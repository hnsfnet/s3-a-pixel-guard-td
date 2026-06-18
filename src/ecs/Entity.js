let entityIdCounter = 0;

export class Entity {
  constructor(tag = 'entity') {
    this.id = ++entityIdCounter;
    this.tag = tag;
    this._components = {};
    this._alive = true;
  }

  addComponent(component) {
    this._components[component.name] = component;
    return this;
  }

  getComponent(name) {
    return this._components[name] || null;
  }

  hasComponent(name) {
    return !!this._components[name];
  }

  hasAll(names) {
    for (const n of names) {
      if (!this._components[n]) return false;
    }
    return true;
  }

  removeComponent(name) {
    delete this._components[name];
  }

  get componentNames() {
    return Object.keys(this._components);
  }

  destroy() {
    this._alive = false;
  }

  get isAlive() {
    return this._alive;
  }
}
