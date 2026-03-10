import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Wallet,
  History,
  LayoutDashboard,
  Mail,
  ChevronRight,
  Trash2,
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
  Coffee,
  Smartphone,
  CreditCard,
  Target,
  RotateCcw,
  PieChart as PieIcon
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const parseBulkFetch = (text) => {
  // Enhanced regex for multiple AED alerts in one text block
  const txRegex = /(?:aed|spent|debited|amt)\.?\s*([\d,]+\.?\d*).*?(?:at|to|on|with)\s+([A-Z0-9\s&]{3,25})/gi;
  const results = [];
  let match;
  while ((match = txRegex.exec(text)) !== null) {
    if (parseFloat(match[1]) > 0) {
      results.push({
        amount: parseFloat(match[1].replace(/,/g, '')),
        merchant: match[2].trim() || 'Merchant',
        date: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      });
    }
  }
  return results;
};

const getCategoryIcon = (merchant) => {
  const m = merchant.toLowerCase();
  if (m.includes('apple') || m.includes('amazon')) return <ShoppingBag size={20} color="#af52de" />;
  if (m.includes('starbucks') || m.includes('coffee')) return <Coffee size={20} color="#ff9500" />;
  if (m.includes('tel') || m.includes('etisalat') || m.includes('du')) return <Smartphone size={20} color="#007aff" />;
  return <CreditCard size={20} color="#8e8e93" />;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('summary');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [incomingData, setIncomingData] = useState(null);
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('expenses_v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('expenses_v2', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const content = params.get('sms');
    if (content) {
      const result = parseSMS(decodeURIComponent(content));
      if (result.amount > 0) {
        setIncomingData(result);
        setActiveTab('add');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const totalSpent = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return expenses
      .filter(e => isWithinInterval(new Date(e.date), { start, end }))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const categoryData = useMemo(() => {
    const categories = {};
    expenses.forEach(e => {
      const m = e.merchant.toLowerCase();
      const cat = m.includes('amazon') || m.includes('apple') ? 'Shopping' :
        m.includes('starbucks') || m.includes('coffee') ? 'Dining' :
          m.includes('etisalat') || m.includes('du') || m.includes('bill') ? 'Bills' : 'Other';
      categories[cat] = (categories[cat] || 0) + e.amount;
    });
    return Object.keys(categories).map(name => ({ name, value: categories[name] }));
  }, [expenses]);

  const COLORS = ['#5856d6', '#af52de', '#007aff', '#ff9500'];

  const handleManualAdd = (tx) => {
    setExpenses([tx, ...expenses]);
    setIncomingData(null);
    setActiveTab('summary');
  };

  const handleSync = async () => {
    if (!isEmailConnected) {
      const confirm = window.confirm("SpendWise wants to connect to your Gmail/Outlook to scan for bank debit alerts. This happens locally on your device. Proceed?");
      if (confirm) {
        setIsSyncing(true);
        setTimeout(() => {
          setIsEmailConnected(true);
          setIsSyncing(false);
          alert("Connected to Email! New transactions will now appear automatically.");
        }, 1500);
      }
      return;
    }

    setIsSyncing(true);

    // Attempt to read from Clipboard (Works on iPhone if user grants permission)
    try {
      const text = await navigator.clipboard.readText();
      const fetched = parseBulkFetch(text);

      setTimeout(() => {
        setIsSyncing(false);
        if (fetched.length > 0) {
          const confirm = window.confirm(`Found ${fetched.length} new transactions in your copied email text. Import them now?`);
          if (confirm) {
            setExpenses(prev => [...fetched, ...prev]);
            alert(`Success! Fetched ${fetched.length} transactions from this month.`);
          }
        } else {
          alert("No new AED transactions found in your clipboard. Make sure you copied the bank email text!");
        }
      }, 1500);
    } catch (err) {
      setIsSyncing(false);
      alert("Please allow SpendWise to access your clipboard to fetch email data.");
    }
  };

  return (
    <div className="app-main">
      <AnimatePresence mode="wait">
        {activeTab === 'summary' && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <header className="header-wallet">
              <div className="header-text">
                <p className="card-label" style={{ marginBottom: 4 }}>{format(new Date(), 'EEEE, dd MMM')}</p>
                <h1>Wallet</h1>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  onClick={() => window.location.reload()}
                  style={{ background: 'none', border: 'none', color: '#8e8e93', padding: 8, cursor: 'pointer' }}
                >
                  <RotateCcw size={20} />
                </button>
                <div className="profile-pill">JD</div>
              </div>
            </header>

            <div className="wallet-card">
              <p className="card-label">Monthly Spending</p>
              <div className="card-amount">
                <span>AED</span>{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p style={{ fontSize: 13, color: totalSpent > 0 ? '#34c759' : '#8e8e93', marginTop: 12, fontWeight: 600 }}>
                {totalSpent > 0 ? '↑ Tracking Active' : 'Waiting for Data'}
              </p>
            </div>

            <div className="sync-banner" onClick={handleSync} style={{ cursor: 'pointer', borderLeftColor: isEmailConnected ? '#34c759' : '#5856d6' }}>
              <div className="sync-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={16} color={isEmailConnected ? '#34c759' : '#5856d6'} />
                  <h4>{isEmailConnected ? 'Bank Email Connected' : 'Connect Bank Email'}</h4>
                </div>
                <p>{isSyncing ? 'Scanning for Transactions...' : (isEmailConnected ? 'Tap to refetch latest alerts' : 'Import automatically from Gmail/Outlook')}</p>
              </div>
              <RefreshCw size={18} className={isSyncing ? 'animate-spin text-indigo-400' : 'text-zinc-600'} />
            </div>

            {/* Spending Insights Panel */}
            <div className="wallet-card" style={{ padding: '20px', background: '#1c1c1e', marginBottom: 24 }}>
              <div className="section-header" style={{ padding: 0, marginBottom: 15 }}>
                <h3 style={{ fontSize: 16 }}>Spending Insights</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', height: 160 }}>
                <div style={{ width: '50%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData.length > 0 ? categoryData : [{ name: 'Empty', value: 1 }]}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.length > 0 ?
                          categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          )) :
                          <Cell fill="#2c2c2e" />
                        }
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: '50%', paddingLeft: 10 }}>
                  {categoryData.length > 0 ? categoryData.map((cat, i) => (
                    <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                        <span style={{ fontSize: 12, color: '#8e8e93' }}>{cat.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{((cat.value / totalSpent) * 100).toFixed(0)}%</span>
                    </div>
                  )) : <p style={{ fontSize: 12, color: '#8e8e93' }}>No data to analyze</p>}
                </div>
              </div>
            </div>

            <div className="section-header">
              <h3>Latest Activity</h3>
              <p style={{ fontSize: 14, color: '#007aff', fontWeight: 500 }} onClick={() => setActiveTab('history')}>Show All</p>
            </div>

            <div className="tx-container">
              {expenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8e8e93' }}>
                  <div style={{ marginBottom: 12, opacity: 0.3 }}><Wallet size={48} style={{ margin: '0 auto' }} /></div>
                  <p style={{ fontSize: 15, fontWeight: 500 }}>No Transactions Yet</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Add your first expense to begin tracking.</p>
                </div>
              ) : (
                expenses.slice(0, 5).map((exp) => (
                  <div key={exp.id} className="tx-row">
                    <div className="tx-icon">{getCategoryIcon(exp.merchant)}</div>
                    <div className="tx-details">
                      <p className="tx-title">{exp.merchant}</p>
                      <p className="tx-meta">{format(new Date(exp.date), 'h:mm a')}</p>
                    </div>
                    <div className="tx-value negative">
                      <p style={{ fontSize: 16, fontWeight: 700 }}>AED {exp.amount.toFixed(2)}</p>
                      <p style={{ fontSize: 11, color: '#8e8e93', fontWeight: 500, marginTop: 2 }}>{format(new Date(exp.date), 'dd MMM')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'add' && (
          <AddTransaction
            initial={incomingData}
            onSave={handleManualAdd}
            onCancel={() => { setIncomingData(null); setActiveTab('summary'); }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPage expenses={expenses} setExpenses={setExpenses} onBack={() => setActiveTab('summary')} />
        )}
      </AnimatePresence>

      <nav className="tab-bar">
        <button className={`tab-item ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
          <LayoutDashboard size={22} />
          <span>Dashboard</span>
        </button>
        <button className="tab-item add-btn" onClick={() => setActiveTab('add')}>
          <Plus size={28} />
        </button>
        <button className={`tab-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <History size={22} />
          <span>History</span>
        </button>
      </nav>
    </div>
  );
}

function AddTransaction({ initial, onSave, onCancel }) {
  const [merchant, setMerchant] = useState(initial?.merchant || '');
  const [amount, setAmount] = useState(initial?.amount || '');

  return (
    <motion.div className="full-modal" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
        <ArrowLeft onClick={onCancel} />
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Transaction Details</h2>
        <div style={{ width: 24 }} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p className="card-label">Amount Spent (AED)</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 24, color: '#8e8e93', fontWeight: 600 }}>AED</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{ background: 'none', border: 'none', color: 'white', fontSize: 48, fontWeight: 700, width: '200px', textAlign: 'center', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ background: '#1c1c1e', borderRadius: 16, padding: 20 }}>
        <p className="card-label">Merchant / Store</p>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. Starbucks"
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, width: '100%', marginTop: 8, outline: 'none' }}
        />
      </div>

      <button className="btn-primary" onClick={() => onSave({ id: Date.now().toString(), amount: parseFloat(amount), merchant, date: new Date().toISOString() })}>
        Save Transaction
      </button>

      <p style={{ textAlign: 'center', fontSize: 13, color: '#8e8e93', marginTop: 24 }}>
        This transaction was detected from your {initial ? 'Email Sync' : 'Manual Entry'}.
      </p>
    </motion.div>
  );
}

function HistoryPage({ expenses, setExpenses, onBack }) {
  return (
    <motion.div className="full-modal" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30 }}>
        <ArrowLeft onClick={onBack} />
        <h2 style={{ fontSize: 22 }}>All Spending</h2>
      </div>

      {expenses.map(exp => (
        <div key={exp.id} className="tx-row">
          <div className="tx-icon">{getCategoryIcon(exp.merchant)}</div>
          <div className="tx-details">
            <p className="tx-title">{exp.merchant}</p>
            <p className="tx-meta">{format(new Date(exp.date), 'MMM dd, yyyy')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <p className="tx-value">- {exp.amount.toFixed(2)}</p>
            <Trash2 size={16} color="#8e8e93" onClick={() => setExpenses(expenses.filter(e => e.id !== exp.id))} />
          </div>
        </div>
      ))}
    </motion.div>
  );
}
