import { System } from './System.js';
import { COMPONENT_NAMES } from '../Component.js';
import { TOWER_BASE_TYPES, ENEMY_TYPES, GAME_STATE, WAVES, getWaveTotalCount } from '../../config.js';

export class MapRenderSystem extends System {
  constructor() {
    super('MapRenderSystem');
    this.priority = 1;
  }

  render() {
    const ctx = this.ctx;
    const levelCfg = this.gameEngine.currentLevel;
    const TILE = levelCfg.tileSize;
    const GW = levelCfg.gridWidth;
    const GH = levelCfg.gridHeight;
    const pathCoords = levelCfg.pathCoords;
    const theme = levelCfg.theme;

    let grassA = '#4caf50';
    let grassB = '#43a047';
    let pathColor = '#8d6e63';
    let pathBorder = '#5d4037';
    if (theme === 'desert') {
      grassA = '#e8d5a9';
      grassB = '#d4c190';
      pathColor = '#c19a6b';
      pathBorder = '#8b6f47';
    } else if (theme === 'snow') {
      grassA = '#e3f2fd';
      grassB = '#bbdefb';
      pathColor = '#b0bec5';
      pathBorder = '#607d8b';
    }

    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const isEvenTile = ((x + y) % 2 === 0);
        ctx.fillStyle = isEvenTile ? grassA : grassB;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    for (let i = 0; i < pathCoords.length - 1; i++) {
      const p1 = pathCoords[i];
      const p2 = pathCoords[i + 1];
      if (p1.x === p2.x) {
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        for (let y = minY; y <= maxY; y++) {
          ctx.fillStyle = pathColor;
          ctx.fillRect(p1.x * TILE, y * TILE, TILE, TILE);
          ctx.strokeStyle = pathBorder;
          ctx.lineWidth = 2;
          ctx.strokeRect(p1.x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
        }
      } else {
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        for (let x = minX; x <= maxX; x++) {
          ctx.fillStyle = pathColor;
          ctx.fillRect(x * TILE, p1.y * TILE, TILE, TILE);
          ctx.strokeStyle = pathBorder;
          ctx.lineWidth = 2;
          ctx.strokeRect(x * TILE + 1, p1.y * TILE + 1, TILE - 2, TILE - 2);
        }
      }
    }

    const startP = pathCoords[0];
    const endP = pathCoords[pathCoords.length - 1];
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(startP.x * TILE + 4, startP.y * TILE + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('入', startP.x * TILE + TILE / 2, startP.y * TILE + TILE / 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(endP.x * TILE + 4, endP.y * TILE + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = '#fff';
    ctx.fillText('出', endP.x * TILE + TILE / 2, endP.y * TILE + TILE / 2);
  }
}
