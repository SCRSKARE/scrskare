import { useState } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, getDocs, query, orderBy, getDoc, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';

export default function AdminReports() {
    const [loading, setLoading] = useState('');
    const { profile } = useAuth();
    const role = profile?.role || 'admin';

    const downloadExcel = (data, filename) => {
        if (!data.length) return alert('No data to export');
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        XLSX.writeFile(workbook, filename);
    };

    const exportTeams = async () => {
        setLoading('teams');
        try {
            const snap = await getDocs(collection(db, 'teams'));
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => {
                const numA = parseInt((a.team_code || '').split('-').pop()) || 0;
                const numB = parseInt((b.team_code || '').split('-').pop()) || 0;
                return numA - numB;
            });
            if (data.length) {
                const rows = [];
                data.forEach(t => {
                    let members = [];
                    if (Array.isArray(t.members)) {
                        members = t.members;
                    } else if (typeof t.members === 'string') {
                        try { members = JSON.parse(t.members); } catch { members = []; }
                    }
                    if (members.length > 0) {
                        members.forEach(m => {
                            rows.push({
                                'Team': t.name || '',
                                'Team Code': t.team_code || '',
                                'Member Name': m.name || '',
                                'Reg No': m.reg_no || '',
                                'Department': m.dept || '',
                                'Year': m.year || '',
                            });
                        });
                    } else {
                        rows.push({
                            'Team': t.name || '',
                            'Team Code': t.team_code || '',
                            'Member Name': '',
                            'Reg No': '',
                            'Department': '',
                            'Year': '',
                        });
                    }
                });
                const ws = XLSX.utils.json_to_sheet(rows);
                ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 8 }];
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Teams');
                XLSX.writeFile(wb, 'teams_list.xlsx');
            }
        } catch (error) {
            alert('Failed to export teams: ' + error.message);
        } finally {
            setLoading('');
        }
    };

    const exportSelections = async () => {
        setLoading('selections');
        try {
            const snap = await getDocs(collection(db, 'selections'));
            const flat = [];
            for (const d of snap.docs) {
                const s = d.data();
                let teamName = '', problemTitle = '';
                try {
                    if (s.team_id) { const t = await getDoc(doc(db, 'teams', s.team_id)); teamName = t.exists() ? t.data().name : ''; }
                    if (s.problem_id) { const p = await getDoc(doc(db, 'problems', s.problem_id)); problemTitle = p.exists() ? p.data().title : ''; }
                } catch { }
                flat.push({ team: teamName, problem: problemTitle, selected_at: s.selected_at, is_locked: !!s.locked_at });
            }
            downloadExcel(flat, 'problem_selections.xlsx');
        } catch (error) {
            alert('Failed to export selections: ' + error.message);
        } finally {
            setLoading('');
        }
    };

    const exportManualAttendance = async () => {
        setLoading('manual_attendance');
        try {
            const snap = await getDocs(collection(db, 'teams'));
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => {
                const numA = parseInt((a.team_code || '').split('-').pop()) || 0;
                const numB = parseInt((b.team_code || '').split('-').pop()) || 0;
                return numA - numB;
            });
            const rows = [];
            data.forEach(t => {
                let members = [];
                if (Array.isArray(t.members)) {
                    members = t.members;
                } else if (typeof t.members === 'string') {
                    try { members = JSON.parse(t.members); } catch { members = []; }
                }
                if (members.length > 0) {
                    members.forEach(m => {
                        rows.push({
                            'Team': t.name || '',
                            'Member Name': m.name || '',
                            'Reg No': m.reg_no || '',
                            'Round 1': '',
                            'Round 2': '',
                            'Round 3': '',
                        });
                    });
                } else {
                    rows.push({
                        'Team': t.name || '',
                        'Member Name': '',
                        'Reg No': '',
                        'Round 1': '',
                        'Round 2': '',
                        'Round 3': '',
                    });
                }
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Manual Attendance');
            XLSX.writeFile(wb, 'manual_attendance.xlsx');
        } catch (error) {
            alert('Failed to export manual attendance: ' + error.message);
        } finally {
            setLoading('');
        }
    };

    const exportScores = async () => {
        setLoading('scores');
        try {
            const reviewsSnap = await getDocs(collection(db, 'reviews'));
            const teamsSnap = await getDocs(collection(db, 'teams'));
            const teamsMap = {};
            teamsSnap.docs.forEach(d => {
                const t = d.data();
                teamsMap[d.id] = { name: t.name || '', team_code: t.team_code || '' };
            });

            // Normalize score keys: replace & with and, strip special chars, collapse spaces
            const normalizeKey = (key) => {
                return key
                    .replace(/&/g, 'and')
                    .replace(/[^a-zA-Z0-9_\s]/g, '')
                    .replace(/\s+/g, '_')
                    .toLowerCase()
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
            };

            // Make a readable label from a normalized key
            const keyToLabel = (key) => {
                return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            };

            // Collect all reviews and find all unique NORMALIZED score keys
            const allReviews = [];
            const normalizedKeySet = new Set();
            // Track original key -> normalized key mapping
            const keyMapping = {};

            for (const d of reviewsSnap.docs) {
                const r = d.data();
                allReviews.push({ ...r, docId: d.id });
                if (r.scores && typeof r.scores === 'object') {
                    Object.keys(r.scores).forEach(k => {
                        const nk = normalizeKey(k);
                        normalizedKeySet.add(nk);
                        keyMapping[k] = nk;
                    });
                }
            }

            // Ordered list of normalized keys for columns
            const scoreColumns = [...normalizedKeySet];

            // Group reviews by team_id
            const teamReviews = {};
            allReviews.forEach(r => {
                const tid = r.team_id || 'unknown';
                if (!teamReviews[tid]) teamReviews[tid] = [];
                teamReviews[tid].push(r);
            });

            const flat = [];
            // Sort teams by team code number
            const sortedTeamIds = Object.keys(teamReviews).sort((a, b) => {
                const codeA = teamsMap[a]?.team_code || '';
                const codeB = teamsMap[b]?.team_code || '';
                const numA = parseInt(codeA.split('-').pop()) || 0;
                const numB = parseInt(codeB.split('-').pop()) || 0;
                return numA - numB;
            });

            for (const tid of sortedTeamIds) {
                const reviews = teamReviews[tid];
                const teamInfo = teamsMap[tid] || { name: '', team_code: '' };

                const row = {
                    'Team': teamInfo.name,
                    'Team Code': teamInfo.team_code,
                    'Total Score': 0,
                };

                // Initialize all score columns to empty
                scoreColumns.forEach(nk => { row[keyToLabel(nk)] = ''; });
                row['Comments'] = '';

                const commentsList = [];
                let totalScore = 0;

                for (const rev of reviews) {
                    totalScore += (rev.total_score || 0);

                    if (rev.scores && typeof rev.scores === 'object') {
                        for (const [key, val] of Object.entries(rev.scores)) {
                            const nk = normalizeKey(key);
                            const label = keyToLabel(nk);
                            const existing = Number(row[label]) || 0;
                            row[label] = existing + (Number(val) || 0);
                        }
                    }

                    const rnd = rev.round || '';
                    if (rev.comments) commentsList.push(rnd ? `R${rnd}: ${rev.comments}` : rev.comments);
                    if (rev.comments2) commentsList.push(rnd ? `R${rnd}: ${rev.comments2}` : rev.comments2);
                }

                row['Total Score'] = totalScore;
                row['Comments'] = commentsList.join(' | ');
                flat.push(row);
            }

            // Sort by total score descending
            flat.sort((a, b) => (b['Total Score'] || 0) - (a['Total Score'] || 0));

            downloadExcel(flat, 'scores_summary.xlsx');
        } catch (error) {
            alert('Failed to export scores: ' + error.message);
        } finally {
            setLoading('');
        }
    };

    const btnStyle = (color) => ({
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '18px 25px', borderRadius: '8px', cursor: 'pointer',
        background: `rgba(${color},0.08)`, border: `1px solid rgba(${color},0.25)`,
        color: '#fff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem',
        letterSpacing: '0.08em', textAlign: 'left', width: '100%',
        transition: 'all 0.2s ease',
    });

    return (
        <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: '#ff8c00', letterSpacing: '0.1em', marginBottom: '25px', textShadow: '0 0 8px rgba(255,140,0,0.3)' }}>
                REPORTS & EXPORTS
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={exportTeams} disabled={!!loading} style={btnStyle('0,255,255')}>
                    <span style={{ fontSize: '1.3rem' }}>📋</span>
                    <div>
                        <div style={{ color: '#0ff', marginBottom: '3px' }}>Teams List</div>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                            {loading === 'teams' ? 'Exporting...' : 'All registered teams with member details'}
                        </div>
                    </div>
                </button>

                {role === 'admin' && <>
                    <button onClick={exportSelections} disabled={!!loading} style={btnStyle('0,255,100')}>
                        <span style={{ fontSize: '1.3rem' }}>🎯</span>
                        <div>
                            <div style={{ color: '#4ade80', marginBottom: '3px' }}>Problem Selections</div>
                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                {loading === 'selections' ? 'Exporting...' : 'Team → problem mapping with timestamps'}
                            </div>
                        </div>
                    </button>

                    <button onClick={exportManualAttendance} disabled={!!loading} style={btnStyle('255,180,0')}>
                        <span style={{ fontSize: '1.3rem' }}>✍️</span>
                        <div>
                            <div style={{ color: '#fbbf24', marginBottom: '3px' }}>Manual Attendance XL</div>
                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                {loading === 'manual_attendance' ? 'Exporting...' : 'Printable attendance sheet with blank sign columns'}
                            </div>
                        </div>
                    </button>

                    <button onClick={exportScores} disabled={!!loading} style={btnStyle('255,140,0')}>
                        <span style={{ fontSize: '1.3rem' }}>⭐</span>
                        <div>
                            <div style={{ color: '#ff8c00', marginBottom: '3px' }}>Scores Summary</div>
                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                {loading === 'scores' ? 'Exporting...' : 'Judge scores, totals, and comments'}
                            </div>
                        </div>
                    </button>
                </>}
            </div>
        </div>
    );
}
