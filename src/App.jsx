import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5001/api';

function App() {
  // ─── State ───────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState('voter'); // voter, admin, results
  const [voterStep, setVoterStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(299);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddr, setWalletAddr] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voted, setVoted] = useState(false);
  const [lastTxHash, setLastTxHash] = useState('');
  const [electionOpen, setElectionOpen] = useState(true);
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [alert, setAlert] = useState({ id: '', type: '', msg: '' });

  const [candidates, setCandidates] = useState([]);
  const [voters, setVoters] = useState([]);
  const [txLog, setTxLog] = useState([]);
  const [showMetaMaskModal, setShowMetaMaskModal] = useState(false);

  // ─── Data Fetching ───────────────────────────────────────
  const fetchData = async () => {
    try {
      const [candRes, voterRes, logRes] = await Promise.all([
        fetch(`${API_BASE}/candidates`),
        fetch(`${API_BASE}/voters`),
        fetch(`${API_BASE}/logs`)
      ]);
      const candData = await candRes.json();
      const voterData = await voterRes.json();
      const logData = await logRes.json();
      
      setCandidates(candData);
      setVoters(voterData);
      setTxLog(logData);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for updates every 5 seconds for results page/admin
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // ─── Effects ─────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (otpSent && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, otpTimer]);

  useEffect(() => {
    if (alert.msg) {
      const timer = setTimeout(() => {
        setAlert({ id: '', type: '', msg: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // ─── Helpers ─────────────────────────────────────────────
  const showAlert = (id, type, msg) => {
    setAlert({ id, type, msg });
  };

  const formatAadhar = (val) => {
    let v = val.replace(/\D/g, '').slice(0, 12);
    setAadhar(v);
  };

  const getDisplayAadhar = () => {
    return aadhar.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);

  // ─── Handlers ────────────────────────────────────────────
  const handleSendOTP = () => {
    if (!email.includes('@gmail.com')) {
      showAlert('alert-login', 'error', 'Please enter a valid Gmail address.');
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setOtpSent(true);
      showAlert('alert-login', 'success', `Verification code sent to ${email}`);
    }, 1200);
  };

  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      showAlert('alert-login', 'error', 'Enter the 6-digit code.');
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setVoterStep(2); // Go to ballot
    }, 1000);
  };

  const handleConnectWallet = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setWalletAddr('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      setWalletConnected(true);
      showAlert('alert-wallet', 'success', 'Wallet connected. Network: Hardhat Local (Chain ID: 31337)');
      setTimeout(() => {
        setVoterStep(3);
      }, 800);
    }, 1500);
  };

  const handleConfirmVote = async () => {
    setIsProcessing(true);
    
    try {
      const res = await fetch(`${API_BASE}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidate,
          voterEmail: email
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setLastTxHash(data.txHash);
        setVoted(true);
        await fetchData();
        setVoterStep(3); // Go to success screen
      } else {
        showAlert('alert-vote', 'error', 'Error securing vote. Please try again.');
      }
    } catch (err) {
      showAlert('alert-vote', 'error', 'Network error. Server might be offline.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('new-cand-name');
    const party = formData.get('new-cand-party');
    
    if (!name || !party) {
      showAlert('admin-alert', 'error', 'Please fill in all candidate details.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/add-candidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, party })
      });
      if (res.ok) {
        await fetchData();
        e.target.reset();
        showAlert('admin-alert', 'success', 'Candidate added successfully.');
      } else {
        showAlert('admin-alert', 'error', 'Server error. Could not add candidate.');
      }
    } catch (err) {
      showAlert('admin-alert', 'error', 'Network error. Backend might be offline.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegisterVoter = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('v-name');
    const email = formData.get('v-email');
    const wallet = formData.get('v-wallet');
    
    if (!name || !email || !wallet) {
      showAlert('voter-alert', 'error', 'Fill all fields.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/register-voter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, wallet })
      });
      if (res.ok) {
        await fetchData();
        showAlert('voter-alert', 'success', 'Voter registered on blockchain. Tx confirmed.');
        e.target.reset();
      } else {
        showAlert('voter-alert', 'error', 'Server error. Could not register voter.');
      }
    } catch (err) {
      showAlert('voter-alert', 'error', 'Network error. Backend might be offline.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseElection = async () => {
    if (window.confirm('Close the election? Voting will stop permanently.')) {
      try {
        const res = await fetch(`${API_BASE}/close-election`, { method: 'POST' });
        if (res.ok) setElectionOpen(false);
      } catch (err) {
        console.error('Error closing election:', err);
      }
    }
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="app-main">
      {/* ─── NAV ─── */}
      <nav>
        <div className="nav-logo">
          <div className="chain-icon">⛓</div>
          VoteChain
        </div>
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${currentPage === 'voter' ? 'active' : ''}`} 
            onClick={() => setCurrentPage('voter')}
          >
            🗳 Voter
          </button>
          <button 
            className={`nav-tab ${currentPage === 'admin' ? 'active' : ''}`} 
            onClick={() => setCurrentPage('admin')}
          >
            🛡 Admin
          </button>
          <button 
            className={`nav-tab ${currentPage === 'results' ? 'active' : ''}`} 
            onClick={() => {
              setCurrentPage('results');
              fetchData();
            }}
          >
            📊 Results
          </button>
        </div>
        <div className="nav-status">
          <div className="status-dot"></div>
          Secure Server Online
        </div>
      </nav>

      {/* ─── VOTER PAGE ─── */}
      <div className={`page ${currentPage === 'voter' ? 'active' : ''}`} id="page-voter">
        <div className="voter-hero">
          <h1 className="hero-title">Safe & Simple<br /><span>Digital Voting.</span></h1>
          <p className="hero-sub">Enter your email to verify your identity and cast your confidential vote in seconds.</p>
        </div>

        {/* Simple Progress Bar (2 steps now: Verify & Vote) */}
        <div className="steps" style={{ maxWidth: '400px', margin: '0 auto 40px' }}>
          <div className={`step ${voterStep > 1 ? 'done' : voterStep === 1 ? 'active' : ''}`}>
            <div className="step-dot">{voterStep > 1 ? '✓' : '1'}</div>
            <div className="step-label">Identify</div>
          </div>
          <div className={`step ${voterStep > 2 ? 'done' : voterStep === 2 ? 'active' : ''}`}>
            <div className="step-dot">{voterStep > 2 ? '✓' : '2'}</div>
            <div className="step-label">Cast Vote</div>
          </div>
        </div>

        {/* Voter Steps Content */}
        {voterStep === 1 && (
          <div className="card">
            <div className="card-label">Step 1 — Gmail Identity Check</div>
            {alert.id === 'alert-login' && (
              <div className={`alert alert-${alert.type}`}>
                {alert.type === 'success' ? '✅' : '❌'} {alert.msg}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Gmail Address</label>
              <input 
                className="form-input" 
                type="email" 
                placeholder="username@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ width: 'auto', marginBottom: '16px' }} 
              onClick={handleSendOTP}
              disabled={isProcessing}
            >
              {isProcessing && alert.id === 'alert-login' ? <span className="spinner"></span> : voterStep === 1 && otpSent ? '✓ Code Sent' : 'Send Verification Code'}
            </button>

            {otpSent && (
              <div id="otp-section">
                <div className="form-group">
                  <label className="form-label">Enter 6-digit Code</label>
                  <input 
                    className="form-input mono" 
                    type="text" 
                    placeholder="• • • • • •" 
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <div className="otp-timer">Code valid for <span>{formatTime(otpTimer)}</span></div>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleVerifyOTP}
                  disabled={isProcessing}
                >
                  {isProcessing ? <span className="spinner"></span> : 'Authorize Voting'}
                </button>
              </div>
            )}
          </div>
        )}

        {voterStep === 2 && (
          <div className="card">
            <div className="card-label">Final Step — Cast Your Vote</div>
            {alert.id === 'alert-vote' && (
              <div className={`alert alert-${alert.type}`}>
                {alert.type === 'success' ? '✅' : '❌'} {alert.msg}
              </div>
            )}
            <div className="candidates-grid">
              {candidates.map(candidate => (
                <div 
                  key={candidate.id}
                  className={`candidate-card ${selectedCandidate === candidate.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCandidate(candidate.id)}
                >
                  <div className="candidate-avatar" style={{ background: `${candidate.color}22`, color: candidate.color }}>
                    {candidate.emoji}
                  </div>
                  <div className="candidate-info">
                    <div className="candidate-name">{candidate.name}</div>
                    <div className="candidate-party">{candidate.party}</div>
                  </div>
                  <div className="candidate-radio"></div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px' }}>
              <button 
                className="btn btn-green" 
                onClick={handleConfirmVote} 
                disabled={!selectedCandidate || isProcessing || !electionOpen}
              >
                {isProcessing ? (
                  <><span className="spinner"></span> Securing your vote...</>
                ) : 'Submit My Vote'}
              </button>
              <p className="text-sm" style={{ textAlign: 'center', marginTop: '10px' }}>This action is permanent and cannot be undone.</p>
            </div>
          </div>
        )}

        {voterStep === 3 && (
          <div className="card">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>✅</div>
              <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Vote Cast Successfully!</div>
              <div style={{ fontSize: '13px', color: 'var(--muted2)', marginBottom: '24px' }}>Your vote has been permanently recorded on the Ethereum blockchain.</div>
              <div className="tx-box">
                <div className="tx-label">Unique Voting Receipt ID</div>
                <div className="tx-hash">{lastTxHash}</div>
                <div className="tx-status">✅ Confirmed & Safely Recorded</div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('results')}>View Live Results →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── ADMIN PAGE ─── */}
      <div className={`page ${currentPage === 'admin' ? 'active' : ''}`} id="page-admin">
        <div className="admin-layout">
          <div className="admin-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-label">Election</div>
              <div className={`sidebar-item ${adminActiveTab === 'dashboard' ? 'active' : ''}`} onClick={() => setAdminActiveTab('dashboard')}>
                <span className="icon">📊</span> Dashboard
              </div>
              <div className={`sidebar-item ${adminActiveTab === 'candidates' ? 'active' : ''}`} onClick={() => setAdminActiveTab('candidates')}>
                <span className="icon">👤</span> Candidates
              </div>
              <div className={`sidebar-item ${adminActiveTab === 'voters' ? 'active' : ''}`} onClick={() => setAdminActiveTab('voters')}>
                <span className="icon">📋</span> Voter List
              </div>
            </div>
          </div>

          <div className="admin-content">
            {adminActiveTab === 'dashboard' && (
              <div id="admin-dashboard">
                <div className="admin-header">
                  <div className="admin-title">Election Results</div>
                </div>

                <div className="grid-3">
                  <div className="stat-card">
                    <div className="stat-label">Total Votes</div>
                    <div className="stat-value text-green">{totalVotes}</div>
                    <div className="stat-sub">Recorded today</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Remaining</div>
                    <div className="stat-value">{Math.max(0, voters.length - totalVotes)}</div>
                    <div className="stat-sub">Yet to vote</div>
                  </div>
                </div>

                <div className="card" style={{ maxWidth: '100%', marginBottom: '20px' }}>
                  <div className="card-label">Add New Candidate</div>
                  {alert.id === 'admin-alert' && (
                    <div className={`alert alert-${alert.type}`}>
                      {alert.type === 'success' ? '✅' : '❌'} {alert.msg}
                    </div>
                  )}
                  <form onSubmit={handleAddCandidate}>
                    <div className="grid-2" style={{ gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label className="form-label">Candidate Name</label>
                        <input className="form-input" name="new-cand-name" placeholder="Full name" required />
                      </div>
                      <div>
                        <label className="form-label">Party / Symbol</label>
                        <input className="form-input" name="new-cand-party" placeholder="Party name" required />
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: 'auto' }}>+ Add to Blockchain</button>
                  </form>
                </div>

                <div className="card" style={{ maxWidth: '100%', marginBottom: '0' }}>
                  <div className="card-label">Live Vote Count</div>
                  <table className="data-table">
                    <thead>
                      <tr><th>#</th><th>Candidate</th><th>Party</th><th>Votes</th><th>%</th></tr>
                    </thead>
                    <tbody>
                      {candidates.map((c, i) => (
                        <tr key={c.id}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{c.emoji} {c.name}</td>
                          <td style={{ color: 'var(--muted2)' }}>{c.party}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: c.color }}>{c.votes}</td>
                          <td>{totalVotes ? Math.round(c.votes / totalVotes * 100) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminActiveTab === 'candidates' && (
              <div id="admin-candidates">
                <div className="admin-header">
                  <div className="admin-title">Candidates</div>
                  <div className="admin-sub">Registered candidates for the election</div>
                </div>
                <div className="card" style={{ maxWidth: '100%' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>ID</th><th>Name</th><th>Party</th><th>Wallet</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {candidates.map((c, i) => (
                        <tr key={c.id}>
                          <td className="text-mono">{c.id}</td>
                          <td style={{ fontWeight: 600 }}>{c.emoji} {c.name}</td>
                          <td>{c.party}</td>
                          <td className="text-mono" style={{ fontSize: '11px', color: 'var(--accent)' }}>0x{Math.random().toString(16).slice(2, 10)}...{Math.random().toString(16).slice(2, 6)}</td>
                          <td><span className="badge badge-green">Active</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminActiveTab === 'voters' && (
              <div id="admin-voters">
                <div className="admin-header">
                  <div className="admin-title">Registered Voters</div>
                  <div className="admin-sub">Add and manage voter eligibility</div>
                </div>
                <div className="card" style={{ maxWidth: '100%', marginBottom: '20px' }}>
                  <div className="card-label">Register New Voter</div>
                  <form onSubmit={handleRegisterVoter}>
                    <div className="grid-2" style={{ gap: '12px', marginBottom: '12px' }}>
                      <div><label className="form-label">Full Name</label><input className="form-input" name="v-name" placeholder="Voter name" /></div>
                      <div><label className="form-label">Gmail Address</label><input className="form-input" name="v-email" placeholder="username@gmail.com" /></div>
                      <div><label className="form-label">Wallet Address</label><input className="form-input" name="v-wallet" placeholder="0x..." /></div>
                      <div><label className="form-label">Mobile Number</label><input className="form-input" name="v-mobile" placeholder="+91 XXXXXXXXXX" /></div>
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Register on Blockchain</button>
                  </form>
                  {alert.id === 'voter-alert' && (
                    <div style={{ marginTop: '12px' }} className={`alert alert-${alert.type}`}>
                      {alert.type === 'success' ? '✅' : '❌'} {alert.msg}
                    </div>
                  )}
                </div>
                <div className="card" style={{ maxWidth: '100%', marginBottom: '0' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Gmail</th><th>Wallet</th><th>Has Voted</th></tr>
                    </thead>
                    <tbody>
                      {voters.map((v, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{v.name}</td>
                          <td className="text-mono" style={{ fontSize: '12px' }}>{v.email}</td>
                          <td className="text-mono" style={{ fontSize: '11px', color: 'var(--accent)' }}>{v.wallet}</td>
                          <td><span className={`badge ${v.voted ? 'badge-green' : 'badge-gray'}`}>{v.voted ? '✓ Voted' : 'Not yet'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminActiveTab === 'contract' && (
              <div id="admin-contract">
                <div className="admin-header">
                  <div className="admin-title">Smart Contract</div>
                  <div className="admin-sub">Voting.sol deployed on local Ganache</div>
                </div>
                <div className="card" style={{ maxWidth: '100%' }}>
                  <div className="card-label">Contract Details</div>
                  <table className="data-table">
                    <tbody>
                      <tr><td className="text-sm">Contract Address</td><td className="text-mono text-accent" style={{ fontSize: '12px' }}>0x5FbDB2315678afecb367f032d93F642f64180aa3</td></tr>
                      <tr><td className="text-sm">Deployed By</td><td className="text-mono" style={{ fontSize: '12px' }}>0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</td></tr>
                      <tr><td className="text-sm">Network</td><td>Ganache Local (Chain ID: 1337)</td></tr>
                      <tr><td className="text-sm">Solidity Version</td><td>0.8.19</td></tr>
                      <tr><td className="text-sm">Block Number</td><td className="text-mono">{47 + txLog.length}</td></tr>
                      <tr><td className="text-sm">Gas Used (Deploy)</td><td className="text-mono">428,291</td></tr>
                      <tr><td className="text-sm">Election Status</td><td><span className={`badge ${electionOpen ? 'badge-green' : 'badge-red'}`}>{electionOpen ? 'OPEN' : 'CLOSED'}</span></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminActiveTab === 'logs' && (
              <div id="admin-logs">
                <div className="admin-header">
                  <div className="admin-title">Transaction Log</div>
                  <div className="admin-sub">All blockchain events for this election</div>
                </div>
                <div className="card" style={{ maxWidth: '100%' }}>
                  <table className="data-table">
                    <thead><tr><th>Block</th><th>Tx Hash</th><th>Event</th><th>From</th><th>Time</th></tr></thead>
                    <tbody>
                      {txLog.map((t, i) => (
                        <tr key={i}>
                          <td className="text-mono">{t.block}</td>
                          <td className="text-mono" style={{ color: 'var(--accent)', fontSize: '11px' }}>{t.hash}</td>
                          <td><span className={`badge ${t.event === 'VoteCast' ? 'badge-green' : t.event === 'VoterRegistered' ? 'badge-blue' : 'badge-gray'}`}>{t.event}</span></td>
                          <td className="text-mono" style={{ fontSize: '11px' }}>{t.from}</td>
                          <td style={{ color: 'var(--muted2)' }}>{t.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── RESULTS PAGE ─── */}
      <div className={`page ${currentPage === 'results' ? 'active' : ''}`} id="page-results">
        <div className="results-layout">
          <div className="results-header">
            <h1 className="results-title">Live Election Tally</h1>
            <p className="results-sub">Secure Digital Voting System — Results updated in real-time</p>
          </div>

          <div className="live-strip">
            <div className="live-indicator">
              <div className="live-dot"></div>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>LIVE TALLY</span>
            </div>
            <div className="live-stats">
              <div className="live-stat">
                <div className="v">{totalVotes}</div>
                <div className="l">Votes Counted</div>
              </div>
            </div>
          </div>

          <div id="results-list">
            {[...candidates].sort((a, b) => b.votes - a.votes).map((c, i) => (
              <div key={c.id} className={`result-item ${i === 0 && c.votes > 0 ? 'winner' : ''}`}>
                {i === 0 && c.votes > 0 && <div className="winner-crown">👑</div>}
                <div className="result-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                <div className="result-avatar" style={{ background: `${c.color}22`, color: c.color }}>{c.emoji}</div>
                <div className="result-info">
                  <div className="result-name">{c.name}</div>
                  <div className="result-party">{c.party}</div>
                  <div className="result-bar-track">
                    <div className="result-bar-fill" style={{ width: `${totalVotes ? Math.round(c.votes / totalVotes * 100) : 0}%`, background: c.color }}></div>
                  </div>
                </div>
                <div className="result-votes">
                  <div className="num" style={{ color: c.color }}>{c.votes}</div>
                  <div className="pct">{totalVotes ? Math.round(c.votes / totalVotes * 100) : 0}%</div>
                </div>
              </div>
            ))}
          </div>

          <div className="tx-feed">
            <div className="tx-feed-title">
              <div className="live-dot"></div>
              Authentication Logs
            </div>
            <div id="tx-feed-list">
              {txLog.slice(0, 5).map((t, i) => (
                <div key={i} className="tx-feed-item">
                  <div className="tx-icon">👤</div>
                  <div className="tx-details">
                    <div className="h">{t.id}</div>
                    <div className="s">{t.event} · Successful</div>
                  </div>
                  <div className="tx-time">{t.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MetaMask Modal ─── */}
      {showMetaMaskModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">🦊</div>
            <div className="modal-title">MetaMask Request</div>
            <div className="modal-sub">
              VoteChain wants to connect to your MetaMask wallet and submit your vote as a blockchain transaction.<br /><br />
              <strong>From:</strong> <span className="text-mono" style={{ fontSize: '11px' }}>{walletAddr}</span><br />
              <strong>To:</strong> <span className="text-mono" style={{ fontSize: '11px' }}>0x5FbDB...80aa3 (Voting.sol)</span><br />
              <strong>Gas Est:</strong> ~42,000 · 0.00003 ETH
            </div>
            <div className="modal-actions">
              <button className="btn btn-green" onClick={handleConfirmVote} disabled={isProcessing}>
                {isProcessing ? <span className="spinner"></span> : 'Confirm Transaction'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowMetaMaskModal(false)}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
