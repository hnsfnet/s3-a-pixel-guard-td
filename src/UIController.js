import { TOWER_TYPES, WAVES, TOWER_LEVELS } from './config.js';

export class UIController {
  constructor(config) {
    this.config = config;
    this.gameEngine = null;
    this.canvas = document.getElementById('game-canvas');
    this.waveValue = document.getElementById('wave-value');
    this.goldValue = document.getElementById('gold-value');
    this.healthFill = document.getElementById('health-fill');
    this.healthValue = document.getElementById('health-value');
    this.countdownValue = document.getElementById('countdown-value');
    this.buildMenu = document.getElementById('build-menu');
    this.gameOverEl = document.getElementById('game-over');
    this.gameOverTitle = document.getElementById('game-over-title');
    this.restartBtn = document.getElementById('restart-btn');
    this.cancelBuildBtn = document.getElementById('cancel-build');
    this.previewEnemies = document.getElementById('preview-enemies');

    this.upgradePanel = document.getElementById('upgrade-panel');
    this.upgradeTitle = document.getElementById('upgrade-title');
    this.upgradeDesc = document.getElementById('upgrade-desc');
    this.currentStatsEl = document.getElementById('current-stats');
    this.nextSection = document.getElementById('upgrade-next-section');
    this.nextNameEl = document.getElementById('next-name');
    this.nextEffectsEl = document.getElementById('next-effects');
    this.nextStatsEl = document.getElementById('next-stats');
    this.maxLevelSection = document.getElementById('max-level-section');
    this.upgradeBtn = document.getElementById('confirm-upgrade');
    this.upgradeCostEl = document.getElementById('upgrade-cost');
    this.cancelUpgradeBtn = document.getElementById('cancel-upgrade');

    this.selectedGridX = -1;
    this.selectedGridY = -1;
    this.upgradeGridX = -1;
    this.upgradeGridY = -1;
    this.hoverTowerType = null;
    this.mouseGridX = -1;
    this.mouseGridY = -1;

    this._bindEvents();
  }

  setGameEngine(engine) {
    this.gameEngine = engine;
  }

