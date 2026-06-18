import { TILE_TYPES, PATH_COORDS } from './config.js';

export class MapRenderer {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.tileSize = config.tileSize;
    this.gridWidth = config.gridWidth;
    this.gridHeight = config.gridHeight;
    this.grid = [];
    this.pathPoints = [];
    this.totalPathLength = 0;
    this.segmentLengths = [];
    this._initGrid();
    this._initPath();
  }

  _initGrid() {
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = TILE_TYPES.GRASS;
      }
    }
  }

  _initPath() {
    for (let i = 0; i < PATH_COORDS.length - 1; i++) {
      const start = PATH_COORDS[i];
      const end = PATH_COORDS[i + 1];
      this._drawPathSegment(start, end);
    }

    const start = PATH_COORDS[0];
    const end = PATH_COORDS[PATH_COORDS.length - 1];
    this.grid[start.y][start.x] = TILE_TYPES.START;
    this.grid[end.y][end.x] = TILE_TYPES.END;

    this._calculatePathPoints();
  }

  _drawPathSegment(start, end) {
    const dx = Math.sign(end.x - start.x);
    const dy = Math.sign(end.y - start.y);
    let x = start.x;
    let y = start.y;

    while (x !== end.x || y !== end.y) {
      this.grid[y][x] = TILE_TYPES.PATH;
      if (x !== end.x) x += dx;
      else if (y !== end.y) y += dy;
    }
    this.grid[end.y][end.x] = TILE_TYPES.PATH;
  }

  _calculatePathPoints() {
    this.pathPoints = [];
    this.segmentLengths = [];
    this.totalPathLength = 0;

    for (let i = 0; i < PATH_COORDS.length - 1; i++) {
      const start = PATH_COORDS[i];
      const end = PATH_COORDS[i + 1];
      const sx = start.x * this.tileSize + this.tileSize / 2;
      const sy = start.y * this.tileSize + this.tileSize / 2;
      const ex = end.x * this.tileSize + this.tileSize / 2;
      const ey = end.y * this.tileSize + this.tileSize / 2;
      const length = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
      this.segmentLengths.push(length);
      this.totalPathLength += length;
      this.pathPoints.push({ sx, sy, ex, ey });
    }
  }

  getPositionOnPath(progress) {
    const targetDist = progress * this.totalPathLength;
    let accumulated = 0;

    for (let i = 0; i < this.pathPoints.length; i++) {
      const seg = this.pathPoints[i];
      const segLen = this.segmentLengths[i];

      if (accumulated + segLen >= targetDist) {
        const t = (targetDist - accumulated) / segLen;
        return {
          x: seg.sx + (seg.ex - seg.sx) * t,
          y: seg.sy + (seg.ey - seg.sy) * t
        };
      }
      accumulated += segLen;
    }

    const last = this.pathPoints[this.pathPoints.length - 1];
    return { x: last.ex, y: last.ey };
  }

  getTileAt(gridX, gridY) {
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return null;
    }
    return this.grid[gridY][gridX];
  }

  isBuildable(gridX, gridY) {
    return this.getTileAt(gridX, gridY) === TILE_TYPES.GRASS;
  }

  render() {
    const ctx = this.ctx;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const tile = this.grid[y][x];
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        this._renderTile(px, py, tile, x, y);
      }
    }

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.tileSize, 0);
      ctx.lineTo(x * this.tileSize, this.gridHeight * this.tileSize);
      ctx.stroke();
    }
    for (let y = 0; y <= this.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.tileSize);
      ctx.lineTo(this.gridWidth * this.tileSize, y * this.tileSize);
      ctx.stroke();
    }
  }

  _renderTile(px, py, tile, gx, gy) {
    const ctx = this.ctx;
    const size = this.tileSize;

    switch (tile) {
      case TILE_TYPES.GRASS:
        const isDark = (gx + gy) % 2 === 0;
        ctx.fillStyle = isDark ? '#1e4a32' : '#235a3a';
        ctx.fillRect(px, py, size, size);
        ctx.fillStyle = isDark ? '#2a6b48' : '#2d7250';
        for (let i = 0; i < 3; i++) {
          const dx = ((gx * 7 + gy * 13 + i * 17) % 10) * size / 12 + 4;
          const dy = ((gx * 11 + gy * 5 + i * 19) % 10) * size / 12 + 4;
          ctx.fillRect(px + dx, py + dy, 2, 4);
        }
        break;

      case TILE_TYPES.PATH:
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(px, py, size, size);
        ctx.fillStyle = '#a07818';
        for (let i = 0; i < 4; i++) {
          const dx = ((gx * 3 + gy * 7 + i * 11) % 8) * size / 10 + 4;
          const dy = ((gx * 5 + gy * 2 + i * 13) % 8) * size / 10 + 4;
          ctx.fillRect(px + dx, py + dy, 4, 4);
        }
        ctx.fillStyle = '#6b4e0f';
        ctx.fillRect(px, py, size, 2);
        ctx.fillRect(px, py + size - 2, size, 2);
        break;

      case TILE_TYPES.START:
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(px, py, size, size);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(px + 4, py + 4, size - 8, size - 8);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('入', px + size / 2, py + size / 2);
        break;

      case TILE_TYPES.END:
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(px, py, size, size);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(px + 4, py + 4, size - 8, size - 8);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('出', px + size / 2, py + size / 2);
        break;
    }
  }

  highlightTile(gridX, gridY, color = 'rgba(255, 255, 255, 0.3)') {
    if (!this.isBuildable(gridX, gridY)) return;
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(gridX * this.tileSize, gridY * this.tileSize, this.tileSize, this.tileSize);
  }

  drawRangeCircle(gridX, gridY, range, color = 'rgba(255, 215, 0, 0.3)') {
    const ctx = this.ctx;
    const cx = gridX * this.tileSize + this.tileSize / 2;
    const cy = gridY * this.tileSize + this.tileSize / 2;
    const radius = range * this.tileSize;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
