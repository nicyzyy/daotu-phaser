import { BootScene } from './scenes/BootScene.js';
import { SouthContinentScene } from './scenes/SouthContinentScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0b1020',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [BootScene, SouthContinentScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
