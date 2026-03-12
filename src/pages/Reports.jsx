import { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { Download, FileText, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ActivityCalendar from '../components/ActivityCalendar';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const Reports = () => {
    const { transactions, budgetLimit, income, savings, db, incomeEnabled, budgetEnabled } = useBudget();
    const { user } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [historicStats, setHistoricStats] = useState(null);
    const [archivesForMonth, setArchivesForMonth] = useState([]);
    const [selectedArchiveId, setSelectedArchiveId] = useState('current');

    // Fetch historic stats & archives when selected month changes
    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;

            const now = new Date();
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            if (selectedMonth === currentMonthStr) {
                setHistoricStats(null); // Use current context data
                return;
            }

            try {
                const statsRef = doc(db, 'users', user.id, 'transactionDetails', 'monthlyStats', selectedMonth);
                const snap = await getDoc(statsRef);
                if (snap.exists()) {
                    setHistoricStats(snap.data());
                } else {
                    setHistoricStats(null);
                }

                // Fetch archives for this month
                const archivesRef = collection(db, 'users', user.id, 'transactionDetails', 'archives');
                const q = query(archivesRef, where('month', '==', selectedMonth));
                const archiveSnap = await getDocs(q);

                const loadedArchives = archiveSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort by archivedAt descending
                loadedArchives.sort((a, b) => b.archivedAt.toMillis() - a.archivedAt.toMillis());

                setArchivesForMonth(loadedArchives);
                setSelectedArchiveId('current'); // Reset selection when month changes

            } catch (err) {
                console.error('Error fetching historic stats or archives:', err);
                setHistoricStats(null);
                setArchivesForMonth([]);
            }
        };

        fetchStats();
    }, [selectedMonth, user, db]);

    // Active stats to use (either from context or historic snapshot)
    const baseIncome = historicStats ? historicStats.income : income;
    const baseBudgetLimit = historicStats ? historicStats.budgetLimit : budgetLimit;
    const baseIncomeEnabled = historicStats ? (historicStats.incomeEnabled !== false) : incomeEnabled;

    // Determine the working dataset (either the 'current/final' one for that month, or an archived snapshot)
    const selectedArchive = archivesForMonth.find(a => a.id === selectedArchiveId);

    const activeIncome = selectedArchive ? selectedArchive.income : baseIncome;
    const activeBudgetLimit = selectedArchive ? selectedArchive.budgetLimit : baseBudgetLimit;
    const activeTransactions = selectedArchive ? (selectedArchive.transactions || []) : transactions;
    const activeIncomeEnabled = selectedArchive ? (selectedArchive.incomeEnabled !== false) : baseIncomeEnabled;

    // Also track budgetEnabled - historical months store this; current month uses context
    const baseBudgetEnabled = historicStats ? (historicStats.budgetEnabled !== false) : budgetEnabled;
    const activeBudgetEnabled = selectedArchive ? (selectedArchive.budgetEnabled !== false) : baseBudgetEnabled;

    const generatePDF = () => {
        try {
            const doc = new jsPDF();
            const monthTransactions = activeTransactions.filter(t => t.date.startsWith(selectedMonth))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            // Helper to clean note strings of emojis/special characters that PDF can't render
            const cleanText = (str) => {
                if (!str) return '-';
                return str.replace(/[^\x00-\x7F]/g, "").trim() || '-';
            };

            // Month-specific calculations
            const totalExp = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

            const monthIncome = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

            // Fallback to global setting if no income transactions for the month
            const displayIncome = monthIncome > 0 ? monthIncome : (activeIncome || 0);

            let budgetLimitDisplay = `INR ${(activeBudgetLimit || 0).toLocaleString()}`;
            let budgetRemainingDisplay = `INR ${(activeBudgetLimit - totalExp || 0).toLocaleString()}`;

            // Check if budget was enabled for the period
            // Note: baseBudgetEnabled and activeBudgetEnabled are already defined outside this function
            // Re-defining them here would shadow the outer variables.
            // The existing logic correctly uses the already defined activeBudgetEnabled.
            if (!activeBudgetEnabled) {
                budgetLimitDisplay = 'Not Tracked';
                budgetRemainingDisplay = 'Not Tracked';
            }

            let netSavingsDisplay = 'Not Tracked';
            if (activeIncomeEnabled) {
                netSavingsDisplay = `INR ${(displayIncome - totalExp || 0).toLocaleString()}`;
            }

            // Header - Professional Look
            doc.setFillColor(63, 81, 181); // Indigo Primary
            doc.rect(0, 0, 210, 40, 'F');

            doc.setFontSize(24);
            doc.setTextColor(255, 255, 255);
            doc.text('BUDGET REPORT', 14, 25);

            doc.setFontSize(10);
            doc.setTextColor(230, 230, 230);
            const monthLabel = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
            const titleLabel = selectedArchive
                ? `Period: ${monthLabel} (Archived Set)`
                : `Period: ${monthLabel}`;
            doc.text(titleLabel, 14, 33);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 160, 33);

            // User Info Section
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Account Summary', 14, 50);
            doc.setFont('helvetica', 'normal');
            doc.text(`User: ${user?.name || user?.email || 'Valued User'}`, 14, 56);

            // Summary Section - Key Metrics as professional cards/grid
            const incomeDisplayStr = activeIncomeEnabled ? `INR ${(displayIncome || 0).toLocaleString()}` : 'Not Tracked';
            const budgetLimitStr = activeBudgetEnabled ? `INR ${(activeBudgetLimit || 0).toLocaleString()}` : 'Not Tracked';
            const budgetRemainingStr = activeBudgetEnabled ? `INR ${(activeBudgetLimit - totalExp || 0).toLocaleString()}` : 'Not Tracked';
            const summaryData = [
                ['Total Monthly Income', incomeDisplayStr],
                ['Total Monthly Expenses', `INR ${(totalExp || 0).toLocaleString()}`],
                ['Monthly Budget Limit', budgetLimitDisplay],
                ['Remaining Budget', budgetRemainingDisplay],
                ['Net Month Savings', netSavingsDisplay],
                ['Total Balance Savings', `INR ${(savings || 0).toLocaleString()}`]
            ];

            autoTable(doc, {
                startY: 65,
                head: [['Financial Metric', 'Amount']],
                body: summaryData,
                theme: 'grid',
                headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255], fontStyle: 'bold' },
                bodyStyles: { textColor: [50, 50, 50] },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { left: 14, right: 14 }
            });

            // Transactions Table
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(63, 81, 181);
            doc.text('Detailed Transaction Log', 14, (doc.lastAutoTable?.finalY || 130) + 15);

            const tableData = monthTransactions.map(t => {
                try {
                    const dateObj = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.date);
                    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const category = t.category || 'Others';
                    return [
                        new Date(t.date).toLocaleDateString(),
                        timeStr,
                        category.charAt(0).toUpperCase() + category.slice(1),
                        cleanText(t.note),
                        (t.type || 'expense').toUpperCase(),
                        `INR ${parseFloat(t.amount || 0).toLocaleString()}`
                    ];
                } catch (err) {
                    console.error('Error mapping transaction:', t, err);
                    return [new Date(t.date || Date.now()).toLocaleDateString(), '-', 'Error', '-', '-', '0.00'];
                }
            });

            autoTable(doc, {
                startY: (doc.lastAutoTable?.finalY || 130) + 20,
                head: [['Date', 'Time', 'Category', 'Note', 'Type', 'Amount']],
                body: tableData.length > 0 ? tableData : [['No data', '-', '-', '-', '-', '0.00']],
                theme: 'striped',
                headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255] },
                columnStyles: {
                    5: { halign: 'right', fontStyle: 'bold' }
                },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${pageCount} - Private & Confidential`, 105, 285, { align: 'center' });
            }

            doc.save(`Budget_Report_${selectedMonth}.pdf`);
        } catch (err) {
            console.error('PDF Generation Error:', err);
            alert('Could not generate PDF. Please try again or check console for details.');
        }
    };

    const generate3MonthPDF = async () => {
        const doc = new jsPDF();
        const months = [];
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        for (let i = 0; i < 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.toISOString().slice(0, 7));
        }

        // Fetch historic stats for the months
        const statsMap = {};
        for (const m of months) {
            if (m === currentMonthStr) {
                statsMap[m] = { income, budgetLimit, incomeEnabled };
            } else {
                try {
                    const snap = await getDoc(doc(db, 'users', user.id, 'transactionDetails', 'monthlyStats', m));
                    if (snap.exists()) {
                        statsMap[m] = { ...snap.data() };
                    } else {
                        statsMap[m] = { income, budgetLimit, incomeEnabled }; // strictly fallback to global if absolutely missing
                    }
                } catch (err) {
                    console.error(`Error fetching stats for ${m}:`, err);
                    statsMap[m] = { income, budgetLimit, incomeEnabled };
                }
            }
        }

        // Header
        doc.setFillColor(55, 65, 81);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('3-MONTH EXPENDITURE ANALYSIS', 14, 25);

        doc.setFontSize(10);
        doc.text(`User: ${user?.name || user?.email || 'User'}`, 14, 33);
        doc.text(`Period: ${months[2]} to ${months[0]}`, 160, 33);

        let currentY = 50;
        months.forEach((month, index) => {
            const monthName = new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
            const monthTransactions = transactions.filter(t => t.date.startsWith(month) && t.type === 'expense');
            const total = monthTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(55, 65, 81);
            doc.text(`${monthName}`, 14, currentY);

            // Display income/stats for that month
            const mIncome = statsMap[month].income || 0;
            const mBudget = statsMap[month].budgetLimit || 0;
            const mIncomeEnabled = statsMap[month].incomeEnabled !== false;

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);

            const incomeText = mIncomeEnabled ? `INR ${mIncome.toLocaleString()}` : 'Not Tracked';
            const budgetText = (statsMap[month].budgetEnabled !== false) ? `INR ${mBudget.toLocaleString()}` : 'Not Tracked';
            doc.text(`Income: ${incomeText}  |  Budget: ${budgetText}`, 14, currentY + 6);

            doc.setFontSize(11);
            doc.setTextColor(220, 38, 38); // Danger color for expenses
            doc.text(`Total Monthly Spend: INR ${total.toLocaleString()}`, 140, currentY);
            currentY += 10;

            const tableData = monthTransactions.map(t => {
                try {
                    const dateObj = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.date);
                    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const category = t.category || 'Others';
                    return [
                        new Date(t.date).toLocaleDateString(),
                        timeStr,
                        category.charAt(0).toUpperCase() + category.slice(1),
                        `INR ${parseFloat(t.amount || 0).toLocaleString()}`
                    ];
                } catch (err) {
                    console.error('Error mapping transaction:', t, err);
                    return [new Date(t.date || Date.now()).toLocaleDateString(), '-', 'Error', '0.00'];
                }
            });

            autoTable(doc, {
                startY: currentY + 2,
                head: [['Date', 'Time', 'Category', 'Amount']],
                body: tableData.length > 0 ? tableData : [['No transactions', '-', '-', '0.00']],
                margin: { left: 14, right: 14 },
                theme: 'striped',
                styles: { fontSize: 9 },
                headStyles: { fillColor: [107, 114, 128] }
            });

            currentY = doc.lastAutoTable.finalY + 15;
            if (currentY > 240 && index < months.length - 1) {
                doc.addPage();
                currentY = 20;
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
        }

        doc.save(`3Month_Report_${months[0]}.pdf`);
    };

    const currentMonthExpenses = activeTransactions
        .filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return (
        <div className="container animate-fade-in">
            <header className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="text-gradient">Reports</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Analyze and export your financial data</p>
                </div>
                <div className="flex-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{ width: '100%' }}
                        />
                        {archivesForMonth.length > 0 && (
                            <select
                                value={selectedArchiveId}
                                onChange={(e) => setSelectedArchiveId(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                            >
                                <option value="current">Current / Final Data</option>
                                {archivesForMonth.map((archive, index) => {
                                    const dateStr = archive.archivedAt?.toDate().toLocaleDateString() || '';
                                    return (
                                        <option key={archive.id} value={archive.id}>
                                            Archived Set {archivesForMonth.length - index} ({dateStr})
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                    </div>
                    <button onClick={generatePDF} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                        <Download size={20} />
                        Monthly PDF
                    </button>
                    <button onClick={generate3MonthPDF} className="btn btn-outline" style={{ alignSelf: 'flex-start' }}>
                        <Download size={20} />
                        Quarterly PDF
                    </button>
                </div>
            </header>

            <div className="glass-panel" style={{ textAlign: 'center', marginBottom: '2rem', padding: '3rem 2rem' }}>
                <div className="flex-center" style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                    <FileText size={48} />
                </div>
                <h2 style={{ marginBottom: '0.5rem' }}>Monthly Report Ready</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                    Your report for {selectedMonth} includes a summary of your income, expenses, and savings, along with a detailed transaction log.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Income</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
                            {activeIncomeEnabled ? `₹${activeIncome.toLocaleString()}` : 'None'}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Expenses</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                            ₹{currentMonthExpenses.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                <div className="flex-between" style={{ marginBottom: '1.5rem', padding: '0 1.5rem' }}>
                    <div className="flex-center" style={{ gap: '0.75rem' }}>
                        <div style={{ color: 'var(--primary)', display: 'flex' }}>
                            <Calendar size={24} />
                        </div>
                        <h3 style={{ margin: 0 }}>Activity Calendar</h3>
                    </div>
                </div>
                <ActivityCalendar transactions={activeTransactions} />
            </div>
        </div>
    );
};

export default Reports;
