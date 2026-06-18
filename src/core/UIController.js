import { WAVES, getWaveTotalCount, GAME_STATE, TOWER_LEVELS, TOWER_BASE_TYPES, LEVELS, getLevelById } from '../config.js';
import { COMPONENT_NAMES } from '../ecs/Component.js';
import { ENEMY_TYPES } from '../config.js';

export class UIController {
  constructor(gameEngine, canvas) {
    this.gameEngine = gameEngine;
    this.canvas = canvas;
    this.gameEngine.setUIController(this);

    this._setupHUD();
    this._setupCanvasEvents();
    this._setupBuildMenu();
    this._setupUpgradePanel();
    this._setupGameOver();
    this._setupLevelSelector();
    this._setupCountdown();

    this.updateHUD(gameEngine);
    this.updateWavePreview(gameEngine);
  }

  _setupHUD() {
    this.hudWave = document.getElementById('hud-wave');
    this.hudGold = document.getElementById('hud-gold');
    this.hudHealth = document.getElementById('hud-health');
    this.hudCountdown = document.getElementById('hud-countdown');
    this.wavePreview = document.getElementById('wave-preview');
    this.enemiesRemaining = document.getElementById('enemies-remaining');
  }

  _setupCanvasEvents() {
    const rect = () => this.canvas.getBoundingClientRect();

    this.canvas.addEventListener('mousemove', (e) => {
      const r = rect();
      const sx = (e.clientX - r.left) * (this.canvas.width / r.width);
      const sy = (e.clientY - r.top) * (this.canvas.height / r.height);
      const TILE = this.gameEngine.currentLevel.tileSize;
      const gx = Math.floor(sx / TILE);
      const gy = Math.floor(sy / TILE);
      this.gameEngine.hoverGridX = gx;
      this.gameEngine.hoverGridY = gy;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.gameEngine.hoverGridX = null;
      this.gameEngine.hoverGridY = null;
    });

    this.canvas.addEventListener('click', (e) => {
      const r = rect();
      const sx = (e.clientX - r.left) * (this.canvas.width / r.width);
      const sy = (e.clientY - r.top) * (this.canvas.height / r.height);
      this._handleCanvasClick(sx, sy);
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.gameEngine.cancelBuildMode();
      this.gameEngine.clearSelection();
    });
  }

  _handleCanvasClick(sx, sy) {
    const TILE = this.gameEngine.currentLevel.tileSize;
    const gx = Math.floor(sx / TILE);
    const gy = Math.floor(sy / TILE);

    if (this.gameEngine.isBuildMode) {
      const baseType = this.gameEngine.buildBaseType;
      if (this.gameEngine.canBuildAt(gx, gy)) {
        this.gameEngine.buildTower(gx, gy, baseType);
        if (this.gameEngine.gold < (TOWER_LEVELS[baseType][0].cost || 99999)) {
          this.gameEngine.cancelBuildMode();
        }
      }
      return;
    }

    const towers = this.gameEngine.entityManager.byTag('tower');
    let clickedTower = null;
    for (const t of towers) {
      const pos = t.getComponent(COMPONENT_NAMES.POSITION);
      const grid = t.getComponent(COMPONENT_NAMES.GRID);
      if (grid && grid.gridX === gx && grid.gridY === gy) {
        clickedTower = t;
        break;
      }
    }
    if (clickedTower) {
      this.gameEngine.selectTower(clickedTower);
    } else {
      this.gameEngine.clearSelection();
    }
  }

  _setupBuildMenu() {
    const arrowBtn = document.getElementById('build-arrow');
    const cannonBtn = document.getElementById('build-cannon');
    const cancelBtn = document.getElementById('build-cancel');

    const activate = (btn) => {
      [arrowBtn, cannonBtn].forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    };

    arrowBtn.addEventListener('click', () => {
      this.gameEngine.startBuildMode(TOWER_BASE_TYPES.ARROW);
      activate(arrowBtn);
    });

    cannonBtn.addEventListener('click', () => {
      this.gameEngine.startBuildMode(TOWER_BASE_TYPES.CANNON);
      activate(cannonBtn);
    });

    cancelBtn.addEventListener('click', () => {
      this.gameEngine.cancelBuildMode();
      activate(null);
      this.gameEngine.clearSelection();
    });

    this.buildArrowBtn = arrowBtn;
    this.buildCannonBtn = cannonBtn;
    this.buildCancelBtn = cancelBtn;
  }

