import React, { useState, useEffect } from 'react';
import './App.css';

// Components
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        onLogin();
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>🍽️ Mess Management</h1>
          <p>Admin Portal</p>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">Login</button>
        </form>
        <p className="demo-creds">Demo: admin / password</p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/dashboard', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(d => setData(d.data)).catch(console.error);
  }, []);

  return (
    <div className="page">
      <h2>📊 Dashboard</h2>
      {!data ? <p>Loading...</p> : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <h3>Active Members</h3>
            <p className="number">{data.activeMembers}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <h3>Today Attendance</h3>
            <p className="number">{data.todayAttendance?.reduce((s, a) => s + a.count, 0) || 0}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏰</div>
            <h3>Expiring Plans</h3>
            <p className="number warning">{data.expiringPlans}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <h3>Expired Plans</h3>
            <p className="number danger">{data.expiredPlans}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <h3>Pending Payments</h3>
            <p className="number warning">{data.pendingPayments}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <h3>Misuse Incidents</h3>
            <p className="number">{data.todayMisuse}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const Members = () => {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    fetch('http://localhost:3000/api/members', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(d => setMembers(d.data)).catch(console.error);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(form)
    });
    setForm({ name: '', email: '', phone: '' });
    location.reload();
  };

  return (
    <div className="page">
      <h2>👥 Members</h2>
      <form onSubmit={handleAdd} className="form">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
        <button type="submit">Add Member</button>
      </form>
      <div className="table">
        {members.map(m => <div key={m.id} className="row">{m.member_id} - {m.name}</div>)}
      </div>
    </div>
  );
};

const MealPlans = () => {
  const [form, setForm] = useState({ member_id: '', plan_type: 'Monthly', start_date: '', end_date: '', amount: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/meal-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(form)
    });
    alert('Meal plan created');
    setForm({ member_id: '', plan_type: 'Monthly', start_date: '', end_date: '', amount: '' });
  };

  return (
    <div className="page">
      <h2>📋 Meal Plans</h2>
      <form onSubmit={handleSubmit} className="form">
        <input placeholder="Member ID" value={form.member_id} onChange={(e) => setForm({...form, member_id: e.target.value})} required />
        <select value={form.plan_type} onChange={(e) => setForm({...form, plan_type: e.target.value})}>
          <option>Monthly</option>
          <option>Quarterly</option>
          <option>Yearly</option>
        </select>
        <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} required />
        <input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} required />
        <input placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} required />
        <button type="submit">Create Plan</button>
      </form>
    </div>
  );
};

const Attendance = () => {
  const [form, setForm] = useState({ member_id: '', date: new Date().toISOString().split('T')[0], slot: 'Lunch', status: 'Present' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(form)
    });
    alert('Attendance recorded');
    setForm({ member_id: '', date: new Date().toISOString().split('T')[0], slot: 'Lunch', status: 'Present' });
  };

  return (
    <div className="page">
      <h2>✅ Attendance</h2>
      <form onSubmit={handleSubmit} className="form">
        <input placeholder="Member ID" value={form.member_id} onChange={(e) => setForm({...form, member_id: e.target.value})} required />
        <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} />
        <select value={form.slot} onChange={(e) => setForm({...form, slot: e.target.value})}>
          <option>Breakfast</option>
          <option>Lunch</option>
          <option>Dinner</option>
        </select>
        <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
          <option>Present</option>
          <option>Absent</option>
          <option>Leave</option>
        </select>
        <button type="submit">Record Attendance</button>
      </form>
    </div>
  );
};

const Payments = () => {
  const [form, setForm] = useState({ member_id: '', amount: '', date: new Date().toISOString().split('T')[0], status: 'Due' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(form)
    });
    alert('Payment recorded');
    setForm({ member_id: '', amount: '', date: new Date().toISOString().split('T')[0], status: 'Due' });
  };

  return (
    <div className="page">
      <h2>💳 Payments</h2>
      <form onSubmit={handleSubmit} className="form">
        <input placeholder="Member ID" value={form.member_id} onChange={(e) => setForm({...form, member_id: e.target.value})} required />
        <input placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} required />
        <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} />
        <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
          <option>Due</option>
          <option>Paid</option>
          <option>Partial</option>
        </select>
        <button type="submit">Record Payment</button>
      </form>
    </div>
  );
};

const Misuse = () => {
  const [form, setForm] = useState({ member_id: '', date: new Date().toISOString().split('T')[0], description: '', severity: 'Low' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/misuse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(form)
    });
    alert('Misuse flagged');
    setForm({ member_id: '', date: new Date().toISOString().split('T')[0], description: '', severity: 'Low' });
  };

  return (
    <div className="page">
      <h2>⚠️ Misuse Incidents</h2>
      <form onSubmit={handleSubmit} className="form">
        <input placeholder="Member ID" value={form.member_id} onChange={(e) => setForm({...form, member_id: e.target.value})} required />
        <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}></textarea>
        <select value={form.severity} onChange={(e) => setForm({...form, severity: e.target.value})}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        <button type="submit">Flag Misuse</button>
      </form>
    </div>
  );
};

const Leave = () => {
  const [form, setForm] = useState({ member_id: '', start_date: '', end_date: '', reason: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/leave', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(form)
    });
    alert('Leave application submitted');
    setForm({ member_id: '', start_date: '', end_date: '', reason: '' });
  };

  return (
    <div className="page">
      <h2>🔄 Leave Management</h2>
      <form onSubmit={handleSubmit} className="form">
        <input placeholder="Member ID" value={form.member_id} onChange={(e) => setForm({...form, member_id: e.target.value})} required />
        <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} required />
        <input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} required />
        <textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})}></textarea>
        <button type="submit">Apply Leave</button>
      </form>
    </div>
  );
};

// Main App
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  const pages = {
    dashboard: <Dashboard />,
    members: <Members />,
    'meal-plans': <MealPlans />,
    attendance: <Attendance />,
    payments: <Payments />,
    misuse: <Misuse />,
    leave: <Leave />
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">🍽️ Mess Management</div>
        <div className="nav-menu">
          {Object.keys(pages).map(page => (
            <button key={page} className={`nav-link ${currentPage === page ? 'active' : ''}`} 
              onClick={() => setCurrentPage(page)}>
              {page === 'dashboard' && '📊 Dashboard'}
              {page === 'members' && '👥 Members'}
              {page === 'meal-plans' && '📋 Meal Plans'}
              {page === 'attendance' && '✅ Attendance'}
              {page === 'payments' && '💳 Payments'}
              {page === 'misuse' && '⚠️ Misuse'}
              {page === 'leave' && '🔄 Leave'}
            </button>
          ))}
        </div>
        <button onClick={() => { localStorage.clear(); setIsLoggedIn(false); }} className="logout-btn">Logout</button>
      </nav>
      <main className="main">{pages[currentPage]}</main>
    </div>
  );
}
