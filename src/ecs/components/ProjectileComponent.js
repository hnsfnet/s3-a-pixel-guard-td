import { Component, COMPONENT_NAMES } from '../Component.js';

export class ProjectileComponent extends Component {
  constructor(options = {}) {
    super(COMPONENT_NAMES.PROJECTILE);
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.damage = options.damage || 10;
    this.splashRadius = options.splashRadius || 0;
    this.targetId = options.targetId || null;
    this.poisonDps = options.poisonDps || 0;
    this.poisonDuration = options.poisonDuration || 0;
    this.slowPercent = options.slowPercent || 0;
    this.slowDuration = options.slowDuration || 0;
    this.color = options.color || '#3498db';
    this.darkColor = options.darkColor || '#1a5276';
    this.baseType = options.baseType || 'ARROW';
    this.towerLevel = options.towerLevel || 1;
    this.hitRadius = options.hitRadius || 18;
  }
}
