import { useState, useEffect } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const S = { gold: '#ff8c00', card: 'rgba(15,10,5,0.85)', border: 'rgba(255,140,0,0.2)', text: 'rgba(255,255,255,0.85)', dim: 'rgba(255,255,255,0.5)' };

export default function AdminCredentials() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTeams = async () => {
            const q = query(collection(db, 'teams'), orderBy('team_code'));
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => {
                const numA = parseInt((a.team_code || '').split('-').pop()) || 0;
                const numB = parseInt((b.team_code || '').split('-').pop()) || 0;
                return numA - numB;
            });
            setTeams(items);
            setLoading(false);
        };
        loadTeams();
    }, []);

    const downloadExcel = () => {
        if (!teams.length) return;
        const rows = teams.map(t => ({
            'Team Name': t.name || '',
            'Team Code': t.team_code || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
        XLSX.writeFile(wb, 'team_credentials.xlsx');
    };

    const btnStyle = (bg, borderColor, textColor) => ({
        padding: '10px 25px', background: bg, border: `1px solid ${borderColor}`,
        borderRadius: '6px', color: textColor, fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem',
        cursor: 'pointer', letterSpacing: '0.08em',
    });

    return (
        <div style={{ fontFamily: "'Rajdhani', sans-serif", color: '#fff' }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem', color: S.gold, letterSpacing: '0.1em', marginBottom: '25px' }}>🔑 TEAM CREDENTIALS</h2>

            <div style={{ background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.15)', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', color: '#0ff' }}>
                    ℹ️ Teams log in using their <strong>Team Code</strong> directly. Below is a list of all teams and their codes.
                </div>
            </div>

            {teams.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <button onClick={downloadExcel} style={btnStyle('rgba(74,222,128,0.12)', 'rgba(74,222,128,0.4)', '#4ade80')}>
                        📥 DOWNLOAD EXCEL
                    </button>
                </div>
            )}

            {loading ? (
                <div style={{ color: S.gold, fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem' }}>LOADING TEAMS...</div>
            ) : teams.length > 0 ? (
                <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: S.gold, letterSpacing: '0.08em' }}>TEAM</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: S.gold, letterSpacing: '0.08em' }}>TEAM CODE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((t, i) => (
                                <tr key={t.id} style={{ borderBottom: i < teams.length - 1 ? `1px solid rgba(255,140,0,0.06)` : 'none' }}>
                                    <td style={{ padding: '10px 16px', color: S.text }}>{t.name}</td>
                                    <td style={{ padding: '10px 16px', color: '#4ade80', fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem' }}>{t.team_code}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: S.dim }}>
                    No teams found. Upload teams first.
                </div>
            )}
        </div>
    );
}
