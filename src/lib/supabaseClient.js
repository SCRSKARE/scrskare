import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storage: window.localStorage,
        // Bypass Navigator LockManager (causes 10s timeout in some browsers)
        lock: async (_name, _acquireTimeout, fn) => await fn(),
    },
});
