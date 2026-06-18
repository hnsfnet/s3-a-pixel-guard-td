import { Component, COMPONENT_NAMES } from '../Component.js';

export class PositionComponent extends Component {
  constructor(x = 0, y = 0) {
    super(COMPONENT_NAMES.POSITION);
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
  }
}
