import { EntityManager } from '../ecs/EntityManager.js';
import { WaveSystem } from '../ecs/systems/WaveSystem.js';
import { MovementSystem } from '../ecs/systems/MovementSystem.js';
import { StatusEffectSystem } from '../ecs/systems/StatusEffectSystem.js';
import { TowerSystem } from '../ecs/systems/TowerSystem.js';
import { ProjectileSystem } from '../ecs/systems/ProjectileSystem.js';
import { EnemyDeathSystem } from '../ecs/systems/EnemyDeathSystem.js';
import { EffectSystem } from '../ecs/systems/EffectSystem.js';
import { MapRenderSystem } from '../ecs/systems/MapRenderSystem.js';
import { TowerRenderSystem } from '../ecs/systems/TowerRenderSystem.js';
import { EnemyRenderSystem } from '../ecs/systems/EnemyRenderSystem.js';
import { ProjectileRenderSystem } from '../ecs/systems/ProjectileRenderSystem.js';
import { EffectRenderSystem } from '../ecs/systems/EffectRenderSystem.js';
import { GAME_STATE, WAVES, getLevelById, DEFAULT_LEVEL_ID, TOWER_TYPES, getWaveTotalCount, TOWER_BASE_TYPES } from '../config.js';

export class GameEngine {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.config = config || { totalWaves: WAVES.length };
    this.config.totalWaves = WAVES.length;

    this.entityManager = new EntityManager();

    this._systems = [];
    this._renderSystems = [];

    this.lastTime = 0;
    this.running = false;

    this.selectedTower = null;
    this.hoverGridX = null;
    this.hoverGridY = null;
    this._buildMode = false;
    this._buildBaseType = null;
    this._buildTypeCfg = null;

    this.currentLevelId = DEFAULT_LEVEL_ID;
    this.currentLevel = getLevelById(this.currentLevelId);
    this.gold = this.currentLevel.initialGold;
    this.health = this.currentLevel.initialHealth;
    this.currentWave = 0;
    this.currentInterval = 1.0;
    this.state = GAME_STATE.WAITING;

