import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

// ─── API ────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_BACKEND_URL || '/api';
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// ─── Auth Context ────────────────────────────────────────────────────────────
const AuthCtx = createContext();
function useAuth() { return useContext(AuthCtx); }

const CATEGORIES = {
  expense: ['Food','Transport','Shopping','Bills','Health','Entertainment','Education','Other'],
  income:  ['Salary','Freelance','Business','Investment','Other'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];

// ─── Auth Page ───────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const url = tab === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(url, form);
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <h2>💰 Smart Expense Tracker</h2>
        <p>Manage your daily finances easily</p>
        <div className="tabs">
          <button className={`tab ${tab==='login'?'active':''}`} onClick={()=>setTab('login')}>Sign In</button>
          <button className={`tab ${tab==='register'?'active':''}`} onClick={()=>setTab('register')}>Register</button>
        </div>
        <form onSubmit={submit}>
          {tab==='register' && (
            <div className="field">
              <label>Full Name</label>
              <input placeholder="John Doe" value={form.name} onChange={e=>set('name',e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@email.com" value={form.email} onChange={e=>set('email',e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="Min 6 chars" value={form.password} onChange={e=>set('password',e.target.value)} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (tab==='login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────
function AddModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'Food', description: '', date: today() });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => {
    const upd = { ...f, [k]: v };
    if (k === 'type') upd.category = CATEGORIES[v][0];
    return upd;
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount');
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/transactions', form);
      onAdded(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Add Transaction</h3>
        <div className="type-toggle">
          <button className={`type-btn expense ${form.type==='expense'?'active':''}`} type="button" onClick={()=>set('type','expense')}>⬆ Expense</button>
          <button className={`type-btn income ${form.type==='income'?'active':''}`} type="button" onClick={()=>set('type','income')}>⬇ Income</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="field">
              <label>Amount (₹)</label>
              <input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>set('amount',e.target.value)} required />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={e=>set('date',e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={e=>set('category',e.target.value)}>
              {CATEGORIES[form.type].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <input placeholder="What was this for?" value={form.description} onChange={e=>set('description',e.target.value)} />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding...' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ onAdd }) {
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const load = async () => {
    setLoading(true);
    const [s, t] = await Promise.all([
      api.get(`/transactions/summary?month=${month}&year=${year}`),
      api.get(`/transactions?month=${month}&year=${year}`)
    ]);
    setSummary(s.data);
    setTransactions(t.data.slice(0, 8));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    await api.delete(`/transactions/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <h1 className="page-title" style={{marginBottom:0}}>Dashboard</h1>
        <button className="btn btn-primary" onClick={onAdd}>+ Add Transaction</button>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="label">Total Income</div>
          <div className="value green">{fmt(summary.income)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Expense</div>
          <div className="value red">{fmt(summary.expense)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Balance</div>
          <div className={`value ${summary.balance >= 0 ? 'blue' : 'red'}`}>{fmt(summary.balance)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Transactions — {now.toLocaleString('default',{month:'long'})} {year}</h3>
        </div>
        {loading ? <p className="empty">Loading...</p> : transactions.length === 0 ? (
          <p className="empty">No transactions this month. Add one!</p>
        ) : (
          <table>
            <thead><tr>
              <th>Date</th><th>Category</th><th>Description</th><th>Type</th><th>Amount</th><th></th>
            </tr></thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>{tx.category}</td>
                  <td style={{color:'#64748b'}}>{tx.description || '—'}</td>
                  <td><span className={`badge badge-${tx.type}`}>{tx.type}</span></td>
                  <td style={{fontWeight:600, color: tx.type==='income'?'#16a34a':'#dc2626'}}>
                    {tx.type==='income'?'+':'-'}{fmt(tx.amount)}
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(tx.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Transactions Page ────────────────────────────────────────────────────────
function Transactions({ onAdd }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState({ type: '', month: new Date().getMonth()+1, year: new Date().getFullYear() });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.type) params.append('type', filter.type);
    if (filter.month && filter.year) { params.append('month', filter.month); params.append('year', filter.year); }
    const { data } = await api.get(`/transactions?${params}`);
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const del = async (id) => {
    if (!confirm('Delete this?')) return;
    await api.delete(`/transactions/${id}`);
    setTransactions(t => t.filter(x => x.id !== id));
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <h1 className="page-title" style={{marginBottom:0}}>All Transactions</h1>
        <button className="btn btn-primary" onClick={onAdd}>+ Add Transaction</button>
      </div>

      <div className="card">
        <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
          <select className="field" style={{width:'auto',padding:'8px 12px',borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'0.875rem',fontFamily:'inherit'}}
            value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'0.875rem',fontFamily:'inherit'}}
            value={filter.month} onChange={e=>setFilter(f=>({...f,month:e.target.value}))}>
            {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'0.875rem',fontFamily:'inherit'}}
            value={filter.year} onChange={e=>setFilter(f=>({...f,year:e.target.value}))}>
            {[2023,2024,2025,2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {loading ? <p className="empty">Loading...</p> : transactions.length === 0 ? (
          <p className="empty">No transactions found.</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Type</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>{tx.category}</td>
                  <td style={{color:'#64748b'}}>{tx.description || '—'}</td>
                  <td><span className={`badge badge-${tx.type}`}>{tx.type}</span></td>
                  <td style={{fontWeight:600, color: tx.type==='income'?'#16a34a':'#dc2626'}}>
                    {tx.type==='income'?'+':'-'}{fmt(tx.amount)}
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={()=>del(tx.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Summary Page ─────────────────────────────────────────────────────────────
function Summary() {
  const [data, setData] = useState({ income:0, expense:0, balance:0 });
  const [catData, setCatData] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth()+1);
  const [year, setYear] = useState(new Date().getFullYear());

  const load = async () => {
    const [s, t] = await Promise.all([
      api.get(`/transactions/summary?month=${month}&year=${year}`),
      api.get(`/transactions?month=${month}&year=${year}`)
    ]);
    setData(s.data);
    // group by category
    const map = {};
    t.data.filter(x=>x.type==='expense').forEach(x => {
      map[x.category] = (map[x.category]||0) + x.amount;
    });
    const arr = Object.entries(map).map(([cat,total])=>({cat,total})).sort((a,b)=>b.total-a.total);
    setCatData(arr);
  };

  useEffect(()=>{ load(); },[month,year]);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const totalExp = catData.reduce((a,c)=>a+c.total,0);

  return (
    <div>
      <h1 className="page-title">Monthly Summary</h1>

      <div style={{display:'flex',gap:'10px',marginBottom:'20px'}}>
        <select style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'0.875rem',fontFamily:'inherit'}}
          value={month} onChange={e=>setMonth(e.target.value)}>
          {months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #e2e8f0',fontSize:'0.875rem',fontFamily:'inherit'}}
          value={year} onChange={e=>setYear(e.target.value)}>
          {[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
        </select>
      </div>

      <div className="stats">
        <div className="stat-card"><div className="label">Income</div><div className="value green">{fmt(data.income)}</div></div>
        <div className="stat-card"><div className="label">Expenses</div><div className="value red">{fmt(data.expense)}</div></div>
        <div className="stat-card"><div className="label">Savings</div><div className={`value ${data.balance>=0?'blue':'red'}`}>{fmt(data.balance)}</div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Expense by Category</h3></div>
        {catData.length === 0 ? <p className="empty">No expenses this month.</p> : (
          <div>
            {catData.map(({cat,total}) => (
              <div key={cat} style={{marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'0.875rem',fontWeight:500}}>{cat}</span>
                  <span style={{fontSize:'0.875rem',fontWeight:600,color:'#dc2626'}}>{fmt(total)}</span>
                </div>
                <div style={{background:'#f1f5f9',borderRadius:'4px',height:'8px',overflow:'hidden'}}>
                  <div style={{width:`${Math.min(100,(total/totalExp)*100)}%`,height:'100%',background:'#6366f1',borderRadius:'4px',transition:'width 0.5s'}} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { const t = localStorage.getItem('token'); if(!t) return null;
      const p = JSON.parse(atob(t.split('.')[1])); return { id:p.id, name:p.name, email:p.email };
    } catch { return null; }
  });
  const [page, setPage] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  if (!user) return <AuthPage onLogin={u => setUser(u)} />;

  const onAdded = () => setRefreshKey(k => k+1);
  const openAdd = () => setShowModal(true);

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">💰 SmartSpend</div>
        {[
          { id:'dashboard', label:'📊 Dashboard' },
          { id:'transactions', label:'📋 Transactions' },
          { id:'summary', label:'📈 Summary' },
        ].map(({id,label}) => (
          <button key={id} className={`nav-link ${page===id?'active':''}`} onClick={()=>setPage(id)}>{label}</button>
        ))}
        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user.name}</strong>
            {user.email}
          </div>
          <button className="btn btn-ghost btn-sm" style={{width:'100%'}} onClick={logout}>Sign Out</button>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        {page === 'dashboard' && <Dashboard key={refreshKey} onAdd={openAdd} />}
        {page === 'transactions' && <Transactions key={refreshKey} onAdd={openAdd} />}
        {page === 'summary' && <Summary key={refreshKey} />}
      </div>

      {showModal && <AddModal onClose={()=>setShowModal(false)} onAdded={onAdded} />}
    </div>
  );
}
