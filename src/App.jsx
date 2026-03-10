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
  Target
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const parseSMS = (text) => {
  const amountRegex = /(?:rs|inr|aed|\$|usd|eur|amount|debited|spent)\.?\s*([\d,]+\.?\d*)/i;
  const merchantRegex = /(?:at|to|on)\s+([A-Z0-9\s&]{3,20})/i;
  const amountMatch = text.match(amountRegex);
  const merchantMatch = text.match(merchantRegex);
  return {
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0,
    merchant: merchantMatch ? merchantMatch[1].trim() : 'Store Purchase',
    date: new Date().toISOString(),
    id: Math.random().toString(36).substr(2, 9)
  };
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
  const [incomingData, setIncomingData] = useState(null);
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('expenses_v2');
    return saved ? JSON.parse(saved) : [
      { id: '1', amount: 245.00, merchant: 'Apple Store', date: subDays(new Date(), 1).toISOString() },
      { id: '2', amount: 15.00, merchant: 'Starbucks', date: subDays(new Date(), 2).toISOString() },
      { id: '3', amount: 350.50, merchant: 'Etisalat UAE', date: subDays(new Date(), 3).toISOString() },
    ];
  });

  useEffect(() => {
    localStorage.setItem('expenses_v2', JSON.stringify(expenses));
  }, [expenses]);

  // Handle URL/Email Ingest
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

  const handleManualAdd = (tx) => {
    setExpenses([tx, ...expenses]);
    setIncomingData(null);
    setActiveTab('summary');
  };

  const [isEmailConnected, setIsEmailConnected] = useState(false);

  const handleSync = () => {
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
    setTimeout(() => {
      setIsSyncing(false);
      const mockEmailData = {
        id: Date.now().toString(),
        amount: 85.00,
        merchant: 'Amazon Food',
        date: new Date().toISOString()
      };
      setIncomingData(mockEmailData);
      setActiveTab('add');
    }, 2000);
  };

  return (
    <div className="app-main">
      <AnimatePresence mode="wait">
        {activeTab === 'summary' && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <header className="header-wallet">
              <div className="header-text">
                <p className="card-label" style={{ marginBottom: 4 }}>Tuesday, 10 Mar</p>
                <h1>Wallet</h1>
              </div>
              <div className="profile-pill">JD</div>
            </header>

            <div className="wallet-card">
              <p className="card-label">Monthly Spending</p>
              <div className="card-amount">
                <span>AED</span>{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p style={{ fontSize: 13, color: '#34c759', marginTop: 12, fontWeight: 600 }}>
                ↑ 12.5% vs last month
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

            <div className="section-header">
              <h3>Latest Activity</h3>
              <p style={{ fontSize: 14, color: '#007aff', fontWeight: 500 }}>Show All</p>
            </div>

            <div className="tx-container">
              {expenses.map((exp) => (
                <div key={exp.id} className="tx-row">
                  <div className="tx-icon">{getCategoryIcon(exp.merchant)}</div>
                  <div className="tx-details">
                    <p className="tx-title">{exp.merchant}</p>
                    <p className="tx-meta">{format(new Date(exp.date), 'EEEE, h:mm a')}</p>
                  </div>
                  <div className="tx-value negative">
                    - {exp.amount.toFixed(2)}
                  </div>
                </div>
              ))}
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
        <div className={`tab-item ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </div>
        <div className="tab-item" onClick={() => setActiveTab('add')}>
          <div className="fab"><Plus size={32} /></div>
        </div>
        <div className={`tab-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <History size={24} />
          <span>History</span>
        </div>
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
