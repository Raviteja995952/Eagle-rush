package com.eaglerush.controller;

import com.eaglerush.model.Leaderboard;
import com.eaglerush.model.LeaderboardRepository;
import com.eaglerush.model.Player;
import com.eaglerush.model.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/leaderboard")
@CrossOrigin(origins = "*")
public class LeaderboardController {

    @Autowired
    private LeaderboardRepository leaderboardRepository;

    @Autowired
    private PlayerRepository playerRepository;

    // Submit a score to leaderboards
    @PostMapping("/submit")
    public ResponseEntity<?> submitScore(@RequestBody Map<String, Object> request) {
        String wallet = (String) request.get("wallet");
        if (wallet == null) {
            return ResponseEntity.badRequest().body("Wallet is required");
        }
        wallet = wallet.toLowerCase().trim();

        int score = (int) request.getOrDefault("score", 0);
        int level = (int) request.getOrDefault("level", 1);
        int xp = (int) request.getOrDefault("xp", 0);
        int coins = (int) request.getOrDefault("coins", 0);
        int combo = (int) request.getOrDefault("combo", 0);
        int achievementsCount = (int) request.getOrDefault("achievementsCount", 0);

        // Ensure user exists
        Optional<Player> playerOpt = playerRepository.findById(wallet);
        if (!playerOpt.isPresent()) {
            return ResponseEntity.badRequest().body("Player profile not found");
        }

        String[] periods = {"DAILY", "WEEKLY", "MONTHLY", "ALLTIME"};
        for (String p : periods) {
            List<Leaderboard> existingEntries = leaderboardRepository.findByWalletAndPeriod(wallet, p);
            Leaderboard entry;

            if (!existingEntries.isEmpty()) {
                entry = existingEntries.get(0);
                // Update if the new score is higher, or if score is equal but xp is higher
                if (score > entry.getScore() || (score == entry.getScore() && xp > entry.getXp())) {
                    entry.setScore(score);
                    entry.setLevel(level);
                    entry.setXp(xp);
                    entry.setCoins(coins);
                    entry.setCombo(combo);
                    entry.setAchievementsCount(achievementsCount);
                    entry.setTimestamp(System.currentTimeMillis());
                    leaderboardRepository.save(entry);
                }
            } else {
                entry = new Leaderboard(wallet, score, level, xp, coins, combo, achievementsCount, p, System.currentTimeMillis());
                leaderboardRepository.save(entry);
            }
        }

        return ResponseEntity.ok(java.util.Collections.singletonMap("message", "Score submitted successfully"));
    }

    // Get leaderboard list sorted by score desc, xp desc, level desc
    @GetMapping
    public ResponseEntity<?> getLeaderboard(@RequestParam(defaultValue = "ALLTIME") String period) {
        String queryPeriod = period.toUpperCase().trim();
        List<Leaderboard> list = leaderboardRepository.findByPeriodOrderByScoreDescXpDescLevelDesc(queryPeriod);
        
        java.util.List<Map<String, Object>> response = new java.util.ArrayList<>();
        int rank = 1;
        for (Leaderboard lb : list) {
            Map<String, Object> dto = new java.util.HashMap<>();
            dto.put("rank", rank++);
            dto.put("wallet", lb.getWallet());
            dto.put("score", lb.getScore());
            dto.put("level", lb.getLevel());
            dto.put("xp", lb.getXp());
            dto.put("coins", lb.getCoins());
            dto.put("combo", lb.getCombo());
            dto.put("timestamp", lb.getTimestamp());
            response.add(dto);
        }
        
        return ResponseEntity.ok(response);
    }
}
