package com.eaglerush.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

@Entity
@Table(name = "leaderboards")
public class Leaderboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String wallet;

    private int score;
    private int level;
    private int xp;
    private int achievementsCount;

    @Column(nullable = false)
    private String period; // "DAILY", "WEEKLY", "MONTHLY", "ALLTIME"

    @Column(nullable = false)
    private Long timestamp;

    public Leaderboard() {}

    public Leaderboard(String wallet, int score, int level, int xp, int achievementsCount, String period, Long timestamp) {
        this.wallet = wallet;
        this.score = score;
        this.level = level;
        this.xp = xp;
        this.achievementsCount = achievementsCount;
        this.period = period;
        this.timestamp = timestamp;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getWallet() {
        return wallet;
    }

    public void setWallet(String wallet) {
        this.wallet = wallet;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getLevel() {
        return level;
    }

    public void setLevel(int level) {
        this.level = level;
    }

    public int getXp() {
        return xp;
    }

    public void setXp(int xp) {
        this.xp = xp;
    }

    public int getAchievementsCount() {
        return achievementsCount;
    }

    public void setAchievementsCount(int achievementsCount) {
        this.achievementsCount = achievementsCount;
    }

    public String getPeriod() {
        return period;
    }

    public void setPeriod(String period) {
        this.period = period;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
}
