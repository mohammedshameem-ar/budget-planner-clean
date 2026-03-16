import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useBudget } from '../context/BudgetContext';
import { Menu, X, Plus } from 'lucide-react';
import Logo from '../components/Logo';

const MainLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();
    const { reminders, getSummary, db } = useBudget();

    // --- SIDEBAR TOGGLE ---
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 1024) setSidebarOpen(true);
            else setSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="layout-wrapper">
            {/* Ambient Background Blobs */}
            <div className="ambient-blob" style={{ top: '-10%', left: '-10%', background: 'var(--primary)' }}></div>
            <div className="ambient-blob" style={{ bottom: '-10%', right: '-5%', background: 'var(--secondary)' }}></div>
            <div className="ambient-blob" style={{ top: '40%', right: '15%', background: 'var(--accent)', opacity: '0.08' }}></div>

            {/* Mobile Header */}
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Logo size={28} iconOnly={true} />
                    <span className="text-gradient" style={{ fontWeight: '800', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>BudgetWise</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-transaction-modal'))}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem', borderRadius: '50%' }}
                    >
                        <Plus size={20} />
                    </button>
                    <button onClick={toggleSidebar} style={{ color: 'var(--text-main)', padding: '0.4rem' }}>
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            <div className="layout-main-content">
                {/* Mobile Overlay */}
                {sidebarOpen && <div className="mobile-overlay" onClick={closeSidebar}></div>}

                <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

                <main className="main-area">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
