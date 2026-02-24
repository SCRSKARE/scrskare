import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbGet, dbPost } from '../../lib/dbProxy';

export default function ProblemSelection() {
    const { profile } = useAuth();
    const [problems, setProblems] = useState([]);
    const [selections, setSelections] = useState([]);
    const [selection, setSelection] = useState(null);
    const [selectionConfig, setSelectionConfig] = useState(null);
    const [search, setSearch] = useState('');
    const [confirmId, setConfirmId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const prob = await dbGet('problems?select=*&is_visible=eq.true&order=title.asc');
        if (Array.isArray(prob)) setProblems(prob);

        const allSel = await dbGet('selections?select=problem_id');
        if (Array.isArray(allSel)) setSelections(allSel);

        if (profile?.team_id) {
            const sel = await dbGet(`selections?select=*,problems(*)&team_id=eq.${profile.team_id}`);
            if (Array.isArray(sel) && sel.length > 0) setSelection(sel[0]);
        }

        const cfg = await dbGet('selection_config?id=eq.1');
        if (Array.isArray(cfg) && cfg.length > 0) setSelectionConfig(cfg[0]);

        setLoading(false);
    };

    const getSelectionCount = (problemId) => selections.filter(s => s.problem_id === problemId).length;
    const getLimit = (p) => parseInt(p.category) || 999;
    const isFull = (p) => getSelectionCount(p.id) >= getLimit(p);

    const handleSelect = async (problemId) => {
        if (!profile?.team_id || !selectionConfig?.is_open) return;
        const prob = problems.find(p => p.id === problemId);
        if (prob && isFull(prob)) {
            alert('This problem has reached its team limit!');
            return;
        }

        const result = await dbPost('selections', {
            team_id: profile.team_id, problem_id: problemId,
            is_locked: true, locked_by: 'system',
        });
        if (result && result.code) {
            alert(result.message || 'Error');
        } else {
            setConfirmId(null);
            loadData();
        }
    };

    const filtered = problems.filter((p) => {
        return !search || p.title.toLowerCase().includes(search.toLowerCase())
            || (p.description || '').toLowerCase().includes(search.toLowerCase());
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '25px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#0ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <div style={{ position: 'absolute', inset: '8px', border: '3px solid transparent', borderTopColor: 'rgba(212,168,83,0.8)', borderRadius: '50%', animation: 'spin 1.5s linear infinite reverse' }} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '8px', height: '8px', borderRadius: '50%', background: '#0ff', boxShadow: '0 0 15px rgba(0,255,255,0.6)' }} />
                </div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', color: '#0ff', letterSpacing: '0.3em' }}>LOADING BOUNTY MISSIONS...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (selection) {
        const p = selection.problems;
        return (
            <div style={{ maxWidth: '800px' }}>
                <h2 style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: '#0ff',
                    letterSpacing: '0.1em', marginBottom: '25px',
                    textShadow: '0 0 8px rgba(0,255,255,0.3)',
                }}>
                    ✓ SELECTED PROBLEM
                </h2>
                <div style={{
                    background: 'rgba(0,15,30,0.5)', border: '1px solid rgba(0,255,255,0.15)',
                    borderRadius: '8px', padding: '30px',
                }}>
                    <h3 style={{
                        fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', color: '#fff',
                        letterSpacing: '0.05em', marginBottom: '15px',
                    }}>
                        {p?.title}
                    </h3>
                    {[
                        { label: 'Description', value: p?.description },
                        { label: 'Requirements', value: p?.requirements },
                        { label: 'Deliverables', value: p?.deliverables },
                        { label: 'Evaluation Focus', value: p?.evaluation_focus },
                        { label: 'Resources', value: p?.resources },
                    ].filter((s) => s.value).map((s, i) => (
                        <div key={i} style={{ marginBottom: '20px' }}>
                            <div style={{
                                fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem',
                                color: 'rgba(0,255,255,0.5)', letterSpacing: '0.1em', marginBottom: '8px',
                            }}>
                                {s.label.toUpperCase()}
                            </div>
                            <div style={{
                                fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem',
                                color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                            }}>
                                {s.value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px' }}>
            <h2 style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: '#0ff',
                letterSpacing: '0.1em', marginBottom: '20px',
                textShadow: '0 0 8px rgba(0,255,255,0.3)',
            }}>
                SELECT PROBLEM STATEMENT
            </h2>

            {!selectionConfig?.is_open ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: 'rgba(255,50,50,0.05)', border: '1px solid rgba(255,50,50,0.15)',
                    borderRadius: '12px',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔒</div>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.9rem', color: '#ff6b6b', letterSpacing: '0.1em', marginBottom: '10px' }}>
                        SELECTION WINDOW CLOSED
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem' }}>
                        Problem statements will be revealed when the admin opens the selection window.
                    </p>
                </div>
            ) : (
                <>
                    <div style={{ marginBottom: '20px' }}>
                        <div className="sci-fi-input-wrapper" style={{ maxWidth: '400px' }}>
                            <div className="sci-fi-icon">🔍</div>
                            <input type="text" className="sci-fi-input" placeholder="Search problems..."
                                value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                        {filtered.map((p) => {
                            const limit = getLimit(p);
                            const count = getSelectionCount(p.id);
                            const full = count >= limit;
                            const slotsLeft = Math.max(0, limit - count);

                            return (
                                <div key={p.id} style={{
                                    background: full ? 'rgba(30,10,10,0.4)' : 'rgba(0,15,30,0.5)',
                                    border: `1px solid ${full ? 'rgba(255,50,50,0.2)' : 'rgba(0,255,255,0.12)'}`,
                                    borderRadius: '8px', padding: '20px',
                                    opacity: full ? 0.6 : 1, transition: 'all 0.2s ease',
                                }}>
                                    <h4 style={{
                                        fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem',
                                        color: full ? 'rgba(255,255,255,0.5)' : '#fff', letterSpacing: '0.05em', marginBottom: '10px',
                                    }}>
                                        {p.title}
                                    </h4>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem',
                                            background: full ? 'rgba(255,50,50,0.15)' : 'rgba(0,255,100,0.1)',
                                            color: full ? '#ff6b6b' : '#4ade80',
                                            fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.05em',
                                        }}>
                                            {full ? '🔒 FULL' : `${slotsLeft} SLOT${slotsLeft !== 1 ? 'S' : ''} LEFT`}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: "'Rajdhani', sans-serif" }}>
                                            {count}/{limit} teams
                                        </span>
                                    </div>
                                    <p style={{
                                        fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem',
                                        color: 'rgba(255,255,255,0.6)', lineHeight: '1.5',
                                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden', marginBottom: '15px',
                                    }}>
                                        {p.description}
                                    </p>

                                    {full ? (
                                        <div style={{
                                            width: '100%', padding: '8px', borderRadius: '6px', textAlign: 'center',
                                            background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)',
                                            color: '#ff6b6b', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', letterSpacing: '0.1em',
                                        }}>
                                            UNAVAILABLE
                                        </div>
                                    ) : confirmId === p.id ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleSelect(p.id)} style={{
                                                flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                                background: 'rgba(0,255,100,0.15)', border: '1px solid rgba(0,255,100,0.4)',
                                                color: '#4ade80', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', letterSpacing: '0.1em',
                                            }}>CONFIRM</button>
                                            <button onClick={() => setConfirmId(null)} style={{
                                                flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                                background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
                                                color: '#ff6b6b', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', letterSpacing: '0.1em',
                                            }}>CANCEL</button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => selectionConfig?.is_open && setConfirmId(p.id)}
                                            disabled={!selectionConfig?.is_open}
                                            style={{
                                                width: '100%', padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                                background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.25)',
                                                color: '#0ff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', letterSpacing: '0.1em',
                                            }}
                                        >SELECT</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {filtered.length === 0 && (
                        <div style={{
                            textAlign: 'center', padding: '40px',
                            color: 'rgba(255,255,255,0.4)', fontFamily: "'Rajdhani', sans-serif",
                        }}>
                            No problems available.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
