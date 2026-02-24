import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalTeams: 0, loggedIn: 0, selected: 0, pending: 0, submissions: 0,
    });
    const [feed, setFeed] = useState([]);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const { count: totalTeams } = await supabase.from('teams').select('*', { count: 'exact', head: true });
        const { count: selected } = await supabase.from('selections').select('*', { count: 'exact', head: true });
        const { count: submissions } = await supabase.from('submissions').select('*', { count: 'exact', head: true });

        setStats({
            totalTeams: totalTeams || 0,
            loggedIn: 0, // Would need realtime presence
            selected: selected || 0,
            pending: (totalTeams || 0) - (selected || 0),
            submissions: submissions || 0,
        });

        // Recent selections as feed
        const { data: recentSel } = await supabase
            .from('selections')
            .select('*, teams(name), problems(title)')
            .order('selected_at', { ascending: false })
            .limit(10);
        if (recentSel) setFeed(recentSel);
    };

    const cardStyle = (color) => ({
        background: `rgba(${color}, 0.08)`, border: `1px solid rgba(${color}, 0.25)`,
        borderRadius: '8px', padding: '20px', textAlign: 'center',
    });

    const statNum = { fontFamily: "'Orbitron', sans-serif", fontSize: '2rem', fontWeight: 700, marginBottom: '5px' };
    const statLabel = { fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', letterSpacing: '0.1em', opacity: 0.6 };

    return (
        <div style={{ maxWidth: '1000px' }}>
            <h2 style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: '#ff8c00',
                letterSpacing: '0.1em', marginBottom: '25px',
                textShadow: '0 0 8px rgba(255,140,0,0.3)',
            }}>
                ADMIN DASHBOARD
            </h2>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                <div style={cardStyle('0,255,255')}>
                    <div style={{ ...statNum, color: '#0ff' }}>{stats.totalTeams}</div>
                    <div style={{ ...statLabel, color: '#0ff' }}>TOTAL TEAMS</div>
                </div>
                <div style={cardStyle('0,255,100')}>
                    <div style={{ ...statNum, color: '#4ade80' }}>{stats.selected}</div>
                    <div style={{ ...statLabel, color: '#4ade80' }}>SELECTED</div>
                </div>
                <div style={cardStyle('255,180,0')}>
                    <div style={{ ...statNum, color: '#fbbf24' }}>{stats.pending}</div>
                    <div style={{ ...statLabel, color: '#fbbf24' }}>PENDING</div>
                </div>

            </div>

            {/* Activity Feed */}
            <div style={{
                background: 'rgba(20,8,0,0.3)', border: '1px solid rgba(255,140,0,0.15)',
                borderRadius: '8px', padding: '25px', marginBottom: '30px'
            }}>
                <h3 style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem',
                    color: '#ff8c00', letterSpacing: '0.1em', marginBottom: '15px',
                }}>
                    LIVE ACTIVITY FEED
                </h3>
                {feed.length === 0 ? (
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255,255,255,0.4)' }}>
                        No recent activity.
                    </p>
                ) : feed.map((item) => (
                    <div key={item.id} style={{
                        display: 'flex', gap: '12px', padding: '10px 0',
                        borderBottom: '1px solid rgba(255,140,0,0.08)',
                    }}>
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%', marginTop: '7px',
                            background: '#ff8c00', flexShrink: 0,
                        }} />
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>
                            <span style={{ color: '#fff' }}>{item.teams?.name}</span> selected{' '}
                            <span style={{ color: '#ff8c00' }}>{item.problems?.title}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Danger Zone */}
            <div style={{
                background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.3)',
                borderRadius: '8px', padding: '25px', marginTop: '40px'
            }}>
                <h3 style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem',
                    color: '#ff4444', letterSpacing: '0.1em', marginBottom: '15px',
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span> DANGER ZONE
                </h3>
                <p style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255,255,255,0.6)', marginBottom: '20px', fontSize: '0.9rem' }}>
                    This action will permanently delete all teams, selections, submissions, reviews, and attendance data. This action cannot be undone.
                </p>
                <button
                    onClick={async () => {
                        const confirm1 = window.confirm("Are you absolutely sure you want to delete all event data? This cannot be undone.");
                        if (!confirm1) return;

                        const confirm2 = window.prompt("To proceed, type exactly 'DELETE' in the box below:");
                        if (confirm2 === "DELETE") {
                            try {
                                const { error } = await supabase.rpc('reset_event_data');
                                if (error) throw error;
                                alert("All event data has been successfully reset.");
                                loadStats(); // Refresh the stats
                            } catch (error) {
                                console.error("Error resetting data:", error);
                                alert("Failed to reset data: " + error.message);
                            }
                        } else if (confirm2 !== null) {
                            alert("Action cancelled. You did not type 'DELETE' correctly.");
                        }
                    }}
                    style={{
                        padding: '10px 20px', borderRadius: '6px', cursor: 'pointer',
                        background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.5)',
                        color: '#ff4444', fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem',
                        letterSpacing: '0.1em', transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.background = 'rgba(255,0,0,0.2)';
                        e.target.style.boxShadow = '0 0 10px rgba(255,0,0,0.3)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.background = 'rgba(255,0,0,0.1)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    RESET ALL EVENT DATA
                </button>
            </div>
        </div>
    );
}
