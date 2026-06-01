package com.eaglerush.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

@Entity
@Table(name = "players")
public class Player {

    @Id
    @Column(name = "wallet", nullable = false, unique = true)
    private String wallet;

    private int level = 1;
    private int xp = 0;
    private int coins = 0;
    private int streak = 0;

    @Column(name = "last_login")
    private Long lastLogin;

    @Column(name = "last_check_in")
    private Long lastCheckIn;

    @Column(name = "unlocked_skins", length = 1000)
    private String unlockedSkins = "default";

    @Column(name = "achievements", length = 2000)
    private String achievements = "";

    @Column(name = "inventory", length = 1000)
    private String inventory = "";

    @Column(name = "encoded_progress", columnDefinition = "TEXT")
    private String encodedProgress = "";

    // Constructors
    public Player() {}

    public Player(String wallet) {
        this.wallet = wallet;
        this.level = 1;
        this.xp = 0;
        this.coins = 0;
        this.streak = 0;
        this.unlockedSkins = "default";
        this.achievements = "";
        this.inventory = "";
        this.encodedProgress = "";
    }

    // Getters and Setters
    public String getWallet() {
        return wallet;
    }

    public void setWallet(String wallet) {
        this.wallet = wallet;
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

    public int getCoins() {
        return coins;
    }

    public void setCoins(int coins) {
        this.coins = coins;
    }

    public int getStreak() {
        return streak;
    }

    public void setStreak(int streak) {
        this.streak = streak;
    }

    public Long getLastLogin() {
        return lastLogin;
    }

    public void setLastLogin(Long lastLogin) {
        this.lastLogin = lastLogin;
    }

    public Long getLastCheckIn() {
        return lastCheckIn;
    }

    public void setLastCheckIn(Long lastCheckIn) {
        this.lastCheckIn = lastCheckIn;
    }

    public String getUnlockedSkins() {
        return unlockedSkins;
    }

    public void setUnlockedSkins(String unlockedSkins) {
        this.unlockedSkins = unlockedSkins;
    }

    public String getAchievements() {
        return achievements;
    }

    public void setAchievements(String achievements) {
        this.achievements = achievements;
    }

    public String getInventory() {
        return inventory;
    }

    public void setInventory(String inventory) {
        this.inventory = inventory;
    }

    public String getEncodedProgress() {
        return encodedProgress;
    }

    public void setEncodedProgress(String encodedProgress) {
        this.encodedProgress = encodedProgress;
    }
}
