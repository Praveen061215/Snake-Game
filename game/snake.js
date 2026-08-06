/**
 * Cyber Snake Entity Module
 * Employs continuous angle-based movement, segment tracking, and skin render shaders.
 */
class SnakeSegment {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }
}

class Snake {
  constructor(startX, startY, cellSize) {
    this.cellSize = cellSize;
    
    // Smooth physics states
    this.x = startX;
    this.y = startY;
    this.angle = 0; // current travel angle
    this.targetAngle = 0; // target travel angle
    this.turnSpeed = 0.085; // smoothing constant for turns (rad per update)
    
    this.baseSpeed = 0.15; // pixels per ms
    this.speed = this.baseSpeed;
    
    // Skin and trail configurations
    this.skin = 'cyber'; // 'cyber', 'fire', 'ice', 'galaxy', 'lightning', 'dragon', 'chroma'
    this.trail = 'sparks'; // 'none', 'sparks', 'smoke', 'sparkles'
    
    this.segments = [];
    this.segmentGap = 8; // spacing steps along path history
    this.pathHistory = [];
    
    this.reverseControlsTimer = 0;
    
    this.initialize(startX, startY);
  }

  initialize(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.angle = 0;
    this.targetAngle = 0;
    
    this.segments = [];
    this.pathHistory = [];
    
    const initialLen = 8;
    const radius = this.cellSize * 0.45;
    
    // Build head
    this.segments.push(new SnakeSegment(startX, startY, radius));
    
    // Fill history and body
    const historySteps = initialLen * this.segmentGap;
    for (let i = 0; i < historySteps; i++) {
      this.pathHistory.push({ x: startX - i * (this.baseSpeed * 16), y: startY });
    }
    
    for (let i = 1; i < initialLen; i++) {
      const histIdx = i * this.segmentGap;
      const pt = this.pathHistory[histIdx];
      const segRad = radius * (1 - (i / initialLen) * 0.35); // slightly taper tail
      this.segments.push(new SnakeSegment(pt.x, pt.y, segRad));
    }
  }

  head() {
    return this.segments[0];
  }

  grow(count = 1) {
    const radius = this.cellSize * 0.45;
    const lastSeg = this.segments[this.segments.length - 1];
    
    for (let i = 0; i < count; i++) {
      const idx = this.segments.length;
      const segRad = radius * (1 - (idx / (idx + 10)) * 0.35);
      
      // Spawn segment at the tail's position
      this.segments.push(new SnakeSegment(lastSeg.x, lastSeg.y, segRad));
      
      // Extend history path accordingly
      const lastPt = this.pathHistory[this.pathHistory.length - 1];
      for (let g = 0; g < this.segmentGap; g++) {
        this.pathHistory.push({ x: lastPt.x, y: lastPt.y });
      }
    }
  }

  setTargetAngle(angleRad) {
    if (this.reverseControlsTimer > 0) {
      this.targetAngle = angleRad + Math.PI; // Invert angle!
    } else {
      this.targetAngle = angleRad;
    }
  }

  reverseControls(durationMs) {
    this.reverseControlsTimer = durationMs;
  }

  turn(dir) {
    // Standard 4-way grid input mappings
    let target = 0;
    switch(dir) {
      case 'RIGHT': target = 0; break;
      case 'DOWN':  target = Math.PI / 2; break;
      case 'LEFT':  target = Math.PI; break;
      case 'UP':    target = -Math.PI / 2; break;
    }
    
    // Prevent 180-degree hard snaps
    const diff = Math.abs(this.normalizeAngle(target - this.angle));
    if (diff > Math.PI - 0.1) {
      return; // Block direct reversing
    }
    
    this.setTargetAngle(target);
  }

  normalizeAngle(ang) {
    while (ang < -Math.PI) ang += Math.PI * 2;
    while (ang > Math.PI) ang -= Math.PI * 2;
    return ang;
  }

  update(dtMs, boundsW, boundsH) {
    if (this.reverseControlsTimer > 0) {
      this.reverseControlsTimer -= dtMs;
    }
    
    // 1. Smoothly rotate current angle towards target angle
    let diff = this.normalizeAngle(this.targetAngle - this.angle);
    this.angle += diff * this.turnSpeed;
    this.angle = this.normalizeAngle(this.angle);
    
    // 2. Adjust travel speed based on current powerups
    let currentSpeed = this.baseSpeed * window.Powerups.getSpeedFactor();
    
    // Check speed upgrades in level
    if (window.Levels) {
      const speedRank = window.Levels.skills.score_boost || 0; // use as passive speed booster optionally
      currentSpeed += speedRank * 0.005; // tiny passive increase
    }
    
    // 3. Move head forward
    this.x += Math.cos(this.angle) * currentSpeed * dtMs;
    this.y += Math.sin(this.angle) * currentSpeed * dtMs;
    
    // 4. Boundary checking (wrapping if endless, handled by engine otherwise)
    // Add position to path history
    this.pathHistory.unshift({ x: this.x, y: this.y });
    
    // Prune history to limit size
    const maxHistory = this.segments.length * this.segmentGap + 10;
    if (this.pathHistory.length > maxHistory) {
      this.pathHistory.length = maxHistory;
    }
    
    // 5. Update body segment coordinates along history
    this.segments[0].x = this.x;
    this.segments[0].y = this.y;
    
    for (let i = 1; i < this.segments.length; i++) {
      const histIdx = Math.min(i * this.segmentGap, this.pathHistory.length - 1);
      const pt = this.pathHistory[histIdx];
      
      // Smooth segment following
      this.segments[i].x = pt.x;
      this.segments[i].y = pt.y;
    }
    
    // 6. Spawn Trail FX
    if (window.FX && this.trail !== 'none' && Math.random() < 0.3) {
      const tail = this.segments[this.segments.length - 1];
      const trailColors = {
        cyber: '#00f3ff',
        fire: '#ff5500',
        ice: '#00ccff',
        galaxy: '#8b00ff',
        lightning: '#ffdf00',
        dragon: '#39ff14',
        chroma: `hsl(${(Date.now() / 10) % 360}, 100%, 50%)`
      };
      const col = trailColors[this.skin] || '#00f3ff';
      const fxType = this.trail === 'smoke' ? 'smoke' : 'sparks';
      window.FX.spawnTrail(tail.x, tail.y, col, fxType);
    }
  }

