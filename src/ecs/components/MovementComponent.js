import { Component, COMPONENT_NAMES } from '../Component.js';

export class MovementComponent extends Component {
  constructor(options = {}) {
    super(COMPONENT_NAMES.MOVEMENT);
    this.enemyType = options.enemyType || 'GROUND';
    this.baseSpeed = options.baseSpeed || 1.0;
    this.progress = options.progress || 0;
    this.speedMultiplier = 1;
    this.wingPhase = Math.random() * Math.PI * 2;
    this.wingSpeed = 12;
  }
}
