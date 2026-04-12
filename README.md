# EtherVote — Blockchain Voting System

A decentralized voting system built for transparency and security. 
Votes are stored on a local Ethereum blockchain — once cast, 
they cannot be changed or deleted.

---

## What It Does

- Voters authenticate using OTP before voting
- Each vote is recorded as a real blockchain transaction
- Results update live directly from the blockchain
- Admin can monitor all votes, candidates, and transaction logs
- The same voter cannot vote twice — enforced by the smart contract

---

## Tech Stack

| Layer      | Technology                        |
+|------------|-----------------------------------|
+| Frontend   | React + Vite                      |
+| Backend    | Node.js + Express + Ethers.js     |
+| Blockchain | Hardhat (local Ethereum node)     |
+| Contract   | Solidity                          |

---

## Project Structure
```text
EtherVote/
├── contracts/
│   └── Voting.sol          # Smart contract
├── scripts/
│   └── deploy.js           # Deploys contract to local node
├── server/
│   └── server.js           # Backend API + blockchain bridge
├── src/
│   ├── App.jsx             # Main frontend logic
│   └── ...
├── hardhat.config.js       # Hardhat settings
└── package.json            # Frontend & Hardhat dependencies
```

---

## How to Run

**Step 1 — Install dependencies**
```bash
npm install
cd server && npm install
```

**Step 2 — Start local blockchain**
```bash
# Terminal 1
npx hardhat node
```

**Step 3 — Deploy smart contract**
```bash
# Terminal 2
npx hardhat run scripts/deploy.js --network localhost
```

**Step 4 — Start backend**
```bash
# Terminal 3
cd server
node server.js
```

**Step 5 — Start frontend**
```bash
# Terminal 4
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables
Create a `.env` file in the `server/` folder if you want to use custom ports:
```text
PORT=5001
RPC_URL=http://localhost:8545
```