  _setupUpgradePanel() {
    this.upgradePanel = document.getElementById('upgrade-panel');
    this.upgradeContent = document.getElementById('upgrade-content');
    this.upgradeClose = document.getElementById('upgrade-close');
    this.upgradeBtn = document.getElementById('upgrade-btn');

    this.upgradeClose.addEventListener('click', () => this.hideUpgradePanel());
  }

  _setupGameOver() {
    this.gameOverPanel = document.getElementById('game-over-panel');
    this.gameOverTitle = document.getElementById('game-over-title');
    this.gameOverStats = document.getElementById('game-over-stats');
    this.restartBtn = document.getElementById('restart-btn');
    this.nextLevelBtn = document.getElementById('next-level-btn');

    this.restartBtn.addEventListener('click', () => {
      const currentId = this.gameEngine.currentLevelId;
      this.gameEngine.setLevel(currentId);
      this.hideGameOver();
      if (this.gameEngine.waveSystem) this.gameEngine.waveSystem.startCountdown();
      this.updateHUD(this.gameEngine);
      this.updateWavePreview(this.gameEngine);
    });

    this.nextLevelBtn.addEventListener('click', () => {
      const currentIdx = LEVELS.findIndex(l => l.id === this.gameEngine.currentLevelId);
      const nextIdx = (currentIdx + 1) % LEVELS.length;
      this.gameEngine.setLevel(LEVELS[nextIdx].id);
      this.hideGameOver();
      if (this.gameEngine.waveSystem) this.gameEngine.waveSystem.startCountdown();
      this.updateHUD(this.gameEngine);
      this.updateWavePreview(this.gameEngine);
      this._refreshLevelSelector();
    });
  }

  _setupLevelSelector() {
    this.levelSelector = document.getElementById('level-selector');
    if (!this.levelSelector) return;
    this.levelSelector.innerHTML = '';
    for (const lvl of LEVELS) {
      const opt = document.createElement('option');
      opt.value = lvl.id;
      opt.textContent = `第${lvl.id}关 - ${lvl.name}`;
      this.levelSelector.appendChild(opt);
    }
    this.levelSelector.value = this.gameEngine.currentLevelId;
    this.levelSelector.addEventListener('change', () => {
      const newId = parseInt(this.levelSelector.value, 10);
      this.gameEngine.setLevel(newId);
      this.hideGameOver();
      this.hideUpgradePanel();
      if (this.gameEngine.waveSystem) this.gameEngine.waveSystem.startCountdown();
      this.updateHUD(this.gameEngine);
      this.updateWavePreview(this.gameEngine);
    });
  }

  _refreshLevelSelector() {
    if (this.levelSelector) this.levelSelector.value = this.gameEngine.currentLevelId;
  }

  _setupCountdown() {
    this.countdownEl = document.getElementById('start-countdown-btn');
    if (this.countdownEl) {
      this.countdownEl.addEventListener('click', () => {
        this.gameEngine.forceStartWave();
      });
    }
  }

