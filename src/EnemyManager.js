import { WAVES } from './config.js';

let enemyIdCounter = 0;

export class EnemyManager {
  constructor(ctx, config, mapRenderer) {
    this.ctx = ctx;
    this.config = config;
    this.mapRenderer = mapRenderer;
    this.tileSize = config.tileSize;
    this.enemies = [];
    this.spawnedCount = 0;
    this.spawnTimer = 0;
    this.hitEffects = [];
  }

  update(dt, waveIndex, gameEngine) {
    const waveConfig = WAVES[waveIndex - 1];
    if (!waveConfig) return;

    if (this.spawnedCount < waveConfig.count) {
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
      this._moveEnemy(enemy, dt, waveConfig);

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
    const startPos = this.mapRenderer.getPositionOnPath(0);
    const baseHp = waveConfig.hp;
    const hpVariation = 0.9 + Math.random() * 0.2;

    this.enemies.push({
      id: ++enemyIdCounter,
      x: startPos.x,
      y: startPos.y,
      hp: Math.round(baseHp * hpVariation),
      maxHp: Math.round(baseHp * hpVariation),
      speed: waveConfig.speed,
      reward: waveConfig.reward,
      progress: 0,
      hitFlash: 0
    });
  }

  _moveEnemy(enemy, dt, waveConfig) {
    const pathLength = this.mapRenderer.totalPathLength;
    const pixelsPerSecond = waveConfig.speed * this.tileSize * 1.5;
    enemy.progress += (pixelsPerSecond / pathLength) * dt;

    if (enemy.progress > 1) enemy.progress = 1;

    const pos = this.mapRenderer.getPositionOnPath(enemy.progress);
    enemy.x = pos.x;
    enemy.y = pos.y;

    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
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
      this._renderEnemy(enemy);
    }

    for (const fx of this.hitEffects) {
      this._renderHitEffect(fx);
    }
  }

  _renderEnemy(enemy) {
    const ctx = this.ctx;
    const { x, y, hp, maxHp } = enemy;
    const size = 26;

    const hpRatio = enemy.hp / enemy.maxHp;
    if (hpRatio > 0.6) {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffaaaa' : '#27ae60';
    } else if (hpRatio > 0.3) {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffaaaa' : '#f39c12';
    } else {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffaaaa' : '#e74c3c';
    }

    ctx.fillRect(x - size / 2, y - size / 2, size, size);

    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : '#1e8449';
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

    const barWidth = size + 4;
    const barHeight = 5;
    const barX = x - barWidth / 2;
    const barY = y - size / 2 - 12;

    ctx.fillStyle = '#222';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    ctx.fillStyle = '#444';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    let hpColor = '#2ecc71';
    if (hpRatio <= 0.3) hpColor = '#e74c3c';
    else if (hpRatio <= 0.6) hpColor = '#f39c12';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
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
}
