/**
 * Cyber Snake Game Simulation Engine
 * Runs rendering pipeline, delta-time physics, obstacles generation, screen shakes, collision layers.
 */
class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.isPaused = false;
    this.isGameOver = false;
    
    this.mode = 'classic'; // 'classic', 'survival', 'time_attack', 'endless', 'hardcore', 'obstacles', 'boss', 'arena', 'speed', 'custom'
    this.gridSizeX = 24;
    this.gridSizeY = 24;
    this.cellSize = 25;
    
    this.snake = null;
    this.foods = [];
    this.maxFoods = 1;
    this.obstacles = []; // Array of {x, y, radius, isLethal}
    
    // Boss references
    this.boss = null;
    
    // Gameplay stats
    this.score = 0;
    this.highScore = 0;
    this.combo = 1;
    this.comboTime = 0;
    this.maxComboTime = 4000; // ms to keep combo
    this.multiplier = 1.0;
    this.survivalTime = 0; // ms
    this.timeAttackRemaining = 60000; // 60s start
    this.survivalEnergy = 100.0; // 100% capacity
    
    this.arenaShrinkRatio = 1.0;
    
    // Rendering FX
    this.screenShake = 0;
    this.damageFlashOpacity = 0;
    
    // Loop control
    this.lastTime = 0;
    this.rafId = null;
  }

  setupCanvas(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    
    // Listen for resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    
    // Handle High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    
    const size = Math.min(rect.width, rect.height, 800);
    
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    
    this.ctx.scale(dpr, dpr);
    
    // Calculate cell sizes based on grid resolution
    this.cellSize = size / this.gridSizeX;
    
    if (this.snake) {
      this.snake.cellSize = this.cellSize;
      this.snake.segments.forEach(s => s.radius = this.cellSize * 0.45);
    }
    this.foods.forEach(f => {
      f.cellSize = this.cellSize;
      f.x = (f.gridX + 0.5) * this.cellSize;
      f.y = (f.gridY + 0.5) * this.cellSize;
    });
  }

  initializeGame(mode, customConfig = null) {
    this.mode = mode;
    this.isPaused = false;
    this.isGameOver = false;
    this.score = 0;
    this.combo = 1;
    this.comboTime = 0;
    this.multiplier = 1.0;
    this.survivalTime = 0;
    this.timeAttackRemaining = 60000;
    this.survivalEnergy = 100.0;
    this.arenaShrinkRatio = 1.0;
    
    this.foods = [];
    this.obstacles = [];
    
    // Reset managers
    window.Powerups.clear();
    window.FX.clear();
    
    // Setup Grid Resolution and Mode configurations
    this.gridSizeX = 24;
    this.gridSizeY = 24;
    this.maxFoods = 1;
    
    if (mode === 'custom' && customConfig) {
      this.gridSizeX = customConfig.gridSize === 'small' ? 16 : (customConfig.gridSize === 'large' ? 32 : 24);
      this.gridSizeY = this.gridSizeX;
    }
    
    this.resizeCanvas();
    
    // Create Entities
    const startGX = Math.floor(this.gridSizeX / 3);
    const startGY = Math.floor(this.gridSizeY / 2);
    this.snake = new Snake(startGX * this.cellSize, startGY * this.cellSize, this.cellSize);
    
    // Generate Boss Centipede
    this.boss = new CentipedeBoss(this.gridSizeX, this.gridSizeY, this.cellSize);
    
    // Set skin/trail from levels system selection
    if (window.selectedSkin) this.snake.skin = window.selectedSkin;
    if (window.selectedTrail) this.snake.trail = window.selectedTrail;
    
    // Generate obstacles
    this.generateObstacles();
    
    // Spawn initial foods
    if (this.mode === 'arena') this.maxFoods = 3;
    for (let i = 0; i < this.maxFoods; i++) {
      this.spawnFood();
    }
    
    // Pre-activate shield if neural link skills unlocked
    if (window.Levels && window.Levels.skills.shield_capacity > 0) {
      window.Powerups.shieldCount = window.Levels.skills.shield_capacity;
    }
    
    // Sound loop start
    if (window.Sound) {
      window.Sound.stopMusic();
      window.Sound.setMusicSpeed(1.0);
      window.Sound.startMusic();
    }
    
    this.lastTime = performance.now();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.gameLoop(this.lastTime);
  }

  generateObstacles() {
    this.obstacles = [];
    
    // Mode specific obstacle templates
    if (this.mode === 'obstacles' || this.mode === 'hardcore') {
      // 4 corners L-shapes
      const wallBlock = [
        { gx: 6, gy: 6 }, { gx: 6, gy: 7 }, { gx: 7, gy: 6 },
        { gx: 17, gy: 6 }, { gx: 17, gy: 7 }, { gx: 16, gy: 6 },
        { gx: 6, gy: 17 }, { gx: 6, gy: 16 }, { gx: 7, gy: 17 },
        { gx: 17, gy: 17 }, { gx: 17, gy: 16 }, { gx: 16, gy: 17 }
      ];
      wallBlock.forEach(b => {
        this.obstacles.push({
          x: (b.gx + 0.5) * this.cellSize,
          y: (b.gy + 0.5) * this.cellSize,
          radius: this.cellSize * 0.45,
          isLethal: true
        });
      });
    } else if (this.mode === 'boss') {
      // Spawn Boss Centipede spawning trigger
      this.boss.triggerSpawning();
    }
  }

  spawnFood() {
    let attempts = 0;
    let valid = false;
    let gx = 0, gy = 0;
    
    const maxAttempts = 100;
    while (!valid && attempts < maxAttempts) {
      gx = Math.floor(Math.random() * this.gridSizeX);
      gy = Math.floor(Math.random() * this.gridSizeY);
      
      // Check arena shrinking restriction (for Arena mode)
      if (this.mode === 'arena') {
        const shrinkMargin = Math.floor((1 - this.arenaShrinkRatio) * this.gridSizeX * 0.5);
        if (gx < shrinkMargin || gx >= this.gridSizeX - shrinkMargin ||
            gy < shrinkMargin || gy >= this.gridSizeY - shrinkMargin) {
          attempts++;
          continue;
        }
      }
      
      // Avoid overlap with Snake Head & segments
      let overlap = false;
      this.snake.segments.forEach(seg => {
        const distGX = Math.floor(seg.x / this.cellSize);
        const distGY = Math.floor(seg.y / this.cellSize);
        if (distGX === gx && distGY === gy) overlap = true;
      });
      
      // Avoid overlap with obstacles
      this.obstacles.forEach(obs => {
        const obsGX = Math.floor(obs.x / this.cellSize);
        const obsGY = Math.floor(obs.y / this.cellSize);
        if (obsGX === gx && obsGY === gy) overlap = true;
      });
      
      // Avoid overlap with existing foods
      this.foods.forEach(f => {
        if (f.gridX === gx && f.gridY === gy) overlap = true;
      });
      
      if (!overlap) valid = true;
      attempts++;
    }
    
    // Choose random food type weighted
    const foodType = FoodManager.getRandomType();
    this.foods.push(new Food(gx, gy, foodType, this.cellSize));
  }

  // Spawns boss plasma cores
  spawnPlasmaCore() {
    let gx = Math.floor(Math.random() * this.gridSizeX);
    let gy = Math.floor(Math.random() * this.gridSizeY);
    this.foods.push(new Food(gx, gy, 'legendary', this.cellSize));
  }

  spawnLegendaryReward(x, y) {
    // Spawns legendary core immediately
    const gx = Math.max(0, Math.min(this.gridSizeX - 1, Math.floor(x / this.cellSize)));
    const gy = Math.max(0, Math.min(this.gridSizeY - 1, Math.floor(y / this.cellSize)));
    this.foods.push(new Food(gx, gy, 'legendary', this.cellSize));
  }

  // CORE GAME LOOP
  gameLoop(timestamp) {
    if (this.isPaused || this.isGameOver) return;
    
    const dtMs = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    // Clamp delta to prevent massive jumps on lag spikes
    const clampedDt = Math.min(dtMs, 100);
    
    this.update(clampedDt);
    this.draw();
    
    this.rafId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  triggerDamageFlash() {
    this.damageFlashOpacity = 0.55;
    this.screenShake = 18;
  }

  update(dtMs) {
    // 1. Update Managers
    window.Powerups.update(dtMs);
    window.FX.update();
    
    // 2. Handle Survival Mode Hunger Decay
    if (this.mode === 'survival') {
      let decayRate = 0.005; // 0.5% per frame equivalent
      if (window.Powerups.isPowerActive('freeze')) decayRate *= 0.5;
      
      this.survivalEnergy -= decayRate * dtMs;
      if (this.survivalEnergy <= 0) {
        this.survivalEnergy = 0;
        this.triggerDeath("CELL ENERGY STARVATION");
      }
    }
    
    // 3. Handle Time Attack countdown
    if (this.mode === 'time_attack') {
      this.timeAttackRemaining -= dtMs;
      if (this.timeAttackRemaining <= 0) {
        this.timeAttackRemaining = 0;
        this.triggerDeath("TIMER DEPLETED");
      }
    }
    
    // 4. Handle Arena Mode Shrinking bounds
    if (this.mode === 'arena') {
      this.survivalTime += dtMs;
      // Shrink boundary by 5% every 30 seconds
      const shrinkCycles = Math.floor(this.survivalTime / 30000);
      this.arenaShrinkRatio = Math.max(0.5, 1.0 - (shrinkCycles * 0.05));
    } else {
      this.survivalTime += dtMs;
    }
    
    // 5. Update Snake Position
    const boundsW = this.gridSizeX * this.cellSize;
    const boundsH = this.gridSizeY * this.cellSize;
    this.snake.update(dtMs, boundsW, boundsH);
    
    const head = this.snake.head();
    
    // 6. Handle Wall Collision Boundary rules
    let outOfBounds = false;
    
    if (head.x < 0 || head.x > boundsW || head.y < 0 || head.y > boundsH) {
      outOfBounds = true;
    }
    
    if (outOfBounds) {
      if (this.mode === 'endless') {
        // Wrap coordinates
        if (this.snake.x < 0) this.snake.x = boundsW;
        if (this.snake.x > boundsW) this.snake.x = 0;
        if (this.snake.y < 0) this.snake.y = boundsH;
        if (this.snake.y > boundsH) this.snake.y = 0;
      } else {
        // Lethal wall crash
        this.handleCrash("BOUNDARY COLLISION DETECTED");
      }
    }
    
    // Arena shrink wall check
    if (this.mode === 'arena' && !outOfBounds) {
      const shrinkMargin = (1 - this.arenaShrinkRatio) * boundsW * 0.5;
      if (head.x < shrinkMargin || head.x > boundsW - shrinkMargin ||
          head.y < shrinkMargin || head.y > boundsH - shrinkMargin) {
        this.handleCrash("COLLAPSED SHIELD BOUNDARY");
      }
    }
    
    // 7. Handle Self Collision Check (Snake eats itself)
    // Only check if snake has grown and isn't invulnerable/ghost
    if (!window.Powerups.isGhost() && this.snake.segments.length > 5) {
      for (let i = 5; i < this.snake.segments.length; i++) {
        const seg = this.snake.segments[i];
        const dist = Math.hypot(head.x - seg.x, head.y - seg.y);
        
        // Collsion threshold radius
        if (dist < (head.radius + seg.radius) * 0.6) {
          this.handleCrash("SELF BODY OVERWRITE");
          break;
        }
      }
    }
    
    // 8. Handle Obstacle Collisions
    if (!window.Powerups.isGhost()) {
      this.obstacles.forEach(obs => {
        const dist = Math.hypot(head.x - obs.x, head.y - obs.y);
        if (dist < head.radius + obs.radius) {
          if (window.Powerups.isInvincible()) {
            // Smash obstacle!
            if (window.Sound) window.Sound.playShieldHit();
            if (window.FX) window.FX.spawnExplosion(obs.x, obs.y, '#ffffff', 20);
            this.obstacles = this.obstacles.filter(o => o !== obs);
          } else {
            this.handleCrash("OBSTACLE DAMAGE TERMINATED");
          }
        }
      });
    }
    
    // 9. Update Boss Centipede and Collisions
    if (this.mode === 'boss' && this.boss && this.boss.active) {
      this.boss.update(dtMs, head);
      
      // Check bullet collisions vs player
      for (let i = this.boss.bullets.length - 1; i >= 0; i--) {
        const b = this.boss.bullets[i];
        const dist = Math.hypot(head.x - b.x, head.y - b.y);
        if (dist < head.radius + b.radius) {
          this.boss.bullets.splice(i, 1);
          this.handleCrash("PLASMA PROJECTILE HIT");
        }
      }
      
      // Check head vs Boss segments
      this.boss.segments.forEach(seg => {
        const dist = Math.hypot(head.x - seg.x, head.y - seg.y);
        if (dist < head.radius + seg.radius) {
          if (window.Powerups.isInvincible() || window.Powerups.isPowerActive('dash')) {
            // Damage the boss!
            this.boss.takeDamage(15, head.x, head.y);
            this.triggerDamageFlash(); // Screen impact
          } else {
            this.handleCrash("MASSIVE BOSS COLLISION");
          }
        }
      });
    }
    
    // 10. Handle Food Collisions & Vacuum effect
    const magnetRad = window.Powerups.getMagnetRadius();
    
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      f.update(dtMs);
      
      const dist = Math.hypot(head.x - f.x, head.y - f.y);
      
      // A. Vacuum suction (magnet active)
      if (magnetRad > 0 && dist < magnetRad && dist > head.radius + 5) {
        const speed = 0.22; // pull speed
        const dx = head.x - f.x;
        const dy = head.y - f.y;
        const angle = Math.atan2(dy, dx);
        f.x += Math.cos(angle) * speed * dtMs;
        f.y += Math.sin(angle) * speed * dtMs;
        f.gridX = Math.floor(f.x / this.cellSize);
        f.gridY = Math.floor(f.y / this.cellSize);
      }
      
      // B. Eat food item
      if (dist < (head.radius + this.cellSize * 0.4)) {
        this.foods.splice(i, 1);
        
        // Trigger food item effects
        f.onEaten();
        
        // Add scoreboard metrics
        let baseScore = f.score;
        let baseXP = f.xp;
        
        // Passive matrix boost bonuses
        if (window.Levels) {
          const passiveBoost = window.Levels.skills.score_boost || 0;
          baseScore += Math.floor(baseScore * (passiveBoost * 0.1)); // +10% per level
        }
        
        const gainedScore = baseScore * this.combo * window.Powerups.getScoreMultiplier();
        this.score += Math.floor(gainedScore);
        
        // Combo increment rules
        this.comboTime = this.maxComboTime;
        this.combo++;
        if (window.Levels && this.combo > window.Levels.stats.highestCombo) {
          window.Levels.stats.highestCombo = this.combo;
        }
        if (this.combo >= 5) {
          if (window.Levels) window.Levels.unlockAchievement("combo_king");
        }
        
        // Add XP
        if (window.Levels) {
          window.Levels.addXp(baseXP);
          window.Levels.unlockAchievement("first_nibble");
        }
        
        // Replenish parameters based on modes
        if (this.mode === 'survival') {
          this.survivalEnergy = Math.min(100.0, this.survivalEnergy + 15);
        }
        if (this.mode === 'time_attack') {
          this.timeAttackRemaining = Math.min(99000, this.timeAttackRemaining + 6000); // add 6s
        }
        
        // Respawn new items
        this.spawnFood();
        
        // If Boss mode, occasional helper cores spawn
        if (this.mode === 'boss' && Math.random() < 0.25) {
          this.spawnPlasmaCore();
        }
      }
    }
    
    // 11. Handle Combo Time depletion decay
    if (this.comboTime > 0) {
      this.comboTime -= dtMs;
      if (this.comboTime <= 0) {
        this.comboTime = 0;
        this.combo = 1; // resets
      }
    }
    
    // 12. Decelerate visual screens effects
    if (this.screenShake > 0) {
      this.screenShake *= 0.9;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }
    
    if (this.damageFlashOpacity > 0) {
      this.damageFlashOpacity -= 0.04;
      if (this.damageFlashOpacity < 0) this.damageFlashOpacity = 0;
    }
  }

  handleCrash(reason) {
    // Block death if invincibility active
    if (window.Powerups.isInvincible()) return;
    
    // Block death if Deflector shield matrices active
    if (window.Powerups.consumeShield()) {
      this.triggerDamageFlash(); // Visual shake
      if (window.FX) {
        window.FX.spawnShockwave(this.snake.head().x, this.snake.head().y, '#00f3ff', 65);
        window.FX.spawnFloatingText(this.snake.head().x, this.snake.head().y - 15, "SHIELD COLLISION REFLECTED", '#00f3ff', 16);
      }
      
      // Teleport slightly backwards or bounce head angle to prevent consecutive crash frames
      this.snake.x -= Math.cos(this.snake.angle) * this.cellSize * 0.75;
      this.snake.y -= Math.sin(this.snake.angle) * this.cellSize * 0.75;
      this.snake.angle += Math.PI; // bounce direction
      this.snake.targetAngle = this.snake.angle;
      return;
    }
    
    this.triggerDeath(reason);
  }

  triggerDeath(reason) {
    this.isGameOver = true;
    
    if (window.Sound) {
      window.Sound.playGameOver();
      window.Sound.stopMusic();
    }
    if (window.FX) {
      window.FX.spawnExplosion(this.snake.head().x, this.snake.head().y, '#ff007f', 40);
      window.FX.spawnShockwave(this.snake.head().x, this.snake.head().y, '#ff007f', 80);
    }
    
    // Flash damage red overlay
    this.damageFlashOpacity = 0.8;
    this.screenShake = 35;
    
    // Achievements score checks
    if (window.Levels) {
      if (this.score >= 10000) window.Levels.unlockAchievement('neon_master');
      if (this.mode === 'survival' && this.survivalTime >= 120000) window.Levels.unlockAchievement('survival_expert');
      
      // Update totals
      window.Levels.stats.totalGames++;
      window.Levels.stats.totalSurvivalTime += Math.floor(this.survivalTime / 1000);
      if (this.score > window.Levels.stats.highScore) {
        window.Levels.stats.highScore = this.score;
      }
      window.Levels.saveProfile();
    }
    
    // Wait brief duration and fire Game Over popup callback
    setTimeout(() => {
      if (window.App) window.App.showGameOverOverlay(this.score, Math.floor(this.survivalTime / 1000), reason);
    }, 1200);
  }

  pause() {
    this.isPaused = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.save();
    
    // Screen shake translate offsets
    if (this.screenShake > 0 && window.screenShakeEnabled) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(dx, dy);
    }
    
    // 1. Draw solid background grid cells
    this.ctx.fillStyle = '#020208';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid layout boundaries
    if (window.gridLinesEnabled) {
      this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
      this.ctx.lineWidth = 1;
      
      // Draw shrinking arena bounds (visual shading)
      let minX = 0, minY = 0;
      let maxX = this.gridSizeX;
      let maxY = this.gridSizeY;
      
      if (this.mode === 'arena') {
        const shrinkMargin = (1 - this.arenaShrinkRatio) * this.gridSizeX * 0.5;
        minX = Math.floor(shrinkMargin);
        minY = Math.floor(shrinkMargin);
        maxX = this.gridSizeX - minX;
        maxY = this.gridSizeY - minY;
        
        // Draw red shrinking alert borders
        this.ctx.fillStyle = 'rgba(255, 0, 127, 0.03)';
        this.ctx.fillRect(0, 0, this.canvas.width, minY * this.cellSize);
        this.ctx.fillRect(0, maxY * this.cellSize, this.canvas.width, (this.gridSizeY - maxY) * this.cellSize);
        this.ctx.fillRect(0, minY * this.cellSize, minX * this.cellSize, (maxY - minY) * this.cellSize);
        this.ctx.fillRect(maxX * this.cellSize, minY * this.cellSize, (this.gridSizeX - maxX) * this.cellSize, (maxY - minY) * this.cellSize);
        
        this.ctx.strokeStyle = 'rgba(255, 0, 127, 0.2)';
        this.ctx.strokeRect(minX * this.cellSize, minY * this.cellSize, (maxX - minX) * this.cellSize, (maxY - minY) * this.cellSize);
      }
      
      for (let x = minX; x <= maxX; x++) {
        this.ctx.beginPath();
        this.ctx.moveTo(x * this.cellSize, minY * this.cellSize);
        this.ctx.lineTo(x * this.cellSize, maxY * this.cellSize);
        this.ctx.stroke();
      }
      for (let y = minY; y <= maxY; y++) {
        this.ctx.beginPath();
        this.ctx.moveTo(minX * this.cellSize, y * this.cellSize);
        this.ctx.lineTo(maxX * this.cellSize, y * this.cellSize);
        this.ctx.stroke();
      }
    }
    
    // 2. Draw Obstacles
    this.obstacles.forEach(obs => {
      this.ctx.save();
      this.ctx.shadowBlur = obs.radius * 1.5;
      this.ctx.shadowColor = '#ff0055';
      this.ctx.fillStyle = '#1a0008';
      this.ctx.strokeStyle = '#ff0055';
      this.ctx.lineWidth = 1.8;
      
      this.ctx.beginPath();
      this.ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      
      // Draw grid pattern core
      this.ctx.fillStyle = '#ff0055';
      this.ctx.beginPath();
      this.ctx.arc(obs.x, obs.y, obs.radius * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
    
    // 3. Draw Foods
    this.foods.forEach(f => f.draw(this.ctx));
    
    // 4. Draw Particles FX layer
    window.FX.draw(this.ctx);
    
    // 5. Draw Boss
    if (this.mode === 'boss' && this.boss) {
      this.boss.draw(this.ctx);
    }
    
    // 6. Draw Snake Body & Head
    if (this.snake) {
      this.snake.draw(this.ctx);
    }
    
    this.ctx.restore();
    
    // Draw Damage screen flash overlay if active
    if (this.damageFlashOpacity > 0) {
      const flash = document.getElementById("screen-damage-flash");
      if (flash) {
        flash.style.opacity = this.damageFlashOpacity;
      }
    } else {
      const flash = document.getElementById("screen-damage-flash");
      if (flash) {
        flash.style.opacity = 0;
      }
    }
  }
}

// Global Single Instance
window.gameEngine = new GameEngine();
