import { useState, useEffect } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, getDocs, addDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { getEvalCriteria } from './AdminEvaluation';

export default function AdminReviews() {
    const [submissions, setSubmissions] = useState([]);
    const [round, setRound] = useState(1);
    const [form, setForm] = useState({ submission_id: '' });
    const [scores, setScores] = useState({});
    const [comments, setComments] = useState('');
    const [comments2, setComments2] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedProblem, setSelectedProblem] = useState(null);

    const metrics = getEvalCriteria(round);
    const totalMax = metrics.reduce((a, m) => a + m.max, 0);

    useEffect(() => { loadTeams(); }, [round]);

    useEffect(() => {
        if (form.submission_id) {
            loadPastComments(form.submission_id);
            loadTeamProblem(form.submission_id);
        } else {
            setPastComments([]);
            setSelectedProblem(null);
        }
    }, [form.submission_id, round]);

    const [pastComments, setPastComments] = useState([]);

    const loadPastComments = async (teamId) => {
        try {
            const q = query(collection(db, 'reviews'), where('team_id', '==', teamId));
            const snap = await getDocs(q);
            const past = snap.docs
                .map(d => d.data())
                .filter(r => r.round < round)
                .sort((a, b) => (b.round || 0) - (a.round || 0));
            setPastComments(past);
        } catch {
            setPastComments([]);
        }
    };

    const loadTeamProblem = async (teamId) => {
        try {
            const selQ = query(collection(db, 'selections'), where('team_id', '==', teamId));
            const selSnap = await getDocs(selQ);
            if (!selSnap.empty) {
                const selData = selSnap.docs[0].data();
                if (selData.problem_id) {
                    const probSnap = await getDoc(doc(db, 'problems', selData.problem_id));
                    if (probSnap.exists()) {
                        setSelectedProblem(probSnap.data());
                        return;
                    }
                }
            }
            setSelectedProblem(null);
        } catch {
            setSelectedProblem(null);
        }
    };


    const loadTeams = async () => {
        console.log('[Reviews] Loading teams for round', round);
        try {
            const teamsSnap = await getDocs(collection(db, 'teams'));
            console.log('[Reviews] Teams fetched:', teamsSnap.docs.length);
            const teamsData = teamsSnap.docs.map(d => ({ id: d.id, ...d.data(), submissions: [] }));
            teamsData.sort((a, b) => {
                const numA = parseInt((a.team_code || '').split('-').pop()) || 0;
                const numB = parseInt((b.team_code || '').split('-').pop()) || 0;
                return numA - numB;
            });
            setSubmissions(teamsData);
            console.log('[Reviews] Teams set:', teamsData.length);
        } catch (err) { console.error('[Reviews] Failed to load teams:', err); }
    };

    const resetForm = () => {
        setForm({ submission_id: '' });
        setScores({});
        setComments('');
        setComments2('');
        setSelectedProblem(null);
    };

    const handleSubmit = async () => {
        if (!form.submission_id) return;
        setSubmitting(true);
        setMessage('');

        const total = metrics.reduce((sum, m) => sum + (Number(scores[m.key]) || 0), 0);

        try {
            await addDoc(collection(db, 'reviews'), {
                team_id: form.submission_id,
                round,
                scores,
                comments: comments || '',
                comments2: comments2 || '',
                total_score: total,
                reviewed_at: new Date().toISOString(),
            });
            setMessage('✅ Review submitted!');
            resetForm();
            loadTeams();
        } catch (e) {
            setMessage(`❌ ${e.message}`);
        }
        setSubmitting(false);
    };

    const S = { gold: '#ff8c00', border: 'rgba(255,140,0,0.2)', dim: 'rgba(255,255,255,0.5)' };
    const inputStyle = {
        width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.4)',
        border: `1px solid ${S.border}`, borderRadius: '6px',
        color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontSize: '0.95rem', outline: 'none',
    };
    const labelStyle = {
        fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem',
        color: 'rgba(255,140,0,0.6)', letterSpacing: '0.1em', marginBottom: '6px', display: 'block',
    };

    return (
        <div style={{ maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: S.gold, letterSpacing: '0.1em', margin: 0, textShadow: '0 0 8px rgba(255,140,0,0.3)' }}>
                    REVIEW MANAGEMENT
                </h2>
            </div>

            <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${S.border}` }}>
                {[1, 2, 3].map(r => (
                    <button key={r} onClick={() => { setRound(r); resetForm(); }} style={{
                        flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
                        fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.1em',
                        background: round === r ? 'rgba(255,140,0,0.15)' : 'rgba(0,0,0,0.3)',
                        color: round === r ? S.gold : 'rgba(255,255,255,0.3)',
                        transition: 'all 0.3s',
                    }}>
                        🏆 ROUND {r} {r === 1 ? '(PRELIMS)' : r === 2 ? '(SEMIS)' : '(FINALS)'}
                    </button>
                ))}
            </div>

            <div style={{ background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.15)', borderRadius: '8px', padding: '12px 18px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {metrics.map(m => (
                    <span key={m.key} style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', color: S.dim }}>
                        <strong style={{ color: '#0ff' }}>{m.label}</strong> /{m.max}
                    </span>
                ))}
                <span style={{ marginLeft: 'auto', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', color: S.gold }}>
                    TOTAL: /{totalMax}
                </span>
            </div>

            <div style={{ background: 'rgba(20,8,0,0.3)', border: `1px solid rgba(255,140,0,0.15)`, borderRadius: '8px', padding: '25px', marginBottom: '25px' }}>
                <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', color: S.gold, letterSpacing: '0.1em', marginBottom: '20px' }}>
                    ADD REVIEW — ROUND {round}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={labelStyle}>SUBMISSION</label>
                        <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.submission_id} onChange={(e) => setForm({ ...form, submission_id: e.target.value })}>
                            <option value="">Select team...</option>
                            {submissions.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} {s.submissions && s.submissions.length > 0 && s.submissions[0].repo_link ? '(Repo)' : ''}</option>
                            ))}
                        </select>
                    </div>
                    {selectedProblem && (
                        <div style={{ gridColumn: '1 / -1', background: 'rgba(0,255,255,0.04)', padding: '12px 18px', borderRadius: '6px', border: '1px solid rgba(0,255,255,0.15)', marginTop: '5px' }}>
                            <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', color: '#0ff', margin: '0 0 6px 0', letterSpacing: '0.05em' }}>SELECTED PROBLEM STATEMENT</h4>
                            <div style={{ fontSize: '1rem', color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 }}>{selectedProblem.title}</div>
                        </div>
                    )}
                    {pastComments.length > 0 && (
                        <div style={{ gridColumn: '1 / -1', background: 'rgba(255,140,0,0.05)', padding: '12px 18px', borderRadius: '6px', border: `1px solid ${S.border}`, marginTop: '5px' }}>
                            <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', color: S.gold, margin: '0 0 10px 0', letterSpacing: '0.05em' }}>PREVIOUS ROUND SCORES & COMMENTS</h4>
                            {pastComments.map((pc, i) => {
                                const roundMetrics = getEvalCriteria(pc.round);
                                const roundTotalMax = roundMetrics.reduce((a, m) => a + m.max, 0);
                                return (
                                    <div key={i} style={{ marginBottom: i < pastComments.length - 1 ? '14px' : 0, paddingBottom: i < pastComments.length - 1 ? '14px' : 0, borderBottom: i < pastComments.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '0.65rem', color: S.dim, fontFamily: "'Orbitron', sans-serif" }}>ROUND {pc.round} {pc.round === 1 ? '(PRELIMS)' : pc.round === 2 ? '(SEMIS)' : '(FINALS)'}</div>
                                            <div style={{ fontSize: '0.75rem', fontFamily: "'Orbitron', sans-serif", color: S.gold, fontWeight: 700 }}>{pc.total_score || 0} / {roundTotalMax}</div>
                                        </div>
                                        {pc.scores && roundMetrics.length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                {roundMetrics.map(m => (
                                                    <span key={m.key} style={{
                                                        padding: '3px 10px', borderRadius: '4px',
                                                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                                                        fontSize: '0.75rem', fontFamily: "'Rajdhani', sans-serif", color: '#fff',
                                                    }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{m.label}: </span>
                                                        <strong style={{ color: '#0ff' }}>{pc.scores[m.key] || 0}</strong>
                                                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>/{m.max}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {pc.comments && pc.comments.trim() !== '' && (
                                            <div style={{ fontSize: '0.85rem', color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontStyle: 'italic', marginBottom: pc.comments2 && pc.comments2.trim() !== '' ? '4px' : 0 }}>💬 "{pc.comments}"</div>
                                        )}
                                        {pc.comments2 && pc.comments2.trim() !== '' && (
                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontFamily: "'Rajdhani', sans-serif", fontStyle: 'italic' }}>📝 "{pc.comments2}"</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${metrics.length}, 1fr)`, gap: '10px', marginBottom: '15px' }}>
                    {metrics.map((m) => (
                        <div key={m.key}>
                            <label style={{ ...labelStyle, fontSize: '0.5rem' }}>{m.label} ({m.max})</label>
                            <input type="number" min="0" max={m.max} style={inputStyle}
                                value={scores[m.key] || 0}
                                onChange={(e) => setScores({ ...scores, [m.key]: Math.min(Number(e.target.value), m.max) })} />
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={labelStyle}>COMMENTS</label>
                        <textarea style={{ ...inputStyle, minHeight: '60px' }} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="General feedback..." />
                    </div>
                    <div>
                        <label style={labelStyle}>ADDITIONAL COMMENTS</label>
                        <textarea style={{ ...inputStyle, minHeight: '60px' }} value={comments2} onChange={(e) => setComments2(e.target.value)} placeholder="Suggestions, improvements..." />
                    </div>
                </div>

                {message && (
                    <div style={{
                        marginBottom: '15px', padding: '8px 14px', borderRadius: '6px', fontSize: '0.9rem', fontFamily: "'Rajdhani', sans-serif",
                        background: message.startsWith('✅') ? 'rgba(74,222,128,0.1)' : 'rgba(255,50,50,0.1)',
                        color: message.startsWith('✅') ? '#4ade80' : '#ff6b6b',
                        border: `1px solid ${message.startsWith('✅') ? 'rgba(74,222,128,0.3)' : 'rgba(255,50,50,0.3)'}`,
                    }}>
                        {message}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button onClick={handleSubmit} disabled={submitting || !form.submission_id} style={{
                        padding: '8px 24px', borderRadius: '6px', cursor: 'pointer',
                        background: 'rgba(255,140,0,0.15)', border: `1px solid rgba(255,140,0,0.4)`,
                        color: S.gold, fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', letterSpacing: '0.1em',
                        opacity: submitting ? 0.5 : 1,
                    }}>
                        {submitting ? '⏳ SUBMITTING...' : 'SUBMIT REVIEW'}
                    </button>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: S.gold, fontWeight: 700 }}>
                        {metrics.reduce((sum, m) => sum + (Number(scores[m.key]) || 0), 0)} / {totalMax}
                    </span>
                </div>
            </div>
        </div>
    );
}
