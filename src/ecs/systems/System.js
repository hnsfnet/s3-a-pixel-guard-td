export class System {
  constructor(name) {
    this.name = name;
    this.priority = 100;
    this.enabled = true;
  }

  init(gameEngine, entityManager) {
    this.gameEngine = gameEngine;
    this.entityManager = entityManager;
    this.ctx = gameEngine.ctx;
    this.config = gameEngine.config;
  }

  update(dt) {
    // 子类重写
  }

  render() {
    // 子类重写 (RenderSystem系列用)
  }
}
