import { COMPONENT_NAMES } from '../../src/ecs/Component.js';
import { PositionComponent } from '../../src/ecs/components/PositionComponent.js';
import { HealthComponent } from '../../src/ecs/components/HealthComponent.js';
import { MovementComponent } from '../../src/ecs/components/MovementComponent.js';
import { EnemyComponent } from '../../src/ecs/components/EnemyComponent.js';
import { StatusEffectComponent } from '../../src/ecs/components/StatusEffectComponent.js';
import { RenderComponent } from '../../src/ecs/components/RenderComponent.js';
import { EntityManager } from '../../src/ecs/EntityManager.js';
import { WaveSystem } from '../../src/ecs/systems/WaveSystem.js';
import { WAVES, GAME_STATE, getWaveTotalCount } from '../../src/config.js';

function createMockGameEngine(overrides = {}) {
  const em = new EntityManager();
  return {
    entityManager: em,
    currentLevel: {
      tileSize: 40,
      gridWidth: 20,
      gridHeight: 15,
      waveCountdown: 10,
      pathCoords: [
        { x: 0, y: 7 }, { x: 4, y: 7 }, { x: 4, y: 3 },
        { x: 9, y: 3 }, { x: 9, y: 11 }, { x: 14, y: 11 },
        { x: 14, y: 5 }, { x: 19, y: 5 }
      ]
    },
    gold: 9999,
    health: 20,
    state: GAME_STATE.WAITING,
    currentWave: 0,
    currentInterval: 1.0,
    config: { totalWaves: WAVES.length },
    ctx: {},
    uiController: { showGameOver: jest.fn() },
    getSystem(name) {
      if (name === 'WaveSystem') return waveSys;
      return null;
    },
    ...overrides
  };
}

let waveSys;

