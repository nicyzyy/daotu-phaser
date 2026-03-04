export class SouthContinentScene extends Phaser.Scene {
  constructor() {
    super('SouthContinentScene');
  }

  create(data) {
    const map = this.make.tilemap({ key: 'nanzhan_map' });
    const tileset = map.addTilesetImage('nanzhan_tileset', 'nanzhan_tiles');

    this.layers = {
      ground: map.createLayer('ground', tileset, 0, 0),
      biome: map.createLayer('biome', tileset, 0, 0),
      water: map.createLayer('water', tileset, 0, 0),
      mountains: map.createLayer('mountains', tileset, 0, 0),
      roads: map.createLayer('roads', tileset, 0, 0),
      collision: map.createLayer('collision', tileset, 0, 0)
    };

    this.layers.collision.setVisible(false);
    this.layers.collision.setCollision([13]);

    const spawnX = 36 * map.tileWidth;
    const spawnY = 64 * map.tileHeight;
    this.player = this.physics.add.sprite(spawnX, spawnY, null)
      .setDisplaySize(18, 22)
      .setTint(0xf8fafc);
    this.player.body.setSize(18, 22);

    this.playerHalo = this.add.circle(spawnX, spawnY + 8, 14, 0x38bdf8, 0.2).setDepth(5);
    this.physics.add.collider(this.player, this.layers.collision);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1.15);

    this.poi = data.poi?.items || [];
    this.encounters = data.encounters?.items || [];
    this.drawPoiMarkers(map.tileWidth, map.tileHeight);

    this.uiTitle = this.add.text(20, 20, '南瞻部洲大地图（Tilemap版）', {
      fontSize: '22px', color: '#e2e8f0', backgroundColor: '#0f172acc', padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(20);

    this.uiHint = this.add.text(20, 56, 'WASD/方向键移动 · M切换奇遇层', {
      fontSize: '13px', color: '#cbd5e1'
    }).setScrollFactor(0).setDepth(20);

    this.uiPos = this.add.text(20, 76, '', {
      fontSize: '13px', color: '#7dd3fc'
    }).setScrollFactor(0).setDepth(20);

    this.encounterVisible = true;
    this.input.keyboard.on('keydown-M', () => {
      this.encounterVisible = !this.encounterVisible;
      this.encounterContainer.setVisible(this.encounterVisible);
    });
  }

  drawPoiMarkers(tileW, tileH) {
    this.poiContainer = this.add.container(0, 0).setDepth(10);
    this.encounterContainer = this.add.container(0, 0).setDepth(9);

    this.poi.forEach((p) => {
      const x = p.tileX * tileW;
      const y = p.tileY * tileH;
      const dot = this.add.circle(x, y, 6, 0xffffff, 0.95).setStrokeStyle(2, 0x111827, 1);
      const pulse = this.add.circle(x, y, 11, 0xffffff, 0.12);
      this.tweens.add({ targets: pulse, scale: { from: 0.8, to: 1.5 }, alpha: { from: 0.35, to: 0.05 }, duration: 1400, repeat: -1 });
      this.poiContainer.add([pulse, dot]);
    });

    this.encounters.forEach((e) => {
      const x = e.tileX * tileW;
      const y = e.tileY * tileH;
      const color = e.rarity === 'rare' ? 0xf97316 : e.rarity === 'conditional' ? 0x22d3ee : 0xa3e635;
      const ring = this.add.circle(x, y, 8, color, 0.12).setStrokeStyle(1, color, 0.8);
      this.encounterContainer.add(ring);
    });
  }

  update(_, delta) {
    if (!this.player) return;
    const speed = 150;
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed;

    this.player.setVelocity(vx, vy);

    this.playerHalo.x = this.player.x;
    this.playerHalo.y = this.player.y + 8;
    this.playerHalo.radius = 14 + Math.sin(this.time.now / 180) * 1.5;

    this.uiPos.setText(`坐标: ${Math.floor(this.player.x / 32)}, ${Math.floor(this.player.y / 32)}`);
  }
}