  updateHUD(ge) {
    if (this.hudWave) this.hudWave.textContent = `波次 ${Math.min(ge.currentWave + 1, ge.totalWaves)}/${ge.totalWaves}`;
    if (this.hudGold) this.hudGold.textContent = `💰 ${ge.gold}`;
    if (this.hudHealth) {
      const h = Math.max(0, ge.health);
      this.hudHealth.textContent = `❤️ ${h}`;
      this.hudHealth.style.color = h <= 5 ? '#e74c3c' : (h <= 10 ? '#f39c12' : 'inherit');
    }
    if (this.hudCountdown) {
      const state = ge.state;
      if (state === GAME_STATE.WAITING && ge.countdown > 0) {
        this.hudCountdown.textContent = `⏳ ${Math.ceil(ge.countdown)}s`;
        this.hudCountdown.style.color = '#f39c12';
      } else if (state === GAME_STATE.PLAYING) {
        this.hudCountdown.textContent = '⚔️ 进行中';
        this.hudCountdown.style.color = '#2ecc71';
      } else if (state === GAME_STATE.WIN) {
        this.hudCountdown.textContent = '🏆 胜利';
        this.hudCountdown.style.color = '#f1c40f';
      } else if (state === GAME_STATE.LOSE) {
        this.hudCountdown.textContent = '💀 失败';
        this.hudCountdown.style.color = '#e74c3c';
      }
    }
    if (this.enemiesRemaining) {
      const waveTotal = getWaveTotalCount(ge.currentWave);
      this.enemiesRemaining.textContent = `剩余: ${ge.enemiesRemaining}/${waveTotal}`;
    }
  }

  updateWavePreview(ge) {
    const container = document.getElementById('wave-preview-inner');
    if (!container) return;
    const nextIdx = ge.currentWave + 1;
    if (nextIdx >= WAVES.length) {
      container.innerHTML = '<span style="font-size:11px;color:#7f8c8d;">最后一波</span>';
      return;
    }
    const wave = WAVES[nextIdx];
    let html = '';
    for (const grp of wave.enemies) {
      const isFlying = grp.type === ENEMY_TYPES.FLYING;
      html += `<div class="wave-preview-item">
        <div class="badge ${isFlying ? 'badge-flying' : 'badge-ground'}">${isFlying ? '✈' : '●'}</div>
        <span class="wave-count">×${grp.count}</span>
      </div>`;
    }
    container.innerHTML = html;
  }

