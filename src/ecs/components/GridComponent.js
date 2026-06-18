import { Component, COMPONENT_NAMES } from '../Component.js';

export class GridComponent extends Component {
  constructor(gridX = 0, gridY = 0, tileSize = 40) {
    super(COMPONENT_NAMES.GRID);
    this.gridX = gridX;
    this.gridY = gridY;
    this.tileSize = tileSize;
    this.centerX = gridX * tileSize + tileSize / 2;
    this.centerY = gridY * tileSize + tileSize / 2;
  }
}
