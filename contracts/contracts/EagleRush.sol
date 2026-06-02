// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EagleRush is ERC1155, Ownable {
    
    struct Player {
        uint256 level;
        uint256 xp;
        uint256 coins;
        uint256 streak;
        uint256 lastCheckIn;
        uint256 totalScore;
    }

    mapping(address => Player) public players;
    address[] public leaderboardAddresses;
    mapping(address => bool) public inLeaderboard;

    // Events
    event DailyCheckIn(address indexed player, uint256 streak, uint256 coinsRewarded);
    event HuntStarted(address indexed player, uint256 timestamp);
    event ScoreSubmitted(address indexed player, uint256 levelReached, uint256 score, uint256 combo);
    event AchievementUnlocked(address indexed player, uint256 achievementId);

    // NFT Achievement IDs
    uint256 public constant FIRST_HUNT_BADGE = 1;
    uint256 public constant LEVEL_20_MASTER = 2;
    uint256 public constant LEVEL_40_LEGEND = 3;

    constructor() ERC1155("https://eagle-rush.onrender.com/api/metadata/{id}.json") Ownable(msg.sender) {}

    function dailyCheckIn() external {
        Player storage p = players[msg.sender];
        
        // 24 hours = 86400 seconds. 
        // We allow checkin if it's been at least 20 hours to be forgiving.
        require(block.timestamp >= p.lastCheckIn + 20 hours || p.lastCheckIn == 0, "Already checked in recently");

        if (p.lastCheckIn == 0 || block.timestamp > p.lastCheckIn + 48 hours) {
            p.streak = 1;
        } else {
            p.streak += 1;
        }
        
        uint256 coinReward = 50;
        if (p.streak == 2) coinReward = 100;
        else if (p.streak == 3) coinReward = 150;
        else if (p.streak == 4) coinReward = 250;
        else if (p.streak == 5) coinReward = 500;
        else if (p.streak == 6) coinReward = 1000;
        else if (p.streak >= 7) coinReward = 5000;

        p.coins += coinReward;
        p.lastCheckIn = block.timestamp;
        
        // Initialize level if completely new
        if (p.level == 0) {
            p.level = 1;
            addToLeaderboard(msg.sender);
        }

        emit DailyCheckIn(msg.sender, p.streak, coinReward);
    }

    function startSkyHunt() external {
        Player storage p = players[msg.sender];
        if (p.level == 0) {
            p.level = 1;
            p.coins = 200; // Starting bonus
            addToLeaderboard(msg.sender);
        }
        emit HuntStarted(msg.sender, block.timestamp);
    }

    function submitScore(uint256 levelReached, uint256 score, uint256 combo) external {
        Player storage p = players[msg.sender];
        
        // Update player stats
        if (levelReached > p.level) {
            p.level = levelReached;
        }
        p.totalScore += score;
        
        // Coin calculation simplified
        uint256 earnedCoins = score / 10 + (combo * 5);
        p.coins += earnedCoins;
        
        // XP calculation
        uint256 earnedXp = score / 5;
        p.xp += earnedXp;

        // Level Up check (100 xp per level)
        uint256 targetXp = 100 * p.level;
        if (p.xp >= targetXp) {
            p.level++;
            p.xp -= targetXp;
        }

        emit ScoreSubmitted(msg.sender, p.level, score, combo);
    }

    function unlockAchievement(uint256 achievementId) external {
        require(balanceOf(msg.sender, achievementId) == 0, "Achievement already unlocked");
        
        Player storage p = players[msg.sender];
        
        if (achievementId == FIRST_HUNT_BADGE) {
            require(p.totalScore > 0, "Must play to unlock");
        } else if (achievementId == LEVEL_20_MASTER) {
            require(p.level >= 20, "Level too low");
        } else if (achievementId == LEVEL_40_LEGEND) {
            require(p.level >= 40, "Level too low");
        } else {
            revert("Invalid achievement");
        }

        _mint(msg.sender, achievementId, 1, "");
        emit AchievementUnlocked(msg.sender, achievementId);
    }

    function addToLeaderboard(address playerAddress) internal {
        if (!inLeaderboard[playerAddress]) {
            leaderboardAddresses.push(playerAddress);
            inLeaderboard[playerAddress] = true;
        }
    }

    function getLeaderboard() external view returns (address[] memory, uint256[] memory, uint256[] memory, uint256[] memory) {
        uint256 count = leaderboardAddresses.length;
        address[] memory addrs = new address[](count);
        uint256[] memory scores = new uint256[](count);
        uint256[] memory levels = new uint256[](count);
        uint256[] memory coinsArr = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            address playerAddr = leaderboardAddresses[i];
            addrs[i] = playerAddr;
            scores[i] = players[playerAddr].totalScore;
            levels[i] = players[playerAddr].level;
            coinsArr[i] = players[playerAddr].coins;
        }
        
        return (addrs, scores, levels, coinsArr);
    }

    // Owner function to set URI for NFTs
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }
}
