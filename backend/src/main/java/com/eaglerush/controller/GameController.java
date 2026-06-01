package com.eaglerush.controller;

import com.eaglerush.model.Player;
import com.eaglerush.model.PlayerRepository;
import com.eaglerush.service.SecurityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/game")
@CrossOrigin(origins = "*")
public class GameController {

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private SecurityService securityService;

    // Connect wallet & fetch or initialize profile
    @PostMapping("/connect")
    public ResponseEntity<?> connectWallet(@RequestBody Map<String, String> request) {
        String wallet = request.get("wallet");
        if (wallet == null || wallet.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Wallet address is required");
        }
        
        wallet = wallet.toLowerCase().trim();
        Optional<Player> existingPlayer = playerRepository.findById(wallet);
        Player player;
        
        if (existingPlayer.isPresent()) {
            player = existingPlayer.get();
            player.setLastLogin(System.currentTimeMillis());
            playerRepository.save(player);
        } else {
            player = new Player(wallet);
            player.setLastLogin(System.currentTimeMillis());
            playerRepository.save(player);
        }
        
        return ResponseEntity.ok(player);
    }

    // Save Progress (Encoded)
    @PostMapping("/save")
    public ResponseEntity<?> saveProgress(@RequestBody Map<String, Object> request) {
        String wallet = (String) request.get("wallet");
        if (wallet == null) {
            return ResponseEntity.badRequest().body("Wallet is required");
        }
        wallet = wallet.toLowerCase().trim();

        Optional<Player> existingPlayer = playerRepository.findById(wallet);
        if (!existingPlayer.isPresent()) {
            return ResponseEntity.badRequest().body("Player profile not found");
        }

        Player player = existingPlayer.get();

        // Extract Security Parameters
        int level = (int) request.getOrDefault("level", player.getLevel());
        int xp = (int) request.getOrDefault("xp", player.getXp());
        int coins = (int) request.getOrDefault("coins", player.getCoins());
        int streak = (int) request.getOrDefault("streak", player.getStreak());
        String unlockedSkins = (String) request.getOrDefault("unlockedSkins", player.getUnlockedSkins());
        String achievements = (String) request.getOrDefault("achievements", player.getAchievements());
        String inventory = (String) request.getOrDefault("inventory", player.getInventory());
        String encodedProgress = (String) request.getOrDefault("encodedProgress", player.getEncodedProgress());

        // Dynamic metrics for anti-bot
        int score = (int) request.getOrDefault("score", 0);
        int clicks = (int) request.getOrDefault("clicks", 0);
        int hits = (int) request.getOrDefault("hits", 0);
        int playDurationSeconds = (int) request.getOrDefault("playDurationSeconds", 0);
        double minClickIntervalMs = ((Number) request.getOrDefault("minClickIntervalMs", 0.0)).doubleValue();
        double avgClickIntervalMs = ((Number) request.getOrDefault("avgClickIntervalMs", 0.0)).doubleValue();
        double clickIntervalStdDev = ((Number) request.getOrDefault("clickIntervalStdDev", 0.0)).doubleValue();
        boolean mouseTracked = (boolean) request.getOrDefault("mouseTracked", true);
        String signature = (String) request.getOrDefault("signature", "");

        // Perform Server-Side Anti-Bot Assessment if playing a match
        if (clicks > 0 || hits > 0) {
            boolean isValid = securityService.validateGameSession(
                wallet, score, level, clicks, hits, playDurationSeconds,
                minClickIntervalMs, avgClickIntervalMs, clickIntervalStdDev, mouseTracked, signature
            );

            if (!isValid) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Anti-Bot System Triggered");
                errorResponse.put("reason", "Suspicious click intervals or abnormal pattern detected");
                errorResponse.put("flagged", true);
                return ResponseEntity.status(403).body(errorResponse);
            }
        }

        // Save Player
        player.setLevel(level);
        player.setXp(xp);
        player.setCoins(coins);
        player.setStreak(streak);
        player.setUnlockedSkins(unlockedSkins);
        player.setAchievements(achievements);
        player.setInventory(inventory);
        player.setEncodedProgress(encodedProgress);
        
        playerRepository.save(player);

        return ResponseEntity.ok(player);
    }

    // Claim Daily Streak Check-in
    @PostMapping("/checkin")
    public ResponseEntity<?> dailyCheckin(@RequestBody Map<String, String> request) {
        String wallet = request.get("wallet");
        if (wallet == null) {
            return ResponseEntity.badRequest().body("Wallet is required");
        }
        wallet = wallet.toLowerCase().trim();

        Optional<Player> existingPlayer = playerRepository.findById(wallet);
        if (!existingPlayer.isPresent()) {
            return ResponseEntity.badRequest().body("Player profile not found");
        }

        Player player = existingPlayer.get();
        long now = System.currentTimeMillis();
        long oneDayMs = 24 * 60 * 60 * 1000L;
        long lastCheckIn = player.getLastCheckIn() != null ? player.getLastCheckIn() : 0L;

        // Reset streak if missed more than 48 hours
        if (lastCheckIn > 0 && (now - lastCheckIn) > (2 * oneDayMs)) {
            player.setStreak(0);
        }

        // Prevent claiming twice in 24 hours
        if (lastCheckIn > 0 && (now - lastCheckIn) < oneDayMs) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Already claimed today");
            errorResponse.put("cooldown", oneDayMs - (now - lastCheckIn));
            return ResponseEntity.badRequest().body(errorResponse);
        }

        // Increment streak
        int newStreak = player.getStreak() + 1;
        if (newStreak > 7) {
            newStreak = 1; // resets after 7 days
        }

        // Allocate Coins based on daily calendar
        int coinReward = 0;
        String extraReward = "";
        
        switch (newStreak) {
            case 1: coinReward = 50; break;
            case 2: coinReward = 100; break;
            case 3: coinReward = 150; break;
            case 4: coinReward = 250; break;
            case 5: coinReward = 500; break;
            case 6: 
                coinReward = 1000; 
                extraReward = "Rare Chest";
                String inv = player.getInventory();
                inv = inv.isEmpty() ? "rare_chest" : inv + ",rare_chest";
                player.setInventory(inv);
                break;
            case 7: 
                coinReward = 5000; 
                extraReward = "Legendary Phoenix Skin";
                String skins = player.getUnlockedSkins();
                if (!skins.contains("legendary_phoenix")) {
                    skins = skins + ",legendary_phoenix";
                    player.setUnlockedSkins(skins);
                }
                break;
        }

        player.setStreak(newStreak);
        player.setCoins(player.getCoins() + coinReward);
        player.setLastCheckIn(now);
        
        playerRepository.save(player);

        Map<String, Object> response = new HashMap<>();
        response.put("streak", newStreak);
        response.put("coinReward", coinReward);
        response.put("extraReward", extraReward);
        response.put("totalCoins", player.getCoins());
        response.put("player", player);

        return ResponseEntity.ok(response);
    }
}
