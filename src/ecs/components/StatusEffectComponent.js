import { Component, COMPONENT_NAMES } from '../Component.js';

export class StatusEffectComponent extends Component {
  constructor() {
    super(COMPONENT_NAMES.STATUS_EFFECT);
    this.poison = null;
    this.slow = null;
  }

  applyPoison(dps, duration) {
    if (!this.poison || this.poison.remaining <= 0 ||
        dps > this.poison.dps || duration > this.poison.remaining) {
      this.poison = {
        dps: dps,
        remaining: duration,
        tickTimer: 0
      };
    }
  }

  applySlow(percent, duration) {
    if (!this.slow || this.slow.remaining <= 0 ||
        percent > this.slow.percent || duration > this.slow.remaining) {
      this.slow = {
        percent: percent,
        remaining: duration
      };
    }
  }

  hasPoison() {
    return this.poison && this.poison.remaining > 0;
  }

  hasSlow() {
    return this.slow && this.slow.remaining > 0;
  }
}
