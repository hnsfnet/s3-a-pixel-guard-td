import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';
import { TOWER_LEVELS, TOWER_BASE_TYPES, ENEMY_TYPES, getWaveTotalCount, WAVES } from '../../config.js';
import { PositionComponent } from '../components/PositionComponent.js';
import { HealthComponent } from '../components/HealthComponent.js';
import { RenderComponent } from '../components/RenderComponent.js';
import { AttackComponent } from '../components/AttackComponent.js';
import { TowerComponent } from '../components/TowerComponent.js';
import { CooldownComponent } from '../components/CooldownComponent.js';
import { TargetComponent } from '../components/TargetComponent.js';
import { GridComponent } from '../components/GridComponent.js';
import { ProjectileComponent } from '../components/ProjectileComponent.js';
import { TrailRenderComponent } from '../components/TrailRenderComponent.js';

export class TowerSystem extends System {
  constructor() {
    super('TowerSystem');
    this.priority = 20;
  }

  canBuildAt(gridX, gridY) {
    const levelCfg = this.gameEngine.currentLevel;
    const TILE = levelCfg.tileSize;
    const GW = levelCfg.gridWidth;
    const GH = levelCfg.gridHeight;
    const pathCoords = levelCfg.pathCoords;

    if (gridX < 0 || gridX >= GW || gridY < 0 || gridY >= GH) return false;
    for (let i = 0; i < pathCoords.length - 1; i++) {
      const p1 = pathCoords[i];
      const p2 = pathCoords[i + 1];
      if (p1.x === p2.x) {
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        if (gridX === p1.x && gridY >= minY && gridY <= maxY) return false;
      } else {
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        if (gridY === p1.y && gridX >= minX && gridX <= maxX) return false;
      }
    }
    const towers = this.entityManager.byTag('tower');
    for (const t of towers) {
      const grid = t.getComponent(COMPONENT_NAMES.GRID);
      if (grid.gridX === gridX && grid.gridY === gridY) return false;
    }
    return true;
  }

  buildTower(gridX, gridY, baseType) {
    const levels = TOWER_LEVELS[baseType];
    if (!levels || levels.length === 0) return null;
    const cfg = levels[0];
    if (this.gameEngine.gold < cfg.cost) return null;
    if (!this.canBuildAt(gridX, gridY)) return null;

    this.gameEngine.spendGold(cfg.cost);

    const levelCfg = this.gameEngine.currentLevel;
    const TILE = levelCfg.tileSize;
    const cx = gridX * TILE + TILE / 2;
    const cy = gridY * TILE + TILE / 2;

    const tower = this.entityManager.createEntity('tower');
    tower.addComponent(new GridComponent(gridX, gridY, TILE));
    tower.addComponent(new PositionComponent(cx, cy));
    tower.addComponent(new RenderComponent({
      type: 'tower',
      size: TILE - 8,
      color: cfg.color,
      darkColor: cfg.darkColor,
      layer: 2,
      level: 1
    }));
    tower.addComponent(new AttackComponent({
      damage: cfg.damage,
      range: cfg.range,
      fireRate: cfg.fireRate,
      splashRadius: cfg.splashRadius,
      canHitFlying: cfg.canHitFlying,
      multiShot: cfg.multiShot,
      poisonDps: cfg.poisonDps,
      poisonDuration: cfg.poisonDuration,
      slowPercent: cfg.slowPercent,
      slowDuration: cfg.slowDuration,
      projectileSpeed: baseType === TOWER_BASE_TYPES.CANNON ? 360 : 500,
      projectileType: baseType
    }));
    tower.addComponent(new TowerComponent({
      gridX, gridY,
      baseType,
      level: 1,
      maxLevel: 3,
      name: cfg.name,
      description: cfg.description,
      buildCost: cfg.cost,
      upgradeCost: cfg.upgradeCost
    }));
    tower.addComponent(new CooldownComponent(0));
    tower.addComponent(new TargetComponent());
    return tower;
  }

