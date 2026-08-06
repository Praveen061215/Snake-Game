/**
 * Cyber Snake Particle and FX Module
 * Renders high-performance canvas graphics: bursts, trails, shockwaves, floating digits.
 */
class Particle {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    
    this.life = options.life !== undefined ? options.life : 1.0;
    this.decay = options.decay || 0.02;
    this.size = options.size || 3;
    this.color = options.color || '#00f3ff';
    this.glow = options.glow !== undefined ? options.glow : true;
    
    this.type = options.type || 'spark'; // 'spark', 'smoke', 'ring', 'shard', 'text', 'line'
    this.angle = options.angle || 0;
    this.spin = options.spin || 0;
    this.gravity = options.gravity || 0;
    this.friction = options.friction || 0.98;
    this.text = options.text || '';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    this.angle += this.spin;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.life;
    
    if (this.glow) {
      ctx.shadowBlur = this.size * 2.5;
      ctx.shadowColor = this.color;
    }
    
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    
    if (this.type === 'spark') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } 
    else if (this.type === 'smoke') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * (2 - this.life), 0, Math.PI * 2);
      ctx.fill();
    }
    else if (this.type === 'shard') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      ctx.moveTo(-this.size, -this.size / 2);
      ctx.lineTo(this.size, -this.size);
      ctx.lineTo(this.size / 2, this.size);
      ctx.closePath();
      ctx.fill();
    }
    else if (this.type === 'ring') {
      ctx.lineWidth = this.size * 0.15;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * (2 - this.life) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    else if (this.type === 'text') {
      ctx.font = `bold ${this.size}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.text, this.x, this.y);
    }
    
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  clear() {
    this.particles = [];
  }

  addParticle(p) {
    this.particles.push(p);
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Optimization: avoid drawing if quality settings is low and particles are excessive
    const maxRender = window.graphicsQuality === 'low' ? 30 : (window.graphicsQuality === 'medium' ? 120 : 500);
    const renderCount = Math.min(this.particles.length, maxRender);
    
    for (let i = 0; i < renderCount; i++) {
      this.particles[i].draw(ctx);
    }
  }

  // FX CREATORS
  spawnExplosion(x, y, color, count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.addParticle(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 4,
        color: color,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        type: Math.random() > 0.45 ? 'spark' : 'shard',
        spin: (Math.random() - 0.5) * 0.25,
        friction: 0.97
      }));
    }
  }

  spawnTrail(x, y, color, type = 'sparks') {
    if (window.graphicsQuality === 'low') return;
    
    if (type === 'sparks') {
      this.addParticle(new Particle({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: 1.5 + Math.random() * 2,
        color: color,
        life: 0.8,
        decay: 0.04,
        type: 'spark',
        friction: 0.98,
        glow: true
      }));
    } else if (type === 'smoke') {
      this.addParticle(new Particle({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.5 - Math.random() * 0.5,
        size: 4 + Math.random() * 6,
        color: color,
        life: 0.7,
        decay: 0.025,
        type: 'smoke',
        friction: 0.99,
        glow: false
      }));
    }
  }

  spawnShockwave(x, y, color, maxRadius = 35) {
    this.addParticle(new Particle({
      x: x,
      y: y,
      size: maxRadius,
      color: color,
      life: 1.0,
      decay: 0.035,
      type: 'ring',
      glow: true
    }));
  }

  spawnFloatingText(x, y, text, color, size = 16) {
    this.addParticle(new Particle({
      x: x,
      y: y - 10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -1.2 - Math.random() * 0.6,
      size: size,
      color: color,
      life: 1.0,
      decay: 0.02,
      type: 'text',
      text: text,
      friction: 0.99,
      glow: true
    }));
  }

  spawnLightning(x1, y1, x2, y2, color, thickness = 1.5) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const segments = Math.max(3, Math.floor(distance / 12));
    
    let lastX = x1;
    let lastY = y1;
    
    for (let i = 1; i <= segments; i++) {
      const ratio = i / segments;
      let targetX = x1 + (x2 - x1) * ratio;
      let targetY = y1 + (y2 - y1) * ratio;
      
      // Add jagged displacement offset
      if (i < segments) {
        const offset = (Math.random() - 0.5) * 12;
        const normX = -(y2 - y1) / distance;
        const normY = (x2 - x1) / distance;
        targetX += normX * offset;
        targetY += normY * offset;
      }
      
      this.addParticle(new Particle({
        x: lastX,
        y: lastY,
        vx: targetX, // Custom usage: line endpoint coordinates stored in velocity
        vy: targetY,
        size: thickness,
        color: color,
        life: 0.35,
        decay: 0.07,
        type: 'line',
        glow: true
      }));
      
      lastX = targetX;
      lastY = targetY;
    }
  }
}

// Subclass helper override to draw Lightning lines inside System
const originalDraw = Particle.prototype.draw;
Particle.prototype.draw = function(ctx) {
  if (this.type === 'line' && this.life > 0) {
    ctx.save();
    ctx.globalAlpha = this.life;
    if (this.glow) {
      ctx.shadowBlur = this.size * 3;
      ctx.shadowColor = this.color;
    }
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.size;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.vx, this.vy); // Destination coords stored in vx,vy
    ctx.stroke();
    ctx.restore();
  } else {
    originalDraw.call(this, ctx);
  }
};

// Global Single Instance
window.FX = new ParticleSystem();
