const LEVELS_DATA = {
  "levels": [
    {
      "id": 1, "name": "草原之路", "gridWidth": 20, "gridHeight": 15, "tileSize": 40,
      "pathCoords": [
        { "x": 0, "y": 7 }, { "x": 4, "y": 7 }, { "x": 4, "y": 3 }, { "x": 9, "y": 3 },
        { "x": 9, "y": 11 }, { "x": 14, "y": 11 }, { "x": 14, "y": 5 }, { "x": 19, "y": 5 }
      ],
      "buildableExclude": [], "initialGold": 150, "initialHealth": 20,
      "waveCountdown": 10, "theme": "grass"
    },
    {
      "id": 2, "name": "S形峡谷", "gridWidth": 20, "gridHeight": 15, "tileSize": 40,
      "pathCoords": [
        { "x": 0, "y": 2 }, { "x": 15, "y": 2 }, { "x": 15, "y": 7 },
        { "x": 3, "y": 7 }, { "x": 3, "y": 12 }, { "x": 19, "y": 12 }
      ],
      "buildableExclude": [], "initialGold": 200, "initialHealth": 20,
      "waveCountdown": 10, "theme": "desert"
    },
    {
      "id": 3, "name": "Z形险道", "gridWidth": 20, "gridHeight": 15, "tileSize": 40,
      "pathCoords": [
        { "x": 0, "y": 1 }, { "x": 6, "y": 1 }, { "x": 6, "y": 7 }, { "x": 13, "y": 7 },
        { "x": 13, "y": 1 }, { "x": 17, "y": 1 }, { "x": 17, "y": 13 }, { "x": 19, "y": 13 }
      ],
      "buildableExclude": [], "initialGold": 180, "initialHealth": 18,
      "waveCountdown": 8, "theme": "snow"
    }
  ],
  "defaultLevelId": 1
};

export const TILE_TYPES = {
  GRASS: 0,
  PATH: 1,
  START: 2,
  END: 3
};

export const ENEMY_TYPES = {
  GROUND: 'GROUND',
  FLYING: 'FLYING'
};

export const TOWER_BASE_TYPES = {
  ARROW: 'ARROW',
  CANNON: 'CANNON'
};

export const TOWER_LEVELS = {
  ARROW: [
    { level: 1, name: '箭塔', cost: 50, upgradeCost: 80, damage: 10, range: 3, fireRate: 0.5,
      color: '#3498db', darkColor: '#1a5276', splashRadius: 0, multiShot: 1,
      poisonDps: 0, poisonDuration: 0, slowPercent: 0, slowDuration: 0, canHitFlying: true,
      description: '基础箭塔，攻速快、伤害低、射程短' },
    { level: 2, name: '连弩塔', upgradeCost: 150, damage: 12, range: 3.2, fireRate: 0.5,
      color: '#8e44ad', darkColor: '#5b2c6f', splashRadius: 0, multiShot: 2,
      poisonDps: 0, poisonDuration: 0, slowPercent: 0, slowDuration: 0, canHitFlying: true,
      description: '一次射出两支箭，火力翻倍' },
    { level: 3, name: '毒箭塔', upgradeCost: 0, damage: 15, range: 3.5, fireRate: 0.45,
      color: '#27ae60', darkColor: '#145a32', splashRadius: 0, multiShot: 2,
      poisonDps: 8, poisonDuration: 3, slowPercent: 0, slowDuration: 0, canHitFlying: true,
      description: '命中附加毒素，持续掉血3秒' }
  ],
  CANNON: [
    { level: 1, name: '炮塔', cost: 100, upgradeCost: 120, damage: 35, range: 4, fireRate: 1.5,
      color: '#e67e22', darkColor: '#7e3a00', splashRadius: 1.2, multiShot: 1,
      poisonDps: 0, poisonDuration: 0, slowPercent: 0, slowDuration: 0, canHitFlying: false,
      description: '基础炮塔，攻速慢、伤害高、范围溅射' },
    { level: 2, name: '火焰炮', upgradeCost: 200, damage: 45, range: 4.2, fireRate: 1.4,
      color: '#c0392b', darkColor: '#641e16', splashRadius: 2.4, multiShot: 1,
      poisonDps: 0, poisonDuration: 0, slowPercent: 0, slowDuration: 0, canHitFlying: false,
      description: '溅射范围翻倍，燃烧一切' },
    { level: 3, name: '冰冻炮', upgradeCost: 0, damage: 55, range: 4.5, fireRate: 1.3,
      color: '#00bcd4', darkColor: '#006064', splashRadius: 2.4, multiShot: 1,
      poisonDps: 0, poisonDuration: 0, slowPercent: 0.5, slowDuration: 2, canHitFlying: false,
      description: '命中减速50%，持续2秒' }
  ]
};

export const TOWER_TYPES = {
  ARROW: TOWER_LEVELS.ARROW[0],
  CANNON: TOWER_LEVELS.CANNON[0]
};

export const WAVES = [
  { interval: 1.0, enemies: [
    { type: 'GROUND', count: 8, hp: 50, speed: 1.0, reward: 10 }
  ]},
  { interval: 0.85, enemies: [
    { type: 'GROUND', count: 10, hp: 100, speed: 1.1, reward: 15 },
    { type: 'FLYING', count: 4, hp: 50, speed: 1.65, reward: 20 }
  ]},
  { interval: 0.65, enemies: [
    { type: 'GROUND', count: 14, hp: 180, speed: 1.2, reward: 20 },
    { type: 'FLYING', count: 8, hp: 90, speed: 1.8, reward: 30 }
  ]}
];

export function getWaveTotalCount(waveIndex) {
  const wave = WAVES[waveIndex];
  if (!wave) return 0;
  return wave.enemies.reduce((sum, e) => sum + e.count, 0);
}

export const GAME_STATE = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  WIN: 'win',
  LOSE: 'lose'
};

export const LEVELS = LEVELS_DATA.levels;
export const DEFAULT_LEVEL_ID = LEVELS_DATA.defaultLevelId;

export function getLevelById(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0];
}
