// Server-side DB proxy helper — bypasses PostgREST RLS issues
// Sends queries through the Vite dev server which uses the service role key

async function dbQuery(path, method = 'GET', data = null) {
    const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, method, data }),
    });
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// Shorthand helpers
export const dbGet = (path) => dbQuery(path);
export const dbPost = (path, data) => dbQuery(path, 'POST', data);