  upgradeTower(towerId) {
    const tower = this.entityManager.getById(towerId);
    if (!tower || tower.tag !== 'tower') return { success: false };
    const towerCmp = tower.getComponent(COMPONENT_NAMES.TOWER);
    if (!towerCmp || towerCmp.level >= towerCmp.maxLevel) return { success: false };

    const levels = TOWER_LEVELS[towerCmp.baseType];
    const currentLevelIdx = towerCmp.level - 1;
    const currentConfig = levels[currentLevelIdx];
    const nextLevelIdx = towerCmp.level;
    const nextConfig = levels[nextLevelIdx];
    if (!nextConfig || !currentConfig) return { success: false };

    const cost = Math.ceil(currentConfig.upgradeCost || 0);
    if (cost <= 0) return { success: false };
    if (this.gameEngine.gold < cost) return { success: false };
    if (!this.gameEngine.spendGold(cost)) return { success: false };

    towerCmp.level++;
    towerCmp.towerName = nextConfig.name;
    towerCmp.description = nextConfig.description;
    towerCmp.upgradeCost = nextConfig.upgradeCost || 0;

    const render = tower.getComponent(COMPONENT_NAMES.RENDER);
    if (render) {
      render.color = nextConfig.color;
      render.darkColor = nextConfig.darkColor;
      render.level = towerCmp.level;
    }

    const atk = tower.getComponent(COMPONENT_NAMES.ATTACK);
    if (atk) {
      atk.damage = nextConfig.damage;
      atk.range = nextConfig.range;
      atk.fireRate = nextConfig.fireRate;
      atk.splashRadius = nextConfig.splashRadius;
      atk.canHitFlying = nextConfig.canHitFlying;
      atk.multiShot = nextConfig.multiShot;
      atk.poisonDps = nextConfig.poisonDps;
      atk.poisonDuration = nextConfig.poisonDuration;
      atk.slowPercent = nextConfig.slowPercent;
      atk.slowDuration = nextConfig.slowDuration;
    }

    return { success: true, newLevel: towerCmp.level, newConfig: nextConfig };
  }

  getUpgradeInfo(towerId) {
    const tower = this.entityManager.getById(towerId);
    if (!tower || tower.tag !== 'tower') return null;
    const towerCmp = tower.getComponent(COMPONENT_NAMES.TOWER);
    const atk = tower.getComponent(COMPONENT_NAMES.ATTACK);
    if (!towerCmp) return null;

    const isMaxLevel = towerCmp.level >= towerCmp.maxLevel;
    const levels = TOWER_LEVELS[towerCmp.baseType];
    const currentLevelCfg = levels[towerCmp.level - 1];
    const nextLevelCfg = !isMaxLevel ? levels[towerCmp.level] : null;

    return {
      tower: tower,
      towerCmp,
      attack: atk,
      currentLevelCfg,
      nextLevelCfg,
      isMaxLevel,
      cost: !isMaxLevel ? Math.ceil(currentLevelCfg.upgradeCost || 0) : 0
    };
  }

  update(dt) {
    const towers = this.entityManager.withComponents([
      COMPONENT_NAMES.TOWER,
      COMPONENT_NAMES.ATTACK,
      COMPONENT_NAMES.COOLDOWN,
      COMPONENT_NAMES.POSITION,
      COMPONENT_NAMES.TARGET
    ]);

    const posName = COMPONENT_NAMES.POSITION;
    const atkName = COMPONENT_NAMES.ATTACK;
    const cdName = COMPONENT_NAMES.COOLDOWN;
    const targetName = COMPONENT_NAMES.TARGET;
    const moveName = COMPONENT_NAMES.MOVEMENT;
    const enemyName = COMPONENT_NAMES.ENEMY;
    const healthName = COMPONENT_NAMES.HEALTH;
    const renderName = COMPONENT_NAMES.RENDER;

    for (const tower of towers) {
      const pos = tower.getComponent(posName);
      const atk = tower.getComponent(atkName);
      const cd = tower.getComponent(cdName);
      const targetComp = tower.getComponent(targetName);
      const TILE = this.gameEngine.currentLevel.tileSize;

      if (cd.remaining > 0) cd.remaining -= dt;

      if (targetComp.targetEntity && !targetComp.targetEntity.isAlive) {
        targetComp.clear();
      }
      if (targetComp.targetEntity) {
        const tgtHealth = targetComp.targetEntity.getComponent(healthName);
        if (tgtHealth && tgtHealth.hp <= 0) targetComp.clear();
      }

      let target = targetComp.targetEntity;
      let targetMove = target ? target.getComponent(moveName) : null;
      const enemies = this.entityManager.byTag('enemy');

      if (target && targetMove && targetMove.progress < 1 && !target.getComponent(healthName).isDead) {
        const tgtPos = target.getComponent(posName);
        if (tgtPos) {
          const dist = Math.hypot(tgtPos.x - pos.x, tgtPos.y - pos.y) / TILE;
          if (dist > atk.range) target = null;
        }
      } else {
        target = null;
      }

      if (!target) {
        let best = null;
        let bestProgress = -1;
        for (const enemy of enemies) {
          const eHealth = enemy.getComponent(healthName);
          if (!eHealth || eHealth.hp <= 0) continue;
          const eMove = enemy.getComponent(moveName);
          const eEnemy = enemy.getComponent(enemyName);
          if (!eMove || !eEnemy) continue;
          if (!atk.canHitFlying && eEnemy.enemyType === ENEMY_TYPES.FLYING) continue;
          const ePos = enemy.getComponent(posName);
          const dist = Math.hypot(ePos.x - pos.x, ePos.y - pos.y) / TILE;
          if (dist <= atk.range) {
            if (eMove.progress > bestProgress) {
              bestProgress = eMove.progress;
              best = enemy;
            }
          }
        }
        target = best;
        targetComp.set(target);
      }

      if (target && cd.remaining <= 0) {
        cd.remaining = atk.fireRate;
        const tPos = target.getComponent(posName);
        if (tPos) {
          this._fire(tower, pos, tPos, target, atk);
        }
      }
    }
  }

