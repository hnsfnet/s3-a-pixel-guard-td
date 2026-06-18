import { TOWER_TYPES } from './config.js';

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

    this.selectedGridX = -1;
    this.selectedGridY = -1;
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

    if (!this.gameEngine.mapRenderer.isBuildable(gridX, gridY)) {
      this.hideBuildMenu();
      return;
    }

    if (this.gameEngine.getTowerAt(gridX, gridY)) {
      this.hideBuildMenu();
      return;
    }

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
      if (this.gameEngine.mapRenderer.isBuildable(this.mouseGridX, this.mouseGridY)
          && !this.gameEngine.getTowerAt(this.mouseGridX, this.mouseGridY)) {
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

    const canvasRect = this.canvas.parentElement.getBoundingClientRect();
    const menuWidth = 340;
    const menuHeight = 280;
    let left = clientX - canvasRect.left + 20;
    let top = clientY - canvasRect.top - 20;

    if (left + menuWidth > canvasRect.width - 10) {
      left = clientX - canvasRect.left - menuWidth - 20;
    }
    if (top + menuHeight > canvasRect.height - 10) {
      top = canvasRect.height - menuHeight - 10;
    }
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    this.buildMenu.style.left = left + 'px';
    this.buildMenu.style.top = top + 'px';
    this.buildMenu.classList.remove('hidden');
  }

  hideBuildMenu() {
    this.buildMenu.classList.add('hidden');
    this.selectedGridX = -1;
    this.selectedGridY = -1;
    this.hoverTowerType = null;
  }

  _onSelectTower(type) {
    if (this.selectedGridX < 0 || this.selectedGridY < 0) return;
    if (!this.gameEngine.buildTower(this.selectedGridX, this.selectedGridY, type)) {
      return;
    }
    this.hideBuildMenu();
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
      if (gameEngine.gold < cost) {
        opt.classList.add('disabled');
      } else {
        opt.classList.remove('disabled');
      }
    });
  }

  updateCountdown(value) {
    if (value < 0) value = 0;
    this.countdownValue.textContent = value;
  }

  updateWave(current, total) {
    this.waveValue.textContent = `${current} / ${total}`;
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
