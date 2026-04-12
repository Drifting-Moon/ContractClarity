// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    mapping(uint => Candidate) public candidates;
    mapping(address => bool) public hasVoted;
    uint public candidatesCount;

    // Constructor to add initial candidates
    constructor(string[] memory _names) {
        for (uint i = 0; i < _names.length; i++) {
            addCandidate(_names[i]);
        }
    }

    function addCandidate(string memory _name) public {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }

    function vote(uint _candidateId) public {
        // Simple double-vote prevention
        require(!hasVoted[msg.sender], "Already voted.");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid ID.");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
    }

    function getVotes(uint _candidateId) public view returns (uint) {
        return candidates[_candidateId].voteCount;
    }
}