  _showUpgradePanel(ge) {
    if (!this.upgradePanel || !this.upgradeContent) return;
    const tower = ge.selectedTower;
    if (!tower) { this.hideUpgradePanel(); return; }

    const id = tower.id;
    const info = ge.getUpgradeInfo(id);
    if (!info) { this.hideUpgradePanel(); return; }

    const { towerCmp, attack, currentLevelCfg, nextLevelCfg, isMaxLevel, cost } = info;

    let content = '';
    content += `<div class="upgrade-header">
      <div class="upgrade-title" style="color:${currentLevelCfg.color}">
        <span class="level-stars">${'★'.repeat(towerCmp.level)}${'☆'.repeat(3 - towerCmp.level)}</span>
        ${towerCmp.towerName}
      </div>
      <div class="upgrade-desc">${towerCmp.description}</div>
    </div>`;

    content += `<div class="upgrade-stats">
      <div class="stat-row"><span class="stat-label">伤害</span><span class="stat-val">${attack.damage}</span></div>
      <div class="stat-row"><span class="stat-label">射程</span><span class="stat-val">${attack.range.toFixed(1)}</span></div>
      <div class="stat-row"><span class="stat-label">射速</span><span class="stat-val">${(1 / attack.fireRate).toFixed(2)}/秒</span></div>
      ${attack.splashRadius > 0 ? `<div class="stat-row"><span class="stat-label">溅射</span><span class="stat-val">${attack.splashRadius.toFixed(1)}</span></div>` : ''}
      ${attack.multiShot > 1 ? `<div class="stat-row"><span class="stat-label">多重</span><span class="stat-val">×${attack.multiShot}</span></div>` : ''}
      ${attack.canHitFlying ? `<div class="stat-row"><span class="stat-label">对空</span><span class="stat-val" style="color:#9b59b6">✔ 可打飞行</span></div>` : `<div class="stat-row"><span class="stat-label">对空</span><span class="stat-val" style="color:#95a5a6">✘ 无法攻击</span></div>`}
    </div>`;

    if (isMaxLevel) {
      content += `<div class="upgrade-maxed">🏆 已达最高等级 🏆</div>`;
    } else {
      const canAfford = ge.gold >= cost;
      content += `<div class="upgrade-next">
        <div class="next-title">下一级: <span style="color:${nextLevelCfg.color}">${nextLevelCfg.name}</span></div>
        <div class="next-desc">${nextLevelCfg.description}</div>
        <div class="next-stats">`;

      if (nextLevelCfg.damage !== currentLevelCfg.damage)
        content += `<div class="next-stat">▲ 伤害 ${currentLevelCfg.damage} → <b>${nextLevelCfg.damage}</b></div>`;
      if (nextLevelCfg.range !== currentLevelCfg.range)
        content += `<div class="next-stat">▲ 射程 ${currentLevelCfg.range.toFixed(1)} → <b>${nextLevelCfg.range.toFixed(1)}</b></div>`;
      if (nextLevelCfg.fireRate !== currentLevelCfg.fireRate)
        content += `<div class="next-stat">▲ 射速 ${(1/currentLevelCfg.fireRate).toFixed(2)} → <b>${(1/nextLevelCfg.fireRate).toFixed(2)}</b>/秒</div>`;
      if (nextLevelCfg.splashRadius !== currentLevelCfg.splashRadius)
        content += `<div class="next-stat">▲ 溅射 ${currentLevelCfg.splashRadius.toFixed(1)} → <b>${nextLevelCfg.splashRadius.toFixed(1)}</b></div>`;
      if (nextLevelCfg.multiShot !== currentLevelCfg.multiShot)
        content += `<div class="next-stat">★ 多重射击 ×${nextLevelCfg.multiShot}</div>`;
      if (nextLevelCfg.poisonDps > 0)
        content += `<div class="next-stat" style="color:#2ecc71">★ 附加毒伤 ${nextLevelCfg.poisonDps}/秒 ×${nextLevelCfg.poisonDuration}秒</div>`;
      if (nextLevelCfg.slowPercent > 0)
        content += `<div class="next-stat" style="color:#00bcd4">★ 减速 ${Math.round(nextLevelCfg.slowPercent*100)}% ×${nextLevelCfg.slowDuration}秒</div>`;

      content += `</div>
        <button id="upgrade-action-btn" class="upgrade-action ${canAfford ? 'can-afford' : 'cannot-afford'}">
          升级 (💰${cost})
        </button>
      </div>`;
    }

    this.upgradeContent.innerHTML = content;
    this.upgradePanel.style.display = 'block';

    const actBtn = document.getElementById('upgrade-action-btn');
    if (actBtn) {
      actBtn.addEventListener('click', () => {
        const r = ge.upgradeTower(id);
        if (r.success) {
          this._showUpgradePanel(ge);
        }
      });
    }
  }

  updateUpgradePanel(ge) {
    if (this.upgradePanel && this.upgradePanel.style.display === 'block') {
      this._showUpgradePanel(ge);
    }
  }

  hideUpgradePanel() {
    if (this.upgradePanel) this.upgradePanel.style.display = 'none';
  }

  showGameOver(isWin, ge) {
    if (!this.gameOverPanel) return;
    this.gameOverPanel.style.display = 'flex';
    this.gameOverTitle.textContent = isWin ? '🎉 胜利！' : '💀 游戏结束';
    this.gameOverTitle.style.color = isWin ? '#f1c40f' : '#e74c3c';
    this.gameOverStats.innerHTML = `
      <div>关卡: 第${ge.currentLevelId}关 - ${ge.currentLevel.name}</div>
      <div>波次: ${ge.currentWave}/${ge.totalWaves}</div>
      <div>剩余金币: 💰 ${ge.gold}</div>
      <div>剩余生命: ❤️ ${ge.health}</div>
    `;
    if (this.nextLevelBtn) this.nextLevelBtn.style.display = isWin ? 'inline-block' : 'none';
  }

  hideGameOver() {
    if (this.gameOverPanel) this.gameOverPanel.style.display = 'none';
  }
}
