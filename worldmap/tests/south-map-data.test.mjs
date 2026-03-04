import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base = path.resolve('src/data');
const meta = JSON.parse(fs.readFileSync(path.join(base, 'south_continent.meta.json'), 'utf8'));
const poi = JSON.parse(fs.readFileSync(path.join(base, 'south_poi.json'), 'utf8'));
const encounters = JSON.parse(fs.readFileSync(path.join(base, 'south_encounters.json'), 'utf8'));
const factions = JSON.parse(fs.readFileSync(path.join(base, 'south_factions.json'), 'utf8'));

test('world and chunk dimensions are valid', () => {
  assert.equal(meta.world.widthTiles, 1024);
  assert.equal(meta.world.heightTiles, 1024);
  assert.equal(meta.chunks.chunkSizeTiles * meta.chunks.cols, meta.world.widthTiles);
  assert.equal(meta.chunks.chunkSizeTiles * meta.chunks.rows, meta.world.heightTiles);
});

test('all region control factions are declared', () => {
  const factionIds = new Set(factions.items.map(f => f.id));
  for (const region of meta.regions) {
    assert.ok(factionIds.has(region.controlFaction), `missing faction: ${region.controlFaction}`);
  }
});

test('poi region references are valid', () => {
  const regionIds = new Set(meta.regions.map(r => r.id));
  for (const p of poi.items) {
    assert.ok(regionIds.has(p.regionId), `invalid poi region: ${p.id} -> ${p.regionId}`);
  }
});

test('encounter data has valid rarity and weight', () => {
  const regionIds = new Set(meta.regions.map(r => r.id));
  const allowed = new Set(['common', 'conditional', 'rare']);
  for (const e of encounters.items) {
    assert.ok(regionIds.has(e.regionId), `invalid encounter region: ${e.id} -> ${e.regionId}`);
    assert.ok(allowed.has(e.rarity), `invalid rarity: ${e.rarity}`);
    assert.ok(Number.isFinite(e.weight) && e.weight > 0, `invalid weight: ${e.id}`);
  }
});
