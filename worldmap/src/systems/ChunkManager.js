export class ChunkManager {
  constructor(scene, meta) {
    this.scene = scene;
    this.meta = meta;
    this.loaded = new Set();
    this.chunkGraphics = new Map();
  }

  update(camera) {
    const tileSize = this.meta.world.tileSize;
    const chunkSize = this.meta.chunks.chunkSizeTiles * tileSize;

    const minCol = Math.max(0, Math.floor(camera.worldView.x / chunkSize) - 1);
    const maxCol = Math.min(this.meta.chunks.cols - 1, Math.floor((camera.worldView.right) / chunkSize) + 1);
    const minRow = Math.max(0, Math.floor(camera.worldView.y / chunkSize) - 1);
    const maxRow = Math.min(this.meta.chunks.rows - 1, Math.floor((camera.worldView.bottom) / chunkSize) + 1);

    const shouldBeLoaded = new Set();

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${row}_${col}`;
        shouldBeLoaded.add(key);
        if (!this.loaded.has(key)) this.loadChunk(row, col, chunkSize, key);
      }
    }

    for (const key of this.loaded) {
      if (!shouldBeLoaded.has(key)) this.unloadChunk(key);
    }
  }

  loadChunk(row, col, chunkSize, key) {
    this.loaded.add(key);

    const x = col * chunkSize;
    const y = row * chunkSize;

    const g = this.scene.add.graphics().setDepth(-1);
    g.lineStyle(1, 0x1e293b, 0.8);
    g.strokeRect(x, y, chunkSize, chunkSize);

    this.chunkGraphics.set(key, g);
  }

  unloadChunk(key) {
    this.loaded.delete(key);
    const g = this.chunkGraphics.get(key);
    if (g) {
      g.destroy();
      this.chunkGraphics.delete(key);
    }
  }
}
