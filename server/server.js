import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'db.json');
const DEPLOYED_CONTRACT_PATH = path.join(__dirname, 'deployed_contract.json');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// ─── BLOCKCHAIN CONFIGURATION ─────────────────────────────
// Connect to the local Hardhat node
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

async function getContract() {
  try {
    const data = await fs.readFile(DEPLOYED_CONTRACT_PATH, 'utf-8');
    const { address, abi } = JSON.parse(data);
    
    // We'll use the first account from Hardhat to sign transactions (the "Relayer")
    // This makes the demo easy because the user doesn't need MetaMask gas
    const signer = await provider.getSigner(0); 
    
    return new ethers.Contract(address, abi, signer);
  } catch (err) {
    console.error("❌ Contract data not found. Run deployment first!");
    return null;
  }
}

// ─── DB HELPERS (For Voter Registration) ──────────────────
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    const initial = { voters: [], txLog: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// ─── API ENDPOINTS ───────────────────────────────────────

// 1. Fetch Candidates (FROM BLOCKCHAIN)
app.get('/api/candidates', async (req, res) => {
  const contract = await getContract();
  if (!contract) return res.status(500).json({ error: 'Contract not loaded' });

  try {
    const count = await contract.candidatesCount();
    const candidates = [];
    
    // Hardhat accounts for colors/emojis in UI
    const styles = [
      { emoji: '🔵', color: '#3b82f6', party: 'Independent' },
      { emoji: '🟢', color: '#10b981', party: 'National Front' },
      { emoji: '🟡', color: '#f59e0b', party: 'Youth Alliance' },
    ];

    for (let i = 1; i <= count; i++) {
        const c = await contract.candidates(i);
        candidates.push({
            id: Number(c.id),
            name: c.name,
            votes: Number(c.voteCount),
            party: styles[i-1]?.party || 'Independent',
            emoji: styles[i-1]?.emoji || '👤',
            color: styles[i-1]?.color || '#94a3b8'
        });
    }
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Cast a Vote (ON BLOCKCHAIN)
app.post('/api/vote', async (req, res) => {
  const { candidateId, voterEmail } = req.body;
  const contract = await getContract();
  if (!contract) return res.status(500).json({ error: 'Contract not loaded' });

  try {
    console.log(`🗳  Submitting vote for Candidate ${candidateId} to blockchain...`);
    
    // In a real app, you'd use the voter's specific wallet.
    // For this demo, we use a dedicated Hardhat account to handle the "Secure Transaction"
    const tx = await contract.vote(candidateId);
    const receipt = await tx.wait();
    
    const db = await readDB();
    db.txLog.unshift({
      id: receipt.hash,
      event: 'Vote Confirmed on Chain',
      email: voterEmail,
      time: new Date().toLocaleTimeString(),
      block: receipt.blockNumber
    });
    
    await writeDB(db);
    res.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Blockchain error: ' + err.reason || err.message });
  }
});

// 3. Add a New Candidate (ON BLOCKCHAIN)
app.post('/api/add-candidate', async (req, res) => {
  const { name } = req.body;
  const contract = await getContract();
  if (!contract) return res.status(500).json({ error: 'Contract not loaded' });

  try {
    console.log(`➕ Adding new candidate: ${name}...`);
    const tx = await contract.addCandidate(name);
    const receipt = await tx.wait();
    
    res.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add candidate: ' + err.message });
  }
});

// 4. Register a New Voter (Local DB)
app.post('/api/register-voter', async (req, res) => {
  const { name, email, wallet } = req.body;
  const db = await readDB();
  db.voters.push({ name, email, wallet, voted: false });
  await writeDB(db);
  res.json({ success: true });
});

// 4. Get Data Lists
app.get('/api/voters', async (req, res) => {
  const db = await readDB();
  res.json(db.voters);
});

app.get('/api/logs', async (req, res) => {
  const db = await readDB();
  res.json(db.txLog);
});

app.listen(PORT, () => {
  console.log(`🚀 Blockchain Backend running on http://localhost:${PORT}`);
  console.log(`📢 Connected to Hardhat node at http://127.0.0.1:8545`);
});
