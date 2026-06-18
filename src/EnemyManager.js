import { WAVES, getWaveTotalCount } from './config.js';

let enemyIdCounter = 0;

export class EnemyManager {
  constructor(ctx, config, mapRenderer) {
    this.ctx = ctx;
    this.config = config;
    this.mapRenderer = mapRenderer;
    this.tileSize = config.tileSize;
    this.enemies = [];
    this.spawnedCount = 0;
    this.spawnedByType = [];
    this.spawnTimer = 0;
    this.hitEffects = [];
    this.flyingStartX = -20;
    this.flyingStartY = 40;
    this.flyingEndX = this.config.gridWidth * this.tileSize + 20;
    this.flyingEndY = this.config.gridHeight * this.tileSize * 0.35;
  }

  update(dt, waveIndex, gameEngine) {
    const waveConfig = WAVES[waveIndex - 1];
    if (!waveConfig) return;

    if (!this.spawnedByType || this.spawnedByType.length !== waveConfig.enemies.length) {
      this.spawnedByType = waveConfig.enemies.map(() => 0);
    }

    const totalToSpawn = getWaveTotalCount(waveIndex - 1);
    if (this.spawnedCount < totalToSpawn) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this._spawnEnemy(waveConfig);
        this.spawnedCount++;
        this.spawnTimer = waveConfig.interval;
      }
    }

    const toRemove = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];

      this._updateStatusEffects(enemy, dt);
      this._moveEnemy(enemy, dt);

      if (enemy.progress >= 1) {
        gameEngine.deductHealth(1);
        toRemove.push(i);
        continue;
      }

      if (enemy.hp <= 0) {
        gameEngine.addGold(enemy.reward);
        this._addHitEffect(enemy.x, enemy.y, true);
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.enemies.splice(toRemove[i], 1);
    }

    const fxToRemove = [];
    for (let i = 0; i < this.hitEffects.length; i++) {
      this.hitEffects[i].life -= dt;
      if (this.hitEffects[i].life <= 0) fxToRemove.push(i);
    }
    for (let i = fxToRemove.length - 1; i >= 0; i--) {
      this.hitEffects.splice(fxToRemove[i], 1);
    }
  }

  _spawnEnemy(waveConfig) {
    let typeIndex = 0;
    let remaining = this.spawnedCount;
    for (let i = 0; i < waveConfig.enemies.length; i++) {
      if (remaining < waveConfig.enemies[i].count) {
        typeIndex = i;
        break;
      }
      remaining -= waveConfig.enemies[i].count;
      if (i === waveConfig.enemies.length - 1) typeIndex = i;
    }

    const typeCfg = waveConfig.enemies[typeIndex];
    const isFlying = typeCfg.type === 'FLYING';

    let x, y;
    if (isFlying) {
      x = this.flyingStartX;
      y = this.flyingStartY + (Math.random() - 0.5) * 80;
    } else {
      const startPos = this.mapRenderer.getPositionOnPath(0);
      x = startPos.x;
      y = startPos.y;
    }

    const hpVariation = 0.9 + Math.random() * 0.2;

    this.enemies.push({
      id: ++enemyIdCounter,
      enemyType: typeCfg.type,
      x,
      y,
      hp: Math.round(typeCfg.hp * hpVariation),
      maxHp: Math.round(typeCfg.hp * hpVariation),
      baseSpeed: typeCfg.speed,
      reward: typeCfg.reward,
      progress: 0,
      hitFlash: 0,
      poison: null,
      slow: null,
      wingPhase: Math.random() * Math.PI * 2
    });
  }

  _moveEnemy(enemy, dt) {
    let speedMul = 1;
    if (enemy.slow && enemy.slow.remaining > 0) {
      speedMul = 1 - enemy.slow.percent;
    }

    if (enemy.enemyType === 'FLYING') {
      const totalDist = this.flyingEndX - this.flyingStartX;
      const pixelSpeed = enemy.baseSpeed * this.tileSize * 1.5 * speedMul;
      enemy.x += pixelSpeed * dt;
      enemy.progress = Math.max(0, Math.min(1, (enemy.x - this.flyingStartX) / totalDist));
      const endY = this.flyingEndY;
      const startY = this.flyingStartY;
      enemy.y = startY + (endY - startY) * enemy.progress + Math.sin(enemy.wingPhase) * 6;
    } else {
      const pathLength = this.mapRenderer.totalPathLength;
      const pixelsPerSecond = enemy.baseSpeed * this.tileSize * 1.5 * speedMul;
      enemy.progress += (pixelsPerSecond / pathLength) * dt;
      if (enemy.progress > 1) enemy.progress = 1;
      const pos = this.mapRenderer.getPositionOnPath(enemy.progress);
      enemy.x = pos.x;
      enemy.y = pos.y;
    }

    enemy.wingPhase += dt * 12;
    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
  }

  _updateStatusEffects(enemy, dt) {
    if (enemy.poison && enemy.poison.remaining > 0) {
      enemy.hp -= enemy.poison.dps * dt;
      enemy.poison.remaining -= dt;
      enemy.poison.tickTimer = (enemy.poison.tickTimer || 0) + dt;
    }
    if (enemy.slow && enemy.slow.remaining > 0) {
      enemy.slow.remaining -= dt;
    }
  }

  applyPoison(enemy, dps, duration) {
    if (!enemy.poison || enemy.poison.remaining <= 0 ||
        dps > enemy.poison.dps || duration > enemy.poison.remaining) {
      enemy.poison = {
        dps: dps,
        remaining: duration,
        tickTimer: 0
      };
    }
  }

  applySlow(enemy, percent, duration) {
    if (!enemy.slow || enemy.slow.remaining <= 0 ||
        percent > enemy.slow.percent || duration > enemy.slow.remaining) {
      enemy.slow = {
        percent: percent,
        remaining: duration
      };
    }
  }

  damageEnemy(enemy, damage) {
    enemy.hp -= damage;
    enemy.hitFlash = 0.1;
  }

  _addHitEffect(x, y, isDeath) {
    this.hitEffects.push({
      x, y,
      life: isDeath ? 0.5 : 0.2,
      maxLife: isDeath ? 0.5 : 0.2,
      isDeath
    });
  }

  render() {
    const ctx = this.ctx;

    for (const enemy of this.enemies) {
      if (enemy.enemyType === 'FLYING') {
        this._renderFlyingShadow(enemy);
      }
    }

    for (const enemy of this.enemies) {
      this._renderEnemy(enemy);
      this._renderStatusIcons(enemy);
    }

    for (const fx of this.hitEffects) {
      this._renderHitEffect(fx);
    }
  }

  _renderFlyingShadow(enemy) {
    const ctx = this.ctx;
    const size = 20;
    const shadowY = enemy.y + 50 + (1 - enemy.progress) * 20;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(enemy.x, shadowY, size * 0.6, size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  _renderEnemy(enemy) {
    const ctx = this.ctx;
    const { x, y } = enemy;
    const isFlying = enemy.enemyType === 'FLYING';
    const size = isFlying ? 22 : 26;

    const hpRatio = enemy.hp / enemy.maxHp;
    let baseColor;
    if (enemy.hitFlash > 0) baseColor = '#ffaaaa';
    else if (hpRatio > 0.6) baseColor = isFlying ? '#8e44ad' : '#27ae60';
    else if (hpRatio > 0.3) baseColor = isFlying ? '#6c3483' : '#f39c12';
    else baseColor = isFlying ? '#4a235a' : '#e74c3c';

    if (isFlying) {
      ctx.save();
      ctx.translate(x, y);
      const wingFlap = Math.sin(enemy.wingPhase) * 0.4;

      ctx.save();
      ctx.rotate(-0.6 + wingFlap);
      ctx.fillStyle = 'rgba(155, 89, 182, 0.85)';
      ctx.beginPath();
      ctx.ellipse(-10, 0, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(200, 160, 220, 0.9)';
      ctx.beginPath();
      ctx.ellipse(-8, -1, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.rotate(0.6 - wingFlap);
      ctx.fillStyle = 'rgba(155, 89, 182, 0.85)';
      ctx.beginPath();
      ctx.ellipse(10, 0, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(200, 160, 220, 0.9)';
      ctx.beginPath();
      ctx.ellipse(8, -1, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.fillRect(-6, -3, 4, 4);
      ctx.fillRect(2, -3, 4, 4);
      ctx.fillStyle = '#000';
      ctx.fillRect(-5, -2, 2, 2);
      ctx.fillRect(3, -2, 2, 2);

      ctx.restore();
    } else {
      ctx.fillStyle = baseColor;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);

      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : (
        hpRatio > 0.6 ? '#1e8449' : hpRatio > 0.3 ? '#b7950b' : '#922b21'
      );
      ctx.fillRect(x - size / 2 + 3, y - size / 2 + 3, size - 6, 4);
      ctx.fillRect(x - size / 2 + 3, y + size / 2 - 7, size - 6, 4);

      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 7, y - 4, 5, 5);
      ctx.fillRect(x + 2, y - 4, 5, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 5, y - 2, 2, 3);
      ctx.fillRect(x + 4, y - 2, 2, 3);

      ctx.fillStyle = '#1a1';
      for (let i = 0; i < 4; i++) {
        const hx = x - size / 2 + 2 + i * 7;
        const hy = y - size / 2 - 5;
        ctx.fillRect(hx, hy, 3, 5);
      }
    }

    const barWidth = size + 6;
    const barHeight = 5;
    const barX = x - barWidth / 2;
    const barY = (isFlying ? y - size - 6 : y - size / 2 - 12);

    ctx.fillStyle = '#222';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    ctx.fillStyle = '#444';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    let hpColor = '#2ecc71';
    if (hpRatio <= 0.3) hpColor = '#e74c3c';
    else if (hpRatio <= 0.6) hpColor = '#f39c12';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * Math.max(0, hpRatio), barHeight);

    if (isFlying) {
      ctx.fillStyle = '#9b59b6';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('飞', x, barY - 3);
    }
  }

  _renderStatusIcons(enemy) {
    const ctx = this.ctx;
    let iconX = enemy.x - 10;
    const iconY = enemy.y + (enemy.enemyType === 'FLYING' ? 18 : 20);

    if (enemy.poison && enemy.poison.remaining > 0) {
      ctx.fillStyle = 'rgba(39, 174, 96, 0.9)';
      ctx.beginPath();
      ctx.arc(iconX, iconY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('毒', iconX, iconY + 1);
      iconX += 14;

      const pulse = 0.5 + Math.sin(Date.now() / 100) * 0.3;
      ctx.fillStyle = `rgba(39, 174, 96, ${pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    if (enemy.slow && enemy.slow.remaining > 0) {
      ctx.fillStyle = 'rgba(0, 188, 212, 0.9)';
      ctx.beginPath();
      ctx.arc(iconX, iconY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('冰', iconX, iconY + 1);

      ctx.strokeStyle = `rgba(0, 188, 212, ${0.3 + Math.sin(Date.now() / 80) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _renderHitEffect(fx) {
    const ctx = this.ctx;
    const t = 1 - fx.life / fx.maxLife;

    if (fx.isDeath) {
      ctx.strokeStyle = `rgba(255, 200, 0, ${1 - t})`;
      ctx.lineWidth = 3;
      const radius = 10 + t * 25;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 215, 0, ${(1 - t) * 0.5})`;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const dx = Math.cos(angle) * radius * 0.8;
        const dy = Math.sin(angle) * radius * 0.8;
        ctx.fillStyle = `rgba(255, 100, 0, ${1 - t})`;
        ctx.fillRect(fx.x + dx - 2, fx.y + dy - 2, 4, 4);
      }
    }
  }

  resetSpawnState() {
    this.spawnedCount = 0;
    this.spawnedByType = [];
    this.spawnTimer = 0;
  }
}
