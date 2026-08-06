/**
 * Cyber Snake Level & Progression Module
 * Manages player profile, level-up calculations, skills, achievements, and stats.
 */
class LevelsSystem {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.skillPoints = 0;
    this.stats = {
      totalGames: 0,
      totalFoodEaten: 0,
      highScore: 0,
      highestCombo: 1,
      totalSurvivalTime: 0, // seconds
      bossesDefeated: 0,
      skillsUpgraded: 0
    };
    
    // Skill upgrades matrix
    this.skills = {
      magnet_range: 0,      // Max 5
      shield_capacity: 0,   // Max 3
      dash_cooldown: 0,     // Max 5
      score_boost: 0,       // Max 5
      power_duration: 0     // Max 5
    };
    
    this.skillConfig = {
      magnet_range: { name: "VACUUM FIELD", desc: "Increases magnetic food absorption range.", max: 5 },
      shield_capacity: { name: "DEFLECTOR MATRIX", desc: "Increases starting deflector shields (Max +3).", max: 3 },
      dash_cooldown: { name: "DASH ENGINE", desc: "Reduces Dash charge cooldown by 15% per rank.", max: 5 },
      score_boost: { name: "DATA HARVESTER", desc: "Passively increases all score points by 10% per rank.", max: 5 },
      power_duration: { name: "ENERGY CELL", desc: "Extends active duration of power-ups by 15% per rank.", max: 5 }
    };
    
    // Achievements List
    this.achievements = [
      { id: "first_nibble", name: "FIRST NIBBLE", desc: "Consume any food cell in the simulation grid.", xp: 50, unlocked: false, icon: "🍏" },
      { id: "neon_master", name: "NEON MASTER", desc: "Reach a score of 10,000 points in any mode.", xp: 200, unlocked: false, icon: "👑" },
      { id: "survival_expert", name: "SURVIVAL EXPERT", desc: "Survive 120 seconds in Survival Mode.", xp: 300, unlocked: false, icon: "⚡" },
      { id: "boss_slayer", name: "BOSS SLAYER", desc: "Defeat the robotic Centipede Boss.", xp: 500, unlocked: false, icon: "👾" },
      { id: "skills_maxed", name: "MAX EVOLUTION", desc: "Bring any Matrix Skill node to its maximum level.", xp: 250, unlocked: false, icon: "🧬" },
      { id: "combo_king", name: "COMBO KING", desc: "Obtain a x5 combo multiplier in Classic Mode.", xp: 200, unlocked: false, icon: "🔥" },
      { id: "immortal", name: "SHIELD MATRIX", desc: "Block a lethal wall or body collision using deflector shields.", xp: 150, unlocked: false, icon: "🛡️" },
      { id: "legendary_nibble", name: "COSMIC HARVEST", desc: "Consume a legendary grade food cell.", xp: 300, unlocked: false, icon: "🌌" }
    ];

    this.dailyChallenge = {
      desc: "Harvest 15 Speed Boost food cells",
      targetType: "speed_food",
      targetCount: 15,
      current: 0,
      rewardXp: 150,
      completed: false
    };

