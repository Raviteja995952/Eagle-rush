package com.eaglerush.service;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SecurityService {

    // Simple security validation for game scores
    public boolean validateGameSession(
            String wallet,
            int score,
            int level,
            int clicks,
            int hits,
            int playDurationSeconds,
            double minClickIntervalMs,
            double avgClickIntervalMs,
            double clickIntervalStdDev,
            boolean mouseTracked,
            String signature
    ) {
        // Rule 1: No negative scores or impossible totals
        if (score < -500 || score > 50000) {
            return false; // Impossible score bounds
        }

        // Rule 2: Minimum game play duration checks (unless level is extremely low or user failed immediately)
        if (playDurationSeconds < 5 && score > 100) {
            return false; // Suspiciously high score in short duration
        }

        // Rule 3: Click frequency calculation
        if (playDurationSeconds > 0) {
            double clicksPerSecond = (double) clicks / playDurationSeconds;
            if (clicksPerSecond > 22.0) {
                return false; // Humanly impossible sustained clicking speed (> 22 clicks/sec)
            }
        }

        // Rule 4: Standard Deviation check for robotic/scripted patterns
        // If click count is substantial and standard deviation is incredibly small (e.g., < 2ms), it indicates an auto-clicker
        if (clicks > 15 && clickIntervalStdDev < 4.0 && clickIntervalStdDev >= 0.0) {
            return false; // Auto-clicker pattern detected (perfectly timed clicks)
        }

        // Rule 5: Minimum click interval
        // If the fastest click was faster than 35ms, it is extremely likely an auto-clicker
        if (clicks > 5 && minClickIntervalMs > 0 && minClickIntervalMs < 35.0) {
            return false; // Impossible human reaction/click threshold
        }

        // Rule 6: Hit ratios and scores
        // Score must match the count of hits, taking into account multipliers. 
        // Max theoretical points per hit: 200 (Mythic Eagle) * 5 (50+ Combo Multiplier) = 1000.
        // If the score is higher than hits * 1000, it is manipulated.
        if (hits > 0 && score > (hits * 1000)) {
            return false; // Extrapolated points exploit
        }

        // Rule 7: Basic signature validation (e.g., verifying if signature is present)
        if (signature == null || signature.isEmpty()) {
            return false; // Missing cryptographic request signature
        }

        // All checks passed
        return true;
    }
}
