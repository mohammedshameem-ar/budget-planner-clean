import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { signIn, googleSignIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signIn(email, password);
            navigate('/');
        } catch (err) {
            setError('Failed to log in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await googleSignIn();
            navigate('/');
        } catch (err) {
            setError('Google sign-in failed.');
        }
    };

    return (
        <div className="auth-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #02a9f4 0%, #01579b 100%)',
            padding: '20px',
            position: 'relative',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Decorative background circles */}
            <div style={{
                position: 'absolute',
                top: '-5%',
                left: '-5%',
                width: 'clamp(150px, 30vw, 300px)',
                height: 'clamp(150px, 30vw, 300px)',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                zIndex: 1,
                backdropFilter: 'blur(5px)',
                animation: 'float 6s ease-in-out infinite'
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                right: '-10%',
                width: 'clamp(200px, 40vw, 400px)',
                height: 'clamp(200px, 40vw, 400px)',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                zIndex: 1,
                backdropFilter: 'blur(5px)',
                animation: 'float 8s ease-in-out infinite reverse'
            }}></div>

            <main className="login-wrapper" style={{
                width: '100%',
                maxWidth: '450px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.2)',
                overflow: 'hidden',
                zIndex: 2,
                position: 'relative'
            }}>
                <div className="login-form-side" style={{
                    padding: 'clamp(30px, 8vw, 50px) clamp(20px, 6vw, 40px)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    <div style={{ marginBottom: 'clamp(25px, 6vw, 35px)', textAlign: 'center' }}>
                        <h1 style={{
                            fontFamily: "'Dancing Script', cursive",
                            fontSize: '2.5rem',
                            marginBottom: '10px',
                            color: '#02a9f4',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                        }}>BudgetWise</h1>
                        <h2 style={{
                            fontSize: '1.8rem',
                            fontWeight: '800',
                            color: '#1e293b',
                            margin: '0 0 5px 0',
                            letterSpacing: '-0.5px'
                        }}>Welcome Back</h2>
                        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>Login to continue managing your finances</p>
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            marginBottom: '25px',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            border: '1px solid #fca5a5'
                        }}>
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px', zIndex: 3 }}>
                        {/* Email Input */}
                        <div style={{ position: 'relative' }}>
                            <label style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '15px',
                                background: 'linear-gradient(180deg, transparent 50%, white 50%)',
                                padding: '0 5px',
                                color: '#02a9f4',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                zIndex: 1
                            }}>Email Id</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    autoComplete="email"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '15px 15px 15px 45px',
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        background: 'transparent',
                                        color: '#334155'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#02a9f4';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(2, 169, 244, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e2e8f0';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div style={{ position: 'relative' }}>
                            <label style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '15px',
                                background: 'linear-gradient(180deg, transparent 50%, white 50%)',
                                padding: '0 5px',
                                color: '#02a9f4',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                zIndex: 1
                            }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '15px 15px 15px 45px',
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        background: 'transparent',
                                        color: '#334155'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#02a9f4';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(2, 169, 244, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e2e8f0';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-15px' }}>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px 8px',
                                    fontSize: '0.8rem',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    transition: 'color 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.color = '#02a9f4'}
                                onMouseOut={(e) => e.target.style.color = '#64748b'}
                            >
                                {showPassword ? 'Hide Password' : 'Show Password'}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: 'linear-gradient(to right, #02a9f4, #0288d1)',
                                color: 'white',
                                padding: '16px',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: '700',
                                letterSpacing: '0.5px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '1rem',
                                boxShadow: '0 10px 15px -3px rgba(2, 169, 244, 0.3)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseOver={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                            onMouseOut={(e) => { if(!loading) e.currentTarget.style.transform = 'none' }}
                            onMouseDown={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                            {loading ? 'LOGGING IN...' : 'LOGIN'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>OR</span>
                            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                        </div>

                        {/* Social Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                style={{
                                    background: 'white',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    width: '100%',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ height: '22px' }} alt="google" />
                                <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.95rem' }}>Continue with Google</span>
                            </button>
                        </div>

                        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b', marginTop: '10px' }}>
                            Don't have an account? <Link to="/signup" style={{ color: '#02a9f4', fontWeight: '700', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#0288d1'} onMouseOut={(e) => e.target.style.color = '#02a9f4'}>Register Now</Link>
                        </p>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Login;
