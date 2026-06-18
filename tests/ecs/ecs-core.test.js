import { Entity } from '../../src/ecs/Entity.js';
import { Component, COMPONENT_NAMES } from '../../src/ecs/Component.js';
import { EntityManager } from '../../src/ecs/EntityManager.js';

describe('ECS Core', () => {
  describe('Entity', () => {
    it('should have unique auto-incrementing IDs', () => {
      const e1 = new Entity('a');
      const e2 = new Entity('b');
      expect(e2.id).toBeGreaterThan(e1.id);
    });

    it('should store tag and be alive by default', () => {
      const e = new Entity('enemy');
      expect(e.tag).toBe('enemy');
      expect(e.isAlive).toBe(true);
    });

    it('should add and get component by name', () => {
      const e = new Entity();
      const comp = new Component(COMPONENT_NAMES.POSITION);
      e.addComponent(comp);
      expect(e.getComponent(COMPONENT_NAMES.POSITION)).toBe(comp);
    });

    it('should return null for missing component', () => {
      const e = new Entity();
      expect(e.getComponent('NonExistent')).toBeNull();
    });

    it('should check hasComponent correctly', () => {
      const e = new Entity();
      e.addComponent(new Component(COMPONENT_NAMES.HEALTH));
      expect(e.hasComponent(COMPONENT_NAMES.HEALTH)).toBe(true);
      expect(e.hasComponent(COMPONENT_NAMES.ATTACK)).toBe(false);
    });

    it('should check hasAll for multiple components', () => {
      const e = new Entity();
      e.addComponent(new Component(COMPONENT_NAMES.POSITION));
      e.addComponent(new Component(COMPONENT_NAMES.HEALTH));
      expect(e.hasAll([COMPONENT_NAMES.POSITION, COMPONENT_NAMES.HEALTH])).toBe(true);
      expect(e.hasAll([COMPONENT_NAMES.POSITION, COMPONENT_NAMES.ATTACK])).toBe(false);
    });

    it('should remove component', () => {
      const e = new Entity();
      e.addComponent(new Component(COMPONENT_NAMES.POSITION));
      expect(e.hasComponent(COMPONENT_NAMES.POSITION)).toBe(true);
      e.removeComponent(COMPONENT_NAMES.POSITION);
      expect(e.hasComponent(COMPONENT_NAMES.POSITION)).toBe(false);
    });

    it('should list component names', () => {
      const e = new Entity();
      e.addComponent(new Component('A'));
      e.addComponent(new Component('B'));
      const names = e.componentNames;
      expect(names).toContain('A');
      expect(names).toContain('B');
      expect(names.length).toBe(2);
    });

    it('should support addComponent chaining', () => {
      const e = new Entity();
      const result = e.addComponent(new Component('X'));
      expect(result).toBe(e);
    });

    it('should mark entity as destroyed', () => {
      const e = new Entity();
      expect(e.isAlive).toBe(true);
      e.destroy();
      expect(e.isAlive).toBe(false);
    });
  });

  describe('EntityManager', () => {
    let em;
    beforeEach(() => {
      em = new EntityManager();
    });

    it('should create entity with tag', () => {
      const e = em.createEntity('tower');
      expect(e.tag).toBe('tower');
      expect(e.isAlive).toBe(true);
    });

    it('should return all alive entities', () => {
      const e1 = em.createEntity('a');
      const e2 = em.createEntity('b');
      em.createEntity('c');
      e2.destroy();
      const all = em.all();
      expect(all.length).toBe(2);
      expect(all.map(e => e.id)).toContain(e1.id);
    });

    it('should query by tag', () => {
      em.createEntity('enemy');
      em.createEntity('enemy');
      em.createEntity('tower');
      expect(em.byTag('enemy').length).toBe(2);
      expect(em.byTag('tower').length).toBe(1);
      expect(em.byTag('projectile').length).toBe(0);
    });

    it('should exclude destroyed entities from byTag', () => {
      const e1 = em.createEntity('enemy');
      em.createEntity('enemy');
      e1.destroy();
      expect(em.byTag('enemy').length).toBe(1);
    });

    it('should query by multiple component names', () => {
      const e1 = em.createEntity('enemy');
      e1.addComponent(new Component(COMPONENT_NAMES.POSITION));
      e1.addComponent(new Component(COMPONENT_NAMES.HEALTH));

      const e2 = em.createEntity('enemy');
      e2.addComponent(new Component(COMPONENT_NAMES.POSITION));

      const result = em.withComponents([COMPONENT_NAMES.POSITION, COMPONENT_NAMES.HEALTH]);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(e1.id);
    });

    it('should query by single component name', () => {
      const e1 = em.createEntity();
      e1.addComponent(new Component(COMPONENT_NAMES.HEALTH));
      em.createEntity();

      expect(em.withOne(COMPONENT_NAMES.HEALTH).length).toBe(1);
    });

    it('should get entity by id', () => {
      const e = em.createEntity('test');
      expect(em.getById(e.id)).toBe(e);
    });

    it('should return null for non-existent id', () => {
      expect(em.getById(99999)).toBeNull();
    });

    it('should not return destroyed entity by id', () => {
      const e = em.createEntity();
      e.destroy();
      expect(em.getById(e.id)).toBeNull();
    });

    it('should garbage collect dead entities', () => {
      const e1 = em.createEntity('a');
      const e2 = em.createEntity('b');
      e1.destroy();
      em.garbageCollect();
      expect(em.all().length).toBe(1);
      expect(em.byTag('a').length).toBe(0);
      expect(em.byTag('b').length).toBe(1);
    });

    it('should destroy all entities by tag', () => {
      em.createEntity('enemy');
      em.createEntity('enemy');
      em.createEntity('tower');
      em.destroyAllByTag('enemy');
      expect(em.byTag('enemy').length).toBe(0);
      expect(em.byTag('tower').length).toBe(1);
    });

    it('should destroy all entities', () => {
      em.createEntity('a');
      em.createEntity('b');
      em.destroyAll();
      expect(em.count).toBe(0);
    });

    it('should report correct count', () => {
      em.createEntity('x');
      em.createEntity('y');
      expect(em.count).toBe(2);
    });
  });
});
