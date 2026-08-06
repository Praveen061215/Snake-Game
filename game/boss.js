/**
 * Cyber Snake Boss Battle Module
 * Spawns and manages a robotic Centipede Boss with segment joints and projectile attacks.
 */
class BossBullet {
  constructor(x, y, vx, vy, radius, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.life = 1.0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = this.radius * 2;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Tech design overlay
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class CentipedeBoss {
  constructor(gridWidth, gridHeight, cellSize) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.cellSize = cellSize;
    
    this.active = false;
    this.health = 100;
    this.maxHealth = 100;
    this.state = 'spawning'; // 'spawning', 'active', 'frenzy', 'dead'
    this.spawnTimer = 2000; // ms warning phase
    
    this.segments = [];
    this.segmentCount = 12;
    
    this.x = 0;
    this.y = 0;
    this.vx = 2;
    this.vy = 0;
    
    this.bullets = [];
    this.shootCooldown = 1800; // ms
    this.shootTimer = 0;
    
    this.sineTimer = 0;
    this.bossColor = '#ff007f';
    this.hitFlash = 0; // frame flash remaining
    
    this.initializeSegments();
  }

  initializeSegments() {
    this.x = -100;
    this.y = (this.gridHeight / 2) * this.cellSize;
    
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({
        x: this.x - (i * this.cellSize * 0.8),
        y: this.y,
        radius: this.cellSize * 0.55 * (1 - (i / this.segmentCount) * 0.45)
      });
    }
  }

  triggerSpawning() {
    this.active = true;
    this.health = 100;
    this.state = 'spawning';
    this.spawnTimer = 2000;
    this.bullets = [];
    this.initializeSegments();
    
    if (window.Sound) window.Sound.playShieldHit(); // Sound warning
    if (window.FX) {
      window.FX.spawnShockwave(
        (this.gridWidth / 2) * this.cellSize, 
        (this.gridHeight / 2) * this.cellSize, 
        '#ff007f', 
        150
      );
    }
  }

  takeDamage(amount, sourceX, sourceY) {
    if (this.state === 'spawning' || this.state === 'dead') return;
    
    this.health -= amount;
    this.hitFlash = 5; // Flash white for 5 frames
    
    if (window.Sound) window.Sound.playBossDamage();
    if (window.FX) {
      window.FX.spawnExplosion(sourceX, sourceY, '#ff007f', 12);
      window.FX.spawnFloatingText(sourceX, sourceY - 15, `-${amount} HP`, '#ff007f', 18);
    }
    
    if (this.health <= 0) {
      this.health = 0;
      this.state = 'dead';
      this.onDefeated();
    } else if (this.health < 40 && this.state !== 'frenzy') {
      this.state = 'frenzy';
      this.shootCooldown = 900; // double shoot speed
      this.bossColor = '#ff3300';
      if (window.FX) {
        window.FX.spawnFloatingText(
          this.segments[0].x, 
          this.segments[0].y - 20, 
          "BOSS FRENZY OVERDRIVE!", 
          '#ff3300', 
          20
        );
      }
    }
  }

  onDefeated() {
    // Explosion cascading effects
    this.segments.forEach((seg, idx) => {
      setTimeout(() => {
        if (window.FX) {
          window.FX.spawnExplosion(seg.x, seg.y, '#ff007f', 25);
          window.FX.spawnShockwave(seg.x, seg.y, '#ffffff', 45);
        }
        if (window.Sound) window.Sound.playShieldHit();
      }, idx * 150);
    });
    
    setTimeout(() => {
      this.active = false;
      if (window.Levels) {
        window.Levels.stats.bossesDefeated++;
        window.Levels.unlockAchievement('boss_slayer');
        window.Levels.addXp(500);
        window.Levels.updateChallengeProgress("boss_kill");
      }
      
      // Spawn massive rewards!
      if (window.gameEngine) {
        const h = this.segments[0];
        window.gameEngine.spawnLegendaryReward(h.x, h.y);
      }
    }, this.segmentCount * 150 + 200);
  }

  shootProjectiles() {
    if (window.Sound) window.Sound.playLaser();
    
    const head = this.segments[0];
    const angleToPlayer = Math.atan2(
      window.gameEngine.snake.head().y - head.y,
      window.gameEngine.snake.head().x - head.x
    );
    
    if (this.state === 'frenzy') {
      // 3-bullet spread
      for (let i = -1; i <= 1; i++) {
        const spreadAngle = angleToPlayer + (i * Math.PI / 8);
        const bulletSpeed = 3.5;
        this.bullets.push(new BossBullet(
          head.x,
          head.y,
          Math.cos(spreadAngle) * bulletSpeed,
          Math.sin(spreadAngle) * bulletSpeed,
          6,
          '#ff3300'
        ));
      }
    } else {
      // Single targeted bullet
      const bulletSpeed = 2.8;
      this.bullets.push(new BossBullet(
        head.x,
        head.y,
        Math.cos(angleToPlayer) * bulletSpeed,
        Math.sin(angleToPlayer) * bulletSpeed,
        7,
        '#ff007f'
      ));
    }
  }

