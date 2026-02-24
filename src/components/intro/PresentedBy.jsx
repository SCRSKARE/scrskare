import { useEffect, useState } from 'react';

export default function PresentedBy() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShow(true), 200);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '30px',
                background: 'radial-gradient(ellipse at center, #0a0e18 0%, #020408 100%)',
                overflow: 'hidden',
            }}
        >
            {/* Warm ambient glow — Kalki movie feel */}
            <div
                style={{
                    position: 'absolute',
                    width: '50%',
                    height: '50%',
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(240,165,0,0.05) 0%, transparent 60%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Grid lines background */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
            linear-gradient(rgba(0,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.025) 1px, transparent 1px)
          `,
                    backgroundSize: '60px 60px',
                    pointerEvents: 'none',
                }}
            />

            {/* "Presented By" text */}
            <p
                className="presented-text"
                style={{
                    fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    opacity: show ? 1 : 0,
                    transition: 'opacity 0.8s ease',
                    zIndex: 5,
                }}
            >
                Presented By
            </p>

            {/* SCRS Logo with hologram reveal */}
            <div
                className={show ? 'holo-logo' : ''}
                style={{
                    width: 'clamp(130px, 25vw, 220px)',
                    height: 'clamp(130px, 25vw, 220px)',
                    opacity: show ? 1 : 0,
                    position: 'relative',
                    zIndex: 5,
                }}
            >
                <img
                    src="/images/scrs-logo.png"
                    alt="SCRS – Soft Computing Research Society"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '50%',
                    }}
                />
                {/* Holographic ring */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '-12px',
                        borderRadius: '50%',
                        border: '1px solid rgba(0,255,255,0.15)',
                        boxShadow: show
                            ? '0 0 30px rgba(0,255,255,0.1), 0 0 60px rgba(0,255,255,0.05)'
                            : 'none',
                        animation: show ? 'holoGlow 2.5s ease-in-out infinite' : 'none',
                    }}
                />
                {/* Second ring */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '-24px',
                        borderRadius: '50%',
                        border: '1px solid rgba(240,165,0,0.08)',
                        animation: show ? 'holoGlow 3s ease-in-out infinite 0.5s' : 'none',
                    }}
                />
            </div>

            {/* Organization name */}
            <p
                style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 'clamp(0.65rem, 1.2vw, 0.9rem)',
                    color: 'rgba(0,255,255,0.5)',
                    letterSpacing: '0.15em',
                    textAlign: 'center',
                    opacity: show ? 1 : 0,
                    transition: 'opacity 1s ease 0.6s',
                    zIndex: 5,
                }}
            >
                SOFT COMPUTING RESEARCH SOCIETY
            </p>

            {/* Ambient particles */}
            {Array.from({ length: 15 }).map((_, i) => (
                <div
                    key={i}
                    className="particle"
                    style={{
                        left: `${Math.random() * 100}%`,
                        bottom: '-5px',
                        background: Math.random() > 0.5
                            ? 'rgba(240, 165, 0, 0.4)'
                            : 'rgba(0, 255, 255, 0.4)',
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${3 + Math.random() * 4}s`,
                    }}
                />
            ))}
        </div>
    );
}
