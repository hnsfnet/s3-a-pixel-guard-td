import { Component, COMPONENT_NAMES } from '../Component.js';

export class HealthComponent extends Component {
  constructor(maxHp, reward = 0) {
    super(COMPONENT_NAMES.HEALTH);
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.reward = reward;
    this.hitFlash = 0;
  }

  get ratio() {
    return Math.max(0, this.hp / this.maxHp);
  }

  get isDead() {
    return this.hp <= 0;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.1;
  }
}
