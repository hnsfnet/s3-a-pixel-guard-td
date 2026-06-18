import { TOWER_TYPES, TOWER_LEVELS } from './config.js';

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
      baseType: towerType,
      level: 1,
      config: { ...towerConfig },
      cooldown: 0,
      angle: 0,
      targetEnemy: null
    });
    return true;
  }

  upgradeTower(gridX, gridY, gameEngine) {
    const tower = this.getTowerAt(gridX, gridY);
    if (!tower) return { success: false, reason: '塔不存在' };
    if (tower.level >= 3) return { success: false, reason: '已满级' };

    const levels = TOWER_LEVELS[tower.baseType];
    const nextConfig = levels[tower.level];
    if (!nextConfig) return { success: false, reason: '已达最高等级' };

    const cost = Math.ceil(nextConfig.upgradeCost || 0);
    if (cost <= 0) return { success: false, reason: '配置错误' };
    if (gameEngine.gold < cost) return { success: false, reason: '金币不足' };
    if (!gameEngine.spendGold(cost)) {
      return { success: false, reason: '金币不足' };
    }

    tower.level++;
    tower.config = { ...nextConfig };
    return { success: true, newLevel: tower.level };
  }

  getTowerAt(gridX, gridY) {
    return this.towers.find((t) => t.gridX === gridX && t.gridY === gridY);
  }

  getUpgradeInfo(tower) {
    if (!tower) return null;
    const levels = TOWER_LEVELS[tower.baseType];
    const current = levels[tower.level - 1];
    const next = tower.level < 3 ? levels[tower.level] : null;
    return { current, next, level: tower.level, maxLevel: 3 };
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
      if (!tower.config.canHitFlying && enemy.enemyType === 'FLYING') {
        continue;
      }

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

    const speed = tower.baseType === 'ARROW' ? 500 : 350;
    const target = tower.targetEnemy;
    const shots = tower.config.multiShot || 1;

    for (let i = 0; i < shots; i++) {
      let aimEnemy = target;

      if (shots > 1) {
        let alt = null;
        let altProgress = -1;
        const range = tower.config.range * this.tileSize;
        for (const e of this.enemyManager.enemies) {
          if (e.id === target.id) continue;
          if (!tower.config.canHitFlying && e.enemyType === 'FLYING') continue;
          const dx = e.x - tower.x;
          const dy = e.y - tower.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= range && e.progress > altProgress) {
            alt = e;
            altProgress = e.progress;
          }
        }
        if (alt && i === 1) aimEnemy = alt;
      }

      const dx = aimEnemy.x - tower.x;
      const dy = aimEnemy.y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const jitterX = shots > 1 ? (i - (shots - 1) / 2) * 12 : 0;
      const jitterY = shots > 1 ? (i - (shots - 1) / 2) * 8 : 0;

      this.bullets.push({
        x: tower.x + (jitterX / this.tileSize) * 2,
        y: tower.y + (jitterY / this.tileSize) * 2,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        damage: tower.config.damage,
        splashRadius: tower.config.splashRadius * this.tileSize,
        color: tower.config.color,
        darkColor: tower.config.darkColor,
        baseType: tower.baseType,
        towerLevel: tower.level,
        poisonDps: tower.config.poisonDps || 0,
        poisonDuration: tower.config.poisonDuration || 0,
        slowPercent: tower.config.slowPercent || 0,
        slowDuration: tower.config.slowDuration || 0,
        targetId: aimEnemy.id
      });
    }
  }

  _updateBullets(dt) {
    const toRemove = [];

    for (let i = 0; i < this.bullets.length; i++) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (bullet.x < -20 || bullet.x > this.config.gridWidth * this.tileSize + 20 ||
          bullet.y < -20 || bullet.y > this.config.gridHeight * this.tileSize + 20) {
        toRemove.push(i);
        continue;
      }

      if (this._checkBulletCollision(bullet)) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.bullets.splice(toRemove[i], 1);
    }
  }

  _checkBulletCollision(bullet) {
    for (const enemy of this.enemyManager.enemies) {
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = enemy.enemyType === 'FLYING' ? 20 : 18;

      if (dist <= hitRadius) {
        if (bullet.splashRadius > 0) {
          this._applySplashDamage(bullet, enemy);
        } else {
          this.enemyManager.damageEnemy(enemy, bullet.damage);
          this._applyHitEffects(enemy, bullet);
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
        const damageMul = enemy.id === hitEnemy.id ? 1.0 : 0.6;
        const dmg = Math.max(1, Math.round(bullet.damage * damageMul));
        this.enemyManager.damageEnemy(enemy, dmg);
        this._applyHitEffects(enemy, bullet);
      }
    }
  }

  _applyHitEffects(enemy, bullet) {
    if (bullet.poisonDps > 0 && bullet.poisonDuration > 0) {
      this.enemyManager.applyPoison(enemy, bullet.poisonDps, bullet.poisonDuration);
    }
    if (bullet.slowPercent > 0 && bullet.slowDuration > 0) {
      this.enemyManager.applySlow(enemy, bullet.slowPercent, bullet.slowDuration);
    }
  }

  renderTowers() {
    for (const tower of this.towers) {
      this._renderTower(tower);
    }
  }

  _renderTower(tower) {
    const ctx = this.ctx;
    const { x, y, config, angle, level, baseType } = tower;
    const size = this.tileSize;

    ctx.fillStyle = '#444';
    ctx.fillRect(x - size * 0.4, y - size * 0.4, size * 0.8, size * 0.8);
    ctx.fillStyle = '#333';
    ctx.fillRect(x - size * 0.35, y - size * 0.35, size * 0.7, size * 0.7);

    for (let i = 0; i < level; i++) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(x - size * 0.3 + i * 7, y + size * 0.2, 5, 5);
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (baseType === 'ARROW') {
      ctx.fillStyle = config.color;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = config.darkColor;
      ctx.fillRect(-6, -6, 12, 12);

      if (level >= 2) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, -5, 20, 3);
        ctx.fillRect(0, 2, 20, 3);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, -2, 22, 4);
      }

      ctx.fillStyle = config.darkColor;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(16, -6);
      ctx.lineTo(16, 6);
      ctx.closePath();
      ctx.fill();

      if (level >= 3) {
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(39, 174, 96, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

    } else if (baseType === 'CANNON') {
      ctx.fillStyle = config.color;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = config.darkColor;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#333';

      const barrelW = level >= 2 ? 28 : 24;
      const barrelH = level >= 3 ? 16 : 14;
      ctx.fillRect(0, -barrelH / 2, barrelW, barrelH);

      ctx.fillStyle = '#222';
      ctx.fillRect(barrelW - 4, -barrelH / 2 + 1, 6, barrelH - 2);

      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      if (level >= 2) {
        ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
        ctx.fillRect(barrelW - 2, -barrelH / 2 - 2, 4, barrelH + 4);
      }
      if (level >= 3) {
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = 'rgba(0, 188, 212, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }
    }

    ctx.restore();
  }

  renderBullets() {
    const ctx = this.ctx;

    for (const bullet of this.bullets) {
      if (bullet.baseType === 'ARROW') {
        const angle = Math.atan2(bullet.vy, bullet.vx);
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(angle);

        let color = bullet.color;
        if (bullet.towerLevel === 3) color = '#2ecc71';
        else if (bullet.towerLevel === 2) color = '#9b59b6';
        ctx.fillStyle = color;
        ctx.fillRect(-8, -2, 16, 4);

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(4, -4);
        ctx.lineTo(4, 4);
        ctx.closePath();
        ctx.fill();

        if (bullet.towerLevel >= 3) {
          ctx.fillStyle = 'rgba(39, 174, 96, 0.5)';
          ctx.beginPath();
          ctx.arc(-4, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

      } else if (bullet.baseType === 'CANNON') {
        let mainColor = '#333';
        let glowColor = 'rgba(255, 165, 0, 0.6)';
        let trailColor = '#e74c3c';
        if (bullet.towerLevel === 3) {
          mainColor = '#00838f';
          glowColor = 'rgba(0, 200, 230, 0.7)';
          trailColor = '#00bcd4';
        } else if (bullet.towerLevel === 2) {
          mainColor = '#8b0000';
          glowColor = 'rgba(255, 80, 0, 0.8)';
          trailColor = '#ff4500';
        }

        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = trailColor;
        ctx.beginPath();
        ctx.arc(bullet.x - 2, bullet.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        const splashAngle = Math.atan2(bullet.vy, bullet.vx) + Math.PI;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(
          bullet.x + Math.cos(splashAngle) * 8,
          bullet.y + Math.sin(splashAngle) * 8,
          bullet.towerLevel >= 2 ? 6 : 4, 0, Math.PI * 2
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

  renderTowerRange(tower) {
    if (!tower) return;
    this.mapRenderer.drawRangeCircle(tower.gridX, tower.gridY, tower.config.range, 'rgba(0, 200, 255, 0.15)');
  }
}
