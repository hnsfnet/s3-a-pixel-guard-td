import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';

export class StatusEffectSystem extends System {
  constructor() {
    super('StatusEffectSystem');
    this.priority = 15;
  }

  update(dt) {
    const enemies = this.entityManager.withComponents([
      COMPONENT_NAMES.STATUS_EFFECT,
      COMPONENT_NAMES.HEALTH
    ]);

    const healthName = COMPONENT_NAMES.HEALTH;
    const statusName = COMPONENT_NAMES.STATUS_EFFECT;

    for (const enemy of enemies) {
      const health = enemy.getComponent(healthName);
      const status = enemy.getComponent(statusName);
      if (!status) continue;

      if (status.hasPoison()) {
        status.poison.tickTimer += dt;
        if (status.poison.tickTimer >= 0.5) {
          status.poison.tickTimer -= 0.5;
          health.takeDamage(Math.max(1, Math.round(status.poison.dps * 0.5)));
        }
        status.poison.remaining -= dt;
        if (status.poison.remaining <= 0) status.poison = null;
      }

      if (status.hasSlow()) {
        status.slow.remaining -= dt;
        if (status.slow.remaining <= 0) status.slow = null;
      }
    }
  }
}
