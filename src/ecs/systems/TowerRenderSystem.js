import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';
import { TOWER_BASE_TYPES, ENEMY_TYPES, GAME_STATE, WAVES, getWaveTotalCount } from '../../config.js';

export class TowerRenderSystem extends System {
  constructor() {
    super('TowerRenderSystem');
    this.priority = 2;
  }

  render() {
    const ctx = this.ctx;
    const levelCfg = this.gameEngine.currentLevel;
    const TILE = levelCfg.tileSize;

    const selectedTower = this.gameEngine.selectedTower;
    if (selectedTower) {
      const pos = selectedTower.getComponent(COMPONENT_NAMES.POSITION);
      const atk = selectedTower.getComponent(COMPONENT_NAMES.ATTACK);
      if (pos && atk) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = atk.canHitFlying ? '#3498db' : '#e67e22';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, atk.range * TILE, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = atk.canHitFlying ? '#2980b9' : '#d35400';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    if (this.gameEngine.hoverGridX !== null && this.gameEngine._buildMode) {
      const gx = this.gameEngine.hoverGridX;
      const gy = this.gameEngine.hoverGridY;
      const typeCfg = this.gameEngine._buildTypeCfg;
      const canBuild = this.gameEngine.towerSystem.canBuildAt(gx, gy) &&
                       this.gameEngine.gold >= (typeCfg?.cost || 0);
      const cx = gx * TILE + TILE / 2;
      const cy = gy * TILE + TILE / 2;
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = canBuild ? (typeCfg?.color || '#3498db') : '#e74c3c';
      ctx.fillRect(gx * TILE + 2, gy * TILE + 2, TILE - 4, TILE - 4);
      if (typeCfg) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = canBuild ? (typeCfg.color) : '#e74c3c';
        ctx.beginPath();
        ctx.arc(cx, cy, typeCfg.range * TILE, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const towers = this.entityManager.byTag('tower');
    for (const tower of towers) {
      const pos = tower.getComponent(COMPONENT_NAMES.POSITION);
      const render = tower.getComponent(COMPONENT_NAMES.RENDER);
      const towerCmp = tower.getComponent(COMPONENT_NAMES.TOWER);
      if (!pos || !render || !towerCmp) continue;

      const { x, y } = pos;
      const size = render.size;
      const color = render.color;
      const darkColor = render.darkColor;
      const level = towerCmp.level;

      ctx.save();
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(x - size / 2 - 3, y - size / 2 - 3, size + 6, size + 6);
      ctx.fillStyle = '#34495e';
      ctx.fillRect(x - size / 2, y - size / 2, size, size);

      if (level >= 3 && towerCmp.baseType === TOWER_BASE_TYPES.ARROW) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (level >= 3 && towerCmp.baseType === TOWER_BASE_TYPES.CANNON) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x - size / 2 + 4, y - size / 2 + 4, size - 8, size - 8);
      ctx.strokeStyle = darkColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - size / 2 + 4, y - size / 2 + 4, size - 8, size - 8);

      if (towerCmp.baseType === TOWER_BASE_TYPES.ARROW) {
        ctx.fillStyle = darkColor;
        if (level >= 2) {
          ctx.fillRect(x - size / 2, y - 4, size / 2 - 2, 4);
          ctx.fillRect(x + 2, y - 4, size / 2 - 2, 4);
          ctx.fillRect(x - size / 2 - 2, y - 8, 6, 4);
          ctx.fillRect(x + size / 2 - 4, y - 8, 6, 4);
        } else {
          ctx.fillRect(x - 3, y - size / 2 - 2, 6, size / 2);
        }
      } else {
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        const targetComp = tower.getComponent(COMPONENT_NAMES.TARGET);
        if (targetComp && targetComp.targetEntity) {
          const tgtPos = targetComp.targetEntity.getComponent(COMPONENT_NAMES.POSITION);
          if (tgtPos) {
            const angle = Math.atan2(tgtPos.y - y, tgtPos.x - x);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, -5, size / 2 + 4, 10);
            ctx.restore();
          } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x, y - 5, size / 2 + 4, 10);
          }
        } else {
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(x, y - 5, size / 2 + 4, 10);
        }
      }

      for (let s = 0; s < level; s++) {
        this._drawStar(ctx, x + 2 - size / 2 + 6 + s * 10, y + size / 2 - 5, 3, '#f1c40f', '#d4ac0d');
      }

      ctx.restore();
    }
  }

  _drawStar(ctx, cx, cy, r, color, darkColor) {
    ctx.fillStyle = color;
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const x1 = cx + Math.cos(angle) * r;
      const y1 = cy + Math.sin(angle) * r;
      const angle2 = angle + Math.PI / 5;
      const x2 = cx + Math.cos(angle2) * (r * 0.45);
      const y2 = cy + Math.sin(angle2) * (r * 0.45);
      if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
