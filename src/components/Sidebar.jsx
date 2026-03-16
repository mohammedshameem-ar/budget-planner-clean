import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, PieChart, Settings, LogOut, X, Target, Sun, Moon, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBudget } from '../context/BudgetContext';
import { useEffect } from 'react';
import Logo from './Logo';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { avatar, toggleAvatarPicker } = useBudget();
    const location = useLocation();

    // Close sidebar when route changes on mobile
    useEffect(() => {
        onClose();
    }, [location.pathname]);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Wallet, label: 'Transactions', path: '/transactions' },
        { icon: PieChart, label: 'Reports', path: '/reports' },
        { icon: Target, label: 'Planning', path: '/planning' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
            <div className="flex-between" style={{ marginBottom: '2rem', padding: '0 0.5rem' }}>
                <Logo size={26} />
                <button
                    onClick={onClose}
                    className="mobile-only"
                    style={{ background: 'transparent', color: 'var(--sidebar-text)', cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} strokeWidth={2.5} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>



            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                <button
                    onClick={toggleTheme}
                    className="btn btn-outline"
                    style={{
                        width: '100%',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        borderColor: 'transparent',
                        color: 'var(--sidebar-text)',
                        background: 'rgba(255,255,255,0.05)'
                    }}
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </button>
                <div 
                    onClick={() => toggleAvatarPicker(true)}
                    style={{ marginBottom: '1rem', padding: '0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                >
                    <div style={{ 
                        width: '42px', height: '42px', borderRadius: '12px', 
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {avatar === 'default' ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {(user?.name?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()}
                            </div>
                        ) : (
                            <img 
                                src={avatar} 
                                alt="Profile" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                        )}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--sidebar-text-active)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--sidebar-text)' }}>Pro Member</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="btn"
                    style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        background: 'transparent',
                        color: '#ef4444',
                        padding: '0.5rem 0.5rem',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                    }}
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
