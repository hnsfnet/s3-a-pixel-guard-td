import { COMPONENT_NAMES } from '../../src/ecs/Component.js';
import { PositionComponent } from '../../src/ecs/components/PositionComponent.js';
import { HealthComponent } from '../../src/ecs/components/HealthComponent.js';
import { MovementComponent } from '../../src/ecs/components/MovementComponent.js';
import { EnemyComponent } from '../../src/ecs/components/EnemyComponent.js';
import { StatusEffectComponent } from '../../src/ecs/components/StatusEffectComponent.js';
import { EntityManager } from '../../src/ecs/EntityManager.js';
import { MovementSystem } from '../../src/ecs/systems/MovementSystem.js';
import { EnemyDeathSystem } from '../../src/ecs/systems/EnemyDeathSystem.js';
import { ENEMY_TYPES, GAME_STATE } from '../../src/config.js';

function createMockGameEngine(overrides = {}) {
  const em = new EntityManager();
  return {
    entityManager: em,
    currentLevel: {
      tileSize: 40,
      gridWidth: 20,
      gridHeight: 15,
      pathCoords: [
        { x: 0, y: 7 }, { x: 4, y: 7 }, { x: 4, y: 3 },
        { x: 9, y: 3 }, { x: 9, y: 11 }, { x: 14, y: 11 },
        { x: 14, y: 5 }, { x: 19, y: 5 }
      ]
    },
    gold: 9999,
    health: 20,
    state: GAME_STATE.PLAYING,
    currentWave: 0,
    config: { totalWaves: 3 },
    ctx: {},
    uiController: null,
    getSystem() { return { state: GAME_STATE.PLAYING }; },
    addGold() {},
    deductHealth() {},
    ...overrides
  };
}

function createGroundEnemy(em, overrides = {}) {
  const enemy = em.createEntity('enemy');
  enemy.addComponent(new PositionComponent(overrides.x || 20, overrides.y || 300));
  enemy.addComponent(new HealthComponent(overrides.hp !== undefined ? overrides.hp : 100, overrides.reward !== undefined ? overrides.reward : 10));
  enemy.addComponent(new MovementComponent({
    enemyType: ENEMY_TYPES.GROUND,
    baseSpeed: overrides.speed || 1.0,
    progress: overrides.progress !== undefined ? overrides.progress : 0
  }));
  enemy.addComponent(new EnemyComponent({ enemyType: ENEMY_TYPES.GROUND, reward: overrides.reward !== undefined ? overrides.reward : 10 }));
  enemy.addComponent(new StatusEffectComponent());
  return enemy;
}

function createFlyingEnemy(em, overrides = {}) {
  const TILE = 40;
  const startX = TILE / 2 + 5;
  const y = TILE * 2.5;
  const enemy = em.createEntity('enemy');
  enemy.addComponent(new PositionComponent(overrides.x || startX, overrides.y || y));
  enemy.addComponent(new HealthComponent(overrides.hp || 100, overrides.reward || 20));
  enemy.addComponent(new MovementComponent({
    enemyType: ENEMY_TYPES.FLYING,
    baseSpeed: overrides.speed || 1.65,
    progress: overrides.progress || 0
  }));
  enemy.addComponent(new EnemyComponent({ enemyType: ENEMY_TYPES.FLYING, reward: overrides.reward || 20 }));
  enemy.addComponent(new StatusEffectComponent());
  return enemy;
}

