import {
  TOWER_LEVELS,
  WAVES,
  getWaveTotalCount,
  LEVELS,
  getLevelById,
  GAME_STATE,
  ENEMY_TYPES,
  TOWER_BASE_TYPES
} from '../../src/config.js';

describe('Config Validation', () => {
  describe('塔升级费用递增', () => {
    for (const towerType of Object.keys(TOWER_LEVELS)) {
      describe(`${towerType} 塔`, () => {
        const levels = TOWER_LEVELS[towerType];

        it('should have exactly 3 levels', () => {
          expect(levels.length).toBe(3);
        });

        it('should have upgradeCost that is positive for non-max levels', () => {
          for (let i = 0; i < levels.length - 1; i++) {
            expect(levels[i].upgradeCost).toBeGreaterThan(0);
          }
        });

        it('should have upgradeCost = 0 for max level', () => {
          expect(levels[levels.length - 1].upgradeCost).toBe(0);
        });

        it('should have increasing upgradeCost from Lv1 to Lv2', () => {
          const cost1 = levels[0].upgradeCost;
          const cost2 = levels[1].upgradeCost;
          expect(cost2).toBeGreaterThan(cost1);
        });
      });
    }
  });

  describe('每级属性数值合理', () => {
    for (const towerType of Object.keys(TOWER_LEVELS)) {
      describe(`${towerType} 塔`, () => {
        const levels = TOWER_LEVELS[towerType];

        it('should have damage > 0 for every level', () => {
          for (const lvl of levels) {
            expect(lvl.damage).toBeGreaterThan(0);
          }
        });

        it('should have range > 0 for every level', () => {
          for (const lvl of levels) {
            expect(lvl.range).toBeGreaterThan(0);
          }
        });

        it('should have fireRate > 0 for every level', () => {
          for (const lvl of levels) {
            expect(lvl.fireRate).toBeGreaterThan(0);
          }
        });

        it('should have damage non-decreasing across levels', () => {
          for (let i = 1; i < levels.length; i++) {
            expect(levels[i].damage).toBeGreaterThanOrEqual(levels[i - 1].damage);
          }
        });

        it('should have range non-decreasing across levels', () => {
          for (let i = 1; i < levels.length; i++) {
            expect(levels[i].range).toBeGreaterThanOrEqual(levels[i - 1].range);
          }
        });

        it('should have valid canHitFlying (boolean)', () => {
          for (const lvl of levels) {
            expect(typeof lvl.canHitFlying).toBe('boolean');
          }
        });

        it('should have splashRadius >= 0', () => {
          for (const lvl of levels) {
            expect(lvl.splashRadius).toBeGreaterThanOrEqual(0);
          }
        });

        it('should have multiShot >= 1', () => {
          for (const lvl of levels) {
            expect(lvl.multiShot).toBeGreaterThanOrEqual(1);
          }
        });

        it('should have level numbers 1, 2, 3', () => {
          for (let i = 0; i < levels.length; i++) {
            expect(levels[i].level).toBe(i + 1);
          }
        });
      });
    }
  });

  describe('波次配置中敌人数量递增', () => {
    it('should have 3 waves total', () => {
      expect(WAVES.length).toBe(3);
    });

    it('should have increasing total enemy count per wave', () => {
      const counts = WAVES.map((_, i) => getWaveTotalCount(i));
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThan(counts[i - 1]);
      }
    });

    it('should have valid enemy configs in each wave', () => {
      for (const wave of WAVES) {
        for (const grp of wave.enemies) {
          expect(grp.count).toBeGreaterThan(0);
          expect(grp.hp).toBeGreaterThan(0);
          expect(grp.speed).toBeGreaterThan(0);
          expect(grp.reward).toBeGreaterThan(0);
          expect([ENEMY_TYPES.GROUND, ENEMY_TYPES.FLYING]).toContain(grp.type);
        }
      }
    });

    it('should have decreasing spawn interval per wave', () => {
      for (let i = 1; i < WAVES.length; i++) {
        expect(WAVES[i].interval).toBeLessThanOrEqual(WAVES[i - 1].interval);
      }
    });

    it('should have increasing HP for ground enemies across waves', () => {
      const groundHps = WAVES.map(wave => {
        const g = wave.enemies.find(e => e.type === ENEMY_TYPES.GROUND);
        return g ? g.hp : 0;
      });
      for (let i = 1; i < groundHps.length; i++) {
        if (groundHps[i] > 0 && groundHps[i - 1] > 0) {
          expect(groundHps[i]).toBeGreaterThan(groundHps[i - 1]);
        }
      }
    });

    it('wave 2 and 3 should include flying enemies', () => {
      for (let i = 1; i < WAVES.length; i++) {
        const hasFlying = WAVES[i].enemies.some(e => e.type === ENEMY_TYPES.FLYING);
        expect(hasFlying).toBe(true);
      }
    });

    it('wave 1 should only have ground enemies', () => {
      const allGround = WAVES[0].enemies.every(e => e.type === ENEMY_TYPES.GROUND);
      expect(allGround).toBe(true);
    });
  });

  describe('关卡配置', () => {
    it('should have at least 2 levels', () => {
      expect(LEVELS.length).toBeGreaterThanOrEqual(2);
    });

    it('each level should have valid pathCoords', () => {
      for (const level of LEVELS) {
        expect(level.pathCoords.length).toBeGreaterThanOrEqual(2);
        for (const pt of level.pathCoords) {
          expect(typeof pt.x).toBe('number');
          expect(typeof pt.y).toBe('number');
          expect(pt.x).toBeGreaterThanOrEqual(0);
          expect(pt.y).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('each level should have positive initialGold and initialHealth', () => {
      for (const level of LEVELS) {
        expect(level.initialGold).toBeGreaterThan(0);
        expect(level.initialHealth).toBeGreaterThan(0);
      }
    });

    it('getLevelById should return correct level', () => {
      const lvl1 = getLevelById(1);
      expect(lvl1.id).toBe(1);
      expect(lvl1.name).toBe('草原之路');
    });

    it('getLevelById should return first level for invalid id', () => {
      const fallback = getLevelById(999);
      expect(fallback.id).toBe(1);
    });

    it('GAME_STATE should have all required states', () => {
      expect(GAME_STATE.WAITING).toBeDefined();
      expect(GAME_STATE.PLAYING).toBeDefined();
      expect(GAME_STATE.WIN).toBeDefined();
      expect(GAME_STATE.LOSE).toBeDefined();
    });
  });
});
