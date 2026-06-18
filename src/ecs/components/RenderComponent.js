import { Component, COMPONENT_NAMES } from '../Component.js';

export class RenderComponent extends Component {
  constructor(options = {}) {
    super(COMPONENT_NAMES.RENDER);
    this.type = options.type || 'box';
    this.size = options.size || 26;
    this.color = options.color || '#27ae60';
    this.darkColor = options.darkColor || '#145a32';
    this.layer = options.layer || 0;
    this.level = options.level || 1;
    this.visible = true;
    this.angle = 0;
    this.hitFlash = 0;
  }
}
