import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebaseClient';
import { doc, onSnapshot } from 'firebase/firestore';
import { Howl } from 'howler';

export default function GlobalAudioPlayer() {
    const [audioConfig, setAudioConfig] = useState({ url: '', is_enabled: false });
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState(false);
    const howlRef = useRef(null);
    const autoplayAttempted = useRef(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'configs', 'audio_settings'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setAudioConfig({
                    url: data.audio_url || '',
                    is_enabled: data.is_enabled === true
                });
            } else {
                setAudioConfig({ url: '', is_enabled: false });
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!audioConfig.is_enabled || !audioConfig.url) {
            if (howlRef.current) {
                howlRef.current.unload();
                howlRef.current = null;
            }
            return;
        }

        if (!howlRef.current || howlRef.current._src !== audioConfig.url) {
            if (howlRef.current) {
                howlRef.current.unload();
            }

            let processedUrl = audioConfig.url;
            if (processedUrl.includes('drive.google.com/file/d/')) {
                const idMatch = processedUrl.match(/\/d\/(.*?)\//);
                if (idMatch && idMatch[1]) {
                    processedUrl = `https://docs.google.com/uc?export=download&id=${idMatch[1]}`;
                }
            } else if (processedUrl.includes('drive.google.com/uc')) {
                processedUrl = processedUrl.replace('drive.google.com', 'docs.google.com');
            }

            howlRef.current = new Howl({
                src: [processedUrl],
                html5: true,
                loop: true,
                volume: 1.0,
                format: ['mp3', 'mpeg', 'wav', 'm4a'],
                onloaderror: (id, err) => {
                    console.error("Howler Load Error:", err);
                    setError(true);
                },
                onplayerror: (id, err) => {
                    console.error("Howler Play Error:", err);
                    howlRef.current.once('unlock', () => {
                        howlRef.current.play();
                    });
                },
                onplay: () => {
                    setError(false);
                }
            });

            // Autoplay immediately
            howlRef.current.play();
            autoplayAttempted.current = true;
        }

        return () => { };
    }, [audioConfig.url, audioConfig.is_enabled]);

    // Auto-start on first user interaction if autoplay was blocked
    useEffect(() => {
        const startOnInteraction = () => {
            if (howlRef.current && !howlRef.current.playing() && audioConfig.is_enabled && audioConfig.url) {
                howlRef.current.play();
            }
            document.removeEventListener('click', startOnInteraction);
            document.removeEventListener('touchstart', startOnInteraction);
            document.removeEventListener('keydown', startOnInteraction);
        };

        document.addEventListener('click', startOnInteraction);
        document.addEventListener('touchstart', startOnInteraction);
        document.addEventListener('keydown', startOnInteraction);

        return () => {
            document.removeEventListener('click', startOnInteraction);
            document.removeEventListener('touchstart', startOnInteraction);
            document.removeEventListener('keydown', startOnInteraction);
        };
    }, [audioConfig]);

    const toggleMute = () => {
        if (!howlRef.current || !audioConfig.is_enabled || !audioConfig.url) return;

        if (isMuted) {
            howlRef.current.mute(false);
            if (!howlRef.current.playing()) {
                howlRef.current.play();
            }
            setIsMuted(false);
        } else {
            howlRef.current.mute(true);
            setIsMuted(true);
        }
    };

    if (!audioConfig.is_enabled || !audioConfig.url) {
        return null;
    }

    return (
        <div style={{ position: 'fixed', bottom: '25px', right: '25px', zIndex: 9999, pointerEvents: 'none' }}>
            <button
                onClick={toggleMute}
                style={{
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: isMuted
                        ? 'rgba(15, 15, 15, 0.85)'
                        : 'linear-gradient(135deg, rgba(255,140,0,0.25) 0%, rgba(255,80,0,0.15) 100%)',
                    border: `1.5px solid ${isMuted ? 'rgba(255,255,255,0.15)' : 'rgba(255,140,0,0.5)'}`,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    color: isMuted ? 'rgba(255,255,255,0.4)' : '#ff8c00',
                    cursor: 'pointer',
                    boxShadow: isMuted
                        ? '0 4px 12px rgba(0,0,0,0.4)'
                        : '0 0 20px rgba(255,140,0,0.2), 0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    outline: 'none',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = isMuted
                        ? '0 4px 16px rgba(255,255,255,0.1)'
                        : '0 0 28px rgba(255,140,0,0.35), 0 4px 16px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = isMuted
                        ? '0 4px 12px rgba(0,0,0,0.4)'
                        : '0 0 20px rgba(255,140,0,0.2), 0 4px 12px rgba(0,0,0,0.3)';
                }}
                title={isMuted ? "Unmute Music" : "Mute Music"}
            >
                {/* Animated ring when unmuted */}
                {!isMuted && (
                    <div style={{
                        position: 'absolute',
                        inset: '-3px',
                        borderRadius: '50%',
                        border: '1.5px solid rgba(255,140,0,0.3)',
                        animation: 'ring-pulse 2s infinite ease-in-out',
                    }} />
                )}

                {/* Sound wave bars when unmuted */}
                {!isMuted && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        opacity: 0.25,
                    }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{
                                width: '2px',
                                background: '#ff8c00',
                                borderRadius: '2px',
                                animation: `bar-bounce ${0.4 + i * 0.15}s infinite ease-in-out alternate`,
                            }} />
                        ))}
                    </div>
                )}

                {/* Icons */}
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative' }}>
                    {error ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                            <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                        </svg>
                    ) : isMuted ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                            <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-3.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                    )}
                </span>
            </button>

            <style>{`
                @keyframes ring-pulse {
                    0% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.15); opacity: 0; }
                    100% { transform: scale(1); opacity: 0.6; }
                }
                @keyframes bar-bounce {
                    0% { height: 6px; }
                    100% { height: 18px; }
                }
            `}</style>
        </div>
    );
}
