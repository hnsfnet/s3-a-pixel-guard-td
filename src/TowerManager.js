import { TOWER_TYPES } from './config.js';

export class TowerManager {
  constructor(ctx, config, mapRenderer) {
    this.ctx = ctx;
    this.config = config;
    this.mapRenderer = mapRenderer;
    this.tileSize = config.tileSize;
    this.towers = [];
    this.bullets = [];
    this.enemyManager = null;
  }

  setEnemyManager(enemyManager) {
    this.enemyManager = enemyManager;
  }

  buildTower(gridX, gridY, towerType, gameEngine) {
    const towerConfig = TOWER_TYPES[towerType];
    if (!towerConfig) return false;
    if (!this.mapRenderer.isBuildable(gridX, gridY)) return false;
    if (this.getTowerAt(gridX, gridY)) return false;
    if (!gameEngine.spendGold(towerConfig.cost)) return false;

    this.towers.push({
      gridX,
      gridY,
      x: gridX * this.tileSize + this.tileSize / 2,
      y: gridY * this.tileSize + this.tileSize / 2,
      type: towerType,
      config: { ...towerConfig },
      cooldown: 0,
      angle: 0,
      targetEnemy: null
    });
    return true;
  }

  getTowerAt(gridX, gridY) {
    return this.towers.find((t) => t.gridX === gridX && t.gridY === gridY);
  }

  update(dt) {
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      this._findTarget(tower);

      if (tower.targetEnemy) {
        const dx = tower.targetEnemy.x - tower.x;
        const dy = tower.targetEnemy.y - tower.y;
        tower.angle = Math.atan2(dy, dx);

        if (tower.cooldown <= 0) {
          this._fire(tower);
          tower.cooldown = tower.config.fireRate;
        }
      }
    }

    this._updateBullets(dt);
  }

  _findTarget(tower) {
    const range = tower.config.range * this.tileSize;
    let bestEnemy = null;
    let bestProgress = -1;

    for (const enemy of this.enemyManager.enemies) {
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range && enemy.progress > bestProgress) {
        bestEnemy = enemy;
        bestProgress = enemy.progress;
      }
    }

    tower.targetEnemy = bestEnemy;
  }

  _fire(tower) {
    if (!tower.targetEnemy) return;

    const speed = tower.type === 'ARROW' ? 500 : 350;
    const dx = tower.targetEnemy.x - tower.x;
    const dy = tower.targetEnemy.y - tower.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.bullets.push({
      x: tower.x,
      y: tower.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      damage: tower.config.damage,
      splashRadius: tower.config.splashRadius * this.tileSize,
      color: tower.config.color,
      type: tower.type,
      targetId: tower.targetEnemy.id
    });
  }

  _updateBullets(dt) {
    const toRemove = [];

    for (let i = 0; i < this.bullets.length; i++) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (bullet.x < 0 || bullet.x > this.config.gridWidth * this.tileSize ||
          bullet.y < 0 || bullet.y > this.config.gridHeight * this.tileSize) {
        toRemove.push(i);
        continue;
      }

      if (this._checkBulletCollision(bullet, i)) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.bullets.splice(toRemove[i], 1);
    }
  }

  _checkBulletCollision(bullet, bulletIndex) {
    for (const enemy of this.enemyManager.enemies) {
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = 18;

      if (dist <= hitRadius) {
        if (bullet.splashRadius > 0) {
          this._applySplashDamage(bullet, enemy);
        } else {
          this.enemyManager.damageEnemy(enemy, bullet.damage);
        }
        return true;
      }
    }
    return false;
  }

  _applySplashDamage(bullet, hitEnemy) {
    for (const enemy of this.enemyManager.enemies) {
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= bullet.splashRadius) {
        const falloff = 1 - (dist / bullet.splashRadius) * 0.5;
        const dmg = Math.round(bullet.damage * falloff);
        this.enemyManager.damageEnemy(enemy, dmg);
      }
    }
  }

  renderTowers() {
    for (const tower of this.towers) {
      this._renderTower(tower);
    }
  }

  _renderTower(tower) {
    const ctx = this.ctx;
    const { x, y, config, angle } = tower;
    const size = this.tileSize;

    ctx.fillStyle = '#444';
    ctx.fillRect(x - size * 0.4, y - size * 0.4, size * 0.8, size * 0.8);
    ctx.fillStyle = '#333';
    ctx.fillRect(x - size * 0.35, y - size * 0.35, size * 0.7, size * 0.7);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (tower.type === 'ARROW') {
      ctx.fillStyle = config.color;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = config.darkColor;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, -2, 22, 4);
      ctx.fillStyle = config.darkColor;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(16, -6);
      ctx.lineTo(16, 6);
      ctx.closePath();
      ctx.fill();
    } else if (tower.type === 'CANNON') {
      ctx.fillStyle = config.color;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = config.darkColor;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#333';
      ctx.fillRect(0, -7, 24, 14);
      ctx.fillStyle = '#222';
      ctx.fillRect(20, -6, 6, 12);
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderBullets() {
    const ctx = this.ctx;

    for (const bullet of this.bullets) {
      if (bullet.type === 'ARROW') {
        const angle = Math.atan2(bullet.vy, bullet.vx);
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(angle);
        ctx.fillStyle = bullet.color;
        ctx.fillRect(-8, -2, 16, 4);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(4, -4);
        ctx.lineTo(4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (bullet.type === 'CANNON') {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(bullet.x - 2, bullet.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        const splashAngle = Math.atan2(bullet.vy, bullet.vx) + Math.PI;
        ctx.fillStyle = 'rgba(255, 165, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(
          bullet.x + Math.cos(splashAngle) * 8,
          bullet.y + Math.sin(splashAngle) * 8,
          4, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  renderTowerPreview(gridX, gridY, towerType) {
    const config = TOWER_TYPES[towerType];
    if (!config) return;

    this.mapRenderer.drawRangeCircle(gridX, gridY, config.range, 'rgba(255, 215, 0, 0.2)');

    const ctx = this.ctx;
    const x = gridX * this.tileSize + this.tileSize / 2;
    const y = gridY * this.tileSize + this.tileSize / 2;
    const size = this.tileSize;

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#444';
    ctx.fillRect(x - size * 0.4, y - size * 0.4, size * 0.8, size * 0.8);
    ctx.fillStyle = config.color;
    ctx.fillRect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.6);
    ctx.globalAlpha = 1;
  }
}
