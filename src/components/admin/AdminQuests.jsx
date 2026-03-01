import { useState, useEffect } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function AdminQuests() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // track which team id is saving

    useEffect(() => { loadTeams(); }, []);

    const loadTeams = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'teams'));
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // initialize scores if not present for local state
            items.forEach(t => {
                if (!t.quests_scores) {
                    t.quests_scores = { round1: 0, round2: 0, round3: 0, total: 0 };
                }
            });

            // sort by total desc
            items.sort((a, b) => (b.quests_scores?.total || 0) - (a.quests_scores?.total || 0));
            setTeams(items);
        } catch (e) {
            console.error('Error loading teams:', e);
        }
        setLoading(false);
    };

    const handleScoreChange = (teamId, round, value) => {
        setTeams(prev => prev.map(t => {
            if (t.id === teamId) {
                const parsedVal = parseFloat(value) || 0;
                const newScores = { ...t.quests_scores, [round]: parsedVal };
                newScores.total = Number(newScores.round1) + Number(newScores.round2) + Number(newScores.round3);
                return { ...t, quests_scores: newScores };
            }
            return t;
        }));
    };

    const saveScore = async (team) => {
        setSaving(team.id);
        try {
            await updateDoc(doc(db, 'teams', team.id), {
                quests_scores: team.quests_scores
            });
            // re-sort slightly locally
            setTeams(prev => {
                const updated = [...prev];
                updated.sort((a, b) => (b.quests_scores?.total || 0) - (a.quests_scores?.total || 0));
                return updated;
            });
        } catch (e) {
            alert('Failed to save score: ' + e.message);
        }
        setSaving(null);
    };

    const inputStyle = {
        width: '70px', padding: '6px', background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,140,0,0.3)', borderRadius: '4px',
        color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem',
        textAlign: 'center', outline: 'none'
    };

    if (loading) {
        return <div style={{ color: '#ff8c00', fontFamily: "'Orbitron', sans-serif" }}>LOADING TEAMS...</div>;
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem', color: '#ff8c00', letterSpacing: '0.1em', marginBottom: '25px', textShadow: '0 0 10px rgba(255,140,0,0.4)' }}>
                QUESTS SCORE MANAGEMENT
            </h2>

            <div style={{ background: 'rgba(20,8,0,0.3)', border: '1px solid rgba(255,140,0,0.15)', borderRadius: '8px', padding: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,140,0,0.2)' }}>
                            <th style={{ padding: '10px', color: 'rgba(255,140,0,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem' }}>TEAM</th>
                            <th style={{ padding: '10px', color: 'rgba(255,140,0,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', textAlign: 'center' }}>ROUND 1</th>
                            <th style={{ padding: '10px', color: 'rgba(255,140,0,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', textAlign: 'center' }}>ROUND 2</th>
                            <th style={{ padding: '10px', color: 'rgba(255,140,0,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', textAlign: 'center' }}>ROUND 3</th>
                            <th style={{ padding: '10px', color: '#0ff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', textAlign: 'center' }}>TOTAL</th>
                            <th style={{ padding: '10px', color: 'rgba(255,140,0,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', textAlign: 'right' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((t) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,140,0,0.05)' }}>
                                <td style={{ padding: '12px 10px' }}>
                                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem', color: '#fff' }}>{t.name}</div>
                                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.7rem', color: '#0ff' }}>Code: {t.team_code}</div>
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={inputStyle}
                                        value={t.quests_scores?.round1 ?? 0}
                                        onChange={(e) => handleScoreChange(t.id, 'round1', e.target.value)}
                                    />
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={inputStyle}
                                        value={t.quests_scores?.round2 ?? 0}
                                        onChange={(e) => handleScoreChange(t.id, 'round2', e.target.value)}
                                    />
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={inputStyle}
                                        value={t.quests_scores?.round3 ?? 0}
                                        onChange={(e) => handleScoreChange(t.id, 'round3', e.target.value)}
                                    />
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'center', color: '#0ff', fontFamily: "'Orbitron', sans-serif", fontWeight: 'bold' }}>
                                    {t.quests_scores?.total ?? 0}
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                                    <button
                                        onClick={() => saveScore(t)}
                                        disabled={saving === t.id}
                                        style={{
                                            padding: '6px 14px', borderRadius: '4px', cursor: 'pointer',
                                            background: saving === t.id ? 'rgba(0,255,255,0.1)' : 'rgba(255,140,0,0.15)',
                                            border: saving === t.id ? '1px solid rgba(0,255,255,0.4)' : '1px solid rgba(255,140,0,0.4)',
                                            color: saving === t.id ? '#0ff' : '#ff8c00',
                                            fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', letterSpacing: '0.1em',
                                        }}
                                    >
                                        {saving === t.id ? 'SAVING...' : 'SAVE'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {teams.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Rajdhani', sans-serif" }}>
                        No teams found.
                    </div>
                )}
            </div>
        </div>
    );
}
