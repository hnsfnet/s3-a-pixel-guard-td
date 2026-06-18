import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';
import { TOWER_BASE_TYPES } from '../../config.js';

export class ProjectileRenderSystem extends System {
  constructor() {
    super('ProjectileRenderSystem');
    this.priority = 4;
  }

  render() {
    const ctx = this.ctx;
    const projectiles = this.entityManager.byTag('projectile');

    for (const proj of projectiles) {
      const pos = proj.getComponent(COMPONENT_NAMES.POSITION);
      const projCmp = proj.getComponent(COMPONENT_NAMES.PROJECTILE);
      const trail = proj.getComponent(COMPONENT_NAMES.TRAIL_RENDER);
      const render = proj.getComponent(COMPONENT_NAMES.RENDER);

      if (!pos || !projCmp) continue;

      const color = projCmp.color;
      const darkColor = projCmp.darkColor;
      const baseType = projCmp.baseType;
      const level = projCmp.towerLevel;

      if (trail && trail.points.length > 1) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = trail.glowColor;
        ctx.lineWidth = trail.width + 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const pts = trail.points;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = color;
        ctx.lineWidth = trail.width;
        ctx.stroke();
        ctx.restore();
      }

      if (baseType === TOWER_BASE_TYPES.CANNON) {
        ctx.save();
        const angle = Math.atan2(projCmp.vy, projCmp.vx);
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        if (level >= 2) {
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = level === 3 ? '#00e5ff' : '#ff5722';
          ctx.beginPath();
          ctx.arc(-8, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        ctx.save();
        const angle = Math.atan2(projCmp.vy, projCmp.vx);
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.fillStyle = darkColor;
        ctx.fillRect(-10, -1, 20, 2);
        ctx.fillStyle = color;
        ctx.fillRect(-8, -1, 16, 2);
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(6, -4);
        ctx.lineTo(6, 4);
        ctx.closePath();
        ctx.fillStyle = darkColor;
        ctx.fill();
        if (level === 3) {
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#2ecc71';
          ctx.fillRect(-10, -2, 20, 1);
          ctx.fillRect(-10, 1, 20, 1);
        }
        ctx.restore();
      }
    }
  }
}
