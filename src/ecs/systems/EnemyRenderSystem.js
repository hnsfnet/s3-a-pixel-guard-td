import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';
import { ENEMY_TYPES } from '../../config.js';

export class EnemyRenderSystem extends System {
  constructor() {
    super('EnemyRenderSystem');
    this.priority = 3;
  }

  render() {
    const ctx = this.ctx;
    const enemies = this.entityManager.byTag('enemy');

    for (const enemy of enemies) {
      const pos = enemy.getComponent(COMPONENT_NAMES.POSITION);
      const render = enemy.getComponent(COMPONENT_NAMES.RENDER);
      const health = enemy.getComponent(COMPONENT_NAMES.HEALTH);
      const move = enemy.getComponent(COMPONENT_NAMES.MOVEMENT);
      const status = enemy.getComponent(COMPONENT_NAMES.STATUS_EFFECT);
      const enemyCmp = enemy.getComponent(COMPONENT_NAMES.ENEMY);

      if (!pos || !render || !health || !enemyCmp) continue;

      const { x, y } = pos;
      const size = render.size;
      let color = render.color;
      const darkColor = render.darkColor;
      const isFlying = enemyCmp.enemyType === ENEMY_TYPES.FLYING;

      if (health.hitFlash > 0) {
        color = '#fff';
        health.hitFlash -= 1 / 60;
      }

      if (isFlying) {
        this._renderFlyingEnemy(ctx, x, y, size, color, darkColor, move);
      } else {
        this._renderGroundEnemy(ctx, x, y, size, color, darkColor);
      }

      const hpRatio = health.ratio;
      const barW = size + 4;
      const barH = 4;
      const barY = isFlying ? y - size / 2 - 16 : y - size / 2 - 10;
      ctx.fillStyle = '#000';
      ctx.fillRect(x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(x - barW / 2, barY, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(x - barW / 2, barY, barW * hpRatio, barH);

      let iconX = x - 16;
      const iconY = barY - 10;
      if (status) {
        if (status.hasPoison()) {
          ctx.fillStyle = '#27ae60';
          ctx.beginPath();
          ctx.arc(iconX, iconY, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#145a32';
          ctx.lineWidth = 1;
          ctx.stroke();
          iconX += 14;
        }
        if (status.hasSlow()) {
          ctx.fillStyle = '#00bcd4';
          ctx.beginPath();
          ctx.moveTo(iconX, iconY - 5);
          ctx.lineTo(iconX + 5, iconY);
          ctx.lineTo(iconX, iconY + 5);
          ctx.lineTo(iconX - 5, iconY);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#006064';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }

  _renderGroundEnemy(ctx, x, y, size, color, darkColor) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + size / 2 + 2, size / 2, size / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = darkColor;
    ctx.fillRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4);
    ctx.fillStyle = color;
    ctx.fillRect(x - size / 2 + 5, y - size / 2 + 5, size - 10, size - 10);

    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 6, y - 3, 4, 4);
    ctx.fillRect(x + 2, y - 3, 4, 4);
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 5, y - 2, 2, 2);
    ctx.fillRect(x + 3, y - 2, 2, 2);

    ctx.restore();
  }

  _renderFlyingEnemy(ctx, x, y, size, color, darkColor, move) {
    ctx.save();
    const wingPhase = move ? move.wingPhase : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + size + 8, size / 2 + 2, size / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const wingY = Math.sin(wingPhase) * 5;
    ctx.fillStyle = darkColor;
    ctx.save();
    ctx.translate(x - 4, y - 2);
    ctx.rotate(-0.4 + wingY * 0.08);
    ctx.beginPath();
    ctx.ellipse(-12, 0, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x + 4, y - 2);
    ctx.rotate(0.4 - wingY * 0.08);
    ctx.beginPath();
    ctx.ellipse(12, 0, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.ellipse(x, y, size / 2, size / 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, size / 2 - 3, size / 2.2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 5, y - 3, 3, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 5, y - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
