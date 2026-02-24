import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ForgotPassword() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await resetPassword(email);
            setSent(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, width: '100vw', height: '100vh',
            background: '#02050a', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'url("/Kalki-2898Ad.jpg")',
                backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,20,40,0.6) 0%, transparent 20%)',
                pointerEvents: 'none',
            }} />

            <div className="sci-fi-panel" style={{
                width: '90%', maxWidth: '400px', padding: '35px 40px 40px',
                zIndex: 10,
            }}>
                <h1 style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '1.4rem', fontWeight: 700,
                    color: '#e0e0e0', textAlign: 'center',
                    letterSpacing: '0.05em', marginBottom: '10px',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
                }}>
                    <span style={{ color: '#ffcc80' }}>RESET</span>{' '}
                    <span style={{ color: '#00ffff' }}>ACCESS</span>
                </h1>

                <p style={{
                    fontFamily: "'Rajdhani', sans-serif", fontSize: '0.95rem',
                    color: 'rgba(255,255,255,0.7)', textAlign: 'center',
                    letterSpacing: '0.1em', marginBottom: '30px',
                }}>
                    Enter your email to receive a reset link
                </p>

                {sent ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            color: '#0ff', fontFamily: "'Orbitron', sans-serif",
                            fontSize: '0.9rem', letterSpacing: '0.1em', marginBottom: '20px',
                        }}>
                            ✓ RESET LINK SENT
                        </div>
                        <p style={{
                            color: 'rgba(255,255,255,0.6)', fontFamily: "'Rajdhani', sans-serif",
                            fontSize: '0.95rem', marginBottom: '25px',
                        }}>
                            Check your email for the password reset link.
                        </p>
                        <Link to="/login" className="sci-fi-link" style={{ fontSize: '1rem' }}>
                            ← Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {error && (
                            <div style={{
                                background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.4)',
                                borderRadius: '6px', padding: '10px 15px',
                                color: '#ff6b6b', fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem',
                            }}>
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="sci-fi-label">EMAIL</label>
                            <div className="sci-fi-input-wrapper">
                                <div className="sci-fi-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                        <path d="M22 7l-10 7L2 7"></path>
                                    </svg>
                                </div>
                                <input
                                    type="email" className="sci-fi-input"
                                    placeholder="Enter your email..." required
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button type="submit" className="sci-fi-btn" disabled={loading}>
                            {loading ? 'SENDING...' : 'SEND RESET LINK'}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <Link to="/login" className="sci-fi-link">← Back to Login</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
