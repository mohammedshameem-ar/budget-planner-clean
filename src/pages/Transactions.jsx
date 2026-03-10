import { useState, useEffect, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { ArrowUpRight, ArrowDownRight, Trash2, Calendar, MoreHorizontal } from 'lucide-react';
import { categoryIcons } from '../components/TransactionList';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Transactions = () => {
    const { transactions, deleteTransaction } = useBudget();
    const [filter, setFilter] = useState('all');
    const today = new Date().toISOString().split('T')[0];
    const [filterDate, setFilterDate] = useState(today);

    // Reset date to today on mount
    useEffect(() => {
        setFilterDate(today);
    }, []);

    const filteredTransactions = transactions.filter(t => {
        const matchesDate = !filterDate || t.date === filterDate;
        if (filter === 'online_services') {
            return t.logo && matchesDate;
        }
        const matchesCategory = filter === 'all' || t.category === filter;
        return matchesCategory && matchesDate;
    });

    const barChartData = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'expense');

        // Define all possible categories to ensure bars align
        const allCategories = ['food', 'transport', 'entertainment', 'utilities', 'health', 'shopping', 'housing', 'investment', 'others'];

        const todayStats = {};
        const monthStats = {};

        const selectedDate = new Date(filterDate || today);
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

        expenses.forEach(t => {
            const tDate = new Date(t.date);
            const cat = t.category?.toLowerCase() || 'others';

            // Today's stats
            if (t.date === filterDate) {
                todayStats[cat] = (todayStats[cat] || 0) + parseFloat(t.amount);
            }

            // Month's stats
            if (tDate >= startOfMonth && tDate <= endOfMonth) {
                monthStats[cat] = (monthStats[cat] || 0) + parseFloat(t.amount);
            }
        });

        const labels = allCategories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1));
        const todayData = allCategories.map(cat => todayStats[cat] || 0);
        const monthData = allCategories.map(cat => monthStats[cat] || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Today',
                    data: todayData,
                    backgroundColor: 'rgba(56, 189, 248, 0.8)',
                    borderColor: 'rgb(56, 189, 248)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                },
                {
                    label: 'This Month',
                    data: monthData,
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgb(139, 92, 246)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                }
            ],
        };
    }, [transactions, filterDate, today]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    boxWidth: 12,
                    font: { size: 10 }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => `₹${context.raw.toLocaleString()}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { size: 10 } }
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
            },
        },
    };

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '1.5rem' }}>
            <header className="flex-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '1.35rem' }}>Transactions</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>History and filtering.</p>
                </div>
                <div className="flex-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Calendar size={18} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            style={{ width: 'auto', paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ width: 'auto', minWidth: '150px', textTransform: 'capitalize', fontSize: '0.875rem' }}
                    >
                        <option value="all">All Categories</option>
                        <option value="online_services">Online Services</option>
                        <option value="food">Food</option>
                        <option value="transport">Transport</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="utilities">Utilities</option>
                        <option value="health">Health</option>
                        <option value="shopping">Shopping</option>
                        <option value="housing">Housing</option>
                        <option value="salary">Salary</option>
                        <option value="investment">Investment</option>
                        <option value="others">Others</option>
                    </select>
                </div>
            </header>

            {/* Daily vs Monthly Comparison Bar Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', height: '260px' }}>
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem' }}>Today vs Monthly Comparison</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {filterDate ? new Date(filterDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Spending Overview'}
                    </span>
                </div>
                <div style={{ height: '160px' }}>
                    {transactions.filter(t => t.type === 'expense').length > 0 ? (
                        <Bar data={barChartData} options={chartOptions} />
                    ) : (
                        <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            No expenses to display
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Type</th>
                                <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Category</th>
                                <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Date</th>
                                <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Note</th>
                                <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Amount</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t) => {
                                    const IconComponent = categoryIcons[t.category?.toLowerCase()] || MoreHorizontal;
                                    const categoryColor = `var(--cat-${t.category?.toLowerCase()}, var(--primary))`;

                                    return (
                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div className="flex-center" style={{
                                                    justifyContent: 'flex-start', gap: '0.6rem',
                                                    color: t.type === 'income' ? 'var(--success)' : 'var(--danger)',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {t.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                    <span style={{ textTransform: 'capitalize' }}>{t.type}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.75rem' }}>
                                                    <div style={{
                                                        background: t.logo ? 'transparent' : `${categoryColor}15`,
                                                        padding: t.logo ? '0' : '0.5rem',
                                                        borderRadius: t.logo ? '50%' : '8px',
                                                        color: categoryColor,
                                                        display: 'flex',
                                                        width: '32px',
                                                        height: '32px',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        border: t.logo ? '1px solid var(--glass-border)' : 'none'
                                                    }}>
                                                        {t.logo ? (
                                                            <img src={t.logo} alt={t.category} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                                                        ) : null}
                                                        <div style={{ display: t.logo ? 'none' : 'block' }}>
                                                            <IconComponent size={16} strokeWidth={2.5} />
                                                        </div>
                                                    </div>
                                                    <span style={{ textTransform: 'capitalize', fontWeight: '500', fontSize: '0.9rem' }}>{t.category}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(t.date).toLocaleDateString()}</td>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                {t.note || '-'}
                                            </td>
                                            <td style={{ padding: '1rem', fontWeight: '700', fontSize: '0.95rem' }}>
                                                ₹{parseFloat(t.amount).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => deleteTransaction(t.id)}
                                                    className="btn-delete"
                                                    title="Delete Transaction"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Transactions;
