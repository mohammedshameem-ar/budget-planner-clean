import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { signUp, googleSignIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }
        setLoading(true);
        setError('');
        try {
            await signUp(email, password);
            navigate('/');
        } catch (err) {
            setError('Failed to create an account.');
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
            background: '#02a9f4',
            padding: '20px',
            position: 'relative',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Decorative background circles */}
            <div style={{
                position: 'absolute',
                top: '-50px',
                left: '-50px',
                width: '150px',
                height: '150px',
                background: 'rgba(255, 255, 255, 0.4)',
                borderRadius: '50%',
                zIndex: 1
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '-30px',
                right: '-30px',
                width: '200px',
                height: '200px',
                background: 'rgba(255, 255, 255, 0.4)',
                borderRadius: '50%',
                zIndex: 1
            }}></div>

            <main className="login-wrapper" style={{
                width: '100%',
                maxWidth: '1000px',
                background: 'white',
                borderRadius: '30px',
                display: 'flex',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                zIndex: 2,
                minHeight: '650px'
            }}>
                {/* Left Side: Illustration & Quote */}
                <div className="login-illustration-side" style={{
                    flex: 1,
                    position: 'relative',
                    background: "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=2070&auto=format&fit=crop')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    padding: '40px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    <h1 style={{
                        fontFamily: "'Dancing Script', cursive",
                        fontSize: '3.5rem',
                        marginBottom: '10px',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                    }}>BudgetWise</h1>
                    <p style={{
                        fontSize: '1rem',
                        maxWidth: '300px',
                        lineHeight: '1.6',
                        fontWeight: '500',
                        opacity: 0.9
                    }}>
                        "A budget is telling your money where to go instead of wondering where it went."
                    </p>

                    {/* Decorative flow for budget logic */}
                    <div style={{
                        position: 'absolute',
                        top: '15%',
                        right: '10%',
                        opacity: 0.6
                    }}>
                        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                            <path d="M10 20 Q 50 90 90 60" stroke="white" strokeWidth="2" strokeDasharray="5 5" />
                            <circle cx="90" cy="60" r="4" fill="white" />
                        </svg>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="login-form-side" style={{
                    flex: 1,
                    padding: '50px 50px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    backgroundColor: '#fff'
                }}>
                    <div style={{ marginBottom: '25px' }}>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: '800',
                            color: '#02a9f4',
                            margin: 0,
                            letterSpacing: '-0.5px'
                        }}>Join Us</h2>
                        <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '5px' }}>Register Now</p>
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            padding: '10px',
                            borderRadius: '10px',
                            marginBottom: '15px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 3 }}>
                        {/* Name Input */}
                        <div style={{ position: 'relative' }}>
                            <label style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '15px',
                                background: 'white',
                                padding: '0 5px',
                                color: '#02a9f4',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                zIndex: 1
                            }}>Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                </span>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    autoComplete="off"
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 45px',
                                        border: '1.5px solid #02a9f4',
                                        borderRadius: '10px',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        background: 'transparent'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Email Input */}
                        <div style={{ position: 'relative' }}>
                            <label style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '15px',
                                background: 'white',
                                padding: '0 5px',
                                color: '#02a9f4',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                zIndex: 1
                            }}>Email Id</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                </span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your Gmail"
                                    autoComplete="off"
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 45px',
                                        border: '1.5px solid #02a9f4',
                                        borderRadius: '10px',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        background: 'transparent'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    left: '15px',
                                    background: 'white',
                                    padding: '0 5px',
                                    color: '#02a9f4',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    zIndex: 1
                                }}>Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    autoComplete="off"
                                    style={{
                                        width: '100%',
                                        padding: '12px 15px',
                                        border: '1.5px solid #02a9f4',
                                        borderRadius: '10px',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        background: 'transparent'
                                    }}
                                />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <label style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    left: '15px',
                                    background: 'white',
                                    padding: '0 5px',
                                    color: '#02a9f4',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    zIndex: 1
                                }}>Confirm</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    autoComplete="off"
                                    style={{
                                        width: '100%',
                                        padding: '12px 15px',
                                        border: '1.5px solid #02a9f4',
                                        borderRadius: '10px',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        background: 'transparent'
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: '#02a9f4',
                                color: 'white',
                                padding: '14px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '700',
                                letterSpacing: '1px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                boxShadow: '0 4px 15px rgba(2, 169, 244, 0.3)',
                                marginTop: '10px'
                            }}
                        >
                            {loading ? 'CREATING...' : 'SIGN UP'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '5px 0' }}>
                            <div style={{ flex: 1, height: '1.5px', background: '#e2e8f0' }}></div>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>OR</span>
                            <div style={{ flex: 1, height: '1.5px', background: '#e2e8f0' }}></div>
                        </div>

                        {/* Social Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                style={{
                                    background: '#f1f5f9',
                                    padding: '12px 30px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                    width: '100%',
                                    justifyContent: 'center'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#e2e8f0';
                                    e.currentTarget.style.borderColor = '#02a9f4';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ height: '22px' }} alt="google" />
                                <span style={{ fontWeight: '600', color: '#475569' }}>Sign up with Google</span>
                            </button>
                        </div>

                        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: '10px' }}>
                            Have account? <Link to="/login" style={{ color: '#1e293b', fontWeight: '700', textDecoration: 'none' }}>Sign In</Link>
                        </p>
                    </form>

                    {/* Skyline Illustration Footer */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1,
                        opacity: 0.1,
                        pointerEvents: 'none'
                    }}>
                        <svg viewBox="0 0 1440 320" style={{ width: '100%', height: 'auto' }}>
                            <path fill="#02a9f4" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,256C960,245,1056,203,1152,186.7C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                            <rect x="150" y="80" width="35" height="240" fill="#02a9f4" />
                            <rect x="400" y="120" width="30" height="200" fill="#02a9f4" />
                            <rect x="750" y="50" width="45" height="270" fill="#02a9f4" />
                            <rect x="1000" y="90" width="35" height="230" fill="#02a9f4" />
                        </svg>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Signup;
