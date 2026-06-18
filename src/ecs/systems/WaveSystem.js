import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';
import { WAVES, GAME_STATE, ENEMY_TYPES, TOWER_LEVELS, getWaveTotalCount } from '../../config.js';
import { PositionComponent } from '../components/PositionComponent.js';
import { HealthComponent } from '../components/HealthComponent.js';
import { RenderComponent } from '../components/RenderComponent.js';
import { MovementComponent } from '../components/MovementComponent.js';
import { EnemyComponent } from '../components/EnemyComponent.js';
import { StatusEffectComponent } from '../components/StatusEffectComponent.js';

export class WaveSystem extends System {
  constructor() {
    super('WaveSystem');
    this.priority = 1;
  }

  init(ge, em) {
    super.init(ge, em);
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.currentWaveIndex = 0;
    this.state = GAME_STATE.WAITING;
    this.countdown = 0;
    this.totalSpawned = 0;
  }

  startCountdown(seconds = null) {
    if (this.state !== GAME_STATE.WAITING) return;
    const levelCfg = this.gameEngine.currentLevel;
    this.countdown = seconds !== null ? seconds : levelCfg.waveCountdown;
  }

  startFirstWave() {
    this.state = GAME_STATE.PLAYING;
    this.countdown = 0;
    this._prepareWave(this.currentWaveIndex);
  }

  _prepareWave(idx) {
    const wave = WAVES[idx];
    if (!wave) return;
    this.spawnQueue = [];
    this.totalSpawned = getWaveTotalCount(idx);
    for (const grp of wave.enemies) {
      for (let i = 0; i < grp.count; i++) {
        this.spawnQueue.push({ type: grp.type, hp: grp.hp, speed: grp.speed, reward: grp.reward });
      }
    }
    this.spawnQueue.sort(() => Math.random() - 0.5);
    this.spawnTimer = 0;
    this.gameEngine.currentInterval = wave.interval;
  }

  update(dt) {
    if (this.state === GAME_STATE.WAITING) {
      if (this.countdown > 0) {
        this.countdown -= dt;
        if (this.countdown <= 0) {
          this.countdown = 0;
          this.startFirstWave();
        }
      }
      return;
    }

    if (this.state === GAME_STATE.WIN || this.state === GAME_STATE.LOSE) return;

    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const cfg = this.spawnQueue.shift();
        this._spawnEnemy(cfg);
        this.spawnTimer = this.gameEngine.currentInterval;
      }
    }

    this._checkWaveComplete();
  }

  _spawnEnemy(cfg) {
    const levelCfg = this.gameEngine.currentLevel;
    const TILE = levelCfg.tileSize;
    const pathCoords = levelCfg.pathCoords;
    let x, y;
    const isFlying = cfg.type === ENEMY_TYPES.FLYING;

    if (isFlying) {
      x = TILE / 2 + 5;
      y = TILE * 2.5;
    } else {
      x = pathCoords[0].x * TILE + TILE / 2;
      y = pathCoords[0].y * TILE + TILE / 2;
    }

    const enemy = this.entityManager.createEntity('enemy');
    enemy.addComponent(new PositionComponent(x, y));
    enemy.addComponent(new HealthComponent(cfg.hp, cfg.reward));
    enemy.addComponent(new MovementComponent({
      enemyType: cfg.type,
      baseSpeed: cfg.speed,
      progress: 0
    }));
    enemy.addComponent(new EnemyComponent({
      enemyType: cfg.type,
      reward: cfg.reward,
      hpVariation: 1.0
    }));
    enemy.addComponent(new StatusEffectComponent());

    if (isFlying) {
      enemy.addComponent(new RenderComponent({
        type: 'enemy_flying',
        size: 24,
        color: '#9b59b6',
        darkColor: '#6c3483',
        layer: 5
      }));
    } else {
      enemy.addComponent(new RenderComponent({
        type: 'enemy_ground',
        size: 26,
        color: '#27ae60',
        darkColor: '#145a32',
        layer: 3
      }));
    }
  }

  _checkWaveComplete() {
    if (this.spawnQueue.length > 0) return;
    const aliveEnemies = this.entityManager.byTag('enemy');
    if (aliveEnemies.length > 0) return;

    this.currentWaveIndex++;
    if (this.currentWaveIndex >= WAVES.length) {
      if (this.state !== GAME_STATE.LOSE) {
        this.state = GAME_STATE.WIN;
        this.gameEngine.state = GAME_STATE.WIN;
        setTimeout(() => {
          if (this.gameEngine.uiController) {
            this.gameEngine.uiController.showGameOver(true, this.gameEngine);
          }
        }, 50);
      }
      return;
    }

    this.state = GAME_STATE.WAITING;
    this.gameEngine.state = GAME_STATE.WAITING;
    const levelCfg = this.gameEngine.currentLevel;
    this.countdown = levelCfg.waveCountdown;
  }
}
