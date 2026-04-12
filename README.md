# VoteChain

A simple decentralized voting system built with Hardhat, React, and Node.js. It uses a local blockchain to record and count votes securely.

## Features
- **Blockchain Core**: Publicly verifiable votes using a Solidity smart contract.
- **Admin Dashboard**: Add candidates and monitor live results.
- **Voter Portal**: Gmail-based identity check and secure voting interface.
- **Transaction Logs**: Real-time display of block numbers and transaction hashes.

## Tech Stack
- **Frontend**: React + Vite (Vanilla CSS for styling)
- **Backend**: Express.js + Ethers.js
- **Blockchain**: Hardhat (local Ethereum node)

## Quick Start
To run this project locally, you need 4 terminal windows open:

1. **Start Blockchain**:
   ```bash
   npx hardhat node
   ```
2. **Deploy Contract**:
   ```bash
   # In another terminal after node is up
   npx hardhat run scripts/deploy.js --network localhost
   ```
3. **Start Backend**:
   ```bash
   cd server
   npm install
   node server.js
   ```
4. **Start Frontend**:
   ```bash
   npm install
   npm run dev
   ```

## Project Structure
- `/contracts`: Solidity smart contract for voting logic.
- `/src`: React frontend files.
- `/server`: Express backend acting as a bridge to the blockchain.
- `/scripts`: Deployment scripts for Hardhat.
