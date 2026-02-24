import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const TEAM_SESSION_KEY = 'devfest-team-session';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const inactivityTimer = useRef(null);

    // Restore team session from localStorage
    const restoreTeamSession = useCallback(() => {
        try {
            const stored = localStorage.getItem(TEAM_SESSION_KEY);
            if (stored) {
                const session = JSON.parse(stored);
                setUser({ id: session.team_id, email: session.email || '' });
                setProfile({
                    id: session.team_id,
                    email: session.email || '',
                    full_name: session.team_name,
                    role: 'participant',
                    team_id: session.team_id,
                    team_code: session.team_code,
                    teams: session.team_data || null,
                });
                return true;
            }
        } catch { }
        return false;
    }, []);

    const fetchProfile = useCallback(async (sessionUser) => {
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles').select('*').eq('id', sessionUser.id).single();

            let teamData = null;
            if (!profileError && profileData) {
                if (profileData.team_id) {
                    try {
                        const { data: team } = await supabase
                            .from('teams').select('*').eq('id', profileData.team_id).single();
                        teamData = team;
                    } catch { }
                }
                const fullProfile = { ...profileData, teams: teamData };
                setProfile(fullProfile);
                return fullProfile;
            }
        } catch { }

        const meta = sessionUser.user_metadata || {};
        const fallbackProfile = {
            id: sessionUser.id,
            email: sessionUser.email,
            full_name: meta.full_name || sessionUser.email?.split('@')[0] || '',
            role: meta.role || 'admin',
            team_id: null,
            teams: null,
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
    }, []);

    // Init session
    useEffect(() => {
        let mounted = true;
        const hardTimeout = setTimeout(() => { if (mounted) setLoading(false); }, 5000);

        const init = async () => {
            // First try team session (instant, no network)
            if (restoreTeamSession()) {
                if (mounted) { clearTimeout(hardTimeout); setLoading(false); }
                return;
            }

            // Then try Supabase auth (for admin)
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;
                if (session?.user) {
                    setUser(session.user);
                    try { await fetchProfile(session.user); } catch { }
                }
            } catch { }

            if (mounted) { clearTimeout(hardTimeout); setLoading(false); }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;
                if (event === 'SIGNED_IN' && session?.user) {
                    setUser(session.user);
                    try { await fetchProfile(session.user); } catch { }
                    setLoading(false);
                } else if (event === 'SIGNED_OUT') {
                    // Only clear if not a team session
                    if (!localStorage.getItem(TEAM_SESSION_KEY)) {
                        setUser(null);
                        setProfile(null);
                    }
                    setLoading(false);
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    setUser(session.user);
                }
            }
        );

        return () => { mounted = false; clearTimeout(hardTimeout); subscription.unsubscribe(); };
    }, [fetchProfile, restoreTeamSession]);

    // Inactivity logout
    const doSignOut = useCallback(async () => {
        const isTeam = !!localStorage.getItem(TEAM_SESSION_KEY);
        setUser(null);
        setProfile(null);
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

        if (isTeam) {
            localStorage.removeItem(TEAM_SESSION_KEY);
        } else {
            try { await supabase.auth.signOut({ scope: 'local' }); } catch { }
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        const resetTimer = () => {
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            inactivityTimer.current = setTimeout(doSignOut, INACTIVITY_TIMEOUT);
        };
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetTimer));
        resetTimer();
        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimer));
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    }, [user, doSignOut]);

    // Admin login (Supabase Auth — bypasses client lock entirely)
    const signIn = async (email, password) => {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
            body: JSON.stringify({ email, password }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error_description || result.msg || 'Invalid credentials');

        // Store session manually in localStorage (same format Supabase expects)
        const storageKey = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
        localStorage.setItem(storageKey, JSON.stringify({
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            expires_at: result.expires_at,
            expires_in: result.expires_in,
            token_type: result.token_type,
            user: result.user,
        }));

        // Set state directly
        setUser(result.user);
        const meta = result.user?.user_metadata || {};
        setProfile({
            id: result.user.id,
            email: result.user.email,
            full_name: meta.full_name || result.user.email?.split('@')[0] || '',
            role: meta.role || 'admin',
            team_id: null,
            teams: null,
        });

        return { user: result.user, session: result };
    };

    // Participant login (team code) — tries multiple approaches
    const teamLogin = async (teamCode) => {
        const code = teamCode.trim();
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        let team = null;

        // Approach 1: Local API proxy (uses service role key server-side)
        try {
            const r1 = await fetch('/api/team-lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            if (r1.ok) {
                const d1 = await r1.json();
                console.log('Local proxy result:', d1);
                if (d1.team) team = d1.team;
            }
        } catch (e) { console.log('Local proxy fallback:', e); }

        // Approach 2: RPC function
        if (!team) {
            try {
                const r2 = await fetch(`${url}/rest/v1/rpc/lookup_team`, {
                    method: 'POST',
                    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                });
                if (r2.ok) {
                    const d2 = await r2.json();
                    if (d2 && d2.id) team = d2;
                }
            } catch (e) { console.log('RPC fallback:', e); }
        }

        // Approach 3: Supabase client (works if user already has session)
        if (!team) {
            try {
                const { data } = await supabase.from('teams').select('*').eq('team_code', code).limit(1);
                if (data && data.length > 0) team = data[0];
            } catch (e) { console.log('Client fallback:', e); }
        }

        // Approach 4: Direct REST (in case RLS was fixed)
        if (!team) {
            try {
                const r4 = await fetch(`${url}/rest/v1/teams?team_code=eq.${encodeURIComponent(code)}&select=*`, {
                    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
                });
                const d4 = await r4.json();
                if (Array.isArray(d4) && d4.length > 0) team = d4[0];
            } catch (e) { console.log('REST fallback:', e); }
        }

        console.log('Team login result:', team);

        if (!team) throw new Error('Invalid team code');

        const session = {
            team_id: team.id,
            team_name: team.name,
            team_code: team.team_code,
            email: '',
            team_data: team,
        };
        localStorage.setItem(TEAM_SESSION_KEY, JSON.stringify(session));

        setUser({ id: team.id, email: '' });
        setProfile({
            id: team.id,
            email: '',
            full_name: team.name,
            role: 'participant',
            team_id: team.id,
            team_code: team.team_code,
            teams: team,
        });

        return { team };
    };

    const signOut = doSignOut;

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    };

    const value = {
        user,
        profile,
        loading,
        signIn,
        teamLogin,
        signOut,
        resetPassword,
        isAdmin: profile?.role === 'admin',
        isParticipant: profile?.role === 'participant',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
