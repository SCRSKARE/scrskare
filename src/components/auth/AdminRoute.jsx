import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminRoute({ children }) {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100vh', width: '100vw', background: '#02050a',
                position: 'fixed', inset: 0, zIndex: 9999,
            }}>
                <div style={{ position: 'relative', width: '60px', height: '60px', marginBottom: '20px' }}>
                    <div style={{
                        position: 'absolute', inset: 0, border: '3px solid transparent',
                        borderTopColor: '#ff8c00', borderRadius: '50%',
                        animation: 'admSpin 1s linear infinite',
                    }} />
                    <div style={{
                        position: 'absolute', inset: '8px', border: '3px solid transparent',
                        borderTopColor: 'rgba(255,140,0,0.4)', borderRadius: '50%',
                        animation: 'admSpin 1.5s linear infinite reverse',
                    }} />
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        width: '6px', height: '6px', borderRadius: '50%', background: '#ff8c00',
                        boxShadow: '0 0 12px rgba(255,140,0,0.6)',
                    }} />
                </div>
                <div style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem',
                    color: '#ff8c00', letterSpacing: '0.25em',
                    textShadow: '0 0 8px rgba(255,140,0,0.3)',
                }}>
                    VERIFYING ACCESS...
                </div>
                <style>{`@keyframes admSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (profile?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