    this.loadProfile();
  }

  getXpNeeded(lvl) {
    return Math.floor(100 * Math.pow(lvl, 1.5));
  }

  addXp(amount) {
    let xpGained = amount;
    this.xp += xpGained;
    
    let levelUps = 0;
    while (this.xp >= this.getXpNeeded(this.level)) {
      this.xp -= this.getXpNeeded(this.level);
      this.level++;
      this.skillPoints += 1;
      levelUps++;
    }
    
    if (levelUps > 0) {
      if (window.Sound) window.Sound.playLevelUp();
      this.showNotification("👑 LEVEL UP!", `Reached Level ${this.level}. +${levelUps} Skill Point(s)`);
    }
    
    this.saveProfile();
    return levelUps > 0;
  }

  upgradeSkill(skillId) {
    if (!this.skills.hasOwnProperty(skillId)) return false;
    
    const config = this.skillConfig[skillId];
    if (this.skills[skillId] >= config.max) return false;
    if (this.skillPoints <= 0) return false;
    
    this.skills[skillId]++;
    this.skillPoints--;
    this.stats.skillsUpgraded++;
    
    if (window.Sound) window.Sound.playClick();
    
    if (this.skills[skillId] === config.max) {
      this.unlockAchievement("skills_maxed");
    }
    
    this.saveProfile();
    return true;
  }

  resetSkills() {
    let pointsRefunded = 0;
    for (let s in this.skills) {
      pointsRefunded += this.skills[s];
      this.skills[s] = 0;
    }
    this.skillPoints += pointsRefunded;
    if (window.Sound) window.Sound.playClick();
    this.saveProfile();
  }

  unlockAchievement(id) {
    const ach = this.achievements.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      this.addXp(ach.xp);
      this.showNotification("🏆 ACHIEVEMENT UNLOCKED!", `${ach.name}: ${ach.desc}`);
      this.saveProfile();
      return true;
    }
    return false;
  }

  updateChallengeProgress(type, count = 1) {
    if (this.dailyChallenge.completed) return;
    
    if (this.dailyChallenge.targetType === type) {
      this.dailyChallenge.current += count;
      if (this.dailyChallenge.current >= this.dailyChallenge.targetCount) {
        this.dailyChallenge.current = this.dailyChallenge.targetCount;
        this.dailyChallenge.completed = true;
        this.addXp(this.dailyChallenge.rewardXp);
        this.showNotification("⚡ CHALLENGE COMPLETE!", `${this.dailyChallenge.desc} (+${this.dailyChallenge.rewardXp} XP)`);
      }
      this.saveProfile();
    }
  }

  generateDailyChallenge() {
    const challenges = [
      { desc: "Harvest 15 Speed Boost food cells", targetType: "speed_food", targetCount: 15, rewardXp: 150 },
      { desc: "Reach a x4 combo multiplier", targetType: "combo_4", targetCount: 1, rewardXp: 200 },
      { desc: "Consume 3 Legendary food cells", targetType: "legendary_food", targetCount: 3, rewardXp: 250 },
      { desc: "Deflect 5 crash attempts with Deflector Shield", targetType: "shield_deflect", targetCount: 5, rewardXp: 200 },
      { desc: "Complete 1 Boss Battle simulation", targetType: "boss_kill", targetCount: 1, rewardXp: 300 }
    ];
    
    // Pick based on date day
    const day = new Date().getDate();
    const challengeIdx = day % challenges.length;
    
    // Only replace if not active or if day changed
    const savedDay = localStorage.getItem("cybersnake_challenge_day");
    if (savedDay !== String(day)) {
      this.dailyChallenge = {
        ...challenges[challengeIdx],
        current: 0,
        completed: false
      };
      localStorage.setItem("cybersnake_challenge_day", String(day));
      this.saveProfile();
    }
  }

  saveProfile() {
    const profile = {
      level: this.level,
      xp: this.xp,
      skillPoints: this.skillPoints,
      stats: this.stats,
      skills: this.skills,
      achievements: this.achievements.map(a => ({ id: a.id, unlocked: a.unlocked })),
      dailyChallenge: this.dailyChallenge
    };
    localStorage.setItem("cybersnake_profile", JSON.stringify(profile));
  }

  loadProfile() {
    const data = localStorage.getItem("cybersnake_profile");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.level = parsed.level || 1;
        this.xp = parsed.xp || 0;
        this.skillPoints = parsed.skillPoints || 0;
        
        if (parsed.stats) this.stats = { ...this.stats, ...parsed.stats };
        if (parsed.skills) this.skills = { ...this.skills, ...parsed.skills };
        
        if (parsed.achievements) {
          parsed.achievements.forEach(savedA => {
            const actualA = this.achievements.find(a => a.id === savedA.id);
            if (actualA) actualA.unlocked = savedA.unlocked;
          });
        }
        
        if (parsed.dailyChallenge) this.dailyChallenge = { ...this.dailyChallenge, ...parsed.dailyChallenge };
      } catch (e) {
        console.error("Error loading cyber profile:", e);
      }
    }
    this.generateDailyChallenge();
  }

  showNotification(title, desc) {
    const banner = document.getElementById("notification-banner");
    if (!banner) return;
    
    banner.querySelector(".notification-title").innerText = title;
    banner.querySelector(".notification-desc").innerText = desc;
    
    banner.classList.remove("hidden");
    // Force reflow
    banner.offsetWidth; 
    banner.classList.add("active");
    
    setTimeout(() => {
      banner.classList.remove("active");
      setTimeout(() => {
        banner.classList.add("hidden");
      }, 400);
    }, 4000);
  }
}

// Global Single Instance
window.Levels = new LevelsSystem();
