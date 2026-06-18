import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';
import { ENEMY_TYPES } from '../../config.js';
import { HitEffectComponent } from '../components/HitEffectComponent.js';
import { PositionComponent } from '../components/PositionComponent.js';
import { RenderComponent } from '../components/RenderComponent.js';
import { StatusEffectComponent } from '../components/StatusEffectComponent.js';

export class ProjectileSystem extends System {
  constructor() {
    super('ProjectileSystem');
    this.priority = 30;
  }

  update(dt) {
    const projectiles = this.entityManager.withComponents([
      COMPONENT_NAMES.PROJECTILE,
      COMPONENT_NAMES.POSITION,
      COMPONENT_NAMES.TRAIL_RENDER
    ]);

    const posName = COMPONENT_NAMES.POSITION;
    const projName = COMPONENT_NAMES.PROJECTILE;
    const trailName = COMPONENT_NAMES.TRAIL_RENDER;
    const healthName = COMPONENT_NAMES.HEALTH;
    const enemyName = COMPONENT_NAMES.ENEMY;
    const statusName = COMPONENT_NAMES.STATUS_EFFECT;

    const TILE = this.gameEngine.currentLevel.tileSize;
    const GW = this.gameEngine.currentLevel.gridWidth * TILE;
    const GH = this.gameEngine.currentLevel.gridHeight * TILE;

    for (const proj of projectiles) {
      const pos = proj.getComponent(posName);
      const projCmp = proj.getComponent(projName);
      const trail = proj.getComponent(trailName);

      pos.prevX = pos.x;
      pos.prevY = pos.y;
      pos.x += projCmp.vx * dt;
      pos.y += projCmp.vy * dt;
      trail.addPoint(pos.x, pos.y);

      if (pos.x < -50 || pos.x > GW + 50 || pos.y < -50 || pos.y > GH + 50) {
        proj.destroy();
        continue;
      }

      let hitEnemy = null;
      let hitDistSq = Infinity;

      if (projCmp.targetId) {
        const tgt = this.entityManager.getById(projCmp.targetId);
        if (tgt && tgt.isAlive) {
          const tgtPos = tgt.getComponent(posName);
          const tgtHealth = tgt.getComponent(healthName);
          if (tgtPos && tgtHealth && tgtHealth.hp > 0) {
            const d = Math.hypot(tgtPos.x - pos.x, tgtPos.y - pos.y);
            if (d <= projCmp.hitRadius) {
              hitEnemy = tgt;
              hitDistSq = d * d;
            }
          }
        }
      }

      if (!hitEnemy) {
        const enemies = this.entityManager.byTag('enemy');
        for (const enemy of enemies) {
          const ePos = enemy.getComponent(posName);
          const eHealth = enemy.getComponent(healthName);
          if (!ePos || !eHealth || eHealth.hp <= 0) continue;
          const d = Math.hypot(ePos.x - pos.x, ePos.y - pos.y);
          if (d <= projCmp.hitRadius && d * d < hitDistSq) {
            hitDistSq = d * d;
            hitEnemy = enemy;
          }
        }
      }

      if (hitEnemy) {
        this._applyHit(pos, projCmp, hitEnemy);
        proj.destroy();
      }
    }
  }

  _applyHit(pos, projCmp, hitEnemy) {
    const posName = COMPONENT_NAMES.POSITION;
    const healthName = COMPONENT_NAMES.HEALTH;
    const enemyName = COMPONENT_NAMES.ENEMY;
    const statusName = COMPONENT_NAMES.STATUS_EFFECT;
    const TILE = this.gameEngine.currentLevel.tileSize;

    const effect = this.entityManager.createEntity('effect');
    effect.addComponent(new PositionComponent(pos.x, pos.y));
    effect.addComponent(new HitEffectComponent(false, 0.5));
    const render = new RenderComponent({
      type: 'hit_effect',
      color: projCmp.color,
      darkColor: projCmp.darkColor,
      size: projCmp.splashRadius > 0 ? 32 : 20,
      layer: 6
    });
    render.baseType = projCmp.baseType;
    render.towerLevel = projCmp.towerLevel;
    render.splash = projCmp.splashRadius > 0;
    effect.addComponent(render);

    if (projCmp.splashRadius > 0) {
      const splashPx = projCmp.splashRadius * TILE;
      const enemies = this.entityManager.byTag('enemy');
      for (const enemy of enemies) {
        const eHealth = enemy.getComponent(healthName);
        if (!eHealth || eHealth.hp <= 0) continue;
        const ePos = enemy.getComponent(posName);
        if (!ePos) continue;
        const dist = Math.hypot(ePos.x - pos.x, ePos.y - pos.y);
        if (dist <= splashPx) {
          const damageMul = enemy.id === hitEnemy.id ? 1.0 : 0.6;
          const dmg = Math.max(1, Math.round(projCmp.damage * damageMul));
          eHealth.takeDamage(dmg);
          if (projCmp.poisonDps > 0 || projCmp.slowPercent > 0) {
            let se = enemy.getComponent(statusName);
            if (!se) {
              se = new StatusEffectComponent();
              enemy.addComponent(se);
            }
            if (projCmp.poisonDps > 0) se.applyPoison(projCmp.poisonDps, projCmp.poisonDuration);
            if (projCmp.slowPercent > 0) se.applySlow(projCmp.slowPercent, projCmp.slowDuration);
          }
        }
      }
    } else {
      const health = hitEnemy.getComponent(healthName);
      if (health) health.takeDamage(projCmp.damage);
      if (projCmp.poisonDps > 0 || projCmp.slowPercent > 0) {
        let se = hitEnemy.getComponent(statusName);
        if (!se) {
          se = new StatusEffectComponent();
          hitEnemy.addComponent(se);
        }
        if (projCmp.poisonDps > 0) se.applyPoison(projCmp.poisonDps, projCmp.poisonDuration);
        if (projCmp.slowPercent > 0) se.applySlow(projCmp.slowPercent, projCmp.slowDuration);
      }
    }
  }
}