  update(dtMs, snakeHead) {
    if (!this.active) return;
    
    // Handle Warning/Spawning phase
    if (this.state === 'spawning') {
      this.spawnTimer -= dtMs;
      if (this.spawnTimer <= 0) {
        this.state = 'active';
      }
      return;
    }
    
    if (this.state === 'dead') return;
    
    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].update();
      
      // Check borders
      const b = this.bullets[i];
      if (b.x < 0 || b.x > this.gridWidth * this.cellSize || b.y < 0 || b.y > this.gridHeight * this.cellSize) {
        this.bullets.splice(i, 1);
      }
    }
    
    // Boss head AI: Wander sinusoidally across the screen
    this.sineTimer += 0.035;
    const speed = this.state === 'frenzy' ? 2.5 : 1.8;
    
    // Check wall bouncing
    if (this.x > this.gridWidth * this.cellSize + 150) {
      this.vx = -speed;
    } else if (this.x < -150) {
      this.vx = speed;
    }
    
    this.x += this.vx;
    this.y = (this.gridHeight / 2) * this.cellSize + Math.sin(this.sineTimer) * (this.gridHeight * 0.3) * this.cellSize;
    
    // Update head position
    this.segments[0].x = this.x;
    this.segments[0].y = this.y;
    
    // Segment body follow logic (classic inverse kinematics spring)
    for (let i = 1; i < this.segments.length; i++) {
      const parent = this.segments[i - 1];
      const child = this.segments[i];
      
      const dx = parent.x - child.x;
      const dy = parent.y - child.y;
      const angle = Math.atan2(dy, dx);
      const targetDist = this.cellSize * 0.75;
      
      child.x = parent.x - Math.cos(angle) * targetDist;
      child.y = parent.y - Math.sin(angle) * targetDist;
    }
    
    // Shoot timing
    this.shootTimer += dtMs;
    if (this.shootTimer >= this.shootCooldown) {
      this.shootTimer = 0;
      this.shootProjectiles();
    }
    
    if (this.hitFlash > 0) this.hitFlash--;
  }

  draw(ctx) {
    if (!this.active) return;
    
    // 1. Draw Warning overlay if spawning
    if (this.state === 'spawning') {
      ctx.save();
      ctx.font = "bold 20px 'Orbitron', sans-serif";
      ctx.fillStyle = '#ff007f';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff007f';
      
      // Siren pulse opacity
      const opacity = 0.3 + Math.sin(Date.now() / 100) * 0.4;
      ctx.globalAlpha = opacity;
      ctx.fillText("⚠️ DETECTING MASSIVE CORRUPTED ENTITY ⚠️", (this.gridWidth / 2) * this.cellSize, (this.gridHeight / 2) * this.cellSize - 50);
      
      ctx.fillRect(0, 0, this.gridWidth * this.cellSize, 4);
      ctx.fillRect(0, this.gridHeight * this.cellSize - 4, this.gridWidth * this.cellSize, 4);
      ctx.restore();
      return;
    }
    
    // 2. Draw Bullets
    this.bullets.forEach(b => b.draw(ctx));
    
    // 3. Draw Centipede Joints
    ctx.save();
    
    // Draw body segments back-to-front
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, seg.radius, 0, Math.PI * 2);
      
      // Tech styling: Flash white on hits
      if (this.hitFlash > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = seg.radius * 2;
        ctx.shadowColor = "#ffffff";
      } else {
        ctx.fillStyle = this.bossColor;
        ctx.shadowBlur = seg.radius * 1.5;
        ctx.shadowColor = this.bossColor;
      }
      ctx.fill();
      
      // Segment details
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, seg.radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      
      // Head specific details
      if (i === 0) {
        // Draw eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(seg.x + this.vx * 3, seg.y - 6, 4, 0, Math.PI * 2);
        ctx.arc(seg.x + this.vx * 3, seg.y + 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // 4. Draw Health Bar Floating Overlay
    const head = this.segments[0];
    const barW = 80;
    const barH = 5;
    const barX = head.x - barW / 2;
    const barY = head.y - head.radius - 12;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barW, barH);
    
    const fillW = barW * (this.health / this.maxHealth);
    ctx.fillStyle = this.bossColor;
    ctx.shadowBlur = 5;
    ctx.shadowColor = this.bossColor;
    ctx.fillRect(barX, barY, fillW, barH);
    
    ctx.restore();
  }
}

window.CentipedeBoss = CentipedeBoss;
