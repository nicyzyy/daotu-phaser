import { ChunkManager } from '../systems/ChunkManager.js';

const TILE_SIZE = 32;

function colorByFaction(factionId) {
  const map = {
    qingyun: 0x2aa876,
    yunmeng_pref: 0x3e7cb1,
    sihai_guild: 0xd4a017,
    clans_union: 0x7b5ea7,
    gray_market: 0x9c2f2f
  };
  return map[factionId] || 0x607d8b;
}

export class SouthContinentScene extends Phaser.Scene {
  constructor() {
    super('SouthContinentScene');
  }

  create(data) {
    this.meta = data.meta;
    this.poi = data.poi;
    this.encounters = data.encounters;
    this.factions = data.factions;

    this.cameras.main.setBackgroundColor('#0f172a');
    this.debugText = this.add.text(20, 20, '南瞻部洲加载中…', { fontSize: '16px', color: '#e2e8f0' }).setScrollFactor(0).setDepth(999);

    try {
      this.drawBackdrop();
      this.drawRegionGrid();
      this.drawConnections();
      this.drawTerrainDetails();
      this.drawPOI();
      this.drawFactionLegend();
      this.drawTitle();

      this.chunkManager = new ChunkManager(this, this.meta);

      this.player = this.add.circle(180 * TILE_SIZE, 170 * TILE_SIZE, 12, 0xffffff, 1).setDepth(8);
      this.player.setStrokeStyle(3, 0x38bdf8, 0.9);
      this.playerLabel = this.add.text(this.player.x + 14, this.player.y - 24, '你', { fontSize: '14px', color: '#ffffff', backgroundColor: '#0f172aaa', padding: { x: 4, y: 2 } }).setDepth(8);
      this.playerTrail = this.add.graphics().setDepth(7);
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');

      this.cameras.main.setZoom(0.65);
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

      this.input.keyboard.on('keydown-M', () => {
        this.toggleEncounterOverlay();
      });

      this.encounterLayerVisible = false;
      this.drawEncounterOverlay();
      this.debugText.setVisible(false);
    } catch (e) {
      console.error('SouthContinentScene create failed:', e);
      this.debugText.setText(`地图加载失败: ${e.message}`);
      this.debugText.setColor('#fca5a5');
    }
  }

  drawBackdrop() {
    const { widthTiles, heightTiles } = this.meta.world;
    const g = this.add.graphics().setDepth(-10);

    g.fillGradientStyle(0x10243f, 0x0f3658, 0x1f4f6d, 0x173d56, 1);
    g.fillRect(0, 0, widthTiles * TILE_SIZE, heightTiles * TILE_SIZE);

    // terrain strokes + macro grid so scene doesn't look empty
    g.lineStyle(2, 0x2c5f7c, 0.28);
    for (let i = 0; i < 200; i++) {
      const x = 200 + i * 160;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 1200, heightTiles * TILE_SIZE);
      g.strokePath();
    }

