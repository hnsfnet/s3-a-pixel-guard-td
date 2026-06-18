import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';
import { ENEMY_TYPES } from '../../config.js';

export class MovementSystem extends System {
  constructor() {
    super('MovementSystem');
    this.priority = 10;
  }

  update(dt) {
    const levelConfig = this.gameEngine.currentLevel;
    const TILE = levelConfig.tileSize;
    const pathCoords = levelConfig.pathCoords;

    const totalLength = this._getTotalPathLength(pathCoords, TILE);
    const enemies = this.entityManager.withComponents([
      COMPONENT_NAMES.POSITION,
      COMPONENT_NAMES.MOVEMENT,
      COMPONENT_NAMES.ENEMY,
      COMPONENT_NAMES.HEALTH
    ]);

    const healthCmp = COMPONENT_NAMES.HEALTH;
    const moveCmpName = COMPONENT_NAMES.MOVEMENT;
    const posCmpName = COMPONENT_NAMES.POSITION;
    const effCmpName = COMPONENT_NAMES.STATUS_EFFECT;

    for (const enemy of enemies) {
      const health = enemy.getComponent(healthCmp);
      if (health.hp <= 0) continue;

      const move = enemy.getComponent(moveCmpName);
      const pos = enemy.getComponent(posCmpName);
      const status = enemy.getComponent(effCmpName);

      let speedMul = 1;
      if (status && status.hasSlow()) {
        speedMul = 1 - status.slow.percent;
      }

      if (move.enemyType === ENEMY_TYPES.FLYING) {
        const startX = TILE / 2 + 5;
        const endX = levelConfig.gridWidth * TILE - TILE / 2 - 5;
        const y = TILE * 2.5;
        const dx = endX - startX;
        move.progress += (move.baseSpeed * speedMul * 60 * dt) / (dx / TILE * 16);
        move.progress = Math.min(move.progress, 1);
        move.wingPhase += dt * move.wingSpeed;
        pos.prevX = pos.x;
        pos.prevY = pos.y;
        pos.x = startX + dx * move.progress;
        pos.y = y + Math.sin(move.progress * Math.PI * 6) * TILE * 0.5;
      } else {
        move.progress += (move.baseSpeed * speedMul * 60 * dt) / (totalLength / TILE * 16);
        move.progress = Math.min(move.progress, 1);
        const pt = this._getPointOnPath(move.progress, pathCoords, TILE);
        pos.prevX = pos.x;
        pos.prevY = pos.y;
        pos.x = pt.x;
        pos.y = pt.y;
      }
    }
  }

  _getTotalPathLength(pathCoords, TILE) {
    let total = 0;
    for (let i = 0; i < pathCoords.length - 1; i++) {
      const x1 = pathCoords[i].x * TILE + TILE / 2;
      const y1 = pathCoords[i].y * TILE + TILE / 2;
      const x2 = pathCoords[i + 1].x * TILE + TILE / 2;
      const y2 = pathCoords[i + 1].y * TILE + TILE / 2;
      total += Math.hypot(x2 - x1, y2 - y1);
    }
    return total;
  }

  _getPointOnPath(progress, pathCoords, TILE) {
    const segments = [];
    let totalLength = 0;
    for (let i = 0; i < pathCoords.length - 1; i++) {
      const x1 = pathCoords[i].x * TILE + TILE / 2;
      const y1 = pathCoords[i].y * TILE + TILE / 2;
      const x2 = pathCoords[i + 1].x * TILE + TILE / 2;
      const y2 = pathCoords[i + 1].y * TILE + TILE / 2;
      const len = Math.hypot(x2 - x1, y2 - y1);
      segments.push({ x1, y1, x2, y2, len, start: totalLength });
      totalLength += len;
    }

    const target = progress * totalLength;
    for (const seg of segments) {
      if (target <= seg.start + seg.len) {
        const t = (target - seg.start) / seg.len;
        return { x: seg.x1 + (seg.x2 - seg.x1) * t, y: seg.y1 + (seg.y2 - seg.y1) * t };
      }
    }
    const last = segments[segments.length - 1];
    return { x: last.x2, y: last.y2 };
  }
}
