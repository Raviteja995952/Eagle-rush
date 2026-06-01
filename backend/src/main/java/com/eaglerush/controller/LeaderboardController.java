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
        int achievementsCount = (int) request.getOrDefault("achievementsCount", 0);
        String period = (String) request.getOrDefault("period", "ALLTIME"); // "DAILY", "WEEKLY", "MONTHLY", "ALLTIME"

        // Ensure user exists
        Optional<Player> playerOpt = playerRepository.findById(wallet);
        if (!playerOpt.isPresent()) {
            return ResponseEntity.badRequest().body("Player profile not found");
        }

        // Check if an entry for this wallet & period already exists
        List<Leaderboard> existingEntries = leaderboardRepository.findByWalletAndPeriod(wallet, period);
        Leaderboard entry;

        if (!existingEntries.isEmpty()) {
            entry = existingEntries.get(0);
            // Only update if the new score is higher
            if (score > entry.getScore()) {
                entry.setScore(score);
                entry.setLevel(level);
                entry.setXp(xp);
                entry.setAchievementsCount(achievementsCount);
                entry.setTimestamp(System.currentTimeMillis());
                leaderboardRepository.save(entry);
            }
        } else {
            entry = new Leaderboard(wallet, score, level, xp, achievementsCount, period, System.currentTimeMillis());
            leaderboardRepository.save(entry);
        }

        return ResponseEntity.ok(entry);
    }

    // Get leaderboard list sorted by score desc
    @GetMapping
    public ResponseEntity<?> getLeaderboard(@RequestParam(defaultValue = "ALLTIME") String period) {
        String queryPeriod = period.toUpperCase().trim();
        List<Leaderboard> list = leaderboardRepository.findByPeriodOrderByScoreDesc(queryPeriod);
        
        // Limit to top 50
        if (list.size() > 50) {
            list = list.subList(0, 50);
        }
        
        return ResponseEntity.ok(list);
    }
}
