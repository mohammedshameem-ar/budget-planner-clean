import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, PieChart, Settings, LogOut, X, Target, Sun, Moon, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useEffect } from 'react';
import Logo from './Logo';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
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
                <div style={{ marginBottom: '1rem', padding: '0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {user?.name?.charAt(0) || 'U'}
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
