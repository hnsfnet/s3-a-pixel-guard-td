import { GameEngine } from './core/GameEngine.js';
import { UIController } from './core/UIController.js';
import { MapRenderer } from './core/MapRenderer.js';
import { WAVES } from './config.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas element #game-canvas not found!');
    return;
  }

  const gameConfig = {
    totalWaves: WAVES.length
  };

  const gameEngine = new GameEngine(canvas, gameConfig);
  gameEngine.init();

  const uiController = new UIController(gameEngine, canvas);
  const mapRenderer = new MapRenderer(gameEngine);

  gameEngine.start();

  window.gameEngine = gameEngine;
  window.uiController = uiController;
  window.mapRenderer = mapRenderer;

  console.log('[像素守卫-ECS版] 初始化完成！');
  console.log('可用调试: gameEngine, uiController, mapRenderer');
  console.log('关卡数量:', gameEngine.currentLevel.name);
});
