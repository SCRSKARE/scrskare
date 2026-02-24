import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminTeams() {
    const [teams, setTeams] = useState([]);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', team_code: '', members: '', is_active: true });

    useEffect(() => { loadTeams(); }, []);

    const loadTeams = async () => {
        const { data } = await supabase.from('teams').select('*').order('name');
        if (data) setTeams(data);
    };

    const handleSave = async () => {
        const payload = {
            ...form,
            members: form.members ? JSON.parse(form.members) : [],
        };
        if (editing) {
            await supabase.from('teams').update(payload).eq('id', editing);
        } else {
            await supabase.from('teams').insert(payload);
        }
        resetForm();
        loadTeams();
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this team?')) {
            await supabase.from('teams').delete().eq('id', id);
            loadTeams();
        }
    };

    const handleEdit = (t) => {
        setEditing(t.id);
        setForm({
            name: t.name, team_code: t.team_code,
            members: JSON.stringify(t.members || [], null, 2),
            is_active: t.is_active,
        });
    };

    const toggleActive = async (id, current) => {
        await supabase.from('teams').update({ is_active: !current }).eq('id', id);
        loadTeams();
    };

    const resetForm = () => {
        setEditing(null);
        setForm({ name: '', team_code: '', members: '', is_active: true });
    };

    const inputStyle = {
        width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,140,0,0.2)', borderRadius: '6px',
        color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontSize: '0.95rem', outline: 'none',
    };

    const labelStyle = {
        fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem',
        color: 'rgba(255,140,0,0.6)', letterSpacing: '0.1em', marginBottom: '6px', display: 'block',
    };

    return (
        <div style={{ maxWidth: '1000px' }}>
            <h2 style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: '#ff8c00',
                letterSpacing: '0.1em', marginBottom: '25px',
                textShadow: '0 0 8px rgba(255,140,0,0.3)',
            }}>
                TEAM MANAGEMENT
            </h2>

            {/* Add/Edit Form */}
            <div style={{
                background: 'rgba(20,8,0,0.3)', border: '1px solid rgba(255,140,0,0.15)',
                borderRadius: '8px', padding: '25px', marginBottom: '25px',
            }}>
                <h3 style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem',
                    color: '#ff8c00', letterSpacing: '0.1em', marginBottom: '20px',
                }}>
                    {editing ? 'EDIT TEAM' : 'ADD TEAM'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={labelStyle}>TEAM NAME</label>
                        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>TEAM CODE</label>
                        <input style={inputStyle} value={form.team_code} onChange={(e) => setForm({ ...form, team_code: e.target.value })} />
                    </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={labelStyle}>MEMBERS (JSON)</label>
                    <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
                        placeholder='[{"name": "John", "role": "Leader", "email": "john@example.com"}]'
                        value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ ...labelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                        ACTIVE
                    </label>
                    <div style={{ flex: 1 }} />
                    {editing && (
                        <button onClick={resetForm} style={{
                            padding: '8px 18px', borderRadius: '6px', cursor: 'pointer',
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                            color: 'rgba(255,255,255,0.5)', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem',
                        }}>CANCEL</button>
                    )}
                    <button onClick={handleSave} style={{
                        padding: '8px 24px', borderRadius: '6px', cursor: 'pointer',
                        background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.4)',
                        color: '#ff8c00', fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', letterSpacing: '0.1em',
                    }}>
                        {editing ? 'UPDATE' : 'ADD TEAM'}
                    </button>
                </div>
            </div>

            {/* Teams Table */}
            <div style={{
                background: 'rgba(0,10,20,0.4)', border: '1px solid rgba(255,140,0,0.1)',
                borderRadius: '8px', overflow: 'hidden',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,140,0,0.15)' }}>
                            {['Team', 'Code', 'Members', 'Status', 'Actions'].map((h) => (
                                <th key={h} style={{
                                    padding: '12px 15px', textAlign: 'left',
                                    fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem',
                                    color: 'rgba(255,140,0,0.6)', letterSpacing: '0.1em',
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((t) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,140,0,0.06)' }}>
                                <td style={{ padding: '10px 15px', fontFamily: "'Rajdhani', sans-serif", color: '#fff', fontSize: '0.95rem' }}>{t.name}</td>
                                <td style={{ padding: '10px 15px', fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{t.team_code}</td>
                                <td style={{ padding: '10px 15px', fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{t.members?.length || 0}</td>
                                <td style={{ padding: '10px 15px' }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem',
                                        background: t.is_active ? 'rgba(0,255,100,0.1)' : 'rgba(255,50,50,0.1)',
                                        color: t.is_active ? '#4ade80' : '#ff6b6b',
                                        fontFamily: "'Rajdhani', sans-serif",
                                    }}>
                                        {t.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style={{ padding: '10px 15px', display: 'flex', gap: '6px' }}>
                                    <button onClick={() => toggleActive(t.id, t.is_active)} style={{
                                        padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                                        color: 'rgba(255,255,255,0.5)', fontSize: '0.55rem', fontFamily: "'Orbitron', sans-serif",
                                    }}>
                                        {t.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                                    </button>
                                    <button onClick={() => handleEdit(t)} style={{
                                        padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                                        background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.25)',
                                        color: '#0ff', fontSize: '0.55rem', fontFamily: "'Orbitron', sans-serif",
                                    }}>EDIT</button>
                                    <button onClick={() => handleDelete(t.id)} style={{
                                        padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                                        background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
                                        color: '#ff6b6b', fontSize: '0.55rem', fontFamily: "'Orbitron', sans-serif",
                                    }}>DELETE</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
