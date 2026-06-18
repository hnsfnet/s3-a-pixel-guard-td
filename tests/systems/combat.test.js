import { COMPONENT_NAMES } from '../../src/ecs/Component.js';
import { PositionComponent } from '../../src/ecs/components/PositionComponent.js';
import { HealthComponent } from '../../src/ecs/components/HealthComponent.js';
import { AttackComponent } from '../../src/ecs/components/AttackComponent.js';
import { MovementComponent } from '../../src/ecs/components/MovementComponent.js';
import { EnemyComponent } from '../../src/ecs/components/EnemyComponent.js';
import { TowerComponent } from '../../src/ecs/components/TowerComponent.js';
import { CooldownComponent } from '../../src/ecs/components/CooldownComponent.js';
import { TargetComponent } from '../../src/ecs/components/TargetComponent.js';
import { GridComponent } from '../../src/ecs/components/GridComponent.js';
import { ProjectileComponent } from '../../src/ecs/components/ProjectileComponent.js';
import { TrailRenderComponent } from '../../src/ecs/components/TrailRenderComponent.js';
import { StatusEffectComponent } from '../../src/ecs/components/StatusEffectComponent.js';
import { RenderComponent } from '../../src/ecs/components/RenderComponent.js';
import { EntityManager } from '../../src/ecs/EntityManager.js';
import { ProjectileSystem } from '../../src/ecs/systems/ProjectileSystem.js';
import { TowerSystem } from '../../src/ecs/systems/TowerSystem.js';
import { ENEMY_TYPES, GAME_STATE, TOWER_BASE_TYPES } from '../../src/config.js';

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
    currentInterval: 1.0,
    config: { totalWaves: 3 },
    ctx: {},
    uiController: null,
    selectedTower: null,
    hoverGridX: null,
    hoverGridY: null,
    _buildMode: false,
    _buildBaseType: null,
    _buildTypeCfg: null,
    isBuildMode: false,
    buildBaseType: null,
    spendGold(amount) {
      if (this.gold >= amount) { this.gold -= amount; return true; }
      return false;
    },
    addGold(amount) { this.gold += amount; },
    deductHealth(amount) {
      this.health -= amount;
      if (this.health <= 0) this.health = 0;
    },
    getSystem() { return null; },
    ...overrides
  };
}

function createProjectileEntity(em, projPos, projCmpOverrides) {
  const proj = em.createEntity('projectile');
  proj.addComponent(new PositionComponent(projPos.x, projPos.y));
  proj.addComponent(new ProjectileComponent({
    vx: 500, vy: 0,
    damage: 10,
    hitRadius: 18,
    color: '#3498db',
    darkColor: '#1a5276',
    baseType: 'ARROW',
    towerLevel: 1,
    ...projCmpOverrides
  }));
  proj.addComponent(new TrailRenderComponent({ color: '#3498db' }));
  return proj;
}

function createEnemyEntity(em, pos, hp, enemyType = ENEMY_TYPES.GROUND) {
  const enemy = em.createEntity('enemy');
  enemy.addComponent(new PositionComponent(pos.x, pos.y));
  enemy.addComponent(new HealthComponent(hp, 10));
  enemy.addComponent(new MovementComponent({ enemyType, baseSpeed: 1.0, progress: 0.5 }));
  enemy.addComponent(new EnemyComponent({ enemyType, reward: 10 }));
  enemy.addComponent(new StatusEffectComponent());
  return enemy;
}