  _fire(tower, towerPos, tgtPos, targetEntity, atk) {
    const towerCmp = tower.getComponent(COMPONENT_NAMES.TOWER);
    const baseType = towerCmp.baseType;
    const shots = atk.multiShot || 1;
    const TILE = this.gameEngine.currentLevel.tileSize;

    for (let i = 0; i < shots; i++) {
      let sx = towerPos.x;
      let sy = towerPos.y - 10;
      let tx = tgtPos.x;
      let ty = tgtPos.y;
      if (shots > 1) {
        const dx = tx - sx;
        const dy = ty - sy;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const off = (i - (shots - 1) / 2) * 8;
        sx += nx * off;
        sy += ny * off;
      }
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = atk.projectileSpeed;
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;

      let color = '#3498db';
      let darkColor = '#1a5276';
      if (baseType === TOWER_BASE_TYPES.CANNON) {
        color = '#e67e22';
        darkColor = '#7e3a00';
        if (towerCmp.level === 2) { color = '#c0392b'; darkColor = '#641e16'; }
        if (towerCmp.level === 3) { color = '#00bcd4'; darkColor = '#006064'; }
      } else {
        if (towerCmp.level === 2) { color = '#8e44ad'; darkColor = '#5b2c6f'; }
        if (towerCmp.level === 3) { color = '#27ae60'; darkColor = '#145a32'; }
      }

      const proj = this.entityManager.createEntity('projectile');
      proj.addComponent(new PositionComponent(sx, sy));
      proj.addComponent(new ProjectileComponent({
        vx, vy,
        damage: atk.damage,
        splashRadius: atk.splashRadius,
        targetId: targetEntity.id,
        poisonDps: atk.poisonDps,
        poisonDuration: atk.poisonDuration,
        slowPercent: atk.slowPercent,
        slowDuration: atk.slowDuration,
        color, darkColor,
        baseType,
        towerLevel: towerCmp.level,
        hitRadius: baseType === TOWER_BASE_TYPES.CANNON ? 22 : 18
      }));
      proj.addComponent(new TrailRenderComponent({
        color,
        length: baseType === TOWER_BASE_TYPES.CANNON ? 6 : 4,
        width: baseType === TOWER_BASE_TYPES.CANNON ? 4 : 2,
        glowColor: baseType === TOWER_BASE_TYPES.CANNON
          ? (towerCmp.level === 3 ? 'rgba(0,188,212,0.5)' : 'rgba(231,76,60,0.6)')
          : (towerCmp.level === 3 ? 'rgba(46,204,113,0.6)' : 'rgba(155,89,182,0.5)')
      }));
      proj.addComponent(new RenderComponent({
        type: baseType === TOWER_BASE_TYPES.CANNON ? 'bullet_cannon' : 'bullet_arrow',
        size: baseType === TOWER_BASE_TYPES.CANNON ? 10 : 6,
        color,
        darkColor,
        layer: 4
      }));
    }
  }
}
