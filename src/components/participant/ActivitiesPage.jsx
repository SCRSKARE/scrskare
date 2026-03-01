import { useState, useEffect } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, getDocs } from 'firebase/firestore';

export default function ActivitiesPage() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStandings(); }, []);

    const loadStandings = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'teams'));
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Only keep teams that actually have somewhat active quests scores or 
            // sort them by desc total
            items.sort((a, b) => (b.quests_scores?.total || 0) - (a.quests_scores?.total || 0));

            setTeams(items);
        } catch (e) {
            console.error('Error loading standings:', e);
        }
        setLoading(false);
    };

    const sectionStyle = {
        background: 'rgba(0,15,30,0.5)', border: '1px solid rgba(0,255,255,0.12)',
        borderRadius: '8px', padding: '25px', marginBottom: '25px',
    };

    const headingStyle = {
        fontFamily: "'Orbitron', sans-serif", fontSize: '0.85rem',
        color: '#0ff', letterSpacing: '0.1em', marginBottom: '15px',
        textShadow: '0 0 8px rgba(0,255,255,0.3)',
    };

    const textStyle = {
        fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem',
        color: 'rgba(255,255,255,0.8)', lineHeight: '1.6',
    };

    return (
        <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: "'Rajdhani', sans-serif", color: '#fff' }}>
            <h2 style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: '#0ff',
                letterSpacing: '0.1em', marginBottom: '25px',
                textShadow: '0 0 8px rgba(0,255,255,0.3)',
            }}>
                QUESTS
            </h2>

            {/* Quests Schedule */}
            <div style={sectionStyle}>
                <h3 style={headingStyle}>SCHEDULE</h3>
                {[
                    { time: 'MIDNIGHT', activity: 'ROUND 1 - Powerplay', desc: '20 questions. IPL 2024 and 2025 related questions and T20WC 2024 questions. +1 for correct answer, -0.5 negative marking.' },
                    { time: 'MIDNIGHT', activity: "ROUND 2 - The Director's Cut: Can You Guess the Film?", desc: '20 questions. We give a simple storyline, participants need to guess the movie name. +1 for correct answer, no negative marking.' },
                    { time: 'MIDNIGHT', activity: 'ROUND 3 - Blockbuster Beats: Guess the Movie Soundtrack', desc: '20 questions. We will play a song tune without lyrics and participants need to guess. Guess song and movie for +2, only movie for +1. No negative marking.' },
                ].map((item, i) => (
                    <div key={i} style={{
                        display: 'flex', gap: '15px', padding: '12px 0',
                        borderBottom: '1px solid rgba(0,255,255,0.06)',
                    }}>
                        <div style={{
                            fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem',
                            color: '#0ff', whiteSpace: 'nowrap', minWidth: '80px', paddingTop: '3px',
                        }}>
                            {item.time}
                        </div>
                        <div>
                            <div style={{ ...textStyle, color: '#fff', fontWeight: 600 }}>{item.activity}</div>
                            <div style={{ ...textStyle, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quests Standings */}
            <div style={sectionStyle}>
                <h3 style={headingStyle}>STANDINGS</h3>
                {loading ? (
                    <div style={{ color: 'rgba(0,255,255,0.5)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem' }}>LOADING LEADERBOARD...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(0,255,255,0.2)' }}>
                                    <th style={{ padding: '12px 10px', color: 'rgba(0,255,255,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem' }}>RANK</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(0,255,255,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem' }}>TEAM CODE</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(0,255,255,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', textAlign: 'center' }}>ROUND 1</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(0,255,255,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', textAlign: 'center' }}>ROUND 2</th>
                                    <th style={{ padding: '12px 10px', color: 'rgba(0,255,255,0.7)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', textAlign: 'center' }}>ROUND 3</th>
                                    <th style={{ padding: '12px 10px', color: '#0ff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', textAlign: 'right' }}>TOTAL SCORE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map((t, index) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(0,255,255,0.05)', background: index === 0 ? 'rgba(0,255,255,0.05)' : 'transparent' }}>
                                        <td style={{ padding: '12px 10px', color: index < 3 ? '#0ff' : 'rgba(255,255,255,0.6)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem', fontWeight: index < 3 ? 'bold' : 'normal' }}>
                                            #{index + 1}
                                        </td>
                                        <td style={{ padding: '12px 10px' }}>
                                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', color: '#fff' }}>{t.team_code || 'TBD'}</div>
                                        </td>
                                        <td style={{ padding: '12px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
                                            {t.quests_scores?.round1 ?? '-'}
                                        </td>
                                        <td style={{ padding: '12px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
                                            {t.quests_scores?.round2 ?? '-'}
                                        </td>
                                        <td style={{ padding: '12px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
                                            {t.quests_scores?.round3 ?? '-'}
                                        </td>
                                        <td style={{ padding: '12px 10px', textAlign: 'right', color: '#0ff', fontFamily: "'Orbitron', sans-serif", fontWeight: 'bold' }}>
                                            {t.quests_scores?.total ?? 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {teams.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Rajdhani', sans-serif" }}>
                                No teams found.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
