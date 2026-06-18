import { Entity } from './Entity.js';

export class EntityManager {
  constructor() {
    this._entities = [];
    this._byTag = {};
  }

  createEntity(tag = 'entity') {
    const entity = new Entity(tag);
    this._entities.push(entity);
    if (!this._byTag[tag]) this._byTag[tag] = [];
    this._byTag[tag].push(entity);
    return entity;
  }

  all() {
    return this._entities.filter(e => e.isAlive);
  }

  byTag(tag) {
    const list = this._byTag[tag] || [];
    return list.filter(e => e.isAlive);
  }

  withComponents(componentNames) {
    return this.all().filter(e => e.hasAll(componentNames));
  }

  withOne(componentName) {
    return this.all().filter(e => e.hasComponent(componentName));
  }

  getById(id) {
    return this._entities.find(e => e.id === id && e.isAlive) || null;
  }

  garbageCollect() {
    const alive = [];
    for (const tag in this._byTag) {
      this._byTag[tag] = this._byTag[tag].filter(e => e.isAlive);
    }
    for (const e of this._entities) {
      if (e.isAlive) alive.push(e);
    }
    this._entities = alive;
  }

  destroyAllByTag(tag) {
    const list = this._byTag[tag] || [];
    for (const e of list) e.destroy();
  }

  destroyAll() {
    for (const e of this._entities) e.destroy();
  }

  get count() {
    return this.all().length;
  }
}
