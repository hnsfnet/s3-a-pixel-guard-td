import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';
import { GAME_STATE } from '../../config.js';
import { HitEffectComponent } from '../components/HitEffectComponent.js';
import { PositionComponent } from '../components/PositionComponent.js';
import { RenderComponent } from '../components/RenderComponent.js';

export class EnemyDeathSystem extends System {
  constructor() {
    super('EnemyDeathSystem');
    this.priority = 40;
  }

  update(dt) {
    const enemies = this.entityManager.withComponents([
      COMPONENT_NAMES.ENEMY,
      COMPONENT_NAMES.HEALTH,
      COMPONENT_NAMES.POSITION,
      COMPONENT_NAMES.MOVEMENT
    ]);

    const healthName = COMPONENT_NAMES.HEALTH;
    const posName = COMPONENT_NAMES.POSITION;
    const moveName = COMPONENT_NAMES.MOVEMENT;
    const wave = this.gameEngine.getSystem('WaveSystem');
    const gameState = wave ? wave.state : this.gameEngine.state;

    if (gameState === GAME_STATE.WIN || gameState === GAME_STATE.LOSE) return;

    for (const enemy of enemies) {
      const health = enemy.getComponent(healthName);
      const move = enemy.getComponent(moveName);
      const pos = enemy.getComponent(posName);

      let reachedEnd = false;
      let killed = false;

      if (move.progress >= 1) {
        this.gameEngine.deductHealth(1);
        reachedEnd = true;
      }
      if (health.hp <= 0) {
        killed = true;
        if (!reachedEnd) {
          this.gameEngine.addGold(health.reward);
          this._addHitEffect(pos.x, pos.y, true);
        }
      }

      if (reachedEnd || killed) {
        enemy.destroy();
      }
    }
  }

  _addHitEffect(x, y, isDeath) {
    const effect = this.entityManager.createEntity('effect');
    effect.addComponent(new PositionComponent(x, y));
    effect.addComponent(new HitEffectComponent(isDeath, isDeath ? 0.6 : 0.5));
    const render = new RenderComponent({
      type: isDeath ? 'death_effect' : 'hit_effect',
      color: isDeath ? '#f1c40f' : '#e74c3c',
      darkColor: isDeath ? '#d4ac0d' : '#c0392b',
      size: isDeath ? 28 : 16,
      layer: 6
    });
    render.isDeath = isDeath;
    effect.addComponent(render);
  }
}
