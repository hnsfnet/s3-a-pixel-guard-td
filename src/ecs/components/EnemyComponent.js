import { Component, COMPONENT_NAMES } from '../Component.js';

export class EnemyComponent extends Component {
  constructor(options = {}) {
    super(COMPONENT_NAMES.ENEMY);
    this.enemyType = options.enemyType || 'GROUND';
    this.reward = options.reward || 10;
    this.hpVariation = options.hpVariation || 1.0;
  }
}
