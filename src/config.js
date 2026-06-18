export const TILE_TYPES = {
  GRASS: 0,
  PATH: 1,
  START: 2,
  END: 3
};

export const TOWER_TYPES = {
  ARROW: {
    name: '箭塔',
    cost: 50,
    damage: 10,
    range: 3,
    fireRate: 0.5,
    color: '#3498db',
    darkColor: '#1a5276',
    splashRadius: 0
  },
  CANNON: {
    name: '炮塔',
    cost: 100,
    damage: 35,
    range: 4,
    fireRate: 1.5,
    color: '#e67e22',
    darkColor: '#7e3a00',
    splashRadius: 1.2
  }
};

export const WAVES = [
  { count: 8, hp: 50, speed: 1.0, reward: 10, interval: 1.0 },
  { count: 12, hp: 100, speed: 1.1, reward: 15, interval: 0.8 },
  { count: 18, hp: 180, speed: 1.2, reward: 20, interval: 0.6 }
];

export const GAME_STATE = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  WIN: 'win',
  LOSE: 'lose'
};

export const PATH_COORDS = [
  { x: 0, y: 7 },
  { x: 4, y: 7 },
  { x: 4, y: 3 },
  { x: 9, y: 3 },
  { x: 9, y: 11 },
  { x: 14, y: 11 },
  { x: 14, y: 5 },
  { x: 19, y: 5 }
];
