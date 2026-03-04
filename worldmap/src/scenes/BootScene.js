export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.json('south_meta', './src/data/south_continent.meta.json');
    this.load.json('south_poi', './src/data/south_poi.json');
    this.load.json('south_encounters', './src/data/south_encounters.json');
    this.load.json('south_factions', './src/data/south_factions.json');
  }

  create() {
    this.scene.start('SouthContinentScene', {
      meta: this.cache.json.get('south_meta'),
      poi: this.cache.json.get('south_poi'),
      encounters: this.cache.json.get('south_encounters'),
      factions: this.cache.json.get('south_factions')
    });
  }
}
