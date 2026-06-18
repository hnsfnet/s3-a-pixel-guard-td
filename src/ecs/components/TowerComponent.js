import { Component, COMPONENT_NAMES } from '../Component.js';

export class TowerComponent extends Component {
  constructor(options = {}) {
    super(COMPONENT_NAMES.TOWER);
    this.gridX = options.gridX || 0;
    this.gridY = options.gridY || 0;
    this.baseType = options.baseType || 'ARROW';
    this.level = options.level || 1;
    this.maxLevel = 3;
    this.towerName = options.name || '塔';
    this.description = options.description || '';
    this.upgradeCost = options.upgradeCost || 0;
    this.buildCost = options.buildCost || 0;
  }
}
