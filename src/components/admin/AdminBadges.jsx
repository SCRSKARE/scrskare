import { useState, useEffect } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import { jsPDF } from 'jspdf';

export default function AdminBadges() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [layout, setLayout] = useState('6'); // '6' or '4'

    useEffect(() => { loadTeams(); }, []);

    const loadTeams = async () => {
        try {
            const snap = await getDocs(collection(db, 'teams'));
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => {
                const numA = parseInt((a.team_code || '').split('-').pop()) || 0;
                const numB = parseInt((b.team_code || '').split('-').pop()) || 0;
                return numA - numB;
            });
            setTeams(items);
        } catch (err) { console.error('Failed:', err); }
        setLoading(false);
    };

    const loadImg = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    const generatePDF = async () => {
        if (!teams.length) return;
        setGenerating(true);
        setProgress(0);

        try {
            const [bgImg, logoImg] = await Promise.all([
                loadImg('/badge_bg.jpeg'),
                loadImg('/images/scrs-logo.png'),
            ]);

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageW = 210, pageH = 297;

            // Layout setup based on selected choice
            const isFour = layout === '4';
            const cols = 2;
            const rows = isFour ? 2 : 3;
            const teamsPerPage = cols * rows;

            // Use the absolute minimum margin and gap to maximize badge size
            const mx = 6;
            const gx = 4;
            // The maximum allowable badge width based on the A4 page width (210mm)
            const cw = (pageW - mx * 2 - gx) / cols;

            const origW = 97;
            const origH = 92.3333; // ~ 277/3
            const targetRatio = origW / origH;

            // Because width is the limiting factor for 2 columns on an A4 page,
            // the size of the badges cannot be increased any further without making them overlap.
            const bw = cw;
            const bh = bw / targetRatio;

            // Center the entire grid of badges vertically on the A4 page
            const gy = 4;
            const totalContentH = (rows * bh) + ((rows - 1) * gy);
            const my = (pageH - totalContentH) / 2;

            const totalPages = Math.ceil(teams.length / teamsPerPage);

            for (let page = 0; page < totalPages; page++) {
                if (page > 0) pdf.addPage();
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pageW, pageH, 'F');

                const pageTeams = teams.slice(page * teamsPerPage, (page + 1) * teamsPerPage);

                pageTeams.forEach((team, idx) => {
                    const col = idx % cols;
                    const row = Math.floor(idx / cols);

                    // Directly place the badges using the maximized width/height and centering margins
                    const bx = mx + col * (bw + gx);
                    const by = my + row * (bh + gy);

                    // Scale factor for all internal elements to perfectly match original design sizes & offsets
                    const scale = bw / origW;

                    // Background image
                    pdf.addImage(bgImg, 'JPEG', bx, by, bw, bh);

                    // SCRS logo (top-right, inward from border)
                    const logoW = bw * 0.12;
                    pdf.addImage(logoImg, 'PNG', bx + bw * 0.76, by + bh * 0.16, logoW, logoW);

                    const teamName = (team.name || 'UNKNOWN').toUpperCase();
                    const teamCode = (team.team_code || 'DF-00').toUpperCase();

                    // === HEADER ===
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(bw * 0.095);
                    pdf.setTextColor(255, 255, 255); // White
                    pdf.text('DEVFEST 2.0 \u2013 KALKI', bx + bw * 0.12, by + bh * 0.23);

                    // Header underline 
                    pdf.setDrawColor(120, 70, 20); // Dark golden
                    pdf.setLineWidth(bw * 0.005);
                    pdf.line(bx + bw * 0.12, by + bh * 0.25, bx + bw * 0.45, by + bh * 0.25);

                    // === TEAM NAME label ===
                    pdf.setFontSize(bw * 0.045);
                    pdf.setTextColor(255, 215, 0); // Yellow
                    pdf.text('TEAM NAME :', bx + bw * 0.12, by + bh * 0.36);

                    // === TEAM NAME value ===
                    const ns = teamName.length > 22 ? bw * 0.08 : teamName.length > 16 ? bw * 0.095 : bw * 0.11;
                    pdf.setFontSize(ns);
                    pdf.setTextColor(255, 255, 255); // White
                    pdf.text(teamName, bx + bw * 0.12, by + bh * 0.44, { maxWidth: bw * 0.76 });

                    // === TEAM CODE label ===
                    pdf.setFontSize(bw * 0.045);
                    pdf.setTextColor(255, 215, 0); // Yellow
                    pdf.text('TEAM CODE :', bx + bw * 0.12, by + bh * 0.52);

                    // === TEAM CODE value ===
                    pdf.setFontSize(bw * 0.12);
                    pdf.setTextColor(255, 255, 255); // White
                    pdf.text(teamCode, bx + bw * 0.12, by + bh * 0.60);

                    // === Divider ===
                    pdf.setDrawColor(150, 90, 20); // Dark golden line
                    pdf.setLineWidth(bw * 0.005);
                    pdf.line(bx + bw * 0.12, by + bh * 0.64, bx + bw * 0.84, by + bh * 0.64);

                    // === ACCESS LEVEL ===
                    pdf.setFontSize(bw * 0.055);
                    pdf.setTextColor(255, 215, 0); // Yellow labels
                    pdf.text('ACCESS LEVEL :', bx + bw * 0.12, by + bh * 0.70);
                    pdf.setFontSize(bw * 0.07);
                    pdf.setTextColor(255, 255, 255); // White
                    pdf.text('BOUNTY HUNTER', bx + bw * 0.35, by + bh * 0.70);

                    // === MISSION ===
                    pdf.setFontSize(bw * 0.055);
                    pdf.setTextColor(255, 215, 0);
                    pdf.text('MISSION :', bx + bw * 0.12, by + bh * 0.76);
                    pdf.setFontSize(bw * 0.07);
                    pdf.setTextColor(255, 255, 255);
                    pdf.text('INNOVATION', bx + bw * 0.27, by + bh * 0.76);

                    // === SECTOR ===
                    pdf.setFontSize(bw * 0.055);
                    pdf.setTextColor(255, 215, 0);
                    pdf.text('SECTOR :', bx + bw * 0.12, by + bh * 0.82);
                    pdf.setFontSize(bw * 0.07);
                    pdf.setTextColor(255, 255, 255);
                    pdf.text('SHAMBALA', bx + bw * 0.27, by + bh * 0.82);

                    // === Footer ===
                    // (Club name removed as requested)
                });

                setProgress(Math.round(((page + 1) / totalPages) * 100));
                await new Promise(r => setTimeout(r, 10));
            }

            pdf.save('DEVFEST2_Team_Badges.pdf');
        } catch (err) {
            console.error('PDF failed:', err);
            alert('Failed: ' + err.message);
        }
        setGenerating(false);
    };

    const S = { gold: '#ff8c00', dim: 'rgba(255,255,255,0.5)', border: 'rgba(255,140,0,0.2)' };

    return (
        <div style={{ maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1rem', color: S.gold, letterSpacing: '0.1em', margin: 0, textShadow: '0 0 8px rgba(255,140,0,0.3)' }}>
                    🎴 TEAM BADGES
                </h2>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <select
                        value={layout}
                        onChange={(e) => setLayout(e.target.value)}
                        disabled={generating || loading || !teams.length}
                        style={{
                            padding: '8px 12px',
                            background: 'rgba(5,5,12,0.8)',
                            color: '#0ff',
                            border: `1px solid ${S.border}`,
                            borderRadius: '6px',
                            fontFamily: "'Orbitron', sans-serif",
                            fontSize: '0.8rem',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="6">6 Badges per Page</option>
                        <option value="4">4 Badges per Page</option>
                    </select>

                    <button onClick={generatePDF} disabled={generating || loading || !teams.length} style={{
                        padding: '10px 24px', borderRadius: '6px', cursor: generating ? 'wait' : 'pointer',
                        background: generating ? 'rgba(255,140,0,0.05)' : 'rgba(255,140,0,0.15)',
                        border: `1px solid ${generating ? 'rgba(255,140,0,0.2)' : 'rgba(255,140,0,0.5)'}`,
                        color: S.gold, fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.1em',
                        opacity: generating || loading ? 0.6 : 1,
                    }}>
                        {generating ? `⏳ GENERATING... ${progress}%` : '📥 DOWNLOAD PDF'}
                    </button>
                </div>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: '40px', color: S.dim }}>Loading teams...</div>}

            {!loading && (
                <>
                    <div style={{ background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.15)', borderRadius: '8px', padding: '12px 18px', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', color: S.dim }}><strong style={{ color: '#0ff' }}>Teams:</strong> {teams.length}</span>
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', color: S.dim }}><strong style={{ color: '#0ff' }}>Pages:</strong> {Math.ceil(teams.length / (layout === '4' ? 4 : 6))}</span>
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', color: S.dim }}><strong style={{ color: '#0ff' }}>Layout:</strong> {layout === '4' ? '4 per A4 (2×2)' : '6 per A4 (2×3)'}</span>
                    </div>

                    {generating && (
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', overflow: 'hidden', height: '8px', border: `1px solid ${S.border}` }}>
                                <div style={{ width: `${progress}%`, height: '100%', transition: 'width 0.3s', background: 'linear-gradient(90deg, #ff8c00, #ffd700)' }} />
                            </div>
                        </div>
                    )}

                    <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', color: S.gold, letterSpacing: '0.1em', marginBottom: '15px' }}>
                        PREVIEW
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '25px' }}>
                        {teams.slice(0, 4).map(team => (
                            <div key={team.id} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '97 / 92' }}>
                                <img src="/badge_bg.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                                {/* SCRS Logo - dropped down slightly from 12% to 19% */}
                                <img src="/images/scrs-logo.png" alt="SCRS" style={{ position: 'absolute', top: '19%', right: '12%', width: '12%', height: 'auto', borderRadius: '50%' }} />
                                {/* Text overlay */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, fontFamily: "'Orbitron', 'Rajdhani', sans-serif" }}>
                                    <div style={{ textAlign: 'left', paddingTop: '20%', paddingLeft: '11%' }}>
                                        <div style={{ fontSize: 'clamp(11px, 2.5vw, 16px)', fontWeight: 900, color: '#fff', letterSpacing: '2px', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                                            DEVFEST 2.0 – KALKI
                                        </div>
                                    </div>
                                    <div style={{ padding: '8% 16% 0 12%', textAlign: 'left' }}>
                                        <div style={{ fontSize: '10px', color: '#ffd700', letterSpacing: '1.5px', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>TEAM NAME :</div>
                                        <div style={{ fontSize: 'clamp(14px, 3.0vw, 24px)', fontWeight: 900, color: '#fff', letterSpacing: '2px', marginBottom: '2%', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                                            {(team.name || '').toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#ffd700', letterSpacing: '1.5px', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>TEAM CODE :</div>
                                        <div style={{ fontSize: 'clamp(13px, 2.6vw, 22px)', fontWeight: 900, color: '#fff', letterSpacing: '3px', marginBottom: '3%', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                                            {(team.team_code || '').toUpperCase()}
                                        </div>
                                        <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, rgba(150,90,20,0.8), rgba(100,60,10,0.5), transparent)', marginBottom: '4%' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <div><span style={{ fontSize: 'clamp(10px, 1.8vw, 14px)', color: '#ffd700', letterSpacing: '1px', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>ACCESS LEVEL : </span><span style={{ fontSize: 'clamp(11px, 2.0vw, 16px)', fontWeight: 900, color: '#fff', letterSpacing: '1.5px', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>BOUNTY HUNTER</span></div>
                                            <div><span style={{ fontSize: 'clamp(10px, 1.8vw, 14px)', color: '#ffd700', letterSpacing: '1px', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>MISSION : </span><span style={{ fontSize: 'clamp(11px, 2.0vw, 16px)', fontWeight: 900, color: '#fff', letterSpacing: '1.5px', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>INNOVATION</span></div>
                                            <div><span style={{ fontSize: 'clamp(10px, 1.8vw, 14px)', color: '#ffd700', letterSpacing: '1px', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>SECTOR : </span><span style={{ fontSize: 'clamp(11px, 2.0vw, 16px)', fontWeight: 900, color: '#fff', letterSpacing: '1.5px', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>SHAMBALA</span></div>
                                        </div>
                                    </div>
                                    {/* Footer (Club name removed as requested) */}
                                </div>
                            </div>
                        ))}
                    </div>

                    {teams.length > 4 && (
                        <div style={{ textAlign: 'center', padding: '8px', color: S.dim, fontSize: '0.8rem', fontFamily: "'Rajdhani', sans-serif" }}>
                            + {teams.length - 4} more badges in PDF
                        </div>
                    )}

                    <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', color: S.gold, letterSpacing: '0.1em', margin: '15px 0 8px' }}>
                        ALL TEAMS ({teams.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px' }}>
                        {teams.map((t, i) => (
                            <div key={t.id} style={{ background: 'rgba(0,10,20,0.4)', border: '1px solid rgba(255,140,0,0.1)', borderRadius: '4px', padding: '5px 10px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: "'Rajdhani', sans-serif", color: '#fff', fontSize: '0.8rem' }}>{i + 1}. {t.name}</span>
                                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.55rem', color: S.gold }}>{t.team_code}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
