import { Component, COMPONENT_NAMES } from '../Component.js';

export class AttackComponent extends Component {
  constructor(options = {}) {
    super(COMPONENT_NAMES.ATTACK);
    this.damage = options.damage || 10;
    this.range = options.range || 3;
    this.fireRate = options.fireRate || 1.0;
    this.splashRadius = options.splashRadius || 0;
    this.canHitFlying = options.canHitFlying !== undefined ? options.canHitFlying : true;
    this.multiShot = options.multiShot || 1;
    this.poisonDps = options.poisonDps || 0;
    this.poisonDuration = options.poisonDuration || 0;
    this.slowPercent = options.slowPercent || 0;
    this.slowDuration = options.slowDuration || 0;
    this.projectileSpeed = options.projectileSpeed || 500;
    this.projectileType = options.projectileType || 'ARROW';
  }
}
