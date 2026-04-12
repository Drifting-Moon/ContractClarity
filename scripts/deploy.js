import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying Voting contract to local network...");

  // Candidates list
  const candidates = ["Arjun Sharma", "Priya Mehta", "Rajan Singh"];

  // Get the contract factory
  const Voting = await hre.ethers.getContractFactory("Voting");
  
  // Deploy the contract
  const voting = await Voting.deploy(candidates);

  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log("✅ Voting contract deployed to:", address);

  // Get the ABI from the artifacts
  // Note: Adjust path if artifacts are in a different location
  const artifactPath = path.join(__dirname, "../artifacts/contracts/Voting.sol/Voting.json");
  
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Save the address and ABI to a file for the backend to use
    const deployData = {
      address: address,
      abi: artifact.abi
    };

    const deployPath = path.join(__dirname, "../server/deployed_contract.json");
    fs.writeFileSync(deployPath, JSON.stringify(deployData, null, 2));
    
    console.log("📄 Contract data saved to server/deployed_contract.json");
  } catch (err) {
    console.error("❌ Could not save artifact data. Make sure you have compiled the contracts (npx hardhat compile).");
    console.error(err.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
