package com.eaglerush.model;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LeaderboardRepository extends JpaRepository<Leaderboard, Long> {
    List<Leaderboard> findByPeriodOrderByScoreDesc(String period);
    List<Leaderboard> findByWalletAndPeriod(String wallet, String period);
}
