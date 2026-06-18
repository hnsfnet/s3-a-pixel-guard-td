import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';

export class EffectRenderSystem extends System {
  constructor() {
    super('EffectRenderSystem');
    this.priority = 5;
  }

  render() {
    const ctx = this.ctx;
    const effects = this.entityManager.byTag('effect');

    for (const eff of effects) {
      const pos = eff.getComponent(COMPONENT_NAMES.POSITION);
      const hit = eff.getComponent(COMPONENT_NAMES.HIT_EFFECT);
      const render = eff.getComponent(COMPONENT_NAMES.RENDER);
      if (!pos || !hit) continue;

      const color = render?.color || (hit.isDeath ? '#f1c40f' : '#e74c3c');
      const darkColor = render?.darkColor || (hit.isDeath ? '#d4ac0d' : '#c0392b');
      const isSplash = render?.splash || false;
      const size = render?.size || (hit.isDeath ? 28 : 20);

      ctx.save();
      const progress = hit.progress;
      const alpha = 1 - progress;
      const scale = 0.5 + progress * 1.5;
      ctx.globalAlpha = alpha;
      ctx.translate(pos.x, pos.y);
      ctx.scale(scale, scale);

      if (isSplash) {
        for (let r = 0; r < 3; r++) {
          ctx.globalAlpha = alpha * (0.6 - r * 0.2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3 - r;
          ctx.beginPath();
          ctx.arc(0, 0, (size / 2) * (0.5 + r * 0.4), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        ctx.globalAlpha = alpha;
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i;
          const len = size * (0.4 + progress * 0.8);
          const px = Math.cos(angle) * len;
          const py = Math.sin(angle) * len;
          ctx.fillStyle = i % 2 === 0 ? color : darkColor;
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
        if (hit.isDeath) {
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha * 0.8;
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('+', 0, -size * 0.8 - progress * 10);
        }
      }
      ctx.restore();
    }
  }
}