    this.towerSystem = null;
    this.waveSystem = null;
    this.uiController = null;
  }

  setLevel(levelId) {
    this.currentLevelId = levelId;
    this.currentLevel = getLevelById(levelId);
    this.gold = this.currentLevel.initialGold;
    this.health = this.currentLevel.initialHealth;
    this.entityManager.destroyAll();
    this.entityManager.garbageCollect();
    if (this.waveSystem) {
      this.waveSystem.init(this, this.entityManager);
    }
    this.currentWave = 0;
    this.state = GAME_STATE.WAITING;
    this.selectedTower = null;
    this._buildMode = false;
    this._buildBaseType = null;
    if (this.uiController) {
      this.uiController.updateHUD(this);
      this.uiController.hideUpgradePanel();
      this.uiController.updateWavePreview(this);
      this.uiController.hideGameOver();
    }
  }

  init() {
    this._registerSystems();
    for (const sys of this._systems) sys.init(this, this.entityManager);
    for (const sys of this._renderSystems) sys.init(this, this.entityManager);

    this.towerSystem = this.getSystem('TowerSystem');
    this.waveSystem = this.getSystem('WaveSystem');
    this.waveSystem.startCountdown();
  }

  _registerSystems() {
    const updateOrder = [
      new WaveSystem(),
      new MovementSystem(),
      new StatusEffectSystem(),
      new TowerSystem(),
      new ProjectileSystem(),
      new EnemyDeathSystem(),
      new EffectSystem()
    ];

    const renderOrder = [
      new MapRenderSystem(),
      new TowerRenderSystem(),
      new EnemyRenderSystem(),
      new ProjectileRenderSystem(),
      new EffectRenderSystem()
    ];

    this._systems = updateOrder.sort((a, b) => a.priority - b.priority);
    this._renderSystems = renderOrder.sort((a, b) => a.priority - b.priority);
  }

  getSystem(name) {
    for (const s of this._systems) if (s.name === name) return s;
    for (const s of this._renderSystems) if (s.name === name) return s;
    return null;
  }

  setUIController(ui) {
    this.uiController = ui;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop.bind(this));
  }

  stop() {
    this.running = false;
  }

  _loop(now) {
    if (!this.running) return;
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    this.lastTime = now;

    this.update(dt);
    this.render();

    if (this.uiController) this.uiController.updateHUD(this);

    requestAnimationFrame(this._loop.bind(this));
  }

  update(dt) {
    for (const sys of this._systems) {
      if (sys.enabled) sys.update(dt);
    }
    this.entityManager.garbageCollect();
    this.currentWave = this.waveSystem ? this.waveSystem.currentWaveIndex : 0;
    this.state = this.waveSystem ? this.waveSystem.state : this.state;
  }

  render() {
    const ctx = this.ctx;
    const TILE = this.currentLevel.tileSize;
    const GW = this.currentLevel.gridWidth;
    const GH = this.currentLevel.gridHeight;
    ctx.clearRect(0, 0, GW * TILE, GH * TILE);
    for (const sys of this._renderSystems) {
      if (sys.enabled) sys.render();
    }
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

  addGold(amount) {
    if (amount <= 0) return;
    this.gold += amount;
  }

  deductHealth(amount) {
    if (amount <= 0) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      if (this.waveSystem && this.waveSystem.state !== GAME_STATE.WIN) {
        this.waveSystem.state = GAME_STATE.LOSE;
        this.state = GAME_STATE.LOSE;
        setTimeout(() => {
          if (this.uiController) this.uiController.showGameOver(false, this);
        }, 50);
      }
    }
  }

  canBuildAt(gx, gy) {
    return this.towerSystem ? this.towerSystem.canBuildAt(gx, gy) : false;
  }

  buildTower(gx, gy, baseType) {
    if (!this.towerSystem) return null;
    const t = this.towerSystem.buildTower(gx, gy, baseType);
    if (t && this.uiController) {
      this.uiController.updateHUD(this);
      this.uiController.updateWavePreview(this);
    }
    return t;
  }

  upgradeTower(towerId) {
    if (!this.towerSystem) return { success: false };
    const r = this.towerSystem.upgradeTower(towerId);
    if (r.success && this.uiController) {
      this.uiController.updateHUD(this);
      this.uiController.updateUpgradePanel(this);
    }
    return r;
  }

  selectTower(towerEntity) {
    this.selectedTower = towerEntity;
    if (this.uiController) this.uiController._showUpgradePanel(this);
  }

  clearSelection() {
    this.selectedTower = null;
    if (this.uiController) this.uiController.hideUpgradePanel();
  }

  getUpgradeInfo(towerId) {
    return this.towerSystem ? this.towerSystem.getUpgradeInfo(towerId) : null;
  }

  startBuildMode(baseType) {
    this._buildMode = true;
    this._buildBaseType = baseType;
    this._buildTypeCfg = TOWER_TYPES[baseType] || null;
    this.clearSelection();
  }

  cancelBuildMode() {
    this._buildMode = false;
    this._buildBaseType = null;
    this._buildTypeCfg = null;
  }

  get isBuildMode() {
    return this._buildMode;
  }

  get buildBaseType() {
    return this._buildBaseType;
  }

  get countdown() {
    return this.waveSystem ? this.waveSystem.countdown : 0;
  }

  forceStartWave() {
    if (this.waveSystem && this.waveSystem.state === GAME_STATE.WAITING && this.waveSystem.countdown > 0) {
      this.waveSystem.countdown = 0.01;
    }
  }

  get enemiesRemaining() {
    return this.entityManager.byTag('enemy').length +
      (this.waveSystem ? this.waveSystem.spawnQueue.length : 0);
  }

  get totalWaves() {
    return WAVES.length;
  }
}
