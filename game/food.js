/**
 * Cyber Snake Food Types Module
 * Configures behaviors, statistics, weighted spawning, and graphic loops for 10 food types.
 */
class Food {
  constructor(gridX, gridY, type, cellSize) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.type = type;
    this.cellSize = cellSize;
    
    // Smooth pixel positions for canvas rendering
    this.x = (gridX + 0.5) * cellSize;
    this.y = (gridY + 0.5) * cellSize;
    
    this.pulseTime = Math.random() * Math.PI * 2;
    this.floatOffset = Math.random() * Math.PI * 2;
    
    this.configureType();
  }

  configureType() {
    const configs = {
      normal: { name: "CORE DATA", color: "#39ff14", score: 10, xp: 5, icon: "🟢", glow: "#39ff14" },
      golden: { name: "ENCRYPTED NODE", color: "#ffdf00", score: 50, xp: 15, icon: "🟡", glow: "#ffdf00" },
      speed: { name: "OVERCLOCK CHARGER", color: "#00f3ff", score: 15, xp: 8, icon: "⚡", glow: "#00f3ff" },
      slow: { name: "CRYO PULSER", color: "#ff00ff", score: 15, xp: 8, icon: "❄️", glow: "#ff00ff" },
      shield: { name: "DEFLECTOR SHIELD", color: "#0044ff", score: 20, xp: 10, icon: "🛡️", glow: "#0044ff" },
      magnet: { name: "VACUUM CORE", color: "#ff5500", score: 20, xp: 10, icon: "🧲", glow: "#ff5500" },
      double: { name: "DOUBLE PIPELINE", color: "#ff8800", score: 25, xp: 12, icon: "✖️", glow: "#ff8800" },
      rainbow: { name: "SPECTRAL HARVEST", color: "#ffffff", score: 100, xp: 50, icon: "🌈", glow: "#ffffff" },
      mystery: { name: "ENIGMA DECODED", color: "#e0e0e0", score: 30, xp: 20, icon: "❓", glow: "#e0e0e0" },
      legendary: { name: "LEGENDARY SOURCE", color: "#8b00ff", score: 250, xp: 100, icon: "🌌", glow: "#8b00ff" }
    };

    const c = configs[this.type] || configs.normal;
    this.name = c.name;
    this.color = c.color;
    this.score = c.score;
    this.xp = c.xp;
    this.icon = c.icon;
    this.glowColor = c.glow;
  }

  // Handle consumption effect triggers
  onEaten() {
    if (window.Sound) window.Sound.playEat();
    
    // Spawn gorgeous fireworks
    if (window.FX) {
      const effectColor = this.type === 'rainbow' ? `hsl(${Math.random() * 360}, 100%, 50%)` : this.color;
      window.FX.spawnExplosion(this.x, this.y, effectColor, this.type === 'legendary' ? 40 : 16);
      window.FX.spawnFloatingText(this.x, this.y - 12, `+${this.score}`, this.color, this.type === 'legendary' ? 22 : 15);
    }
    
    // Apply special ability unlocks
    switch (this.type) {
      case 'speed':
        window.Powerups.activate('dash', 1000);
        break;
      case 'slow':
        window.Powerups.activate('freeze', 5000);
        break;
      case 'shield':
        window.Powerups.activate('shield', 0);
        break;
      case 'magnet':
        window.Powerups.activate('magnet', 8000);
        break;
      case 'double':
        window.Powerups.activate('double_points', 6000);
        break;
      case 'mystery':
        // Trigger random positive or negative events
        const events = ['shield', 'ghost', 'invincible', 'freeze', 'reverse_controls'];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        if (randomEvent === 'reverse_controls') {
          if (window.gameEngine && window.gameEngine.snake) {
            window.gameEngine.snake.reverseControls(4000);
            if (window.FX) window.FX.spawnFloatingText(this.x, this.y - 12, "CONTROLS REVERSED!", "#ff0000", 16);
          }
        } else {
          window.Powerups.activate(randomEvent, 5000);
          if (window.FX) window.FX.spawnFloatingText(this.x, this.y - 12, `MYSTERY: ${randomEvent.toUpperCase()}`, "#ffffff", 15);
        }
        break;
      case 'rainbow':
        window.Powerups.activate('invincible', 3000);
        break;
      case 'legendary':
        window.Powerups.activate('invincible', 5000);
        window.Levels.unlockAchievement('legendary_nibble');
        break;
    }
    
    // Progression Stats update
    if (window.Levels) {
      window.Levels.stats.totalFoodEaten++;
      window.Levels.updateChallengeProgress("speed_food");
      if (this.type === 'legendary') window.Levels.updateChallengeProgress("legendary_food");
    }
  }

  update(dtMs) {
    this.pulseTime += 0.04;
    this.floatOffset += 0.025;
  }

  draw(ctx) {
    ctx.save();
    
    // Floating calculation
    const floatY = Math.sin(this.floatOffset) * (this.cellSize * 0.15);
    const pulseScale = 1.0 + Math.sin(this.pulseTime) * 0.12;
    
    ctx.translate(this.x, this.y + floatY);
    ctx.scale(pulseScale, pulseScale);
    
    // Draw neon background glow
    let glowRadius = this.cellSize * 0.9;
    if (this.type === 'legendary') {
      glowRadius = this.cellSize * 1.5;
    }
    
    let drawColor = this.color;
    if (this.type === 'rainbow') {
      const hue = (Date.now() / 15) % 360;
      drawColor = `hsl(${hue}, 100%, 60%)`;
      this.glowColor = drawColor;
    }
    
    ctx.shadowBlur = glowRadius;
    ctx.shadowColor = this.glowColor;
    
    // Draw Custom geometries based on foods
    ctx.fillStyle = drawColor;
    
    if (this.type === 'normal') {
      // Hexagonal Data core
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const rx = Math.cos(angle) * (this.cellSize * 0.35);
        const ry = Math.sin(angle) * (this.cellSize * 0.35);
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fill();
      // Tech core
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, this.cellSize * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (this.type === 'golden') {
      // Rotating diamond
      ctx.rotate(this.pulseTime * 0.5);
      ctx.fillRect(-this.cellSize * 0.3, -this.cellSize * 0.3, this.cellSize * 0.6, this.cellSize * 0.6);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-this.cellSize * 0.3, -this.cellSize * 0.3, this.cellSize * 0.6, this.cellSize * 0.6);
    }
    else if (this.type === 'legendary') {
      // Star core with orbiting ring
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * (this.cellSize * 0.5),
                   Math.sin((18 + i * 72) * Math.PI / 180) * (this.cellSize * 0.5));
        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.cellSize * 0.22),
                   Math.sin((54 + i * 72) * Math.PI / 180) * (this.cellSize * 0.22));
      }
      ctx.closePath();
      ctx.fill();
      
      // Ring
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.cellSize * 0.7, this.cellSize * 0.2, Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    else {
      // Generic circular nodes with icon overlays
      ctx.beginPath();
      ctx.arc(0, 0, this.cellSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw interior white graphic dot
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, this.cellSize * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

class FoodManager {
  static getSpawnWeights() {
    // Weighted probabilities out of 100
    return [
      { type: 'normal', weight: 65 },
      { type: 'golden', weight: 12 },
      { type: 'speed', weight: 5 },
      { type: 'slow', weight: 4 },
      { type: 'magnet', weight: 4 },
      { type: 'shield', weight: 3 },
      { type: 'double', weight: 3 },
      { type: 'rainbow', weight: 2 },
      { type: 'mystery', weight: 1.5 },
      { type: 'legendary', weight: 0.5 }
    ];
  }

  static getRandomType() {
    const weights = this.getSpawnWeights();
    const sum = weights.reduce((acc, curr) => acc + curr.weight, 0);
    let randomVal = Math.random() * sum;
    
    for (let i = 0; i < weights.length; i++) {
      if (randomVal < weights[i].weight) {
        return weights[i].type;
      }
      randomVal -= weights[i].weight;
    }
    return 'normal';
  }
}

window.Food = Food;
window.FoodManager = FoodManager;
