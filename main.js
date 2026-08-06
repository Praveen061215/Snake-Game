/**
 * Cyber Snake App Coordinator
 * Connects DOM screens, keyboard/touch inputs, local saving, customization store, and hud animations.
 */
class AppCoordinator {
  constructor() {
    this.currentScreen = 'screen-main-menu';
    
    // UI Global Configurations
    window.graphicsQuality = 'high';
    window.screenShakeEnabled = true;
    window.gridLinesEnabled = true;
    window.selectedSkin = 'cyber';
    window.selectedTrail = 'sparks';
    
    // Joystick state
    this.joystickActive = false;
    this.joystickStart = { x: 0, y: 0 };
    
    // Skins and Trails Database
    this.skinsDb = [
      { id: 'cyber', name: 'CYBER NEON', desc: 'Standard cyan emitter body.', cost: 0, type: 'skin', unlocked: true },
      { id: 'fire', name: 'SOLAR FIRE', desc: 'Pulsing orange-red thermal energy.', cost: 200, type: 'skin', unlocked: false },
      { id: 'ice', name: 'GLACIAL ICE', desc: 'Hexagonal crystalline frost structures.', cost: 300, type: 'skin', unlocked: false },
      { id: 'galaxy', name: 'NEBULA GALAXY', desc: 'Cosmic purple space matter shifts.', cost: 450, type: 'skin', unlocked: false },
      { id: 'lightning', name: 'LIGHTNING STRIKE', desc: 'White-yellow electric arcs.', cost: 500, type: 'skin', unlocked: false },
      { id: 'dragon', name: 'DRAGON EMPEROR', desc: 'Scale geometries with acid green glows.', cost: 600, type: 'skin', unlocked: false },
      { id: 'chroma', name: 'CHROMA SPECTRA', desc: 'Cycling rainbow hue shifts.', cost: 800, type: 'skin', unlocked: false }
    ];

    this.trailsDb = [
      { id: 'none', name: 'NO DUST', cost: 0, unlocked: true },
      { id: 'sparks', name: 'NEON SPARKS', cost: 100, unlocked: true },
      { id: 'smoke', name: 'DIGITAL SMOKE', cost: 250, unlocked: false }
    ];
    
    // Load Customizations states
    this.loadCustomSettings();
  }

  init() {
    // 1. Initialize Systems
    window.Sound.init();
    
    // 2. Wire Screen Navigation Triggers
    this.wireButtons();
    
    // 3. Setup User Controls Inputs
    this.setupControls();
    
    // 4. Update Profile Info on Screens
    this.updateProfileHUDs();
    
    // 5. Populate Grids
    this.populateSkinsGrid();
    this.populateTrailsGrid();
    this.populateSkillsTree();
    this.populateAchievementsList();
    this.populateStatsGrid();
    this.populateModesGrid();
    
    // 6. Spawn Skin Preview Canvas loop
    this.startSkinPreviewLoop();
    
    // 7. Ambient background loop
    this.startAmbientCanvas();
  }

  showScreen(screenId) {
    if (window.Sound) window.Sound.playClick();
    
    const prev = document.getElementById(this.currentScreen);
    const next = document.getElementById(screenId);
    
    if (prev) prev.classList.remove('active');
    setTimeout(() => {
      if (prev) prev.classList.add('hidden');
      if (next) {
        next.classList.remove('hidden');
        // force reflow
        next.offsetWidth;
        next.classList.add('active');
        this.currentScreen = screenId;
        
        // Context specific screen entries
        if (screenId === 'screen-main-menu') {
          this.updateProfileHUDs();
        }
      }
    }, 150);
  }

