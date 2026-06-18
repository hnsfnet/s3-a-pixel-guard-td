import { Component, COMPONENT_NAMES } from '../Component.js';

export class HitEffectComponent extends Component {
  constructor(isDeath = false, duration = 0.5) {
    super(COMPONENT_NAMES.HIT_EFFECT);
    this.life = duration;
    this.maxLife = duration;
    this.isDeath = isDeath;
  }

  get progress() {
    return 1 - this.life / this.maxLife;
  }

  get done() {
    return this.life <= 0;
  }
}
