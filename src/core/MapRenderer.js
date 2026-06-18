import { TILE_TYPES } from '../config.js';

export class MapRenderer {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  get levelConfig() {
    return this.gameEngine.currentLevel;
  }

  get TILE() {
    return this.levelConfig.tileSize;
  }

  get GW() {
    return this.levelConfig.gridWidth;
  }

  get GH() {
    return this.levelConfig.gridHeight;
  }

  get pathCoords() {
    return this.levelConfig.pathCoords;
  }

  getTileAt(gridX, gridY) {
    if (gridX < 0 || gridX >= this.GW || gridY < 0 || gridY >= this.GH) return null;
    const pathCoords = this.pathCoords;
    for (let i = 0; i < pathCoords.length - 1; i++) {
      const p1 = pathCoords[i];
      const p2 = pathCoords[i + 1];
      if (p1.x === p2.x) {
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        if (gridX === p1.x && gridY >= minY && gridY <= maxY) {
          if (i === 0) return TILE_TYPES.START;
          if (i === pathCoords.length - 2) return TILE_TYPES.END;
          return TILE_TYPES.PATH;
        }
      } else {
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        if (gridY === p1.y && gridX >= minX && gridX <= maxX) {
          if (i === 0) return TILE_TYPES.START;
          if (i === pathCoords.length - 2) return TILE_TYPES.END;
          return TILE_TYPES.PATH;
        }
      }
    }
    return TILE_TYPES.GRASS;
  }

  isBuildable(gridX, gridY) {
    const t = this.getTileAt(gridX, gridY);
    return t === TILE_TYPES.GRASS;
  }

  screenToGrid(screenX, screenY) {
    return {
      gridX: Math.floor(screenX / this.TILE),
      gridY: Math.floor(screenY / this.TILE)
    };
  }

  gridToCenter(gridX, gridY) {
    return {
      x: gridX * this.TILE + this.TILE / 2,
      y: gridY * this.TILE + this.TILE / 2
    };
  }

  getPathPixelLength() {
    let total = 0;
    const T = this.TILE;
    for (let i = 0; i < this.pathCoords.length - 1; i++) {
      const p1 = this.pathCoords[i];
      const p2 = this.pathCoords[i + 1];
      const x1 = p1.x * T + T / 2;
      const y1 = p1.y * T + T / 2;
      const x2 = p2.x * T + T / 2;
      const y2 = p2.y * T + T / 2;
      total += Math.hypot(x2 - x1, y2 - y1);
    }
    return total;
  }

  render(ctx) {
  }
}