  wireButtons() {
    // Main Menu Buttons
    document.getElementById('btn-play-game').addEventListener('click', () => this.showScreen('screen-gameplay'));
    document.getElementById('btn-show-customization').addEventListener('click', () => this.showScreen('screen-customization'));
    document.getElementById('btn-show-upgrades').addEventListener('click', () => this.showScreen('screen-upgrades'));
    document.getElementById('btn-show-achievements').addEventListener('click', () => this.showScreen('screen-achievements'));
    document.getElementById('btn-show-settings').addEventListener('click', () => this.showScreen('screen-settings'));
    
    // Back Buttons
    document.getElementById('btn-back-customization').addEventListener('click', () => this.showScreen('screen-main-menu'));
    document.getElementById('btn-back-upgrades').addEventListener('click', () => this.showScreen('screen-main-menu'));
    document.getElementById('btn-back-achievements').addEventListener('click', () => this.showScreen('screen-main-menu'));
    document.getElementById('btn-back-settings').addEventListener('click', () => this.showScreen('screen-main-menu'));
    
    // Cancel gameplay modes overlays
    document.getElementById('btn-cancel-game').addEventListener('click', () => this.showScreen('screen-main-menu'));
    document.getElementById('btn-back-custom-game').addEventListener('click', () => {
      document.getElementById('custom-mode-overlay').classList.add('hidden');
      document.getElementById('mode-selector-overlay').classList.remove('hidden');
    });
    
    // Custom game parameters start launcher
    document.getElementById('btn-start-custom-game').addEventListener('click', () => {
      document.getElementById('custom-mode-overlay').classList.add('hidden');
      this.launchGame('custom');
    });
    
    // Skills tree reset
    document.getElementById('btn-reset-skills').addEventListener('click', () => {
      if (window.Levels) {
        window.Levels.resetSkills();
        this.populateSkillsTree();
        this.updateProfileHUDs();
      }
    });
    
    // Customization Deck Tabs
    const tabBtns = document.querySelectorAll('.tabs-container button');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tabTarget = btn.getAttribute('data-tab');
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
          if (content.id === tabTarget) {
            content.classList.remove('hidden');
            content.classList.add('active');
          } else {
            content.classList.add('hidden');
            content.classList.remove('active');
          }
        });
        if (window.Sound) window.Sound.playClick();
      });
    });
    
    // Volume adjustments updates
    const volSfx = document.getElementById('settings-volume-sfx');
    const volMusic = document.getElementById('settings-volume-music');
    
    volSfx.addEventListener('input', (e) => {
      document.getElementById('val-volume-sfx').innerText = `${e.target.value}%`;
      if (window.Sound) window.Sound.setSfxVolume(e.target.value);
    });
    volMusic.addEventListener('input', (e) => {
      document.getElementById('val-volume-music').innerText = `${e.target.value}%`;
      if (window.Sound) window.Sound.setMusicVolume(e.target.value);
    });
    
    // Settings Save Configurations
    document.getElementById('btn-save-settings').addEventListener('click', () => {
      window.graphicsQuality = document.getElementById('settings-graphics').value;
      window.gridLinesEnabled = document.getElementById('settings-grid-lines').checked;
      window.screenShakeEnabled = document.getElementById('settings-screen-shake').checked;
      
      const configControls = document.getElementById('settings-controls').value;
      localStorage.setItem("cybersnake_controls", configControls);
      
      this.saveCustomSettings();
      if (window.Sound) window.Sound.playClick();
      this.showScreen('screen-main-menu');
    });
    
    // In-game Pause/Resume buttons hooks
    document.getElementById('btn-pause-game').addEventListener('click', () => {
      if (window.gameEngine.isPaused) return;
      window.gameEngine.pause();
      document.getElementById('pause-modal').classList.remove('hidden');
      document.getElementById('pause-modal').classList.add('active');
      if (window.Sound) window.Sound.playClick();
    });
    
    document.getElementById('btn-resume-game').addEventListener('click', () => {
      document.getElementById('pause-modal').classList.remove('active');
      document.getElementById('pause-modal').classList.add('hidden');
      window.gameEngine.resume();
      if (window.Sound) window.Sound.playClick();
    });
    
    document.getElementById('btn-restart-game').addEventListener('click', () => {
      document.getElementById('pause-modal').classList.remove('active');
      document.getElementById('pause-modal').classList.add('hidden');
      if (window.Sound) window.Sound.playClick();
      this.launchGame(window.gameEngine.mode);
    });
    
    document.getElementById('btn-quit-game').addEventListener('click', () => {
      document.getElementById('pause-modal').classList.remove('active');
      document.getElementById('pause-modal').classList.add('hidden');
      if (window.Sound) window.Sound.playClick();
      if (window.Sound) window.Sound.stopMusic();
      this.showScreen('screen-main-menu');
    });
    
    // Game Over actions
    document.getElementById('btn-go-restart').addEventListener('click', () => {
      document.getElementById('game-over-modal').classList.remove('active');
      document.getElementById('game-over-modal').classList.add('hidden');
      if (window.Sound) window.Sound.playClick();
      this.launchGame(window.gameEngine.mode);
    });
    
    document.getElementById('btn-go-menu').addEventListener('click', () => {
      document.getElementById('game-over-modal').classList.remove('active');
      document.getElementById('game-over-modal').classList.add('hidden');
      if (window.Sound) window.Sound.playClick();
      this.showScreen('screen-main-menu');
    });
  }

  setupControls() {
    // Keyboard inputs listener
    window.addEventListener('keydown', (e) => {
      if (this.currentScreen !== 'screen-gameplay') return;
      if (window.gameEngine.isPaused || window.gameEngine.isGameOver) return;
      
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':
          window.gameEngine.snake.turn('UP');
          break;
        case 'a': case 'arrowleft':
          window.gameEngine.snake.turn('LEFT');
          break;
        case 's': case 'arrowdown':
          window.gameEngine.snake.turn('DOWN');
          break;
        case 'd': case 'arrowright':
          window.gameEngine.snake.turn('RIGHT');
          break;
        case ' ': // spacebar dash
          e.preventDefault();
          window.Powerups.triggerDash();
          break;
        case 'p': case 'escape':
          if (!window.gameEngine.isPaused) {
            document.getElementById('btn-pause-game').click();
          }
          break;
      }
    });

    // Touch Swipe Detection
    let touchStartX = 0;
    let touchStartY = 0;
    
    const arenaContainer = document.getElementById('canvas-container');
    
    arenaContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      
      const configControls = localStorage.getItem("cybersnake_controls") || 'keyboard';
      if (configControls === 'joystick') {
        const rect = arenaContainer.getBoundingClientRect();
        this.joystickActive = true;
        this.joystickStart = {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
        
        const joystickEl = document.getElementById('joystick-zone');
        joystickEl.classList.remove('hidden');
        joystickEl.style.left = `${this.joystickStart.x}px`;
        joystickEl.style.top = `${this.joystickStart.y}px`;
        
        const knob = document.getElementById('joystick-knob');
        knob.style.transform = 'translate(0px, 0px)';
      }
    }, { passive: true });

    arenaContainer.addEventListener('touchmove', (e) => {
      const configControls = localStorage.getItem("cybersnake_controls") || 'keyboard';
      
      if (configControls === 'joystick' && this.joystickActive) {
        const rect = arenaContainer.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const touchY = e.touches[0].clientY - rect.top;
        
        const dx = touchX - this.joystickStart.x;
        const dy = touchY - this.joystickStart.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = 35; // Joystick travel limit
        
        const angle = Math.atan2(dy, dx);
        const knob = document.getElementById('joystick-knob');
        
        if (dist > maxDist) {
          knob.style.left = `${Math.cos(angle) * maxDist}px`;
          knob.style.top = `${Math.sin(angle) * maxDist}px`;
        } else {
          knob.style.left = `${dx}px`;
          knob.style.top = `${dy}px`;
        }
        
        // Send continuous target angle direct updates
        if (window.gameEngine.snake) {
          window.gameEngine.snake.setTargetAngle(angle);
        }
      }
    }, { passive: true });

    arenaContainer.addEventListener('touchend', (e) => {
      const configControls = localStorage.getItem("cybersnake_controls") || 'keyboard';
      
      if (configControls === 'joystick') {
        this.joystickActive = false;
        document.getElementById('joystick-zone').classList.add('hidden');
      } else if (configControls === 'swipe') {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) window.gameEngine.snake.turn('RIGHT');
            else window.gameEngine.snake.turn('LEFT');
          } else {
            if (dy > 0) window.gameEngine.snake.turn('DOWN');
            else window.gameEngine.snake.turn('UP');
          }
        }
      }
    }, { passive: true });
  }

  launchGame(mode) {
    document.getElementById('mode-selector-overlay').classList.add('hidden');
    
    if (mode === 'custom') {
      document.getElementById('custom-mode-overlay').classList.remove('hidden');
      return;
    }
    
    // Countdown Screen overlay sequence
    const overlay = document.getElementById('game-countdown-overlay');
    overlay.classList.remove('hidden');
    
    const countNum = document.getElementById('countdown-number');
    let c = 3;
    countNum.innerText = c;
    
    const interval = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(interval);
        overlay.classList.add('hidden');
        
        // Launch engine simulation
        const customConfig = mode === 'custom' ? {
          speed: parseInt(document.getElementById('custom-speed').value),
          gridSize: document.getElementById('custom-grid-size').value,
          wallsLethal: document.getElementById('custom-walls-lethal').checked,
          obstacles: document.getElementById('custom-obstacles').checked,
          powerups: document.getElementById('custom-powerups').checked
        } : null;
        
        window.gameEngine.setupCanvas(document.getElementById('game-canvas'));
        window.gameEngine.initializeGame(mode, customConfig);
        
        // Initialize Control overlay overlays classes
        const configControls = localStorage.getItem("cybersnake_controls") || 'keyboard';
        const touchOverlay = document.getElementById('mobile-control-overlay');
        
        if (configControls === 'swipe') {
          touchOverlay.classList.remove('hidden');
        } else {
          touchOverlay.classList.add('hidden');
        }
        
        // Start updating live HUD panel meters
        this.startHudTicks();
      } else {
        countNum.innerText = c;
        if (window.Sound) window.Sound.playClick();
      }
    }, 700);
    
    if (window.Sound) window.Sound.playClick();
  }

  startHudTicks() {
    const updateHud = () => {
      if (this.currentScreen !== 'screen-gameplay' || window.gameEngine.isGameOver) return;
      
      // Update Top HUD values
      document.getElementById('hud-score').innerText = String(window.gameEngine.score).padStart(6, '0');
      
      const combo = document.getElementById('hud-combo');
      combo.innerText = `x${window.gameEngine.combo}`;
      
      const bar = document.getElementById('hud-combo-bar');
      const timeRatio = window.gameEngine.comboTime / window.gameEngine.maxComboTime;
      bar.style.width = `${timeRatio * 100}%`;
      
      // Active multiplier
      const activeMult = window.gameEngine.combo * window.Powerups.getScoreMultiplier();
      document.getElementById('hud-multiplier').innerText = `${activeMult.toFixed(1)}x`;
      
      // Update Shields slots indicators
      const shields = document.getElementById('hud-shields');
      shields.innerHTML = '';
      const activeShields = window.Powerups.shieldCount;
      const rankShields = 1 + (window.Levels ? window.Levels.skills.shield_capacity : 0);
      
      for(let i = 0; i < rankShields; i++) {
        const pip = document.createElement('span');
        pip.className = `shield-pip ${i < activeShields ? 'active' : ''}`;
        shields.appendChild(pip);
      }
      
      // Mode specific indicators
      const survivalContainer = document.getElementById('hud-survival-container');
      const timeContainer = document.getElementById('hud-time-container');
      
      if (window.gameEngine.mode === 'survival') {
        survivalContainer.style.display = 'block';
        timeContainer.style.display = 'none';
        document.getElementById('hud-survival-energy').style.width = `${window.gameEngine.survivalEnergy}%`;
      } else if (window.gameEngine.mode === 'time_attack') {
        survivalContainer.style.display = 'none';
        timeContainer.style.display = 'block';
        const seconds = Math.ceil(window.gameEngine.timeAttackRemaining / 1000);
        document.getElementById('hud-time-val').innerText = `00:${String(seconds).padStart(2, '0')}`;
      } else {
        survivalContainer.style.display = 'none';
        timeContainer.style.display = 'none';
      }
      
      // Active Powers icons displays
      const powersHUD = document.getElementById('hud-active-powers');
      powersHUD.innerHTML = '';
      
      for (let id in window.Powerups.active) {
        const item = window.Powerups.active[id];
        const pct = item.remaining / item.maxDuration;
        
        const div = document.createElement('div');
        div.className = 'power-hud-icon';
        div.style.color = item.color;
        div.innerText = item.icon;
        div.title = `${item.label} (${(item.remaining/1000).toFixed(1)}s)`;
        
        // Cooldown circle radial fill optionally
        powersHUD.appendChild(div);
      }
      
      requestAnimationFrame(updateHud);
    };
    
    requestAnimationFrame(updateHud);
  }

  showGameOverOverlay(score, survivalTime, reason) {
    document.getElementById('game-over-modal').classList.remove('hidden');
    document.getElementById('game-over-modal').classList.add('active');
    
    document.getElementById('game-over-reason').innerText = reason;
    document.getElementById('go-score').innerText = score;
    document.getElementById('go-time').innerText = `${survivalTime}s`;
    
    // XP yield calculations
    const gainedXp = Math.floor(score * 0.05 + survivalTime * 0.2);
    document.getElementById('go-xp').innerText = `+${gainedXp} XP`;
    
    const didLvlUp = window.Levels.addXp(gainedXp);
    
    if (didLvlUp) {
      document.getElementById('go-level-up-alert').classList.remove('hidden');
      document.getElementById('go-new-level').innerText = window.Levels.level;
    } else {
      document.getElementById('go-level-up-alert').classList.add('hidden');
    }
  }

  updateProfileHUDs() {
    const lvl = window.Levels.level;
    const currentXp = window.Levels.xp;
    const nextXp = window.Levels.getXpNeeded(lvl);
    const xpPct = (currentXp / nextXp) * 100;
    
    // Main Menu header
    document.getElementById('menu-lvl').innerText = lvl;
    document.getElementById('menu-xp-current').innerText = currentXp;
    document.getElementById('menu-xp-next').innerText = nextXp;
    document.getElementById('menu-xp-fill').style.width = `${xpPct}%`;
    
    // Skill Points inside Upgrade matrices
    document.getElementById('skill-points-val').innerText = window.Levels.skillPoints;
  }

  // SHOP CUSTOMIZATIONS POPULATORS
  populateSkinsGrid() {
    const grid = document.getElementById('skins-grid');
    grid.innerHTML = '';
    
    this.skinsDb.forEach(skin => {
      const card = document.createElement('div');
      card.className = `skin-card ${skin.unlocked ? '' : 'locked'} ${window.selectedSkin === skin.id ? 'selected' : ''}`;
      
      // Custom skin drawing icon representing preview
      const iconBox = document.createElement('div');
      iconBox.className = 'skin-icon-container';
      
      // Draw static colored circles matching styles
      const dot = document.createElement('div');
      dot.style.width = '24px';
      dot.style.height = '24px';
      dot.style.borderRadius = '50%';
      
      const colors = { cyber:'#00f3ff', fire:'#ff5500', ice:'#6bb8ff', galaxy:'#8b00ff', lightning:'#ffdf00', dragon:'#39ff14', chroma:'#ff00ff' };
      dot.style.background = colors[skin.id] || '#ffffff';
      dot.style.boxShadow = `0 0 10px ${colors[skin.id] || '#ffffff'}`;
      iconBox.appendChild(dot);
      
      const name = document.createElement('div');
      name.className = 'skin-name';
      name.innerText = skin.name;
      
      card.appendChild(iconBox);
      card.appendChild(name);
      
      if (!skin.unlocked) {
        const cost = document.createElement('div');
        cost.className = 'unlock-cost';
        cost.innerText = `${skin.cost} XP`;
        card.appendChild(cost);
      }
      
      // Clicking triggers selection or unlocking via Levels XP reduction
      card.addEventListener('click', () => {
        if (!skin.unlocked) {
          // Attempt buy with levels XP (simplification: spend XP directly to unlock!)
          const totalEarnedXP = window.Levels.xp + window.Levels.getXpNeeded(window.Levels.level); // estimate
          // Simple validation: levels XP acts as currency but deducts from current levels accumulation
          if (window.Levels.xp >= skin.cost) {
            window.Levels.xp -= skin.cost;
            skin.unlocked = true;
            window.Levels.saveProfile();
            this.showNotification("🧬 SYSTEM CORE EXPANSION", `Skin ${skin.name} unlocked successfully!`);
            this.populateSkinsGrid();
            this.updateProfileHUDs();
          } else {
            this.showNotification("⚠️ HARVEST FAILURE", `Insufficient XP. Requires ${skin.cost} XP to load core.`);
          }
        } else {
          // Select skin
          window.selectedSkin = skin.id;
          localStorage.setItem("cybersnake_selected_skin", skin.id);
          this.populateSkinsGrid();
          if (window.Sound) window.Sound.playClick();
        }
      });
      
      grid.appendChild(card);
    });
  }

  populateTrailsGrid() {
    const grid = document.getElementById('trails-grid');
    grid.innerHTML = '';
    
    this.trailsDb.forEach(trail => {
      const card = document.createElement('div');
      card.className = `trail-card ${trail.unlocked ? '' : 'locked'} ${window.selectedTrail === trail.id ? 'selected' : ''}`;
      
      const name = document.createElement('div');
      name.className = 'trail-name';
      name.innerText = trail.name;
      
      card.appendChild(name);
      
      if (!trail.unlocked) {
        const cost = document.createElement('div');
        cost.className = 'unlock-cost';
        cost.innerText = `${trail.cost} XP`;
        card.appendChild(cost);
      }
      
      card.addEventListener('click', () => {
        if (!trail.unlocked) {
          if (window.Levels.xp >= trail.cost) {
            window.Levels.xp -= trail.cost;
            trail.unlocked = true;
            window.Levels.saveProfile();
            this.showNotification("🧬 SYSTEM TRAIL LOADED", `Trail ${trail.name} unlocked!`);
            this.populateTrailsGrid();
            this.updateProfileHUDs();
          } else {
            this.showNotification("⚠️ INSUFFICIENT DATA", `Requires ${trail.cost} XP.`);
          }
        } else {
          window.selectedTrail = trail.id;
          localStorage.setItem("cybersnake_selected_trail", trail.id);
          this.populateTrailsGrid();
          if (window.Sound) window.Sound.playClick();
        }
      });
      grid.appendChild(card);
    });
  }

  // MATRIX SKILLS UPGRADES
  populateSkillsTree() {
    const grid = document.getElementById('skills-tree-grid');
    grid.innerHTML = '';
    
    for (let id in window.Levels.skills) {
      const lvlVal = window.Levels.skills[id];
      const cfg = window.Levels.skillConfig[id];
      
      const node = document.createElement('div');
      node.className = `skill-node ${lvlVal === cfg.max ? 'maxed' : ''}`;
      
      const header = document.createElement('div');
      header.className = 'skill-header';
      
      const title = document.createElement('span');
      title.className = 'skill-title';
      title.innerText = cfg.name;
      
      const lvl = document.createElement('span');
      lvl.className = 'skill-level-indicator';
      lvl.innerText = `${lvlVal} / ${cfg.max}`;
      
      header.appendChild(title);
      header.appendChild(lvl);
      
      const desc = document.createElement('p');
      desc.className = 'skill-desc';
      desc.innerText = cfg.desc;
      
      const btn = document.createElement('button');
      btn.className = 'skill-upgrade-btn';
      btn.innerText = lvlVal === cfg.max ? 'MAX INTEGRATION' : 'INJECT CODES (1 SP)';
      btn.disabled = lvlVal === cfg.max || window.Levels.skillPoints <= 0;
      
      btn.addEventListener('click', () => {
        if (window.Levels.upgradeSkill(id)) {
          this.populateSkillsTree();
          this.updateProfileHUDs();
        }
      });
      
      node.appendChild(header);
      node.appendChild(desc);
      node.appendChild(btn);
      
      grid.appendChild(node);
    }
  }

  // ACHIEVEMENTS LIST
  populateAchievementsList() {
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';
    
    window.Levels.achievements.forEach(ach => {
      const card = document.createElement('div');
      card.className = `achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`;
      
      const icon = document.createElement('div');
      icon.className = 'ach-icon-container';
      icon.innerText = ach.unlocked ? ach.icon : '🔒';
      
      const details = document.createElement('div');
      details.className = 'ach-details';
      
      const title = document.createElement('div');
      title.className = 'ach-title';
      title.innerText = ach.name;
      
      const desc = document.createElement('div');
      desc.className = 'ach-desc';
      desc.innerText = ach.desc;
      
      details.appendChild(title);
      details.appendChild(desc);
      
      const reward = document.createElement('div');
      reward.className = 'ach-xp-reward';
      reward.innerText = `+${ach.xp} XP`;
      
      card.appendChild(icon);
      card.appendChild(details);
      card.appendChild(reward);
      
      list.appendChild(card);
    });
  }

  populateStatsGrid() {
    const container = document.getElementById('stats-grid-container');
    container.innerHTML = '';
    
    const stats = [
      { label: 'SIMULATIONS INITIATED', val: window.Levels.stats.totalGames },
      { label: 'BEST SCORE RECORDED', val: window.Levels.stats.highScore },
      { label: 'CORES CONSUMED', val: window.Levels.stats.totalFoodEaten },
      { label: 'HIGHEST RECORDED COMBO', val: `x${window.Levels.stats.highestCombo}` },
      { label: 'TIME SPENT IN SIM', val: `${window.Levels.stats.totalSurvivalTime}s` },
      { label: 'CORRUPTED BOSSES DEFEATED', val: window.Levels.stats.bossesDefeated }
    ];
    
    stats.forEach(st => {
      const item = document.createElement('div');
      item.className = 'stat-item';
      
      const label = document.createElement('span');
      label.className = 'stat-label';
      label.innerText = st.label;
      
      const value = document.createElement('span');
      value.className = 'stat-value cyan-text';
      value.innerText = st.val;
      
      item.appendChild(label);
      item.appendChild(value);
      container.appendChild(item);
    });
  }

  // OPERATION MODES SELECTION GRID
  populateModesGrid() {
    const grid = document.getElementById('modes-selection-grid');
    grid.innerHTML = '';
    
    const modes = [
      { id: 'classic', name: 'CLASSIC ARCHITECTURE', desc: 'Grid boundary limits active. Walls are lethal. Earn maximum XP.' },
      { id: 'survival', name: 'SURVIVAL METABOLISM', desc: 'Cell energy decays continuously over time. Consume nodes to sustain links.' },
      { id: 'time_attack', name: 'TIME PRESSURE WAVE', desc: '60s countdown start. Food cells increment clocks. Gain high score.' },
      { id: 'endless', name: 'ENDLESS BENDING', desc: 'No walls bounding limits. Warp positions. Relaxed pace.' },
      { id: 'hardcore', name: 'HARDCORE CORRUPTION', desc: 'Hyper grid speeds. No auxiliary shields. Immediate crash termination.' },
      { id: 'obstacles', name: 'OBSTACLES LABYRINTH', desc: 'Dynamic concrete grids walls spawn. Avoid crash hazards.' },
      { id: 'boss', name: 'BOSS PURGE INTERFACE', desc: 'Launch matrix attack on robotic centipede entity. Collect plasma fuels.' },
      { id: 'arena', name: 'ARENA COLLAPSER', desc: 'Red perimeter grids collapse progressively over time. Space shrinks.' },
      { id: 'speed', name: 'SPEED RAMP OVERLOAD', desc: 'Game engine speed increases exponentially with each food nibbled.' },
      { id: 'custom', name: 'CUSTOM CONFIG DECK', desc: 'Adjust speed, scale resolutions, toggles walls. Make your matrix.' }
    ];
    
    modes.forEach(mode => {
      const card = document.createElement('div');
      card.className = 'mode-card';
      
      const title = document.createElement('div');
      title.className = 'mode-title';
      title.innerText = mode.name;
      
      const desc = document.createElement('div');
      desc.className = 'mode-desc';
      desc.innerText = mode.desc;
      
      card.appendChild(title);
      card.appendChild(desc);
      
      card.addEventListener('click', () => {
        this.launchGame(mode.id);
      });
      grid.appendChild(card);
    });
  }

  showNotification(title, desc) {
    if (window.Levels) window.Levels.showNotification(title, desc);
  }

  // SKIN DECK LIVE PREVIEW CANVAS
  startSkinPreviewLoop() {
    const canvas = document.getElementById('skin-preview-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const resizePreview = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizePreview();
    window.addEventListener('resize', resizePreview);
    
    let previewSnakeSegments = [];
    const radius = 9;
    const segmentsCount = 6;
    
    const loop = () => {
      if (this.currentScreen !== 'screen-customization') {
        requestAnimationFrame(loop);
        return;
      }
      
      ctx.fillStyle = 'rgba(5, 5, 12, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const t = Date.now() / 350;
      const midX = canvas.width / 2;
      const midY = canvas.height / 2;
      
      // Update dummy points slithering
      previewSnakeSegments = [];
      for (let i = 0; i < segmentsCount; i++) {
        const offsetAngle = t - i * 0.45;
        const x = midX + Math.cos(offsetAngle) * 50;
        const y = midY + Math.sin(offsetAngle * 2) * 15;
        previewSnakeSegments.push({ x, y, radius: radius * (1 - i * 0.08) });
      }
      
      // Draw connecting lines for lightning preview
      if (window.selectedSkin === 'lightning') {
        ctx.strokeStyle = '#ffdf00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(previewSnakeSegments[0].x, previewSnakeSegments[0].y);
        for(let i = 1; i < segmentsCount; i++) {
          ctx.lineTo(previewSnakeSegments[i].x, previewSnakeSegments[i].y);
        }
        ctx.stroke();
      }
      
      // Draw segments
      for (let i = segmentsCount - 1; i >= 0; i--) {
        const seg = previewSnakeSegments[i];
        ctx.save();
        ctx.translate(seg.x, seg.y);
        
        let color = '#00f3ff';
        let glow = 'rgba(0, 243, 255, 0.4)';
        
        switch(window.selectedSkin) {
          case 'cyber': color = '#00f3ff'; glow = 'rgba(0, 243, 255, 0.4)'; break;
          case 'fire': color = `rgb(${200 + Math.sin(t*3)*55}, 80, 0)`; glow = 'rgba(255, 100, 0, 0.5)'; break;
          case 'ice': color = i%2===0?'#ffffff':'#6bb8ff'; glow='rgba(150, 220, 255, 0.4)'; break;
          case 'galaxy': color=`hsl(${(240 + i*18) % 360}, 90%, 50%)`; glow='rgba(139, 0, 255, 0.4)'; break;
          case 'lightning': color='#ffdf00'; glow='rgba(255, 223, 0, 0.6)'; break;
          case 'dragon': color=i%2===0?'#1b8b3a':'#c9a0dc'; glow='rgba(57, 255, 20, 0.3)'; break;
          case 'chroma': color=`hsl(${(Date.now()/10 + i*15)%360}, 100%, 50%)`; glow=color; break;
        }
        
        ctx.shadowBlur = seg.radius * 2;
        ctx.shadowColor = glow;
        ctx.fillStyle = color;
        
        if (window.selectedSkin === 'ice') {
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const angle = (Math.PI / 3) * j;
            ctx.lineTo(Math.cos(angle) * seg.radius, Math.sin(angle) * seg.radius);
          }
          ctx.closePath();
          ctx.fill();
        } else if (window.selectedSkin === 'cyber' && i > 0) {
          ctx.fillRect(-seg.radius, -seg.radius, seg.radius*2, seg.radius*2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, seg.radius, 0, Math.PI*2);
          ctx.fill();
        }
        
        ctx.restore();
      }
      
      requestAnimationFrame(loop);
    };
    
    requestAnimationFrame(loop);
  }

  // AMBIENT BACKGROUND CANVAS
  startAmbientCanvas() {
    const canvas = document.getElementById('ambient-canvas');
    const ctx = canvas.getContext('2d');
    
    const resizeBg = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeBg();
    window.addEventListener('resize', resizeBg);
    
    // Float geometric dots particles list
    const bgParticles = [];
    const maxCount = 28;
    for(let i=0; i<maxCount; i++) {
      bgParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: 1.2 + Math.random() * 3,
        color: Math.random() > 0.5 ? 'rgba(0, 243, 255, 0.05)' : 'rgba(255, 0, 127, 0.05)'
      });
    }
    
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update particles
      bgParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce bounds
        if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  loadCustomSettings() {
    // Restore settings from LocalStorage
    const sfx = localStorage.getItem("cybersnake_volume_sfx");
    const bgm = localStorage.getItem("cybersnake_volume_music");
    const graphics = localStorage.getItem("cybersnake_graphics");
    const lines = localStorage.getItem("cybersnake_gridlines");
    const shake = localStorage.getItem("cybersnake_shake");
    const selectedS = localStorage.getItem("cybersnake_selected_skin");
    const selectedT = localStorage.getItem("cybersnake_selected_trail");
    
    if (sfx) {
      window.Sound.sfxVolume = parseFloat(sfx) / 100;
      document.getElementById('settings-volume-sfx').value = sfx;
      document.getElementById('val-volume-sfx').innerText = `${sfx}%`;
    }
    if (bgm) {
      window.Sound.musicVolume = parseFloat(bgm) / 100;
      document.getElementById('settings-volume-music').value = bgm;
      document.getElementById('val-volume-music').innerText = `${bgm}%`;
    }
    if (graphics) {
      window.graphicsQuality = graphics;
      document.getElementById('settings-graphics').value = graphics;
    }
    if (lines) {
      window.gridLinesEnabled = lines === 'true';
      document.getElementById('settings-grid-lines').checked = lines === 'true';
    }
    if (shake) {
      window.screenShakeEnabled = shake === 'true';
      document.getElementById('settings-screen-shake').checked = shake === 'true';
    }
    if (selectedS) window.selectedSkin = selectedS;
    if (selectedT) window.selectedTrail = selectedT;
    
    // Controls mapping restore
    const controls = localStorage.getItem("cybersnake_controls") || 'keyboard';
    document.getElementById('settings-controls').value = controls;
  }

  saveCustomSettings() {
    localStorage.setItem("cybersnake_volume_sfx", String(Math.round(window.Sound.sfxVolume * 100)));
    localStorage.setItem("cybersnake_volume_music", String(Math.round(window.Sound.musicVolume * 100)));
    localStorage.setItem("cybersnake_graphics", window.graphicsQuality);
    localStorage.setItem("cybersnake_gridlines", String(window.gridLinesEnabled));
    localStorage.setItem("cybersnake_shake", String(window.screenShakeEnabled));
  }
}

// Instantiate App
window.addEventListener('load', () => {
  window.App = new AppCoordinator();
  window.App.init();
});
