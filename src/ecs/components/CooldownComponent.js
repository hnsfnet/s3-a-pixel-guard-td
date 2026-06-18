import { Component, COMPONENT_NAMES } from '../Component.js';

export class CooldownComponent extends Component {
  constructor(initial = 0) {
    super(COMPONENT_NAMES.COOLDOWN);
    this.remaining = initial;
  }

  get ready() {
    return this.remaining <= 0;
  }

  setTo(seconds) {
    this.remaining = seconds;
  }
}
