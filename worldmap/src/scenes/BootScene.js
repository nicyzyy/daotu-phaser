export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('nanzhan_tiles', './assets/tilesets/nanzhan_tileset.svg');
    this.load.tilemapTiledJSON('nanzhan_map', './assets/tilemaps/nanzhan_worldmap.json');
    this.load.json('south_poi', './src/data/south_poi.json');
    this.load.json('south_encounters', './src/data/south_encounters.json');
  }

  create() {
    this.scene.start('SouthContinentScene', {
      poi: this.cache.json.get('south_poi'),
      encounters: this.cache.json.get('south_encounters')
    });
  }
}