describe('CombatSystem (ProjectileSystem)', () => {
  let em, ge, projSys;

  beforeEach(() => {
    em = new EntityManager();
    ge = createMockGameEngine({ entityManager: em });
    projSys = new ProjectileSystem();
    projSys.init(ge, em);
  });

  describe('命中扣血逻辑', () => {
    it('should deal full damage to single target (non-splash)', () => {
      const enemy = createEnemyEntity(em, { x: 200, y: 200 }, 100);
      const proj = createProjectileEntity(em, { x: 195, y: 200 }, {
        damage: 25,
        splashRadius: 0,
        targetId: enemy.id,
        hitRadius: 20
      });

      projSys.update(0.016);

      const health = enemy.getComponent(COMPONENT_NAMES.HEALTH);
      expect(health.hp).toBe(75);
    });

    it('should destroy projectile after hit', () => {
      const enemy = createEnemyEntity(em, { x: 200, y: 200 }, 100);
      const proj = createProjectileEntity(em, { x: 195, y: 200 }, {
        targetId: enemy.id,
        hitRadius: 20
      });

      projSys.update(0.016);

      expect(proj.isAlive).toBe(false);
    });

    it('should not hit if target is out of hitRadius', () => {
      const enemy = createEnemyEntity(em, { x: 500, y: 500 }, 100);
      const proj = createProjectileEntity(em, { x: 100, y: 100 }, {
        targetId: enemy.id,
        hitRadius: 18
      });

      projSys.update(0.016);

      const health = enemy.getComponent(COMPONENT_NAMES.HEALTH);
      expect(health.hp).toBe(100);
    });
  });

  describe('溅射伤害衰减', () => {
    it('should deal 100% damage to primary target (hitEnemy)', () => {
      const primary = createEnemyEntity(em, { x: 200, y: 200 }, 100);
      const proj = createProjectileEntity(em, { x: 198, y: 200 }, {
        damage: 35,
        splashRadius: 1.2,
        targetId: primary.id,
        hitRadius: 20,
        baseType: 'CANNON'
      });

      projSys.update(0.016);

      const hp = primary.getComponent(COMPONENT_NAMES.HEALTH).hp;
      expect(hp).toBe(65);
    });

    it('should deal 60% damage to secondary targets in splash range', () => {
      const primary = createEnemyEntity(em, { x: 200, y: 200 }, 200);
      const secondary = createEnemyEntity(em, { x: 220, y: 200 }, 200);
      const proj = createProjectileEntity(em, { x: 198, y: 200 }, {
        damage: 35,
        splashRadius: 1.2,
        targetId: primary.id,
        hitRadius: 20,
        baseType: 'CANNON'
      });

      projSys.update(0.016);

      const primaryHp = primary.getComponent(COMPONENT_NAMES.HEALTH).hp;
      const secondaryHp = secondary.getComponent(COMPONENT_NAMES.HEALTH).hp;
      expect(primaryHp).toBe(200 - 35);
      expect(secondaryHp).toBe(200 - Math.max(1, Math.round(35 * 0.6)));
    });

    it('should not damage enemies outside splash radius', () => {
      const primary = createEnemyEntity(em, { x: 200, y: 200 }, 200);
      const farEnemy = createEnemyEntity(em, { x: 350, y: 200 }, 200);
      const proj = createProjectileEntity(em, { x: 198, y: 200 }, {
        damage: 35,
        splashRadius: 1.2,
        targetId: primary.id,
        hitRadius: 20,
        baseType: 'CANNON'
      });

      projSys.update(0.016);

      const farHp = farEnemy.getComponent(COMPONENT_NAMES.HEALTH).hp;
      expect(farHp).toBe(200);
    });
  });

  describe('射程判定 (TowerSystem target selection)', () => {
    let towerSys;

    beforeEach(() => {
      towerSys = new TowerSystem();
      towerSys.init(ge, em);
    });

    it('should select enemy within range', () => {
      const tower = em.createEntity('tower');
      tower.addComponent(new PositionComponent(100, 280));
      tower.addComponent(new AttackComponent({ damage: 10, range: 3, fireRate: 0.5, canHitFlying: true }));
      tower.addComponent(new TowerComponent({ baseType: 'ARROW', level: 1 }));
      tower.addComponent(new CooldownComponent(0));
      tower.addComponent(new TargetComponent());

      const enemy = createEnemyEntity(em, { x: 180, y: 280 }, 100);
      enemy.getComponent(COMPONENT_NAMES.MOVEMENT).progress = 0.3;

      towerSys.update(0.016);

      const target = tower.getComponent(COMPONENT_NAMES.TARGET);
      expect(target.targetEntity).not.toBeNull();
      expect(target.targetEntity.id).toBe(enemy.id);
    });

    it('should not select enemy out of range', () => {
      const tower = em.createEntity('tower');
      tower.addComponent(new PositionComponent(100, 100));
      tower.addComponent(new AttackComponent({ damage: 10, range: 1, fireRate: 0.5, canHitFlying: true }));
      tower.addComponent(new TowerComponent({ baseType: 'ARROW', level: 1 }));
      tower.addComponent(new CooldownComponent(0));
      tower.addComponent(new TargetComponent());

      createEnemyEntity(em, { x: 700, y: 700 }, 100);

      towerSys.update(0.016);

      const target = tower.getComponent(COMPONENT_NAMES.TARGET);
      expect(target.targetEntity).toBeNull();
    });

    it('should ignore flying enemies when canHitFlying is false', () => {
      const tower = em.createEntity('tower');
      tower.addComponent(new PositionComponent(100, 280));
      tower.addComponent(new AttackComponent({ damage: 35, range: 4, fireRate: 1.5, canHitFlying: false }));
      tower.addComponent(new TowerComponent({ baseType: 'CANNON', level: 1 }));
      tower.addComponent(new CooldownComponent(0));
      tower.addComponent(new TargetComponent());

      const flyingEnemy = createEnemyEntity(em, { x: 150, y: 280 }, 100, ENEMY_TYPES.FLYING);
      flyingEnemy.getComponent(COMPONENT_NAMES.MOVEMENT).progress = 0.3;

      towerSys.update(0.016);

      const target = tower.getComponent(COMPONENT_NAMES.TARGET);
      expect(target.targetEntity).toBeNull();
    });

    it('should select furthest-progress enemy within range', () => {
      const tower = em.createEntity('tower');
      tower.addComponent(new PositionComponent(400, 280));
      tower.addComponent(new AttackComponent({ damage: 10, range: 10, fireRate: 0.5, canHitFlying: true }));
      tower.addComponent(new TowerComponent({ baseType: 'ARROW', level: 1 }));
      tower.addComponent(new CooldownComponent(0));
      tower.addComponent(new TargetComponent());

      const nearEnemy = createEnemyEntity(em, { x: 420, y: 280 }, 100);
      nearEnemy.getComponent(COMPONENT_NAMES.MOVEMENT).progress = 0.2;

      const farEnemy = createEnemyEntity(em, { x: 450, y: 280 }, 100);
      farEnemy.getComponent(COMPONENT_NAMES.MOVEMENT).progress = 0.8;

      towerSys.update(0.016);

      const target = tower.getComponent(COMPONENT_NAMES.TARGET);
      expect(target.targetEntity.id).toBe(farEnemy.id);
    });
  });
});
