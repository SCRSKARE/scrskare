import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminSelections() {
    const [selections, setSelections] = useState([]);
    const [teams, setTeams] = useState([]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const { data: sel } = await supabase.from('selections').select('*, teams(name), problems(title)').order('selected_at', { ascending: false });
        if (sel) setSelections(sel);
        const { data: t } = await supabase.from('teams').select('id, name');
        if (t) setTeams(t);
    };

    const toggleLock = async (id, current) => {
        await supabase.from('selections').update({ is_locked: !current, locked_by: 'admin' }).eq('id', id);
        loadData();
    };



    const deleteSelection = async (id) => {
        if (confirm('Remove this selection?')) {
            await supabase.from('selections').delete().eq('id', id);
            loadData();
        }
    };

    const selectedTeamIds = new Set(selections.map(s => s.team_id));
    const notSelected = teams.filter(t => !selectedTeamIds.has(t.id) && t.team_code !== '__TIMELINE__');

    const [tab, setTab] = useState('selected');

    const tabBtn = (key, label, count, color) => (
        <button onClick={() => setTab(key)} style={{
            padding: '8px 18px', borderRadius: '6px', cursor: 'pointer',
            background: tab === key ? `rgba(${color},0.15)` : 'transparent',
            border: `1px solid ${tab === key ? `rgba(${color},0.4)` : 'rgba(255,255,255,0.1)'}`,
            color: tab === key ? `rgb(${color})` : 'rgba(255,255,255,0.4)',
            fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', letterSpacing: '0.08em',
        }}>
            {label} <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '8px', background: `rgba(${color},0.15)`, fontSize: '0.55rem' }}>{count}</span>
        </button>
    );

    return (
        <div style={{ maxWidth: '1000px' }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: '#ff8c00', letterSpacing: '0.1em', marginBottom: '20px', textShadow: '0 0 8px rgba(255,140,0,0.3)' }}>
                SELECTION MONITORING
            </h2>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {tabBtn('selected', 'SELECTED', selections.length, '0,255,255')}
                {tabBtn('notselected', 'NOT SELECTED', notSelected.length, '255,100,100')}
            </div>

            {tab === 'selected' ? (
                <div style={{ background: 'rgba(0,10,20,0.4)', border: '1px solid rgba(255,140,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,140,0,0.15)' }}>
                                {['Team', 'Problem', 'Time', 'Status', 'Actions'].map((h) => (
                                    <th key={h} style={{ padding: '12px 15px', textAlign: 'left', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: 'rgba(255,140,0,0.6)', letterSpacing: '0.1em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {selections.map((s) => (
                                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,140,0,0.06)' }}>
                                    <td style={{ padding: '10px 15px', fontFamily: "'Rajdhani', sans-serif", color: '#fff', fontSize: '0.95rem' }}>{s.teams?.name}</td>
                                    <td style={{ padding: '10px 15px', fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255,255,255,0.7)' }}>{s.problems?.title}</td>
                                    <td style={{ padding: '10px 15px', fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                                        {s.selected_at ? new Date(s.selected_at).toLocaleString() : '—'}
                                    </td>
                                    <td style={{ padding: '10px 15px' }}>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem',
                                            background: s.is_locked ? 'rgba(255,50,50,0.1)' : 'rgba(0,255,100,0.1)',
                                            color: s.is_locked ? '#ff6b6b' : '#4ade80', fontFamily: "'Rajdhani', sans-serif",
                                        }}>
                                            {s.is_locked ? 'Locked' : 'Unlocked'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 15px', display: 'flex', gap: '6px' }}>
                                        <button onClick={() => toggleLock(s.id, s.is_locked)} style={{
                                            padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                                            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                                            color: 'rgba(255,255,255,0.5)', fontSize: '0.55rem', fontFamily: "'Orbitron', sans-serif",
                                        }}>
                                            {s.is_locked ? 'UNLOCK' : 'LOCK'}
                                        </button>
                                        <button onClick={() => deleteSelection(s.id)} style={{
                                            padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                                            background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
                                            color: '#ff6b6b', fontSize: '0.55rem', fontFamily: "'Orbitron', sans-serif",
                                        }}>REMOVE</button>
                                    </td>
                                </tr>
                            ))}
                            {selections.length === 0 && (
                                <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'Rajdhani', sans-serif" }}>No selections yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notSelected.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(0,255,100,0.6)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                            ✓ ALL TEAMS HAVE SELECTED A PROBLEM
                        </div>
                    ) : notSelected.map((t) => (
                        <div key={t.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px',
                            background: 'rgba(255,30,30,0.04)', border: '1px solid rgba(255,100,100,0.15)',
                            borderRadius: '8px',
                        }}>
                            <span style={{ color: '#ff6b6b', fontSize: '0.8rem' }}>⚠</span>
                            <span style={{ flex: 1, fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem', color: '#fff' }}>{t.name}</span>
                            <span style={{
                                padding: '3px 10px', borderRadius: '10px', fontSize: '0.65rem',
                                background: 'rgba(255,100,100,0.1)', color: '#ff6b6b',
                                fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.08em',
                            }}>
                                NO PS SELECTED
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
