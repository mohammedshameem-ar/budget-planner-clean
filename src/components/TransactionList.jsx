import {
    Utensils,
    Car,
    Zap,
    Film,
    HeartPulse,
    ShoppingBag,
    Home,
    Banknote,
    TrendingUp,
    Wallet,
    MoreHorizontal
} from 'lucide-react';
import { ONLINE_SERVICES } from './OnlineServicesForm';

export const categoryIcons = {
    food: Utensils,
    transport: Car,
    utilities: Zap,
    entertainment: Film,
    health: HeartPulse,
    shopping: ShoppingBag,
    housing: Home,
    salary: Banknote,
    investment: TrendingUp,
    savings: Wallet,
    others: MoreHorizontal
};

const TransactionList = ({ transactions, limit = 5, title = 'Recent Transactions' }) => {
    const displayTransactions = transactions.slice(0, limit);

    return (
        <div className="glass-panel" style={{ flex: 1 }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h3>{title}</h3>
                <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>View All</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {displayTransactions.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No transactions yet.</p>
                ) : (
                    displayTransactions.map((t) => {
                        const IconComponent = categoryIcons[t.category?.toLowerCase()] || MoreHorizontal;
                        const categoryColor = `var(--cat-${t.category?.toLowerCase()}, var(--primary))`;

                        let displayLogo = t.logo;
                        if (displayLogo) {
                            const matchedService = ONLINE_SERVICES.find(s => 
                                (typeof t.logo === 'string' && t.logo.toLowerCase().includes(s.id.toLowerCase())) ||
                                (t.note && typeof t.note === 'string' && t.note.toLowerCase().includes(s.name.toLowerCase()))
                            );
                            if (matchedService) displayLogo = matchedService.logo;
                        }

                        return (
                            <div key={t.id} className="flex-between" style={{
                                paddingBottom: '1rem',
                                borderBottom: '1px solid var(--glass-border)'
                            }}>
                                <div className="flex-center" style={{ gap: '1rem' }}>
                                    <div style={{
                                        background: displayLogo ? 'transparent' : `${categoryColor}15`,
                                        padding: displayLogo ? '0' : '0.6rem',
                                        borderRadius: displayLogo ? '50%' : '12px',
                                        color: categoryColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '40px',
                                        height: '40px',
                                        overflow: 'hidden',
                                        border: displayLogo ? '1px solid var(--glass-border)' : 'none'
                                    }}>
                                        {displayLogo ? (
                                            <img src={displayLogo} alt={t.note} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                        ) : null}
                                        <div style={{ display: displayLogo ? 'none' : 'block' }}>
                                            <IconComponent size={20} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '600', textTransform: 'capitalize', fontSize: '1rem' }}>{t.category || 'Uncategorized'}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(t.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{
                                        fontWeight: '700',
                                        fontSize: '1rem',
                                        color: t.type === 'income' ? 'var(--success)' : 'var(--text-main)'
                                    }}>
                                        {t.type === 'income' ? '+' : '-'}₹{parseFloat(t.amount).toLocaleString()}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{t.type}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};


export default TransactionList;
