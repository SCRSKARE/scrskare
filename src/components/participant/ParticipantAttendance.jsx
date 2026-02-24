import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbGet } from '../../lib/dbProxy';

const K = { gold: '#d4a853', cyan: '#0ff', card: 'rgba(10,15,25,0.85)', border: 'rgba(212,168,83,0.25)', text: 'rgba(255,255,255,0.85)', dim: 'rgba(255,255,255,0.5)' };

export default function ParticipantAttendance() {
    const { profile } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.team_id) { setLoading(false); return; }

        // Use the dbProxy to bypass RLS and fetch the team's data directly
        dbGet(`teams?id=eq.${profile.team_id}&select=members`)
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setRecords(typeof data[0].members === 'string' ? JSON.parse(data[0].members) : (data[0].members || []));
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [profile?.team_id]);

    // Parse the current members from state
    const members = records || [];

    // Build matrix: member -> { round1, round2, round3 }
    const matrix = {};
    members.forEach(m => {
        matrix[m.name] = {
            name: m.name,
            reg_no: m.reg_no || '',
            r1: m.r1 === true || m.r1 === 'true' || m.r1 === 1,
            r2: m.r2 === true || m.r2 === 'true' || m.r2 === 1,
            r3: m.r3 === true || m.r3 === 'true' || m.r3 === 1
        };
    });

    const rows = Object.values(matrix);

    const Badge = ({ val }) => {
        if (val === null) return <span style={{ color: K.dim, fontSize: '0.75rem' }}>—</span>;
        return val
            ? <span style={{ color: '#4ade80', fontSize: '1rem' }}>✅</span>
            : <span style={{ color: '#ef4444', fontSize: '1rem' }}>❌</span>;
    };

    return (
        <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: "'Rajdhani', sans-serif" }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
                <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.4rem', color: K.gold, letterSpacing: '0.12em', margin: 0 }}>ATTENDANCE</h2>
                <p style={{ color: K.dim, marginTop: '6px' }}>Your team's attendance across all rounds</p>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: K.dim }}>Loading...</p>
            ) : rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: K.card, border: `1px solid ${K.border}`, borderRadius: '10px' }}>
                    <p style={{ color: K.dim }}>No attendance data available yet</p>
                </div>
            ) : (
                <div style={{ background: K.card, border: `1px solid ${K.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${K.border}` }}>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', color: K.gold, letterSpacing: '0.1em' }}>NAME</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', color: K.gold, letterSpacing: '0.1em' }}>REG NO</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center', fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', color: K.gold, letterSpacing: '0.1em' }}>R1</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center', fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', color: K.gold, letterSpacing: '0.1em' }}>R2</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center', fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', color: K.gold, letterSpacing: '0.1em' }}>R3</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid rgba(212,168,83,0.08)` : 'none' }}>
                                    <td style={{ padding: '12px 16px', color: K.text }}>{r.name}</td>
                                    <td style={{ padding: '12px 16px', color: K.dim, fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem' }}>{r.reg_no}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge val={r.r1} /></td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge val={r.r2} /></td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge val={r.r3} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