  _bindEvents() {
    this.canvas.addEventListener('click', (e) => this._onCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this._onCanvasMove(e));
    this.canvas.addEventListener('mouseleave', () => this._onCanvasLeave());

    document.querySelectorAll('.tower-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const type = opt.dataset.tower;
        this._onSelectTower(type);
      });
    });

    this.cancelBuildBtn.addEventListener('click', () => this.hideBuildMenu());
    this.restartBtn.addEventListener('click', () => this._onRestart());
    this.cancelUpgradeBtn.addEventListener('click', () => this.hideUpgradePanel());
    this.upgradeBtn.addEventListener('click', () => this._onConfirmUpgrade());
  }

  _onCanvasClick(e) {
    if (!this.gameEngine) return;
    if (this.gameEngine.state === 'win' || this.gameEngine.state === 'lose') return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const { gridX, gridY } = this.gameEngine.screenToGrid(x, y);

    const existingTower = this.gameEngine.getTowerAt(gridX, gridY);
    if (existingTower) {
      this.hideBuildMenu();
      this._showUpgradePanel(existingTower, e.clientX, e.clientY);
      this.gameEngine.selectTower(existingTower);
      return;
    }

    if (!this.gameEngine.mapRenderer.isBuildable(gridX, gridY)) {
      this.hideBuildMenu();
      this.hideUpgradePanel();
      this.gameEngine.clearSelectedTower();
      return;
    }

    this.hideUpgradePanel();
    this.gameEngine.clearSelectedTower();
    this._showBuildMenu(gridX, gridY, e.clientX, e.clientY);
  }

  _onCanvasMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const { gridX, gridY } = this.gameEngine.screenToGrid(x, y);
    this.mouseGridX = gridX;
    this.mouseGridY = gridY;

    requestAnimationFrame(() => this._renderHover());
  }

  _onCanvasLeave() {
    this.mouseGridX = -1;
    this.mouseGridY = -1;
  }

  _renderHover() {
    if (!this.gameEngine) return;

    if (this.mouseGridX >= 0 && this.mouseGridY >= 0) {
      const hasTower = !!this.gameEngine.getTowerAt(this.mouseGridX, this.mouseGridY);
      if (this.gameEngine.mapRenderer.isBuildable(this.mouseGridX, this.mouseGridY) && !hasTower) {
        this.gameEngine.mapRenderer.highlightTile(this.mouseGridX, this.mouseGridY, 'rgba(255, 255, 255, 0.25)');
      }
    }

    if (this.hoverTowerType && this.mouseGridX >= 0) {
      if (this.gameEngine.mapRenderer.isBuildable(this.mouseGridX, this.mouseGridY)) {
        this.gameEngine.towerManager.renderTowerPreview(this.mouseGridX, this.mouseGridY, this.hoverTowerType);
      }
    }
  }

  _showBuildMenu(gridX, gridY, clientX, clientY) {
    this.selectedGridX = gridX;
    this.selectedGridY = gridY;

    const towerOptions = this.buildMenu.querySelectorAll('.tower-option');
    towerOptions.forEach((opt) => {
      const type = opt.dataset.tower;
      const cost = TOWER_TYPES[type].cost;
      if (this.gameEngine.gold < cost) {
        opt.classList.add('disabled');
      } else {
        opt.classList.remove('disabled');
      }
    });

    this._positionMenu(this.buildMenu, clientX, clientY, 340, 310);
    this.buildMenu.classList.remove('hidden');
  }

  _showUpgradePanel(tower, clientX, clientY) {
    const info = this.gameEngine.getUpgradeInfo(tower);
    if (!info) return;

    this.upgradeGridX = tower.gridX;
    this.upgradeGridY = tower.gridY;

    this.upgradeTitle.textContent = `${info.current.name}  Lv.${info.level}`;
    this.upgradeDesc.textContent = info.current.description;

    this.currentStatsEl.innerHTML = this._renderStats(info.current, false);

    if (info.next) {
      this.nextSection.classList.remove('hidden');
      this.maxLevelSection.classList.add('hidden');
      this.nextNameEl.textContent = `${info.next.name} (Lv.${info.level + 1})`;
      this.nextEffectsEl.innerHTML = this._renderEffects(info.current, info.next);
      this.nextStatsEl.innerHTML = this._renderStats(info.next, true);

      const canAfford = this.gameEngine.gold >= info.next.upgradeCost;
      this.upgradeCostEl.textContent = `💰 ${info.next.upgradeCost}`;
      this.upgradeBtn.disabled = !canAfford;
      this.upgradeBtn.classList.toggle('disabled', !canAfford);
    } else {
      this.nextSection.classList.add('hidden');
      this.maxLevelSection.classList.remove('hidden');
      this.upgradeBtn.disabled = true;
    }

    const panelHeight = info.next ? 420 : 290;
    this._positionMenu(this.upgradePanel, clientX, clientY, 360, panelHeight);
    this.upgradePanel.classList.remove('hidden');
  }

  _renderStats(cfg, isNext) {
    const rows = [];
    const p = (v) => v;
    const add = (label, val) => rows.push(`<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${val}</span></div>`);
    add('伤害', cfg.damage);
    add('射程', cfg.range.toFixed(1) + '格');
    add('攻速', cfg.fireRate.toFixed(2) + 's');
    if (cfg.splashRadius > 0) add('溅射', cfg.splashRadius.toFixed(1) + '格');
    if (cfg.multiShot > 1) add('箭矢数', `${cfg.multiShot}支`);
    if (cfg.poisonDps > 0) add('毒素', `${cfg.poisonDps}/秒 ×${cfg.poisonDuration}s`);
    if (cfg.slowPercent > 0) add('减速', `${Math.round(cfg.slowPercent * 100)}% ×${cfg.slowDuration}s`);
    add('对空', cfg.canHitFlying ? '<span class="stat-value good">✓</span>' : '<span class="stat-value bad">✗</span>');
    return rows.join('');
  }

  _renderEffects(current, next) {
    const buffs = [];
    const pushBuff = (text, isSpecial = false) => {
      buffs.push(`<div class="effect-item ${isSpecial ? 'upgrade-buff' : ''}">${text}</div>`);
    };
    if (next.damage > current.damage) pushBuff(`伤害 ${current.damage} → ${next.damage}`);
    if (next.range > current.range) pushBuff(`射程 ${current.range.toFixed(1)} → ${next.range.toFixed(1)} 格`);
    if (next.fireRate < current.fireRate) pushBuff(`攻速提升 ${current.fireRate.toFixed(2)}s → ${next.fireRate.toFixed(2)}s`);
    if (next.splashRadius > current.splashRadius) pushBuff(`溅射范围 ${current.splashRadius} → ${next.splashRadius} 格`);
    if (next.multiShot > current.multiShot) pushBuff(`多重射击 ${current.multiShot} → ${next.multiShot} 支`, true);
    if (next.poisonDps > 0 && current.poisonDps === 0) pushBuff(`附加剧毒：每秒${next.poisonDps}伤害，持续${next.poisonDuration}秒`, true);
    if (next.slowPercent > 0 && current.slowPercent === 0) pushBuff(`冰冻效果：减速${Math.round(next.slowPercent * 100)}%，持续${next.slowDuration}秒`, true);
    if (buffs.length === 0) pushBuff('属性略有提升');
    return buffs.join('');
  }

  _positionMenu(menuEl, clientX, clientY, menuWidth, menuHeight) {
    const canvasRect = this.canvas.parentElement.getBoundingClientRect();
    let left = clientX - canvasRect.left + 20;
    let top = clientY - canvasRect.top - 30;
    if (left + menuWidth > canvasRect.width - 12) left = clientX - canvasRect.left - menuWidth - 20;
    if (top + menuHeight > canvasRect.height - 12) top = canvasRect.height - menuHeight - 12;
    if (left < 12) left = 12;
    if (top < 12) top = 12;
    menuEl.style.left = left + 'px';
    menuEl.style.top = top + 'px';
  }

  hideBuildMenu() {
    this.buildMenu.classList.add('hidden');
    this.selectedGridX = -1;
    this.selectedGridY = -1;
    this.hoverTowerType = null;
  }

  hideUpgradePanel() {
    this.upgradePanel.classList.add('hidden');
    this.upgradeGridX = -1;
    this.upgradeGridY = -1;
  }

  _onSelectTower(type) {
    if (this.selectedGridX < 0 || this.selectedGridY < 0) return;
    if (!this.gameEngine.buildTower(this.selectedGridX, this.selectedGridY, type)) {
      return;
    }
    this.hideBuildMenu();
  }

  _onConfirmUpgrade() {
    if (this.upgradeGridX < 0) return;
    const result = this.gameEngine.upgradeTower(this.upgradeGridX, this.upgradeGridY);
    if (result.success) {
      const tower = this.gameEngine.getTowerAt(this.upgradeGridX, this.upgradeGridY);
      if (tower) {
        const info = this.gameEngine.getUpgradeInfo(tower);
        this.upgradeTitle.textContent = `${info.current.name}  Lv.${info.level}`;
        this.upgradeDesc.textContent = info.current.description;
        this.currentStatsEl.innerHTML = this._renderStats(info.current, false);
        if (info.next) {
          this.nextSection.classList.remove('hidden');
          this.maxLevelSection.classList.add('hidden');
          this.nextNameEl.textContent = `${info.next.name} (Lv.${info.level + 1})`;
          this.nextEffectsEl.innerHTML = this._renderEffects(info.current, info.next);
          this.nextStatsEl.innerHTML = this._renderStats(info.next, true);
          const canAfford = this.gameEngine.gold >= info.next.upgradeCost;
          this.upgradeCostEl.textContent = `💰 ${info.next.upgradeCost}`;
          this.upgradeBtn.disabled = !canAfford;
        } else {
          this.nextSection.classList.add('hidden');
          this.maxLevelSection.classList.remove('hidden');
          this.upgradeBtn.disabled = true;
        }
      }
    }
  }

  _onRestart() {
    if (this.gameEngine) {
      this.gameEngine.restart();
    }
  }

  updateHUD(gameEngine) {
    this.goldValue.textContent = gameEngine.gold;
    const healthPct = (gameEngine.health / gameEngine.maxHealth) * 100;
    this.healthFill.style.width = healthPct + '%';
    this.healthValue.textContent = `${gameEngine.health} / ${gameEngine.maxHealth}`;
    this.waveValue.textContent = `${Math.max(gameEngine.currentWave, 1)} / ${this.config.totalWaves}`;

    document.querySelectorAll('.tower-option').forEach((opt) => {
      const type = opt.dataset.tower;
      const cost = TOWER_TYPES[type].cost;
      if (gameEngine.gold < cost) opt.classList.add('disabled');
      else opt.classList.remove('disabled');
    });

    if (!this.upgradePanel.classList.contains('hidden') && this.upgradeGridX >= 0) {
      const tower = this.gameEngine.getTowerAt(this.upgradeGridX, this.upgradeGridY);
      if (tower) {
        const info = this.gameEngine.getUpgradeInfo(tower);
        if (info && info.next) {
          const canAfford = gameEngine.gold >= info.next.upgradeCost;
          this.upgradeBtn.disabled = !canAfford;
        }
      }
    }
  }

  updateCountdown(value) {
    if (value < 0) value = 0;
    this.countdownValue.textContent = value;
  }

  updateWave(current, total) {
    this.waveValue.textContent = `${current} / ${total}`;
  }

  updateWavePreview(gameEngine) {
    let waveIdx;
    if (gameEngine.currentWave === 0) waveIdx = 0;
    else if (gameEngine.state === 'waiting') waveIdx = gameEngine.currentWave;
    else waveIdx = gameEngine.currentWave - 1;
    if (waveIdx < 0 || waveIdx >= WAVES.length) {
      this.previewEnemies.innerHTML = '<span class="hud-label" style="color:#888">—</span>';
      return;
    }
    const wave = WAVES[waveIdx];
    const html = wave.enemies.map((e) => {
      if (e.type === 'GROUND') {
        return `<div class="preview-enemy ground">
          <span class="preview-icon ground-icon"></span>
          地面×${e.count}
        </div>`;
      } else {
        return `<div class="preview-enemy flying">
          <span class="preview-icon flying-icon"></span>
          飞行×${e.count}
        </div>`;
      }
    }).join('');
    this.previewEnemies.innerHTML = html;
  }

  showGameOver(isWin, gameEngine) {
    this.gameOverTitle.textContent = isWin ? '🎉 胜利！' : '💀 游戏结束';
    this.gameOverTitle.className = isWin ? 'win' : 'lose';
    document.getElementById('final-wave').textContent = gameEngine.currentWave;
    document.getElementById('final-gold').textContent = gameEngine.gold;
    document.getElementById('final-health').textContent = gameEngine.health;
    this.gameOverEl.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverEl.classList.add('hidden');
  }
}
