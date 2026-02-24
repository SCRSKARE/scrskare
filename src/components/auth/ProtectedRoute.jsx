import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100vh', width: '100vw', background: '#02050a',
                position: 'fixed', inset: 0, zIndex: 9999,
            }}>
                {/* Spinning ring */}
                <div style={{ position: 'relative', width: '60px', height: '60px', marginBottom: '20px' }}>
                    <div style={{
                        position: 'absolute', inset: 0, border: '3px solid transparent',
                        borderTopColor: '#0ff', borderRadius: '50%',
                        animation: 'protSpin 1s linear infinite',
                    }} />
                    <div style={{
                        position: 'absolute', inset: '8px', border: '3px solid transparent',
                        borderTopColor: 'rgba(212,168,83,0.8)', borderRadius: '50%',
                        animation: 'protSpin 1.5s linear infinite reverse',
                    }} />
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        width: '6px', height: '6px', borderRadius: '50%', background: '#0ff',
                        boxShadow: '0 0 12px rgba(0,255,255,0.6)',
                    }} />
                </div>
                <div style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem',
                    color: '#0ff', letterSpacing: '0.25em',
                    textShadow: '0 0 8px rgba(0,255,255,0.3)',
                }}>
                    AUTHENTICATING...
                </div>
                <style>{`@keyframes protSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