  draw(ctx) {
    ctx.save();
    
    // 1. Draw connecting lines between body segment links (for electric/neon outline)
    if (this.skin === 'lightning') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.segments[0].x, this.segments[0].y);
      for(let i = 1; i < this.segments.length; i++) {
        ctx.lineTo(this.segments[i].x, this.segments[i].y);
      }
      ctx.stroke();
    }
    
    // 2. Draw body segments back-to-front
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      
      ctx.save();
      ctx.translate(seg.x, seg.y);
      
      // Compute Skin Visual Properties
      let skinColor = '#00f3ff';
      let glowColor = 'rgba(0, 243, 255, 0.4)';
      let shadowBlur = seg.radius * 1.5;
      
      // Dynamic color overrides
      const chromaHue = (Date.now() / 15 + i * 12) % 360;
      
      switch(this.skin) {
        case 'cyber':
          skinColor = i === 0 ? '#00f3ff' : 'rgba(0, 243, 255, 0.6)';
          glowColor = 'rgba(0, 243, 255, 0.4)';
          break;
        case 'fire':
          // Red-orange gradient pulse
          const redVal = Math.floor(180 + Math.sin(Date.now() / 150 + i) * 75);
          skinColor = `rgb(${redVal}, 70, 0)`;
          glowColor = 'rgba(255, 80, 0, 0.5)';
          break;
        case 'ice':
          skinColor = i % 2 === 0 ? '#cdeeff' : '#6bb8ff';
          glowColor = 'rgba(100, 200, 255, 0.4)';
          break;
        case 'galaxy':
          skinColor = `hsl(${(240 + i * 6) % 360}, 75%, 45%)`;
          glowColor = 'rgba(139, 0, 255, 0.4)';
          break;
        case 'lightning':
          skinColor = '#ffdf00';
          glowColor = 'rgba(255, 223, 0, 0.6)';
          break;
        case 'dragon':
          // Emerald green and dark gold
          skinColor = i % 2 === 0 ? '#1b8b3a' : '#c9a0dc';
          glowColor = 'rgba(57, 255, 20, 0.3)';
          break;
        case 'chroma':
          skinColor = `hsl(${chromaHue}, 100%, 50%)`;
          glowColor = skinColor;
          break;
      }
      
      // Overrides for Overdrive / Dash state
      if (window.Powerups.isInvincible()) {
        skinColor = '#ffffff';
        glowColor = '#39ff14';
        shadowBlur = seg.radius * 2.8;
      }
      
      ctx.shadowBlur = shadowBlur;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = skinColor;
      
      // Draw segment geometries
      if (this.skin === 'ice') {
        // Hexagonal ice shards
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (Math.PI / 3) * j;
          ctx.lineTo(Math.cos(angle) * seg.radius, Math.sin(angle) * seg.radius);
        }
        ctx.closePath();
        ctx.fill();
      }
      else if (this.skin === 'cyber' && i > 0) {
        // Square grids segments
        ctx.fillRect(-seg.radius, -seg.radius, seg.radius * 2, seg.radius * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(-seg.radius, -seg.radius, seg.radius * 2, seg.radius * 2);
      }
      else {
        // Standard circle node
        ctx.beginPath();
        ctx.arc(0, 0, seg.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Head decorations
      if (i === 0) {
        // Eyes
        ctx.fillStyle = '#ffffff';
        const eyeAngleL = this.angle - Math.PI / 5;
        const eyeAngleR = this.angle + Math.PI / 5;
        const eyeDist = seg.radius * 0.55;
        
        ctx.beginPath();
        ctx.arc(Math.cos(eyeAngleL) * eyeDist, Math.sin(eyeAngleL) * eyeDist, 2.5, 0, Math.PI * 2);
        ctx.arc(Math.cos(eyeAngleR) * eyeDist, Math.sin(eyeAngleR) * eyeDist, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Active Shield bubble outline around head
        if (window.Powerups.hasShield()) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, seg.radius * 2.1, 0, Math.PI * 2);
          ctx.strokeStyle = '#00f3ff';
          ctx.lineWidth = 2.0;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#00f3ff';
          ctx.stroke();
          ctx.restore();
        }
      }
      
      ctx.restore();
    }
    
    ctx.restore();
  }
}

window.Snake = Snake;
