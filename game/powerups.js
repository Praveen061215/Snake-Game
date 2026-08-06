/**
 * Cyber Snake Powerups and Special Abilities Module
 * Manages timers, durations, active modifiers, and upgrade synergies.
 */
class ActivePowerUp {
  constructor(id, label, icon, color, duration) {
    this.id = id;
    this.label = label;
    this.icon = icon;
    this.color = color;
    this.maxDuration = duration; // in milliseconds
    this.remaining = duration;
  }
}

class PowerUpManager {
  constructor() {
    this.active = {}; // Maps id -> ActivePowerUp
    
    // Cooldown states (mostly for manual abilities like Dash)
    this.cooldowns = {
      dash: 0 // remaining time in ms
    };
    this.maxCooldowns = {
      dash: 5000 // default 5 seconds
    };
    
    this.shieldCount = 0;
    this.maxShields = 1;
  }

  clear() {
    this.active = {};
    this.cooldowns.dash = 0;
    this.shieldCount = 0;
  }

  activate(id, durationMs) {
    // 1. Apply rank bonuses from Matrix Skills
    let durationMultiplier = 1.0;
    if (window.Levels) {
      const powerRank = window.Levels.skills.power_duration || 0;
      durationMultiplier += powerRank * 0.15; // +15% per rank
    }
    
    const finalDuration = durationMs * durationMultiplier;
    
    if (window.Sound) window.Sound.playPowerup();
    
    switch (id) {
      case 'shield':
        const capRank = (window.Levels ? window.Levels.skills.shield_capacity : 0) || 0;
        const limit = 1 + capRank; // Up to 4 shields
        if (this.shieldCount < limit) {
          this.shieldCount++;
        }
        if (window.FX) window.FX.spawnShockwave(window.gameEngine.snake.head().x, window.gameEngine.snake.head().y, '#00f3ff', 50);
        break;
        
      case 'dash':
        this.active[id] = new ActivePowerUp('dash', 'DASH ENGINE', '⚡', '#ff007f', finalDuration);
        break;
        
      case 'magnet':
        this.active[id] = new ActivePowerUp('magnet', 'MAGNETIC FIELD', '🧲', '#ffdf00', finalDuration);
        break;
        
      case 'freeze':
        this.active[id] = new ActivePowerUp('freeze', 'TIME WARP', '❄️', '#00f3ff', finalDuration);
        if (window.Sound) window.Sound.setMusicSpeed(0.65); // Slow down soundtrack!
        break;
        
      case 'ghost':
        this.active[id] = new ActivePowerUp('ghost', 'GHOST ROUTINE', '👻', '#8b00ff', finalDuration);
        break;
        
      case 'invincible':
        this.active[id] = new ActivePowerUp('invincible', 'OVERDRIVE CORE', '🔥', '#39ff14', finalDuration);
        break;
        
      case 'double_points':
        this.active[id] = new ActivePowerUp('double_points', 'DOUBLE SCORE', 'x2', '#ffdf00', finalDuration);
        break;
    }
  }

  // Trigger manual dash
  triggerDash() {
    if (this.cooldowns.dash > 0) return false;
    if (this.isPowerActive('dash')) return false;
    
    // Check skill reduction
    let cdMultiplier = 1.0;
    if (window.Levels) {
      const rank = window.Levels.skills.dash_cooldown || 0;
      cdMultiplier -= rank * 0.15; // -15% cooldown per rank
    }
    
    this.activate('dash', 800); // 0.8 seconds dash
    this.cooldowns.dash = this.maxCooldowns.dash * cdMultiplier;
    
    if (window.Sound) window.Sound.playDash();
    return true;
  }

  isPowerActive(id) {
    return this.active.hasOwnProperty(id) && this.active[id].remaining > 0;
  }

  hasShield() {
    return this.shieldCount > 0;
  }

  consumeShield() {
    if (this.shieldCount > 0) {
      this.shieldCount--;
      if (window.Sound) window.Sound.playShieldHit();
      if (window.Levels) window.Levels.updateChallengeProgress("shield_deflect");
      return true;
    }
    return false;
  }

  update(dtMs) {
    // Update active powerup timers
    for (let id in this.active) {
      this.active[id].remaining -= dtMs;
      
      // Clean up finished powerups
      if (this.active[id].remaining <= 0) {
        if (id === 'freeze' && window.Sound) {
          window.Sound.setMusicSpeed(1.0); // Reset music tempo
        }
        delete this.active[id];
      }
    }
    
    // Update cooldown timers
    for (let id in this.cooldowns) {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] -= dtMs;
        if (this.cooldowns[id] < 0) this.cooldowns[id] = 0;
      }
    }
  }

  // Helper getters for gameplay adjustments
  getSpeedFactor() {
    if (this.isPowerActive('dash')) return 2.2;
    if (this.isPowerActive('freeze')) return 0.55;
    return 1.0;
  }

  getScoreMultiplier() {
    let mult = 1;
    if (this.isPowerActive('double_points')) mult *= 2;
    if (this.isPowerActive('dash')) mult *= 1.5; // Dash score bonus
    return mult;
  }

  getMagnetRadius() {
    if (!this.isPowerActive('magnet')) return 0;
    
    let baseRad = 85; // pixels
    if (window.Levels) {
      const rank = window.Levels.skills.magnet_range || 0;
      baseRad += rank * 25; // +25px per rank
    }
    return baseRad;
  }

  isGhost() {
    return this.isPowerActive('ghost') || this.isPowerActive('invincible') || this.isPowerActive('dash');
  }

  isInvincible() {
    return this.isPowerActive('invincible') || this.isPowerActive('dash');
  }
}

// Global Single Instance
window.Powerups = new PowerUpManager();