describe('WaveSystem', () => {
  let em, ge;

  beforeEach(() => {
    em = new EntityManager();
    ge = createMockGameEngine({ entityManager: em });
    waveSys = new WaveSystem();
    waveSys.init(ge, em);
    ge.getSystem = (name) => name === 'WaveSystem' ? waveSys : null;
  });

  describe('波次配置加载', () => {
    it('should prepare correct total enemy count for wave 0', () => {
      waveSys.startFirstWave();
      const expected = getWaveTotalCount(0);
      expect(waveSys.totalSpawned).toBe(expected);
      expect(waveSys.spawnQueue.length).toBe(expected);
    });

    it('should prepare correct total enemy count for wave 1', () => {
      waveSys.currentWaveIndex = 1;
      waveSys._prepareWave(1);
      const expected = getWaveTotalCount(1);
      expect(waveSys.totalSpawned).toBe(expected);
      expect(waveSys.spawnQueue.length).toBe(expected);
    });

    it('should have GROUND and FLYING enemies in wave 1', () => {
      waveSys._prepareWave(1);
      const types = waveSys.spawnQueue.map(e => e.type);
      expect(types).toContain('GROUND');
      expect(types).toContain('FLYING');
    });

    it('should have only GROUND enemies in wave 0', () => {
      waveSys._prepareWave(0);
      const types = waveSys.spawnQueue.map(e => e.type);
      expect(types.every(t => t === 'GROUND')).toBe(true);
    });

    it('should match WAVES config enemy counts', () => {
      for (let i = 0; i < WAVES.length; i++) {
        expect(getWaveTotalCount(i)).toBe(
          WAVES[i].enemies.reduce((sum, e) => sum + e.count, 0)
        );
      }
    });
  });

  describe('波次倒计时', () => {
    it('should countdown and auto-start wave', () => {
      waveSys.startCountdown(0.5);
      expect(waveSys.state).toBe(GAME_STATE.WAITING);
      expect(waveSys.countdown).toBe(0.5);

      waveSys.update(0.3);
      expect(waveSys.countdown).toBeCloseTo(0.2, 1);
      expect(waveSys.state).toBe(GAME_STATE.WAITING);

      waveSys.update(0.3);
      expect(waveSys.countdown).toBe(0);
      expect(waveSys.state).toBe(GAME_STATE.PLAYING);
    });

    it('should not start countdown if not in WAITING state', () => {
      waveSys.state = GAME_STATE.PLAYING;
      waveSys.startCountdown(5);
      expect(waveSys.countdown).toBe(0);
    });

    it('should spawn enemies at interval during PLAYING', () => {
      waveSys.startFirstWave();
      const initialQueueLen = waveSys.spawnQueue.length;

      waveSys.update(1.1);

      expect(waveSys.spawnQueue.length).toBeLessThan(initialQueueLen);
    });
  });

  describe('胜利事件', () => {
    it('should trigger WIN when last wave is cleared', () => {
      waveSys.currentWaveIndex = WAVES.length - 1;
      waveSys.state = GAME_STATE.PLAYING;
      waveSys.spawnQueue = [];

      waveSys._checkWaveComplete();

      expect(waveSys.state).toBe(GAME_STATE.WIN);
      expect(ge.state).toBe(GAME_STATE.WIN);
    });

    it('should call showGameOver with isWin=true on victory', (done) => {
      waveSys.currentWaveIndex = WAVES.length - 1;
      waveSys.state = GAME_STATE.PLAYING;
      waveSys.spawnQueue = [];

      waveSys._checkWaveComplete();

      setTimeout(() => {
        expect(ge.uiController.showGameOver).toHaveBeenCalledWith(true, ge);
        done();
      }, 100);
    });

    it('should NOT trigger WIN if state is LOSE (mutual exclusion)', () => {
      waveSys.currentWaveIndex = WAVES.length - 1;
      waveSys.state = GAME_STATE.LOSE;
      waveSys.spawnQueue = [];

      waveSys._checkWaveComplete();

      expect(waveSys.state).toBe(GAME_STATE.LOSE);
    });

    it('should transition to WAITING between waves', () => {
      waveSys.currentWaveIndex = 0;
      waveSys.state = GAME_STATE.PLAYING;
      waveSys.spawnQueue = [];

      waveSys._checkWaveComplete();

      expect(waveSys.state).toBe(GAME_STATE.WAITING);
      expect(waveSys.currentWaveIndex).toBe(1);
      expect(waveSys.countdown).toBe(ge.currentLevel.waveCountdown);
    });

    it('should not trigger wave complete while enemies still alive', () => {
      waveSys.state = GAME_STATE.PLAYING;
      waveSys.spawnQueue = [];

      const enemy = em.createEntity('enemy');
      enemy.addComponent(new HealthComponent(100));
      enemy.addComponent(new PositionComponent(100, 200));
      enemy.addComponent(new MovementComponent({ enemyType: 'GROUND' }));
      enemy.addComponent(new EnemyComponent({ enemyType: 'GROUND' }));

      waveSys._checkWaveComplete();

      expect(waveSys.state).toBe(GAME_STATE.PLAYING);
    });
  });

  describe('敌人生成', () => {
    it('should spawn ground enemy at path start', () => {
      waveSys._spawnEnemy({ type: 'GROUND', hp: 50, speed: 1.0, reward: 10 });

      const enemies = em.byTag('enemy');
      expect(enemies.length).toBe(1);
      const pos = enemies[0].getComponent(COMPONENT_NAMES.POSITION);
      const TILE = 40;
      expect(pos.x).toBeCloseTo(0 * TILE + TILE / 2, 0);
      expect(pos.y).toBeCloseTo(7 * TILE + TILE / 2, 0);
    });

    it('should spawn flying enemy at left side', () => {
      waveSys._spawnEnemy({ type: 'FLYING', hp: 50, speed: 1.65, reward: 20 });

      const enemies = em.byTag('enemy');
      expect(enemies.length).toBe(1);
      const pos = enemies[0].getComponent(COMPONENT_NAMES.POSITION);
      const TILE = 40;
      expect(pos.x).toBeCloseTo(TILE / 2 + 5, 0);
      expect(pos.y).toBeCloseTo(TILE * 2.5, 0);
    });

    it('should set correct HP and reward on spawned enemy', () => {
      waveSys._spawnEnemy({ type: 'GROUND', hp: 100, speed: 1.1, reward: 15 });

      const enemies = em.byTag('enemy');
      const health = enemies[0].getComponent(COMPONENT_NAMES.HEALTH);
      expect(health.maxHp).toBe(100);
      expect(health.hp).toBe(100);
      expect(health.reward).toBe(15);
    });
  });
});