describe('MovementSystem', () => {
  let em, ge, moveSys;

  beforeEach(() => {
    em = new EntityManager();
    ge = createMockGameEngine({ entityManager: em });
    moveSys = new MovementSystem();
    moveSys.init(ge, em);
  });

  describe('地面敌人路径插值', () => {
    it('should move ground enemy along path (progress increases)', () => {
      const enemy = createGroundEnemy(em, { progress: 0 });
      moveSys.update(0.016);

      const move = enemy.getComponent(COMPONENT_NAMES.MOVEMENT);
      expect(move.progress).toBeGreaterThan(0);
    });

    it('should set position based on path interpolation', () => {
      const enemy = createGroundEnemy(em, { progress: 0 });
      const pos = enemy.getComponent(COMPONENT_NAMES.POSITION);
      const startX = pos.x;
      const startY = pos.y;

      moveSys.update(0.1);

      expect(pos.x).not.toBe(startX);
    });

    it('should cap progress at 1.0', () => {
      const enemy = createGroundEnemy(em, { progress: 0.99, speed: 10 });
      moveSys.update(1.0);

      const move = enemy.getComponent(COMPONENT_NAMES.MOVEMENT);
      expect(move.progress).toBeLessThanOrEqual(1);
    });

    it('should position enemy at path start when progress is 0', () => {
      const enemy = createGroundEnemy(em, { progress: 0 });
      const pos = enemy.getComponent(COMPONENT_NAMES.POSITION);
      const TILE = 40;
      expect(pos.x).toBeCloseTo(0 * TILE + TILE / 2, 0);
      expect(pos.y).toBeCloseTo(7 * TILE + TILE / 2, 0);
    });
  });

  describe('飞行敌人直线飞行', () => {
    it('should move flying enemy horizontally', () => {
      const enemy = createFlyingEnemy(em, { progress: 0 });
      const pos = enemy.getComponent(COMPONENT_NAMES.POSITION);
      const startX = pos.x;

      moveSys.update(0.1);

      expect(pos.x).toBeGreaterThan(startX);
    });

    it('should have y-position oscillating (sine wave)', () => {
      const enemy = createFlyingEnemy(em, { progress: 0.5 });
      const pos = enemy.getComponent(COMPONENT_NAMES.POSITION);
      moveSys.update(0.016);

      const TILE = 40;
      const baseY = TILE * 2.5;
      expect(pos.y).not.toBe(baseY);
    });

    it('should cap flying progress at 1.0', () => {
      const enemy = createFlyingEnemy(em, { progress: 0.99, speed: 10 });
      moveSys.update(1.0);

      const move = enemy.getComponent(COMPONENT_NAMES.MOVEMENT);
      expect(move.progress).toBeLessThanOrEqual(1);
    });
  });

  describe('减速效果影响移动', () => {
    it('should reduce speed when slow is applied', () => {
      const enemy = createGroundEnemy(em, { progress: 0, speed: 1.0 });
      const status = enemy.getComponent(COMPONENT_NAMES.STATUS_EFFECT);
      status.applySlow(0.5, 2);

      const enemy2 = createGroundEnemy(em, { progress: 0, speed: 1.0 });

      moveSys.update(0.1);

      const progress1 = enemy.getComponent(COMPONENT_NAMES.MOVEMENT).progress;
      const progress2 = enemy2.getComponent(COMPONENT_NAMES.MOVEMENT).progress;
      expect(progress1).toBeLessThan(progress2);
    });
  });

  describe('到达终点扣生命值', () => {
    let deathSys;

    beforeEach(() => {
      deathSys = new EnemyDeathSystem();
    });

    it('should call deductHealth when enemy reaches end (progress >= 1)', () => {
      const deducted = jest.fn();
      const geWithSpy = createMockGameEngine({
        entityManager: em,
        deductHealth: deducted
      });
      deathSys.init(geWithSpy, em);

      const enemy = createGroundEnemy(em, { progress: 1.0, hp: 100 });

      deathSys.update(0.016);

      expect(deducted).toHaveBeenCalledWith(1);
    });

    it('should destroy enemy when it reaches end', () => {
      const geWithSpy = createMockGameEngine({
        entityManager: em,
        deductHealth: jest.fn()
      });
      deathSys.init(geWithSpy, em);

      const enemy = createGroundEnemy(em, { progress: 1.0, hp: 100 });

      deathSys.update(0.016);

      expect(enemy.isAlive).toBe(false);
    });

    it('should add gold when enemy is killed (hp <= 0, not at end)', () => {
      const addGold = jest.fn();
      const geWithSpy = createMockGameEngine({
        entityManager: em,
        deductHealth: jest.fn(),
        addGold
      });
      deathSys.init(geWithSpy, em);

      const enemy = createGroundEnemy(em, { progress: 0.5, hp: 0, reward: 15 });

      deathSys.update(0.016);

      expect(addGold).toHaveBeenCalledWith(15);
    });

    it('should NOT add gold when enemy reaches end', () => {
      const addGold = jest.fn();
      const geWithSpy = createMockGameEngine({
        entityManager: em,
        deductHealth: jest.fn(),
        addGold
      });
      deathSys.init(geWithSpy, em);

      const enemy = createGroundEnemy(em, { progress: 1.0, hp: 0, reward: 15 });

      deathSys.update(0.016);

      expect(addGold).not.toHaveBeenCalled();
    });
  });
});
