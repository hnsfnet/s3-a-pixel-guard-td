import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';

export class EffectSystem extends System {
  constructor() {
    super('EffectSystem');
    this.priority = 50;
  }

  update(dt) {
    const effects = this.entityManager.withComponents([
      COMPONENT_NAMES.HIT_EFFECT
    ]);

    const hitName = COMPONENT_NAMES.HIT_EFFECT;

    for (const eff of effects) {
      const hc = eff.getComponent(hitName);
      hc.life -= dt;
      if (hc.done) eff.destroy();
    }
  }
}
