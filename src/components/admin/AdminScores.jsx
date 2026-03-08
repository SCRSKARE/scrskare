import { useState, useEffect } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { getEvalCriteria } from './AdminEvaluation';
import * as XLSX from 'xlsx';

export default function AdminScores() {
    const [reviews, setReviews] = useState([]);
    const [round, setRound] = useState(1);
    const [sortBy, setSortBy] = useState('score');
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editScores, setEditScores] = useState({});
    const [editComments, setEditComments] = useState('');
    const [saving, setSaving] = useState(false);

    const metrics = getEvalCriteria(round);
    const totalMax = metrics.reduce((a, m) => a + m.max, 0);

    useEffect(() => { loadReviews(); }, [round]);

    const loadReviews = async () => {
        setLoading(true);
        setEditingId(null);
        try {
            const rQ = query(collection(db, 'reviews'), where('round', '==', round));
            const rSnap = await getDocs(rQ);
            const reviewsData = [];
            for (const d of rSnap.docs) {
                const r = { id: d.id, ...d.data() };
                if (r.team_id) {
                    try {
                        const teamSnap = await getDoc(doc(db, 'teams', r.team_id));
                        if (teamSnap.exists()) {
                            r.teamName = teamSnap.data().name;
                            r.teamCode = teamSnap.data().team_code;
                        } else {
                            r.teamName = 'Unknown';
                            r.teamCode = 'N/A';
                        }
                    } catch { r.teamName = 'Unknown'; r.teamCode = 'N/A'; }
                }
                reviewsData.push(r);
            }
            setReviews(reviewsData);
        } catch (err) {
            console.error('[Scores] Failed to load reviews:', err);
            setReviews([]);
        }
        setLoading(false);
    };

    const startEdit = (review) => {
        setEditingId(review.id);
        setEditScores({ ...(review.scores || {}) });
        setEditComments(review.comments || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditScores({});
        setEditComments('');
    };

    const saveEdit = async (reviewId) => {
        setSaving(true);
        try {
            const total = metrics.reduce((sum, m) => sum + (Number(editScores[m.key]) || 0), 0);
            await updateDoc(doc(db, 'reviews', reviewId), {
                scores: editScores,
                comments: editComments || '',
                total_score: total,
            });
            setEditingId(null);
            loadReviews();
        } catch (err) {
            console.error('Failed to save:', err);
            alert('Failed to save changes: ' + err.message);
        }
        setSaving(false);
    };

    const deleteReview = async (reviewId, teamName) => {
        if (!confirm(`Delete review for "${teamName}"? This cannot be undone.`)) return;
        try {
            await deleteDoc(doc(db, 'reviews', reviewId));
            loadReviews();
        } catch (err) {
            console.error('Failed to delete:', err);
            alert('Failed to delete: ' + err.message);
        }
    };

    const handleExport = async () => {
        try {
            const snap = await getDocs(collection(db, 'reviews'));
            const allReviews = [];
            for (const d of snap.docs) {
                const r = { id: d.id, ...d.data() };
                try {
                    if (r.team_id) {
                        const teamSnap = await getDoc(doc(db, 'teams', r.team_id));
                        r.teamName = teamSnap.exists() ? teamSnap.data().name : 'Unknown';
                        r.teamCode = teamSnap.exists() ? teamSnap.data().team_code : 'N/A';
                    }
                } catch { }
                allReviews.push(r);
            }
            if (!allReviews.length) return;

            // Explicit alias map: maps every known score key variant → canonical label
            // Built from actual Firestore data (18 unique keys → 11 canonical rubrics)
            const SCORE_KEY_ALIASES = {
                // Round 1 rubrics
                'domain_relevance': 'Domain Relevance',
                'feasibility': 'Feasibility',
                'innovation_&_idea_strength': 'Innovation And Idea Strength',
                'innovation_and_idea_strength': 'Innovation And Idea Strength',
                'presentation': 'Presentation',
                'presentation_clarity': 'Presentation',
                'problem_understanding': 'Problem Understanding',
                // Round 3 rubrics
                'functionality_&_stability': 'Functionality And Stability',
                'scalability_&_future_scope': 'Scalability And Future Scope',
                'scalability_and_future_scope': 'Scalability And Future Scope',
                'q&a_&_justication': 'Q And A Justification',
                'q&a_and_justification': 'Q And A Justification',
                'q_&_a_justification': 'Q And A Justification',
                'ui/ux_&_usability': 'UI UX And Usability',
                'ui_/_ux_&_usability': 'UI UX And Usability',
                'business/user_impact': 'Business User Impact',
                'bussiness_/_user_impact': 'Business User Impact',
                'bussiness_or_user_impact': 'Business User Impact',
            };

            // Resolve any score key to its canonical label
            const resolveLabel = (rawKey) => {
                return SCORE_KEY_ALIASES[rawKey] || rawKey.replace(/[_/&]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
            };

            // Collect canonical labels PER ROUND
            const labelsByRound = {};
            allReviews.forEach(r => {
                const rnd = r.round || 1;
                if (!labelsByRound[rnd]) labelsByRound[rnd] = new Set();
                if (r.scores && typeof r.scores === 'object') {
                    Object.keys(r.scores).forEach(k => labelsByRound[rnd].add(resolveLabel(k)));
                }
            });

            // Helper: build score columns for a review, using only specified labels
            const buildScoreCols = (scores, allowedLabels) => {
                const result = {};
                allowedLabels.forEach(label => { result[label] = ''; });
                if (scores && typeof scores === 'object') {
                    for (const [key, val] of Object.entries(scores)) {
                        const label = resolveLabel(key);
                        if (label in result) {
                            const existing = Number(result[label]) || 0;
                            result[label] = existing + (Number(val) || 0);
                        }
                    }
                }
                return result;
            };

            // Combined Scores sheet (one row per team, no individual rubrics)
            const teamsMap = {};
            allReviews.forEach(r => {
                const teamName = r.teamName || 'Unknown';
                const teamCode = r.teamCode || 'N/A';
                if (!teamsMap[teamName]) {
                    teamsMap[teamName] = { Team: teamName, 'Team Code': teamCode, 'R1 Total': 0, 'R2 Total': 0, 'R3 Total': 0, 'Combined Total': 0 };
                }
                const rnd = r.round;
                teamsMap[teamName][`R${rnd} Total`] = Math.max(teamsMap[teamName][`R${rnd} Total`], r.total_score || 0);
                if (r.comments) {
                    const ck = `R${rnd} Comments`;
                    teamsMap[teamName][ck] = teamsMap[teamName][ck] ? teamsMap[teamName][ck] + ' | ' + r.comments : r.comments;
                }
            });
            Object.values(teamsMap).forEach(t => { t['Combined Total'] = (t['R1 Total'] || 0) + (t['R2 Total'] || 0) + (t['R3 Total'] || 0); });
            const combinedData = Object.values(teamsMap).sort((a, b) => b['Combined Total'] - a['Combined Total']);

            // Current round sheet — only use rubric labels from THIS round
            const currentRoundLabels = [...(labelsByRound[round] || [])];
            const currentRoundReviews = allReviews.filter(r => r.round === round)
                .sort((a, b) => b.total_score - a.total_score)
                .map(r => ({
                    Team: r.teamName, 'Team Code': r.teamCode,
                    'Total Score': r.total_score, Comments: r.comments || '',
                    ...buildScoreCols(r.scores, currentRoundLabels)
                }));

            // All Detailed Reviews — use ALL rubric labels
            const allLabels = new Set();
            Object.values(labelsByRound).forEach(s => s.forEach(k => allLabels.add(k)));
            const allLabelsArr = [...allLabels];
            const detailedData = allReviews.map(r => ({
                Round: r.round, Team: r.teamName, 'Team Code': r.teamCode,
                'Total Score': r.total_score, Comments: r.comments || '',
                ...buildScoreCols(r.scores, allLabelsArr)
            })).sort((a, b) => a.Round - b.Round || b['Total Score'] - a['Total Score']);

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(combinedData), "Combined Scores");
            if (currentRoundReviews.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(currentRoundReviews), `R${round} Scores`);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailedData), "All Detailed Reviews");
            XLSX.writeFile(wb, `SCRS_Scores_R${round}.xlsx`);
        } catch (e) {
            console.error('Export failed:', e);
        }
    };

    const sorted = [...reviews].sort((a, b) => {
        if (sortBy === 'score') return b.total_score - a.total_score;
        return new Date(b.reviewed_at) - new Date(a.reviewed_at);
    });

    const S = { gold: '#ff8c00', border: 'rgba(255,140,0,0.2)', dim: 'rgba(255,255,255,0.5)' };
    const inputStyle = {
        padding: '6px 8px', background: 'rgba(0,0,0,0.5)', border: `1px solid ${S.border}`,
        borderRadius: '4px', color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem',
        outline: 'none', width: '100%', textAlign: 'center',
    };

    return (
        <div style={{ maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: S.gold, letterSpacing: '0.1em', margin: 0, textShadow: '0 0 8px rgba(255,140,0,0.3)' }}>
                    📊 SCORES & RESULTS
                </h2>
                <button onClick={handleExport} style={{
                    padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
                    background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.3)',
                    color: '#0ff', fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', letterSpacing: '0.1em',
                }}>
                    💾 EXPORT SCORES
                </button>
            </div>

            <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${S.border}` }}>
                {[1, 2, 3].map(r => (
                    <button key={r} onClick={() => setRound(r)} style={{
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', color: S.gold, letterSpacing: '0.1em', margin: 0 }}>
                    ROUND {round} SCORES ({reviews.length})
                </h3>
                <select style={{
                    padding: '6px 10px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${S.border}`,
                    borderRadius: '6px', color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem',
                }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="score">Sort by: Score (High → Low)</option>
                    <option value="recent">Sort by: Recent</option>
                </select>
            </div>

            {metrics.length > 0 && (
                <div style={{ background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.15)', borderRadius: '8px', padding: '10px 18px', marginBottom: '15px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {metrics.map(m => (
                        <span key={m.key} style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', color: S.dim }}>
                            <strong style={{ color: '#0ff' }}>{m.label}</strong> /{m.max}
                        </span>
                    ))}
                    <span style={{ marginLeft: 'auto', fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', color: S.gold }}>
                        TOTAL: /{totalMax}
                    </span>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {loading && (
                    <div style={{ textAlign: 'center', padding: '30px', color: S.dim }}>Loading scores...</div>
                )}
                {!loading && reviews.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: S.dim }}>No scores yet for Round {round}.</div>
                )}
                {!loading && sorted.map((r, i) => {
                    const isEditing = editingId === r.id;
                    const editTotal = isEditing ? metrics.reduce((sum, m) => sum + (Number(editScores[m.key]) || 0), 0) : 0;

                    return (
                        <div key={r.id} style={{
                            background: isEditing ? 'rgba(255,140,0,0.08)' : i === 0 ? 'rgba(255,140,0,0.06)' : 'rgba(0,10,20,0.4)',
                            border: `1px solid ${isEditing ? 'rgba(255,140,0,0.4)' : i === 0 ? 'rgba(255,140,0,0.25)' : 'rgba(255,140,0,0.1)'}`,
                            borderRadius: '8px', padding: '15px 20px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', color: i < 3 ? S.gold : S.dim, minWidth: '24px' }}>
                                        {sortBy === 'score' ? `#${i + 1}` : ''}
                                    </span>
                                    <div>
                                        <div style={{ fontFamily: "'Rajdhani', sans-serif", color: '#fff', fontSize: '1rem' }}>
                                            {r.teamName || 'Unknown Team'}
                                        </div>
                                        {r.teamCode && <div style={{ fontSize: '0.7rem', color: S.dim }}>{r.teamCode}</div>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.1rem', color: isEditing ? '#0ff' : i === 0 ? '#4ade80' : S.gold, fontWeight: 700 }}>
                                        {isEditing ? editTotal : r.total_score}/{totalMax}
                                    </div>
                                    {!isEditing && (
                                        <>
                                            <button onClick={() => startEdit(r)} style={{
                                                background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)',
                                                borderRadius: '4px', padding: '4px 10px', cursor: 'pointer',
                                                color: S.gold, fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem',
                                                letterSpacing: '0.05em',
                                            }}>✏️ EDIT</button>
                                            <button onClick={() => deleteReview(r.id, r.teamName)} style={{
                                                background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
                                                borderRadius: '4px', padding: '4px 8px', cursor: 'pointer',
                                                color: '#ff6b6b', fontSize: '0.75rem',
                                            }}>🗑️</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isEditing ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${metrics.length}, 1fr)`, gap: '8px', marginBottom: '10px' }}>
                                        {metrics.map(m => (
                                            <div key={m.key}>
                                                <label style={{ fontSize: '0.55rem', color: S.dim, fontFamily: "'Orbitron', sans-serif", display: 'block', marginBottom: '3px' }}>
                                                    {m.label} ({m.max})
                                                </label>
                                                <input
                                                    type="number" min="0" max={m.max}
                                                    style={inputStyle}
                                                    value={editScores[m.key] || 0}
                                                    onChange={e => setEditScores({ ...editScores, [m.key]: Math.min(Number(e.target.value), m.max) })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ fontSize: '0.55rem', color: S.dim, fontFamily: "'Orbitron', sans-serif", display: 'block', marginBottom: '3px' }}>
                                            COMMENTS (OPTIONAL)
                                        </label>
                                        <textarea
                                            style={{ ...inputStyle, textAlign: 'left', minHeight: '50px', width: '100%' }}
                                            value={editComments}
                                            onChange={e => setEditComments(e.target.value)}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => saveEdit(r.id)} disabled={saving} style={{
                                            padding: '6px 18px', borderRadius: '4px', cursor: 'pointer',
                                            background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)',
                                            color: '#4ade80', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem',
                                            letterSpacing: '0.08em', opacity: saving ? 0.5 : 1,
                                        }}>
                                            {saving ? '⏳ SAVING...' : '✅ SAVE'}
                                        </button>
                                        <button onClick={cancelEdit} style={{
                                            padding: '6px 18px', borderRadius: '4px', cursor: 'pointer',
                                            background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
                                            color: '#ff6b6b', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem',
                                            letterSpacing: '0.08em',
                                        }}>
                                            ✕ CANCEL
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {r.scores && (
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: r.comments ? '8px' : 0 }}>
                                            {metrics.map(m => (
                                                <span key={m.key} style={{ fontSize: '0.8rem', color: S.dim, fontFamily: "'Rajdhani', sans-serif" }}>
                                                    {m.label}: <strong style={{ color: '#0ff' }}>{r.scores[m.key] || 0}</strong>/{m.max}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {r.comments && (
                                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', color: S.dim, fontStyle: 'italic' }}>"{r.comments}"</div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
