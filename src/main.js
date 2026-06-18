import { GameEngine } from './GameEngine.js';
import { MapRenderer } from './MapRenderer.js';
import { TowerManager } from './TowerManager.js';
import { EnemyManager } from './EnemyManager.js';
import { UIController } from './UIController.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 40;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;

const config = {
  tileSize: TILE_SIZE,
  gridWidth: GRID_WIDTH,
  gridHeight: GRID_HEIGHT,
  initialGold: 150,
  initialHealth: 20,
  totalWaves: 3,
  waveCountdown: 10
};

const mapRenderer = new MapRenderer(ctx, config);
const towerManager = new TowerManager(ctx, config, mapRenderer);
const enemyManager = new EnemyManager(ctx, config, mapRenderer);
const uiController = new UIController(config);

const gameEngine = new GameEngine(ctx, config, mapRenderer, towerManager, enemyManager, uiController);

uiController.setGameEngine(gameEngine);
towerManager.setEnemyManager(enemyManager);

gameEngine.start();
