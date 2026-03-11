import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

const BudgetContext = createContext();

export const useBudget = () => useContext(BudgetContext);

export const BudgetProvider = ({ children }) => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [budgetLimit, setBudgetLimit] = useState(0);

    const [income, setIncome] = useState(0);
    const [incomeEnabled, setIncomeEnabled] = useState(true);
    const [budgetEnabled, setBudgetEnabled] = useState(true);
    const [savings, setSavings] = useState(0);
    const [balanceContributedToSavings, setBalanceContributedToSavings] = useState(0);
    const [carryOverBalance, setCarryOverBalance] = useState(0);
    const [plans, setPlans] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load user profile (income and budgetLimit) from Firestore
    useEffect(() => {
        if (!user) {
            setTransactions([]);
            setBudgetLimit(0);
            setIncome(0);
            setReminders([]);
            setLoading(false);
            return;
        }

        const profileRef = doc(db, 'users', user.id, 'profile', 'settings');

        const unsubscribe = onSnapshot(profileRef, async (profileSnap) => {
            try {
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    let currentIncome = data.income || 0;
                    let currentBudgetLimit = data.budgetLimit || 0;
                    let currentCarryOverBalance = data.carryOverBalance || 0;
                    let currentBalanceContributedToSavings = data.balanceContributedToSavings || 0;

                    const now = new Date();
                    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    const lastActiveMonth = data.lastActiveMonth || currentMonthStr;

                    if (lastActiveMonth !== currentMonthStr) {
                        // Month has changed, perform rollover

                        // 1. Snapshot the previous month's final state
                        const statsRef = doc(db, 'users', user.id, 'monthlyStats', lastActiveMonth);
                        await setDoc(statsRef, {
                            income: currentIncome,
                            budgetLimit: currentBudgetLimit,
                            carryOverBalance: currentCarryOverBalance, // The balance they started the month with
                            incomeEnabled: data.incomeEnabled !== false,
                            budgetEnabled: data.budgetEnabled !== false,
                            savedAt: Timestamp.now()
                        });

                        // 2. Calculate what's left over from last month (only if income is enabled)
                        if (data.incomeEnabled !== false) {
                            // The unspent amount from last month = Income - Budget Limit - What they manually contributed from balance to savings
                            const leftover = currentIncome - currentBudgetLimit - currentBalanceContributedToSavings;
                            currentCarryOverBalance += leftover;

                            if (currentCarryOverBalance < 0) currentCarryOverBalance = 0;
                        }

                        // 3. Reset stats for the new month
                        currentIncome = 0;
                        currentBudgetLimit = 0;
                        currentBalanceContributedToSavings = 0;

                        // 4. Update the profile with new month data
                        await setDoc(profileRef, {
                            ...data,
                            income: currentIncome,
                            budgetLimit: currentBudgetLimit,
                            carryOverBalance: currentCarryOverBalance,
                            balanceContributedToSavings: currentBalanceContributedToSavings,
                            lastActiveMonth: currentMonthStr,
                            updatedAt: Timestamp.now()
                        }, { merge: true });
                    }

                    setBudgetLimit(currentBudgetLimit);
                    setIncome(currentIncome);
                    setCarryOverBalance(currentCarryOverBalance);
                    setSavings(data.savings || 0);
                    setBalanceContributedToSavings(currentBalanceContributedToSavings);
                    setIncomeEnabled(data.incomeEnabled !== false); // default true
                    setBudgetEnabled(data.budgetEnabled !== false); // default true
                } else {
                    const now = new Date();
                    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                    // Initialize profile for new user
                    await setDoc(profileRef, {
                        budgetLimit: 0,
                        income: 0,
                        savings: 0,
                        balanceContributedToSavings: 0,
                        carryOverBalance: 0,
                        lastActiveMonth: currentMonthStr,
                        dailySummaryEnabled: false,
                        dailySummaryTime: '09:00',
                        createdAt: Timestamp.now()
                    });
                }
            } catch (error) {
                console.error('Error processing profile snapshot:', error);
            }
        }, (error) => {
            console.error('Error listening to profile:', error);
        });

        return unsubscribe;

    }, [user]);

    // Listen to plans in real-time
    useEffect(() => {
        if (!user) return;

        const plansRef = collection(db, 'users', user.id, 'plans');
        const q = query(plansRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const plansList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPlans(plansList);
        }, (error) => {
            console.error('Error listening to plans:', error);
        });

        return unsubscribe;
    }, [user]);

    // Listen to reminders in real-time
    useEffect(() => {
        if (!user) return;

        const remindersRef = collection(db, 'users', user.id, 'reminders');
        const q = query(remindersRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const remindersList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReminders(remindersList);
        }, (error) => {
            console.error('Error listening to reminders:', error);
        });

        return unsubscribe;
    }, [user]);

    // Listen to transactions in real-time
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const transactionsRef = collection(db, 'users', user.id, 'transactions');
        const q = query(transactionsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const transactionsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convert Firestore Timestamp to ISO string
                date: doc.data().date?.toDate?.()?.toISOString().split('T')[0] || doc.data().date
            }));
            setTransactions(transactionsList);
            setLoading(false);
        }, (error) => {
            console.error('Error listening to transactions:', error);
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    const addTransaction = async (transaction) => {
        if (!user) return;

        try {
            const transactionId = uuidv4();
            const transactionRef = doc(db, 'users', user.id, 'transactions', transactionId);

            // If category is 'savings', add to savings total
            if (transaction.category === 'savings') {
                await addToSavings(transaction.amount);
            }

            await setDoc(transactionRef, {
                ...transaction,
                date: transaction.date || new Date().toISOString().split('T')[0],
                createdAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    };

    const deleteTransaction = async (id) => {
        if (!user) return;

        try {
            const transactionRef = doc(db, 'users', user.id, 'transactions', id);
            await deleteDoc(transactionRef);
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    };

    const clearTransactions = async () => {
        if (!user) return;
        try {
            const transactionsRef = collection(db, 'users', user.id, 'transactions');
            const snapshot = await getDocs(transactionsRef);
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            setTransactions([]);
        } catch (error) {
            console.error('Error clearing transactions:', error);
            throw error;
        }
    };

    const addPlan = async (plan) => {
        if (!user) return;

        try {
            const planId = uuidv4();
            const planRef = doc(db, 'users', user.id, 'plans', planId);

            await setDoc(planRef, {
                ...plan,
                createdAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error adding plan:', error);
            throw error;
        }
    };

    const deletePlan = async (id) => {
        if (!user) return;

        try {
            const planRef = doc(db, 'users', user.id, 'plans', id);
            await deleteDoc(planRef);
        } catch (error) {
            console.error('Error deleting plan:', error);
            throw error;
        }
    };

    const updatePlan = async (id, data) => {
        if (!user) return;

        try {
            const planRef = doc(db, 'users', user.id, 'plans', id);
            await setDoc(planRef, {
                ...data,
                updatedAt: Timestamp.now()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating plan:', error);
            throw error;
        }
    };

    const addReminder = async (reminder) => {
        if (!user) return;
        try {
            const reminderId = uuidv4();
            const reminderRef = doc(db, 'users', user.id, 'reminders', reminderId);

            // Calculate nextNotificationTime
            const [hours, minutes] = reminder.time.split(':').map(Number);
            let scheduledTime;

            if (reminder.recurrence === 'one-time') {
                const [year, month, day] = reminder.date.split('-').map(Number);
                scheduledTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
            } else {
                // For recurring, start from next occurrence
                const now = new Date();
                scheduledTime = new Date(now);
                scheduledTime.setHours(hours, minutes, 0, 0);

                if (scheduledTime <= now) {
                    scheduledTime.setDate(scheduledTime.getDate() + 1);
                }
            }

            await setDoc(reminderRef, {
                ...reminder,
                nextNotificationTime: Timestamp.fromDate(scheduledTime),
                createdAt: Timestamp.now(),
                completed: false
            });
        } catch (error) {
            console.error('Error adding reminder:', error);
            throw error;
        }
    };

    const deleteReminder = async (id) => {
        if (!user) return;
        try {
            const reminderRef = doc(db, 'users', user.id, 'reminders', id);
            await deleteDoc(reminderRef);
        } catch (error) {
            console.error('Error deleting reminder:', error);
            throw error;
        }
    };

    const updateIncomeEnabled = async (value) => {
        if (!user) return;
        try {
            const profileRef = doc(db, 'users', user.id, 'profile', 'settings');
            await setDoc(profileRef, {
                incomeEnabled: value,
                updatedAt: Timestamp.now()
            }, { merge: true });
            setIncomeEnabled(value);
        } catch (error) {
            console.error('Error updating incomeEnabled:', error);
            throw error;
        }
    };

    const updateBudgetEnabled = async (value) => {
        if (!user) return;
        try {
            const profileRef = doc(db, 'users', user.id, 'profile', 'settings');
            await setDoc(profileRef, {
                budgetEnabled: value,
                updatedAt: Timestamp.now()
            }, { merge: true });
            setBudgetEnabled(value);
        } catch (error) {
            console.error('Error updating budgetEnabled:', error);
            throw error;
        }
    };

    const updateBudgetLimit = async (amount) => {
        if (!user) return;

        try {
            const profileRef = doc(db, 'users', user.id, 'profile', 'settings');
            await setDoc(profileRef, {
                budgetLimit: parseFloat(amount),
                income: income,
                savings: savings,
                updatedAt: Timestamp.now()
            }, { merge: true });

            setBudgetLimit(parseFloat(amount));
        } catch (error) {
            console.error('Error updating budget limit:', error);
            throw error;
        }
    };

    const updateIncome = async (amount) => {
        if (!user) return;

        try {
            // Reset transactions as per user request
            await clearTransactions();

            const profileRef = doc(db, 'users', user.id, 'profile', 'settings');
            await setDoc(profileRef, {
                income: parseFloat(amount),
                budgetLimit: budgetLimit,
                savings: savings,
                updatedAt: Timestamp.now()
            }, { merge: true });

            setIncome(parseFloat(amount));
        } catch (error) {
            console.error('Error updating income:', error);
            throw error;
        }
    };

    const updateSavings = async (amount) => {
        if (!user) return;

        try {
            const profileRef = doc(db, 'users', user.id, 'profile', 'settings');
            await setDoc(profileRef, {
                income: income,
                budgetLimit: budgetLimit,
                savings: parseFloat(amount),
                updatedAt: Timestamp.now()
            }, { merge: true });

            setSavings(parseFloat(amount));
        } catch (error) {
            console.error('Error updating savings:', error);
            throw error;
        }
    };

    const addToSavings = async (amount) => {
        if (!user) return;
        const newSavings = savings + parseFloat(amount);
        await updateSavings(newSavings);
    };

    const resetSavings = async () => {
        await updateSavings(0);
    };

    const contributeFromBalance = async (amount) => {
        if (!user) return;
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return;

        const summary = getSummary();
        if (summary.availableBalance === null || val > summary.availableBalance) {
            throw new Error('Insufficient available balance for this contribution.');
        }

        try {
            const profileRef = doc(db, 'users', user.id, 'profile', 'settings');
            const newContributed = balanceContributedToSavings + val;
            const newSavings = savings + val;

            await setDoc(profileRef, {
                balanceContributedToSavings: newContributed,
                savings: newSavings,
                updatedAt: Timestamp.now()
            }, { merge: true });

            setBalanceContributedToSavings(newContributed);
            setSavings(newSavings);
        } catch (error) {
            console.error('Error contributing from balance:', error);
            throw error;
        }
    };

    const clearAllData = async () => {
        if (!user) return;
        try {
            const now = new Date();
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Archive the current setup and transactions before deletion
            if (transactions.length > 0) {
                const archiveId = uuidv4();
                const archiveRef = doc(db, 'users', user.id, 'archives', archiveId);

                await setDoc(archiveRef, {
                    month: currentMonthStr,
                    archivedAt: Timestamp.now(),
                    income: income,
                    budgetLimit: budgetLimit,
                    carryOverBalance: carryOverBalance,
                    incomeEnabled: incomeEnabled,
                    transactions: transactions // Snapshot of the current array
                });
            }

            // Clear transactions
            await clearTransactions();

            // Reset profile settings in Firestore
            const profileRef = doc(db, 'users', user.id, 'profile', 'settings');
            await setDoc(profileRef, {
                budgetLimit: 0,
                income: 0,
                savings: 0,
                balanceContributedToSavings: 0,
                carryOverBalance: 0,
                lastActiveMonth: currentMonthStr,
                updatedAt: Timestamp.now()
            });

            // Reset local state
            setBudgetLimit(0);
            setIncome(0);
            setSavings(0);
            setBalanceContributedToSavings(0);
            setCarryOverBalance(0);
        } catch (error) {
            console.error('Error clearing all data:', error);
            throw error;
        }
    };

    const getSummary = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

        const currentMonthExpenses = transactions
            .filter(t => {
                const transDate = new Date(t.date);
                return t.type === 'expense' && transDate >= startOfMonth;
            })
            .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

        return {
            totalExpenses,
            monthExpenses: currentMonthExpenses, // Current month starting from 1st
            totalIncome: incomeEnabled ? income : null,
            budgetLimit: budgetEnabled ? budgetLimit : null,
            remainingBudget: budgetEnabled ? (budgetLimit - currentMonthExpenses) : null,
            totalSavings: savings,
            availableBalance: (!incomeEnabled || !budgetEnabled) ? null : (income - budgetLimit - balanceContributedToSavings + carryOverBalance)
        };
    };

    const getMonthlyData = () => {
        return transactions;
    };

    if (loading) {
        return <div className="flex-center" style={{ height: '100vh' }}>Loading your data...</div>;
    }

    return (
        <BudgetContext.Provider value={{
            transactions,
            budgetLimit,
            income,
            incomeEnabled,
            updateIncomeEnabled,
            budgetEnabled,
            updateBudgetEnabled,
            addTransaction,
            deleteTransaction,
            updateBudgetLimit,
            updateIncome,
            updateSavings,
            addToSavings,
            resetSavings,
            savings,
            getSummary,
            getMonthlyData,
            clearTransactions,

            clearAllData,
            plans,
            addPlan,
            deletePlan,
            updatePlan,
            reminders,
            addReminder,
            deleteReminder,
            contributeFromBalance,
            balanceContributedToSavings,
            carryOverBalance,
            db
        }}>
            {children}
        </BudgetContext.Provider>
    );
};

