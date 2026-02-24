import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import * as XLSX from 'xlsx';

const S = { gold: '#ff8c00', card: 'rgba(15,10,5,0.85)', border: 'rgba(255,140,0,0.2)', text: 'rgba(255,255,255,0.85)', dim: 'rgba(255,255,255,0.5)' };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function generatePassword(len = 8) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < len; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
}

export default function AdminCredentials() {
    const [teams, setTeams] = useState([]);
    const [credentials, setCredentials] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createResult, setCreateResult] = useState(null);
    const [domain, setDomain] = useState('devfest.com');
    const [passwordLength, setPasswordLength] = useState(8);
    const [useTeamCodeAsPassword, setUseTeamCodeAsPassword] = useState(true);
    const [sqlCopied, setSqlCopied] = useState(false);

    useEffect(() => {
        supabase.from('teams').select('*').order('name').then(({ data }) => {
            if (data) setTeams(data);
        });
    }, []);

    const generateForAll = () => {
        setGenerating(true);
        const newCreds = teams.map(team => ({
            team_id: team.id,
            team_name: team.name,
            team_code: team.team_code,
            email: `${team.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@${domain}`,
            password: useTeamCodeAsPassword ? team.team_code : generatePassword(passwordLength),
        }));
        setCredentials(newCreds);
        setGenerating(false);
        setCreateResult(null);
    };

    const generateForOne = (team) => {
        const newCred = {
            team_id: team.id,
            team_name: team.name,
            team_code: team.team_code,
            email: `${team.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@${domain}`,
            password: useTeamCodeAsPassword ? team.team_code : generatePassword(passwordLength),
        };
        setCredentials(prev => {
            const filtered = prev.filter(c => c.team_id !== team.id);
            return [newCred, ...filtered];
        });
    };

    // Create users via Supabase Auth API (signup endpoint)
    const createUsersInSupabase = async () => {
        if (!credentials.length) return;
        setCreating(true);
        let created = 0, skipped = 0, failed = 0, lastError = '';

        for (let i = 0; i < credentials.length; i++) {
            const cred = credentials[i];
            setCreateResult({ created, skipped, failed, error: '', progress: `${i + 1}/${credentials.length}` });

            try {
                const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({
                        email: cred.email,
                        password: cred.password,
                        data: { role: 'participant', full_name: cred.team_name },
                    }),
                });
                const result = await res.json();

                if (result.id) {
                    created++;
                } else if (result.msg?.includes('already registered') || result.message?.includes('already registered') || result.code === 'user_already_exists') {
                    skipped++;
                } else if (result.msg?.includes('rate limit') || result.message?.includes('rate limit')) {
                    // Wait longer on rate limit, then retry
                    await new Promise(r => setTimeout(r, 5000));
                    const retry = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify({ email: cred.email, password: cred.password, data: { role: 'participant', full_name: cred.team_name } }),
                    });
                    const retryResult = await retry.json();
                    if (retryResult.id) created++;
                    else { failed++; if (!lastError) lastError = retryResult.msg || retryResult.message || 'Rate limit'; }
                } else {
                    failed++;
                    if (!lastError) lastError = result.msg || result.message || result.error_description || JSON.stringify(result);
                }
            } catch (e) {
                failed++;
                if (!lastError) lastError = e.message;
            }

            // Delay between signups to avoid rate limit
            if (i < credentials.length - 1) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }
        setCreateResult({ created, skipped, failed, error: lastError });
        setCreating(false);
    };

    const generateSQL = () => {
        if (!credentials.length) return '';
        let sql = `CREATE OR REPLACE FUNCTION create_user(\n  user_email TEXT, user_password TEXT, user_role TEXT DEFAULT 'participant', user_name TEXT DEFAULT ''\n) RETURNS UUID AS $$\nDECLARE new_id UUID := gen_random_uuid();\nBEGIN\n  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_user_meta_data, created_at, updated_at)\n  VALUES (new_id, '00000000-0000-0000-0000-000000000000', user_email, crypt(user_password, gen_salt('bf', 10)), now(), 'authenticated', 'authenticated', jsonb_build_object('role', user_role, 'full_name', user_name), now(), now());\n  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)\n  VALUES (new_id, new_id, user_email, jsonb_build_object('sub', new_id, 'email', user_email), 'email', now(), now(), now());\n  RETURN new_id;\nEND; $$ LANGUAGE plpgsql SECURITY DEFINER;\n\n`;
        sql += `DO $$\nBEGIN\n`;
        credentials.forEach(c => {
            sql += `  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = '${c.email.replace(/'/g, "''")}') THEN\n`;
            sql += `    PERFORM create_user('${c.email.replace(/'/g, "''")}', '${c.password.replace(/'/g, "''")}', 'participant', '${c.team_name.replace(/'/g, "''")}');\n`;
            sql += `  END IF;\n`;
        });
        sql += `END $$;\n`;
        return sql;
    };

    const copySQL = async () => {
        const sql = generateSQL();
        try { await navigator.clipboard.writeText(sql); } catch {
            const ta = document.createElement('textarea'); ta.value = sql; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        }
        setSqlCopied(true); setTimeout(() => setSqlCopied(false), 3000);
    };

    const downloadExcel = () => {
        if (!credentials.length) return;

        const data = credentials.map(c => ({
            'Team Name': c.team_name,
            'Team Code': c.team_code,
            'Email': c.email,
            'Password': c.password
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Credentials');

        XLSX.writeFile(workbook, 'team_credentials.xlsx');
    };

    const inputStyle = { padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${S.border}`, borderRadius: '6px', color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontSize: '0.95rem' };
    const btnStyle = (bg, borderColor, textColor) => ({
        padding: '10px 25px', background: bg, border: `1px solid ${borderColor}`,
        borderRadius: '6px', color: textColor, fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem',
        cursor: 'pointer', letterSpacing: '0.08em',
    });

    return (
        <div style={{ fontFamily: "'Rajdhani', sans-serif", color: '#fff' }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.2rem', color: S.gold, letterSpacing: '0.1em', marginBottom: '25px' }}>🔑 TEAM CREDENTIALS</h2>

            {/* Config */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '0.65rem', color: S.dim, fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}>EMAIL DOMAIN</label>
                        <input value={domain} onChange={e => setDomain(e.target.value)} style={{ ...inputStyle, width: '180px' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.65rem', color: S.dim, fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}>PASSWORD</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ display: 'flex', gap: '5px', alignItems: 'center', color: S.dim, fontSize: '0.85rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={useTeamCodeAsPassword} onChange={e => setUseTeamCodeAsPassword(e.target.checked)} />
                                Use Team Code
                            </label>
                            {!useTeamCodeAsPassword && (
                                <input type="number" min={6} max={16} value={passwordLength} onChange={e => setPasswordLength(parseInt(e.target.value))} style={{ ...inputStyle, width: '60px' }} />
                            )}
                        </div>
                    </div>
                    <button onClick={generateForAll} disabled={generating || !teams.length} style={{ ...btnStyle('rgba(255,140,0,0.15)', S.gold, S.gold), opacity: generating ? 0.5 : 1 }}>
                        {generating ? '⏳...' : `🔑 GENERATE FOR ALL ${teams.length} TEAMS`}
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            {credentials.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <button onClick={createUsersInSupabase} disabled={creating} style={{ ...btnStyle(creating ? 'rgba(0,200,255,0.08)' : 'rgba(0,200,255,0.15)', creating ? 'rgba(0,200,255,0.3)' : '#0ff', creating ? 'rgba(0,200,255,0.5)' : '#0ff'), opacity: creating ? 0.8 : 1 }}>
                        {creating ? `⏳ CREATING... ${createResult?.progress || ''}` : `🚀 CREATE ${credentials.length} USERS IN SUPABASE`}
                    </button>
                    <button onClick={copySQL} style={btnStyle(sqlCopied ? 'rgba(74,222,128,0.2)' : 'rgba(138,43,226,0.15)', sqlCopied ? '#4ade80' : '#a78bfa', sqlCopied ? '#4ade80' : '#a78bfa')}>
                        {sqlCopied ? '✅ COPIED!' : '📋 COPY SQL'}
                    </button>
                    <button onClick={downloadExcel} style={btnStyle('rgba(74,222,128,0.12)', 'rgba(74,222,128,0.4)', '#4ade80')}>
                        📥 EXCEL
                    </button>
                </div>
            )}

            {/* Create Result */}
            {createResult && (
                <div style={{ padding: '15px 20px', background: createResult.failed > 0 ? 'rgba(255,50,50,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${createResult.failed > 0 ? 'rgba(255,50,50,0.3)' : 'rgba(74,222,128,0.3)'}`, borderRadius: '8px', marginBottom: '20px' }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', color: createResult.created > 0 ? '#4ade80' : S.dim }}>
                        {createResult.created > 0 && `✅ ${createResult.created} created `}
                        {createResult.skipped > 0 && `⏭️ ${createResult.skipped} skipped (already exist) `}
                        {createResult.failed > 0 && `❌ ${createResult.failed} failed`}
                    </span>
                    {createResult.error && <div style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: '6px' }}>Error: {createResult.error}</div>}
                </div>
            )}

            {/* Credentials Table */}
            {credentials.length > 0 && (
                <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: S.gold, letterSpacing: '0.08em' }}>TEAM</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: S.gold, letterSpacing: '0.08em' }}>EMAIL</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: S.gold, letterSpacing: '0.08em' }}>PASSWORD</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontFamily: "'Orbitron', sans-serif", fontSize: '0.6rem', color: S.gold, letterSpacing: '0.08em' }}>🔄</th>
                            </tr>
                        </thead>
                        <tbody>
                            {credentials.map((c, i) => (
                                <tr key={c.team_id || i} style={{ borderBottom: i < credentials.length - 1 ? `1px solid rgba(255,140,0,0.06)` : 'none' }}>
                                    <td style={{ padding: '10px 16px', color: S.text }}>{c.team_name}</td>
                                    <td style={{ padding: '10px 16px', color: '#0ff', fontSize: '0.9rem' }}>{c.email}</td>
                                    <td style={{ padding: '10px 16px', color: '#4ade80', fontFamily: "'Courier New', monospace", fontSize: '0.9rem' }}>{c.password}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                        <button onClick={() => { const t = teams.find(t => t.id === c.team_id); if (t) generateForOne(t); }} style={{ background: 'none', border: 'none', color: S.gold, cursor: 'pointer', fontSize: '1rem' }}>🔄</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {credentials.length === 0 && teams.length > 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: S.dim }}>
                    Click "Generate for All Teams" to create login credentials.
                </div>
            )}
            {teams.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: S.dim }}>
                    No teams found. Upload teams first.
                </div>
            )}
        </div>
    );
}