    g.lineStyle(1, 0x93c5fd, 0.12);
    const step = 1024;
    for (let x = 0; x <= widthTiles * TILE_SIZE; x += step) g.lineBetween(x, 0, x, heightTiles * TILE_SIZE);
    for (let y = 0; y <= heightTiles * TILE_SIZE; y += step) g.lineBetween(0, y, widthTiles * TILE_SIZE, y);
  }

  drawConnections() {
    const g = this.add.graphics().setDepth(-1);
    g.lineStyle(6, 0xfde68a, 0.25);

    const regionCenter = new Map(this.meta.regions.map((r) => [
      r.id,
      {
        x: (r.xTiles + r.widthTiles / 2) * TILE_SIZE,
        y: (r.yTiles + r.heightTiles / 2) * TILE_SIZE
      }
    ]));

    this.meta.connections.forEach(([a, b]) => {
      const p1 = regionCenter.get(a);
      const p2 = regionCenter.get(b);
      if (!p1 || !p2) return;
      g.beginPath();
      g.moveTo(p1.x, p1.y);
      g.lineTo(p2.x, p2.y);
      g.strokePath();
    });
  }

  drawTerrainDetails() {
    const mountain = this.add.graphics().setDepth(-2);
    const river = this.add.graphics().setDepth(-1);
    const biome = this.add.graphics().setDepth(-3);

    // biome patches
    biome.fillStyle(0x14532d, 0.22);
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(1200, 31000);
      const y = Phaser.Math.Between(1200, 31000);
      biome.fillEllipse(x, y, Phaser.Math.Between(800, 2600), Phaser.Math.Between(500, 1700));
    }

    mountain.fillStyle(0x1f2937, 0.36);
    for (let i = 0; i < 160; i++) {
      const x = Phaser.Math.Between(0, this.meta.world.widthTiles * TILE_SIZE);
      const y = Phaser.Math.Between(0, this.meta.world.heightTiles * TILE_SIZE);
      const r = Phaser.Math.Between(90, 220);
      mountain.fillTriangle(x - r, y + r * 0.6, x, y - r, x + r, y + r * 0.6);
    }

    river.lineStyle(14, 0x38bdf8, 0.35);
    const points = [
      [300, 900], [2800, 1200], [6200, 7000], [10000, 9000],
      [14000, 11500], [21000, 17000], [29000, 22000], [30000, 24500], [32000, 28000], [32700, 32000]
    ];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      river.lineBetween(x1, y1, x2, y2);
    }
  }

  drawTitle() {
    this.add.text(24, 20, '道途 · 南瞻部洲（Phaser 原型）', {
      fontSize: '24px',
      color: '#e2e8f0'
    }).setScrollFactor(0);

    this.add.text(24, 52, 'WASD/方向键移动角色 · M 键切换奇遇层', {
      fontSize: '14px',
      color: '#94a3b8'
    }).setScrollFactor(0);

    this.hudText = this.add.text(24, 74, '', {
      fontSize: '13px',
      color: '#cbd5e1'
    }).setScrollFactor(0);
  }

  drawRegionGrid() {
    const { world, regions } = this.meta;
    const mapWidthPx = world.widthTiles * TILE_SIZE;
    const mapHeightPx = world.heightTiles * TILE_SIZE;

    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);

    regions.forEach((region) => {
      const x = region.xTiles * TILE_SIZE;
      const y = region.yTiles * TILE_SIZE;
      const w = region.widthTiles * TILE_SIZE;
      const h = region.heightTiles * TILE_SIZE;

      const rect = this.add.rectangle(x, y, w, h, colorByFaction(region.controlFaction), 0.18)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0xe2e8f0, 0.8)
        .setDepth(-6);

      const label = this.add.text(x + 12, y + 12, region.name, {
        fontSize: '22px',
        color: '#f8fafc',
        backgroundColor: '#0f172aaa',
        padding: { x: 6, y: 4 }
      }).setDepth(3);

      rect.setData('regionId', region.id);
      label.setDepth(3);
    });

    const centerX = mapWidthPx / 2;
    const centerY = mapHeightPx / 2;
    this.cameras.main.centerOn(centerX, centerY);
  }

  drawPOI() {
    this.poi.items.forEach((p) => {
      const x = p.tileX * TILE_SIZE;
      const y = p.tileY * TILE_SIZE;

      const ring = this.add.circle(x, y, 12, 0xffffff, 0.08).setDepth(3);
      const dot = this.add.circle(x, y, 7, 0xf8fafc, 1).setStrokeStyle(2, 0x0f172a).setDepth(4);
      dot.setInteractive({ useHandCursor: true });

      this.tweens.add({
        targets: ring,
        scale: { from: 0.8, to: 1.5 },
        alpha: { from: 0.28, to: 0.05 },
        duration: 1400,
        repeat: -1,
        ease: 'Sine.easeOut'
      });

      dot.on('pointerover', () => {
        const tips = [p.name, `类型: ${p.type}`, `区域: ${p.regionId}`].join('\n');
        this.showTooltip(x + 12, y - 12, tips);
      });
      dot.on('pointerout', () => this.hideTooltip());
    });
  }

  drawEncounterOverlay() {
    this.encounterGraphics = this.add.graphics();
    this.encounterGraphics.setDepth(1);
    this.encounterGraphics.setVisible(false);

    this.encounters.items.forEach((e) => {
      const x = e.tileX * TILE_SIZE;
      const y = e.tileY * TILE_SIZE;
      const radius = e.rarity === 'rare' ? 18 : e.rarity === 'conditional' ? 14 : 10;
      const color = e.rarity === 'rare' ? 0xf97316 : e.rarity === 'conditional' ? 0x22d3ee : 0xa3e635;

      this.encounterGraphics.fillStyle(color, 0.25);
      this.encounterGraphics.fillCircle(x, y, radius);
      this.encounterGraphics.lineStyle(1, color, 0.8);
      this.encounterGraphics.strokeCircle(x, y, radius);
    });
  }

  toggleEncounterOverlay() {
    this.encounterLayerVisible = !this.encounterLayerVisible;
    this.encounterGraphics.setVisible(this.encounterLayerVisible);
  }

  drawFactionLegend() {
    const legend = this.add.container(24, 86).setScrollFactor(0);
    const bg = this.add.rectangle(0, 0, 320, 160, 0x020617, 0.7).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
    legend.add(bg);

    this.add.text(10, 8, '势力图例', { fontSize: '14px', color: '#e2e8f0' }).setScrollFactor(0);

    let idx = 0;
    this.factions.items.forEach((f) => {
      const y = 32 + idx * 24;
      const swatch = this.add.rectangle(16, 12 + y, 12, 12, colorByFaction(f.id), 0.9).setOrigin(0, 0);
      const txt = this.add.text(36, y, f.name, { fontSize: '13px', color: '#cbd5e1' }).setScrollFactor(0);
      legend.add(swatch);
      legend.add(txt);
      idx += 1;
    });
  }

  showTooltip(x, y, text) {
    this.hideTooltip();
    const pad = 8;
    const label = this.add.text(x, y, text, {
      fontSize: '12px',
      color: '#e2e8f0',
      backgroundColor: '#111827',
      padding: { x: pad, y: pad }
    }).setDepth(100);
    this.tooltip = label;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  getCurrentRegionName() {
    const tileX = this.player.x / TILE_SIZE;
    const tileY = this.player.y / TILE_SIZE;
    const hit = this.meta.regions.find((r) => (
      tileX >= r.xTiles && tileX <= r.xTiles + r.widthTiles &&
      tileY >= r.yTiles && tileY <= r.yTiles + r.heightTiles
    ));
    return hit ? hit.name : '荒野地带';
  }

  update(_, delta) {
    if (!this.player) return;

    const speed = 0.35 * delta;
    const moveLeft = this.cursors.left.isDown || this.wasd.A.isDown;
    const moveRight = this.cursors.right.isDown || this.wasd.D.isDown;
    const moveUp = this.cursors.up.isDown || this.wasd.W.isDown;
    const moveDown = this.cursors.down.isDown || this.wasd.S.isDown;

    if (moveLeft) this.player.x -= speed;
    if (moveRight) this.player.x += speed;
    if (moveUp) this.player.y -= speed;
    if (moveDown) this.player.y += speed;

    const maxX = this.meta.world.widthTiles * TILE_SIZE;
    const maxY = this.meta.world.heightTiles * TILE_SIZE;
    this.player.x = Phaser.Math.Clamp(this.player.x, 0, maxX);
    this.player.y = Phaser.Math.Clamp(this.player.y, 0, maxY);
    this.playerLabel.setPosition(this.player.x + 14, this.player.y - 24);

    this.playerTrail.clear();
    this.playerTrail.lineStyle(2, 0x7dd3fc, 0.5);
    this.playerTrail.strokeCircle(this.player.x, this.player.y, 18 + Math.sin(this.time.now / 180) * 2);

    const regionName = this.getCurrentRegionName();
    this.hudText.setText(`当前位置：${Math.floor(this.player.x / TILE_SIZE)}, ${Math.floor(this.player.y / TILE_SIZE)} · 区域：${regionName}`);

    this.chunkManager.update(this.cameras.main);
  }
}
