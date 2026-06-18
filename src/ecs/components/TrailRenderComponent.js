import { Component, COMPONENT_NAMES } from '../Component.js';

export class TrailRenderComponent extends Component {
  constructor(options = {}) {
    super(COMPONENT_NAMES.TRAIL_RENDER);
    this.color = options.color || '#fff';
    this.length = options.length || 4;
    this.width = options.width || 2;
    this.points = [];
    this.glowColor = options.glowColor || 'rgba(255,255,255,0.6)';
  }

  addPoint(x, y) {
    this.points.push({ x, y });
    if (this.points.length > this.length) {
      this.points.shift();
    }
  }
}
