import { Component, COMPONENT_NAMES } from '../Component.js';

export class TargetComponent extends Component {
  constructor() {
    super(COMPONENT_NAMES.TARGET);
    this.targetId = null;
    this.targetEntity = null;
  }

  clear() {
    this.targetId = null;
    this.targetEntity = null;
  }

  set(entity) {
    this.targetEntity = entity;
    this.targetId = entity ? entity.id : null;
  }
}
