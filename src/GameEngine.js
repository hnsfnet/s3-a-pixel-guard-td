import { GAME_STATE, WAVES, getWaveTotalCount } from './config.js';

export class GameEngine {
  constructor(ctx, config, mapRenderer, towerManager, enemyManager, uiController) {
    this.ctx = ctx;
    this.config = config;
    this.mapRenderer = mapRenderer;
    this.towerManager = towerManager;
    this.enemyManager = enemyManager;
    this.uiController = uiController;

    this.state = GAME_STATE.WAITING;
    this.currentWave = 0;
    this.gold = config.initialGold;
    this.health = config.initialHealth;
    this.maxHealth = config.initialHealth;
    this.countdown = config.waveCountdown;

    this.lastTime = 0;
    this.running = false;
    this.selectedTower = null;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.uiController.updateWavePreview(this);
    this._loop(this.lastTime);
  }

  restart() {
    this.state = GAME_STATE.WAITING;
    this.currentWave = 0;
    this.gold = this.config.initialGold;
    this.health = this.config.initialHealth;
    this.countdown = this.config.waveCountdown;
    this.towerManager.towers = [];
    this.towerManager.bullets = [];
    this.enemyManager.enemies = [];
    this.enemyManager.resetSpawnState();
    this.selectedTower = null;
    this.uiController.hideBuildMenu();
    this.uiController.hideUpgradePanel();
    this.uiController.hideGameOver();
    this.uiController.updateHUD(this);
    this.uiController.updateWavePreview(this);
  }

  _loop(currentTime) {
    if (!this.running) return;

    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this._update(deltaTime);
    this._render();

    requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    if (this.state === GAME_STATE.WIN || this.state === GAME_STATE.LOSE) {
      return;
    }

    if (this.state === GAME_STATE.WAITING) {
      this.countdown -= dt;
      this.uiController.updateCountdown(Math.ceil(this.countdown));

      if (this.countdown <= 0) {
        this._startWave();
      }
    } else if (this.state === GAME_STATE.PLAYING) {
      this.enemyManager.update(dt, this.currentWave, this);
      this.towerManager.update(dt);
      this._checkWaveComplete();
    }

    this.uiController.updateHUD(this);
  }

  _startWave() {
    this.state = GAME_STATE.PLAYING;
    this.currentWave++;
    this.enemyManager.resetSpawnState();
    this.uiController.updateWave(this.currentWave, this.config.totalWaves);
    this.uiController.updateWavePreview(this);
  }

  _checkWaveComplete() {
    const totalToSpawn = getWaveTotalCount(this.currentWave - 1);
    if (
      this.enemyManager.spawnedCount >= totalToSpawn &&
      this.enemyManager.enemies.length === 0
    ) {
      if (this.currentWave >= this.config.totalWaves) {
        if (this.state !== GAME_STATE.LOSE) {
          this.state = GAME_STATE.WIN;
          this.uiController.showGameOver(true, this);
        }
      } else {
        if (this.state !== GAME_STATE.LOSE) {
          this.state = GAME_STATE.WAITING;
          this.countdown = this.config.waveCountdown;
          this.uiController.updateWavePreview(this);
        }
      }
    }
  }

  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.config.gridWidth * this.config.tileSize, this.config.gridHeight * this.config.tileSize);

    this.mapRenderer.render();

    if (this.selectedTower) {
      this.towerManager.renderTowerRange(this.selectedTower);
    }

    this.towerManager.renderTowers();
    this.enemyManager.render();
    this.towerManager.renderBullets();
  }

  buildTower(gridX, gridY, towerType) {
    const ok = this.towerManager.buildTower(gridX, gridY, towerType, this);
    if (ok) {
      this.selectedTower = null;
      this.uiController.hideUpgradePanel();
    }
    return ok;
  }

  upgradeTower(gridX, gridY) {
    const result = this.towerManager.upgradeTower(gridX, gridY, this);
    if (result.success) {
      const t = this.getTowerAt(gridX, gridY);
      this.selectedTower = t;
    }
    return result;
  }

  selectTower(tower) {
    this.selectedTower = tower;
  }

  clearSelectedTower() {
    this.selectedTower = null;
  }

  getUpgradeInfo(tower) {
    return this.towerManager.getUpgradeInfo(tower);
  }

  deductHealth(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.state = GAME_STATE.LOSE;
      this.uiController.showGameOver(false, this);
    }
  }

  addGold(amount) {
    this.gold += amount;
  }

  spendGold(amount) {
    if (amount <= 0) return false;
    if (this.gold >= amount) {
      this.gold -= amount;
      if (this.gold < 0) this.gold = 0;
      return true;
    }
    return false;
  }

  screenToGrid(screenX, screenY) {
    const gridX = Math.floor(screenX / this.config.tileSize);
    const gridY = Math.floor(screenY / this.config.tileSize);
    return { gridX, gridY };
  }

  getTowerAt(gridX, gridY) {
    return this.towerManager.getTowerAt(gridX, gridY);
  }

  getNextWaveIndex() {
    if (this.state === GAME_STATE.WAITING) return this.currentWave;
    if (this.state === GAME_STATE.PLAYING) return this.currentWave;
    return -1;
  }
}
