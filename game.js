/* ═══════════════════════════════════════════════════════
   道途 — Phaser 3 ATB 战斗系统 V3 (增强动画版)
   ═══════════════════════════════════════════════════════ */

// ─── Data Classes ───
class SkillData {
  constructor(name, desc, mpCost, power, targetType = 'single', damageType = 'physical') {
    this.name = name;
    this.desc = desc;
    this.mpCost = mpCost;
    this.power = power;
    this.targetType = targetType;
    this.damageType = damageType;
  }
}

class BattleUnit {
  constructor(name, isPlayer, stats) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.maxHp = stats.hp; this.hp = stats.hp;
    this.maxMp = stats.mp; this.mp = stats.mp;
    this.attack = stats.attack;
    this.defense = stats.defense;
    this.agility = stats.agility;
    this.spirit = stats.spirit;
    this.realm = stats.realm || '';
    this.skills = stats.skills || [];
    this.atb = 0;
    this.isDead = false;
  }
  getAtbSpeed() { return 1.0 + this.agility / 100.0; }
  takeDamage(dmg) {
    const actual = Math.max(1, dmg - Math.floor(this.defense / 2));
    this.hp = Math.max(0, this.hp - actual);
    if (this.hp <= 0) this.isDead = true;
    return actual;
  }
  useMp(cost) {
    if (this.mp >= cost) { this.mp -= cost; return true; }
    return false;
  }
}

// ─── Config ───
const SPRITE_MAP = {
  '剑修·云逸': 'yunyi', '丹修·灵溪': 'lingxi',
  '妖狼': 'wolf', '毒蛇精': 'snake', '石魔': 'golem',
};

const SKILL_ICONS = {
  '御剑术': '⚔️', '万剑归宗': '🗡️', '聚灵诀': '💠',
  '灵火术': '🔥', '天火焚原': '🌋', '回春术': '🌿',
};

// ─── 纵列站位系统 ───
// 支持双方各 5 人，分前排(2)和后排(3)
// 我方在左侧面向右，敌方在右侧面向左
// row: 'front'=前排(靠中间), 'back'=后排(靠边)
const CHAR_HEIGHT = 200; // 所有角色统一显示高度(CSS px) — 加大确保2K清晰

// 我方站位 (左侧) — 角色更靠中间，战场感更强
const ALLY_SLOTS = [
  // 前排 (靠中间)
  { x: 0.30, y: 0.40, row: 'front' },
  { x: 0.28, y: 0.56, row: 'front' },
  // 后排
  { x: 0.16, y: 0.33, row: 'back' },
  { x: 0.14, y: 0.48, row: 'back' },
  { x: 0.16, y: 0.63, row: 'back' },
];

// 敌方站位 (右侧)
const ENEMY_SLOTS = [
  { x: 0.70, y: 0.40, row: 'front' },
  { x: 0.72, y: 0.56, row: 'front' },
  { x: 0.84, y: 0.33, row: 'back' },
  { x: 0.86, y: 0.48, row: 'back' },
  { x: 0.84, y: 0.63, row: 'back' },
];

const GW = 1280, GH = 720;
// HiDPI: 确保 2K+ 显示器上清晰渲染
// Windows 2K 屏幕 devicePixelRatio 常为1，但实际需要2倍渲染
const screenDPR = window.devicePixelRatio || 1;
const screenScale = Math.max(window.screen.width / GW, window.screen.height / GH);
const DPR = Math.min(Math.max(2, Math.ceil(screenDPR), Math.ceil(screenScale)), 4);
const RW = GW * DPR, RH = GH * DPR;

// ─── Battle Scene ───
class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.allUnits = [];
    this.playerUnits = [];
    this.enemyUnits = [];
    this.sprites = {};
    this.basePos = {};
    this.currentUnit = null;
    this.selectedSkill = null;
    this.isWaiting = false;
    this.battleActive = false;
    this.defeatedSet = new Set();
    this.atbSpeed = 30;
  }

  preload() {
    this.load.image('battle_bg', 'assets/bg/battle_bg.png');
    for (const [, folder] of Object.entries(SPRITE_MAP)) {
      for (const pose of ['idle', 'attack', 'cast', 'hit', 'defeated']) {
        this.load.image(`${folder}_${pose}_left`, `assets/sprites/poses/${folder}/${pose}_left.png`);
        this.load.image(`${folder}_${pose}_right`, `assets/sprites/poses/${folder}/${pose}_right.png`);
      }
      this.load.image(`${folder}_portrait`, `assets/sprites/portraits/${folder}.png`);
    }
  }

  create() {
    // ─── Dynamic Background System ───
    // BG cover (render space = RW×RH)
    const bg = this.add.image(RW / 2, RH / 2, 'battle_bg');
    const src = this.textures.get('battle_bg').getSourceImage();
    bg.setScale(Math.max(RW / src.width, RH / src.height)).setDepth(-10);
    // Slow parallax drift
    this.tweens.add({ targets: bg, x: { from: RW / 2 - 6 * DPR, to: RW / 2 + 6 * DPR }, duration: 12000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ─── Ambient Particles ───
    this._createAmbientEffects();

    this._createUnits();
    this._spawnSprites();
    this._buildATB();
    this._buildOverhead();
    this.battleActive = true;
    UI.log('[战] 战斗开始!', 'system');
  }

  // ─── Ambient Scene Effects ───
  _createAmbientEffects() {
    // 1. Floating qi particles (gentle drifting lights)
    this.time.addEvent({
      delay: 800, loop: true,
      callback: () => {
        const x = Phaser.Math.Between(0, RW);
        const y = RH + 10 * DPR;
        const sz = (1.5 + Math.random() * 2.5) * DPR;
        const colors = [0x88ccff, 0xaaddff, 0x66aaee, 0xccddff, 0xffd080];
        const c = colors[Math.floor(Math.random() * colors.length)];
        const p = this.add.circle(x, y, sz, c, 0.15 + Math.random() * 0.25).setDepth(-5);
        const drift = Phaser.Math.Between(-80, 80) * DPR;
        this.tweens.add({
          targets: p,
          x: x + drift,
          y: -20 * DPR,
          alpha: 0,
          duration: 6000 + Math.random() * 4000,
          ease: 'Sine.easeInOut',
          onComplete: () => p.destroy()
        });
      }
    });

    // 2. Ground mist layers (horizontal scrolling fog)
    for (let i = 0; i < 3; i++) {
      const mistY = RH * (0.75 + i * 0.08);
      const mist = this.add.rectangle(RW / 2, mistY, RW * 1.5, 30 * DPR, 0xccddee, 0.04 + i * 0.02).setDepth(-4 + i);
      this.tweens.add({
        targets: mist,
        x: { from: RW / 2 - 100 * DPR, to: RW / 2 + 100 * DPR },
        alpha: { from: mist.alpha * 0.6, to: mist.alpha },
        duration: 8000 + i * 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // 3. Occasional energy spark bursts (random positions)
    this.time.addEvent({
      delay: 3000, loop: true,
      callback: () => {
        const cx = Phaser.Math.Between(RW * 0.2, RW * 0.8);
        const cy = Phaser.Math.Between(RH * 0.3, RH * 0.7);
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = (10 + Math.random() * 20) * DPR;
          const sz = (1 + Math.random() * 1.5) * DPR;
          const s = this.add.circle(cx, cy, sz, 0xffeebb, 0.5).setDepth(-3);
          this.tweens.add({
            targets: s,
            x: cx + Math.cos(a) * sp, y: cy + Math.sin(a) * sp,
            alpha: 0, duration: 500 + Math.random() * 500,
            onComplete: () => s.destroy()
          });
        }
      }
    });

    // 4. Vignette overlay (darkened edges)
    const vig = this.add.graphics().setDepth(-1);
    vig.fillStyle(0x000000, 0.3);
    vig.fillRect(0, 0, RW, 40 * DPR); // top
    vig.fillRect(0, RH - 30 * DPR, RW, 30 * DPR); // bottom
  }

  update(_, delta) {
    if (!this.battleActive || this.isWaiting) return;

    for (const u of this.allUnits) {
      if (!u.isDead) u.atb += u.getAtbSpeed() * this.atbSpeed * delta * 0.001;
    }
    this._tickATB();
    this._tickOverhead();

    let best = null, maxAtb = 0;
    for (const u of this.allUnits) {
      if (!u.isDead && u.atb >= 100 && u.atb > maxAtb) { maxAtb = u.atb; best = u; }
    }
    if (best) {
      best.atb = 0;
      this.currentUnit = best;
      if (best.isPlayer) {
        this.isWaiting = true;
        UI.showAction(this, best);
        const sp = this.sprites[best.name];
        if (sp) this.tweens.add({ targets: sp, alpha: { from: 1, to: 0.6 }, duration: 150, yoyo: true, repeat: 2 });
      } else {
        this._enemyAI(best);
      }
    }
  }

  // ─── Units ───
  _createUnits() {
    this.playerUnits = [
      new BattleUnit('剑修·云逸', true, {
        hp: 120, mp: 60, attack: 20, defense: 8, agility: 75, spirit: 10, realm: '炼气期九层',
        skills: [
          new SkillData('御剑术', '剑气斩击单体', 10, 25, 'single', 'physical'),
          new SkillData('万剑归宗', '剑雨攻击全体', 25, 15, 'all', 'magical'),
          new SkillData('聚灵诀', '恢复自身生命', 15, 30, 'self', 'heal'),
        ]
      }),
      new BattleUnit('丹修·灵溪', true, {
        hp: 90, mp: 100, attack: 10, defense: 6, agility: 55, spirit: 25, realm: '炼气期七层',
        skills: [
          new SkillData('灵火术', '灵火灼烧单体', 12, 30, 'single', 'magical'),
          new SkillData('天火焚原', '烈焰焚烧全体', 30, 20, 'all', 'magical'),
          new SkillData('回春术', '恢复自身生命', 18, 40, 'self', 'heal'),
        ]
      }),
    ];
    this.enemyUnits = [
      new BattleUnit('妖狼', false, { hp: 80, mp: 20, attack: 15, defense: 5, agility: 65, spirit: 5 }),
      new BattleUnit('毒蛇精', false, { hp: 60, mp: 30, attack: 18, defense: 3, agility: 80, spirit: 12 }),
      new BattleUnit('石魔', false, { hp: 150, mp: 10, attack: 22, defense: 15, agility: 30, spirit: 3 }),
    ];
    this.allUnits = [...this.playerUnits, ...this.enemyUnits];
    for (const u of this.allUnits) u.atb = Math.random() * 20 + u.agility * 0.3;
  }

  // ─── Sprites ───
  _spawnSprites() {
    // Assign slots: allies use ALLY_SLOTS, enemies use ENEMY_SLOTS
    let allyIdx = 0, enemyIdx = 0;
    for (const u of this.allUnits) {
      const folder = SPRITE_MAP[u.name];
      if (!folder) continue;
      const slots = u.isPlayer ? ALLY_SLOTS : ENEMY_SLOTS;
      const idx = u.isPlayer ? allyIdx++ : enemyIdx++;
      if (idx >= slots.length) continue;
      const slot = slots[idx];

      const dir = u.isPlayer ? 'right' : 'left';
      const sp = this.add.image(RW * slot.x, RH * slot.y, `${folder}_idle_${dir}`);
      const texH = sp.texture.getSourceImage().height;
      const sc = (CHAR_HEIGHT * DPR) / texH;  // 统一高度
      sp.setOrigin(0.5, 0.5);
      sp.setScale(sc);
      // Depth: 后排在前排后面 (y 越大越靠前)
      sp.setDepth(Math.floor(RH * slot.y));
      sp.setData('folder', folder);
      sp.setData('dir', dir);
      sp.setData('sc', sc);
      sp.setData('slot', slot);
      this.sprites[u.name] = sp;
      this.basePos[u.name] = { x: RW * slot.x, y: RH * slot.y };
      this._idleAnim(u.name);
    }
  }

  _idleAnim(name) {
    const sp = this.sprites[name], bp = this.basePos[name];
    if (!sp) return;
    this.tweens.add({ targets: sp, y: { from: bp.y - 3, to: bp.y + 3 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: sp, x: { from: bp.x - 1.5, to: bp.x + 1.5 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const sc = sp.getData('sc');
    this.tweens.add({ targets: sp, scaleX: { from: sc * 0.998, to: sc * 1.005 }, scaleY: { from: sc * 0.998, to: sc * 1.005 }, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  _pose(name, pose) {
    const sp = this.sprites[name];
    if (!sp) return;
    const key = `${sp.getData('folder')}_${pose}_${sp.getData('dir')}`;
    if (this.textures.exists(key)) sp.setTexture(key);
  }

  _resetIdle(name) {
    const u = this.allUnits.find(x => x.name === name);
    if (u && u.isDead) return;
    const sp = this.sprites[name], bp = this.basePos[name];
    if (!sp) return;
    this._pose(name, 'idle');
    sp.setAlpha(1).setAngle(0).setPosition(bp.x, bp.y);
    sp.setScale(sp.getData('sc'));
    this.tweens.killTweensOf(sp);
    this._idleAnim(name);
  }

  // ─── Enhanced Animations V3 ───

  // 📸 Screen shake
  _shake(intensity = 6, dur = 150) {
    this.cameras.main.shake(dur, intensity / 1000);
  }

  // ⚡ Flash overlay
  _flash(color = 0xffffff, dur = 80) {
    this.cameras.main.flash(dur, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff, true);
  }

  // ─── ATTACK (melee) ───
  _animAttack(atk, tgt) {
    const sp = this.sprites[atk], bp = this.basePos[atk], tbp = this.basePos[tgt];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._pose(atk, 'attack');

    // Wind-up: slight pullback + squeeze
    const dir = tbp.x > bp.x ? 1 : -1;
    const sc = sp.getData('sc');
    this.tweens.chain({
      targets: sp,
      tweens: [
        // 1) Pull back & squeeze
        { x: bp.x - dir * 15 * DPR, scaleX: sc * 0.92, scaleY: sc * 1.06, duration: 100, ease: 'Quad.easeOut' },
        // 2) Dash forward (close to target)
        { x: tbp.x - dir * 60 * DPR, scaleX: sc * 1.08, scaleY: sc * 0.95, duration: 120, ease: 'Back.easeIn',
          onComplete: () => {
            this._fxSlash(tgt);
            this._fxImpactBurst(tgt);
            this._animHit(tgt);
            this._shake(8, 120);
            this._flash(0xffffff, 60);
          }
        },
        // 3) Overshoot slightly
        { x: tbp.x - dir * 80 * DPR, duration: 60, ease: 'Quad.easeOut' },
        // 4) Return to base
        { x: bp.x, scaleX: sc, scaleY: sc, duration: 300, ease: 'Cubic.easeOut',
          onComplete: () => this._resetIdle(atk)
        },
      ]
    });
  }

  // ⚔️ Enhanced slash FX: multiple slash arcs + sparks
  _fxSlash(tgt) {
    const sp = this.sprites[tgt];
    if (!sp) return;
    const cx = sp.x, cy = sp.y - 30 * DPR;

    // Main slash arcs (cyan sword energy)
    for (let i = 0; i < 5; i++) {
      const w = (35 + i * 8) * DPR, h = 2 * DPR;
      const s = this.add.rectangle(cx - 10 * DPR + i * 8 * DPR, cy - i * 14 * DPR, w, h, 0x60ddff, 0.9)
        .setAngle(-25 + i * 12).setDepth(999);
      this.tweens.add({ targets: s, alpha: 0, scaleX: 2.8, scaleY: 0.3, duration: 200 + i * 30,
        ease: 'Quad.easeOut', onComplete: () => s.destroy() });
    }

    // Sparks
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      const sz = (1.5 + Math.random() * 2.5) * DPR;
      const colors = [0xffff80, 0x80ddff, 0xffffff, 0x60eeff];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const p = this.add.rectangle(cx, cy, sz, sz, c, 1).setDepth(999);
      this.tweens.add({
        targets: p,
        x: p.x + Math.cos(a) * speed * DPR,
        y: p.y + Math.sin(a) * speed * DPR,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 250 + Math.random() * 200,
        onComplete: () => p.destroy()
      });
    }
  }

  // 💥 Impact burst at target
  _fxImpactBurst(tgt) {
    const sp = this.sprites[tgt];
    if (!sp) return;
    const cx = sp.x, cy = sp.y;

    // Expanding ring
    const ring = this.add.circle(cx, cy, 5 * DPR, 0xffffff, 0.7).setDepth(998);
    ring.setStrokeStyle(2 * DPR, 0xffdd44);
    this.tweens.add({
      targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 300,
      ease: 'Quad.easeOut', onComplete: () => ring.destroy()
    });
  }

  // ─── HIT reaction ───
  _animHit(tgt) {
    const sp = this.sprites[tgt], bp = this.basePos[tgt];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._pose(tgt, 'hit');
    sp.setTint(0xff3333);

    const sc = sp.getData('sc');
    // Violent shake + knockback
    this.tweens.chain({
      targets: sp,
      tweens: [
        { x: bp.x + 18 * DPR, scaleX: sc * 1.1, scaleY: sc * 0.92, duration: 40 },
        { x: bp.x - 14 * DPR, scaleX: sc * 0.95, scaleY: sc * 1.05, duration: 40 },
        { x: bp.x + 8 * DPR, duration: 40 },
        { x: bp.x - 4 * DPR, duration: 40 },
        { x: bp.x, scaleX: sc, scaleY: sc, duration: 60,
          onComplete: () => {
            sp.clearTint();
            this.time.delayedCall(300, () => this._resetIdle(tgt));
          }
        },
      ]
    });
  }

  // ─── DEFEAT ───
  _animDefeat(name) {
    const sp = this.sprites[name];
    if (!sp) return;
    const u = this.allUnits.find(x => x.name === name);
    const isAlly = u && u.isPlayer;
    this.tweens.killTweensOf(sp);
    this._pose(name, 'defeated');
    sp.setTint(0xff4444);

    const sc = sp.getData('sc');
    const baseY = sp.y;

    if (isAlly) {
      // ─── 我方：倒下但不消失 ───
      this.tweens.chain({
        targets: sp,
        tweens: [
          { alpha: 0.4, duration: 100, yoyo: true, repeat: 2 },
          // Collapse + tilt
          { y: baseY + 30 * DPR, scaleY: sc * 0.75, angle: -15,
            alpha: 0.45, duration: 700, ease: 'Bounce.easeOut' },
        ]
      });
      // Grey out in side panel
      UI.hideOverhead(name);
    } else {
      // ─── 敌方：倒下后消失 ───
      this.tweens.chain({
        targets: sp,
        tweens: [
          { alpha: 0.4, duration: 100, yoyo: true, repeat: 2 },
          { y: baseY + 40 * DPR, scaleY: sc * 0.7, alpha: 0.5,
            duration: 600, ease: 'Bounce.easeOut' },
          { alpha: 0, duration: 500, ease: 'Quad.easeIn',
            onComplete: () => { sp.setVisible(false); UI.hideOverhead(name); }
          },
        ]
      });

      // Death particles (soul wisps) - only for enemies
      this.time.delayedCall(300, () => {
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          const sz = (2 + Math.random() * 3) * DPR;
          const colors = [0x8844cc, 0xaa66ee, 0x6633aa, 0xcc88ff];
          const p = this.add.circle(sp.x + Phaser.Math.Between(-20, 20) * DPR,
            sp.y + Phaser.Math.Between(-10, 20) * DPR, sz, colors[i % 4], 0.8).setDepth(999);
          this.tweens.add({
            targets: p,
            x: p.x + Math.cos(a) * 50 * DPR,
            y: p.y - 40 * DPR + Math.sin(a) * 30 * DPR,
            alpha: 0, scaleX: 0.1, scaleY: 0.1,
            duration: 800 + Math.random() * 400,
            ease: 'Quad.easeOut',
            onComplete: () => p.destroy()
          });
        }
      });
    }
  }

  // ─── CAST (magical / skill) ───
  _animCast(caster, tgt) {
    const sp = this.sprites[caster], bp = this.basePos[caster];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._pose(caster, 'cast');

    const sc = sp.getData('sc');
    // Charge-up: glow + scale pulse
    sp.setTint(0xddbbff);
    this.tweens.add({
      targets: sp, scaleX: sc * 1.08, scaleY: sc * 1.08, duration: 200, yoyo: true, ease: 'Sine.easeInOut',
    });

    // Charging particles around caster
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 40 * DPR;
      const p = this.add.circle(
        sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r,
        2.5 * DPR, 0xbbaaff, 0.9
      ).setDepth(999);
      this.tweens.add({
        targets: p, x: sp.x, y: sp.y - 20 * DPR, alpha: 0,
        duration: 300 + i * 40, ease: 'Quad.easeIn',
        onComplete: () => p.destroy()
      });
    }

    // Release: projectile or burst at target
    this.time.delayedCall(350, () => {
      this._fxMagicProjectile(sp.x, sp.y, this.sprites[tgt]);
      this.time.delayedCall(250, () => {
        this._fxFireExplosion(tgt);
        this._animHit(tgt);
        this._shake(6, 100);
      });
      sp.clearTint();
      this.time.delayedCall(600, () => this._resetIdle(caster));
    });
  }

  // 🔥 Magic projectile: energy ball flying from caster to target
  _fxMagicProjectile(fromX, fromY, targetSp) {
    if (!targetSp) return;
    const ball = this.add.circle(fromX, fromY - 20 * DPR, 6 * DPR, 0xff6600, 1).setDepth(999);
    const glow = this.add.circle(fromX, fromY - 20 * DPR, 12 * DPR, 0xff8833, 0.3).setDepth(998);

    // Trail particles
    const trail = this.time.addEvent({
      delay: 30, repeat: 8,
      callback: () => {
        const t = this.add.circle(ball.x, ball.y, (2 + Math.random() * 3) * DPR, 0xff9944, 0.6).setDepth(997);
        this.tweens.add({ targets: t, alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 200, onComplete: () => t.destroy() });
      }
    });

    this.tweens.add({
      targets: [ball, glow],
      x: targetSp.x, y: targetSp.y - 20 * DPR,
      duration: 250, ease: 'Quad.easeIn',
      onComplete: () => { ball.destroy(); glow.destroy(); trail.remove(); }
    });
  }

  // 🔥 Enhanced fire explosion
  _fxFireExplosion(tgt) {
    const sp = this.sprites[tgt];
    if (!sp) return;
    const cx = sp.x, cy = sp.y;

    // Central flash
    const flash = this.add.circle(cx, cy, 8 * DPR, 0xffaa00, 0.9).setDepth(999);
    this.tweens.add({ targets: flash, scaleX: 5, scaleY: 5, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

    // Fire particles (outward burst)
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 45;
      const sz = (2 + Math.random() * 4) * DPR;
      const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xffcc33];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const p = this.add.circle(cx, cy, sz, c, 0.9).setDepth(999);
      this.tweens.add({
        targets: p,
        x: cx + Math.cos(a) * speed * DPR,
        y: cy + Math.sin(a) * speed * DPR - 15 * DPR, // drift upward
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 350 + Math.random() * 250,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      });
    }

    // Smoke wisps
    for (let i = 0; i < 5; i++) {
      const s = this.add.circle(cx + Phaser.Math.Between(-15, 15) * DPR, cy, (4 + Math.random() * 6) * DPR, 0x333333, 0.4).setDepth(997);
      this.tweens.add({
        targets: s, y: s.y - (50 + Math.random() * 30) * DPR, alpha: 0, scaleX: 2, scaleY: 2,
        duration: 600 + Math.random() * 300, ease: 'Quad.easeOut',
        onComplete: () => s.destroy()
      });
    }
  }

  // ─── HEAL ───
  _animHeal(name) {
    const sp = this.sprites[name];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._pose(name, 'cast');

    const sc = sp.getData('sc');

    // Green glow pulse
    sp.setTint(0x44ff66);
    this.tweens.add({ targets: sp, scaleX: sc * 1.05, scaleY: sc * 1.05, duration: 300, yoyo: true, ease: 'Sine.easeInOut' });

    // Heal rune circle (rotating ring of particles)
    const cx = sp.x, cy = sp.y + 20 * DPR;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 30 * DPR;
      const p = this.add.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.4, 2.5 * DPR, 0x66ff88, 0.8).setDepth(999);
      this.tweens.add({
        targets: p,
        x: cx + Math.cos(a + Math.PI) * r,
        y: cy + Math.sin(a + Math.PI) * r * 0.4,
        alpha: 0, duration: 600 + i * 50,
        onComplete: () => p.destroy()
      });
    }

    // Rising heal particles (leaves / sparkles)
    for (let i = 0; i < 15; i++) {
      const delay = i * 50;
      this.time.delayedCall(delay, () => {
        const px = sp.x + Phaser.Math.Between(-25, 25) * DPR;
        const py = sp.y + Phaser.Math.Between(-10, 20) * DPR;
        const colors = [0x40ff60, 0x80ffaa, 0xaaffcc, 0xeeffcc];
        const sz = (2 + Math.random() * 3) * DPR;
        const p = this.add.circle(px, py, sz, colors[i % 4], 0.9).setDepth(999);
        this.tweens.add({
          targets: p,
          y: py - (50 + Math.random() * 40) * DPR,
          x: px + Phaser.Math.Between(-10, 10) * DPR,
          alpha: 0, duration: 600 + Math.random() * 300,
          ease: 'Quad.easeOut',
          onComplete: () => p.destroy()
        });
      });
    }

    this.time.delayedCall(700, () => { sp.clearTint(); this._resetIdle(name); });
  }

  // ─── ATB Bar ───
  _buildATB() {
    const bar = document.getElementById('atb-bar');
    // Clear any old icons
    bar.querySelectorAll('.atb-icon').forEach(e => e.remove());
    for (const u of this.allUnits) {
      const folder = SPRITE_MAP[u.name];
      const side = u.isPlayer ? 'ally' : 'enemy';
      const el = document.createElement('div');
      el.className = 'atb-icon';
      el.id = `atb-${u.name}`;
      el.innerHTML = `
        <div class="atb-icon-bg"><img src="assets/sprites/portraits/${folder}.png"></div>
        <div class="atb-icon-frame ${side}"></div>
        <div class="atb-icon-accent ${side}"></div>`;
      bar.appendChild(el);
    }
  }

  _tickATB() {
    const trackW = GW - 100; // CSS-space padding 50 each side
    for (const u of this.allUnits) {
      const el = document.getElementById(`atb-${u.name}`);
      if (!el) continue;
      const pct = Math.min(u.atb / 100, 1);
      el.style.left = `${50 + pct * trackW}px`;
      el.classList.toggle('dead', u.isDead);
    }
  }

  // ─── Side Panel HP System ───
  // Ally HP: left side panel, Enemy HP: right side panel
  // Characters only get a tiny name tag floating above (no HP bar on battlefield)
  _buildOverhead() {
    // Build side panels
    const allyPanel = document.getElementById('ally-panel');
    const enemyPanel = document.getElementById('enemy-panel');
    allyPanel.innerHTML = '';
    enemyPanel.innerHTML = '';

    for (const u of this.allUnits) {
      const folder = SPRITE_MAP[u.name];
      const side = u.isPlayer ? 'ally' : 'enemy';
      const panel = u.isPlayer ? allyPanel : enemyPanel;

      const el = document.createElement('div');
      el.className = `sp-unit sp-${side}`;
      el.id = `sp-${u.name}`;

      let h = `<div class="sp-row">`;
      h += `<img class="sp-portrait" src="assets/sprites/portraits/${folder}.png">`;
      h += `<div class="sp-info">`;
      h += `<div class="sp-name ${side}">${u.name}</div>`;
      h += `<div class="sp-bar-wrap"><div class="sp-bar sp-hp-${side}" id="spf-hp-${u.name}"></div></div>`;
      h += `<div class="sp-nums" id="spt-hp-${u.name}">${u.hp}/${u.maxHp}</div>`;
      if (u.isPlayer) {
        h += `<div class="sp-bar-wrap mp"><div class="sp-bar sp-mp" id="spf-mp-${u.name}"></div></div>`;
        h += `<div class="sp-nums mp" id="spt-mp-${u.name}">${u.mp}/${u.maxMp}</div>`;
      }
      h += `</div></div>`;
      el.innerHTML = h;
      panel.appendChild(el);

      // Also create floating name tag on battlefield (tiny, no HP)
      const tag = document.createElement('div');
      tag.className = `name-tag tag-${side}`;
      tag.id = `tag-${u.name}`;
      tag.textContent = u.name;
      document.getElementById('overhead-bars').appendChild(tag);
    }
  }

  _tickOverhead() {
    for (const u of this.allUnits) {
      const sp = this.sprites[u.name];
      const tag = document.getElementById(`tag-${u.name}`);
      if (!sp || !tag) continue;
      if (!sp.visible) { tag.style.display = 'none'; continue; }
      tag.style.display = '';
      const cx = sp.x / DPR, cy = sp.y / DPR;
      const halfH = (sp.displayHeight / DPR) / 2;
      tag.style.left = `${cx}px`;
      tag.style.top = `${cy - halfH - 14}px`;
    }
    this._refreshHP();
  }

  _refreshHP() {
    for (const u of this.allUnits) {
      const hf = document.getElementById(`spf-hp-${u.name}`);
      const ht = document.getElementById(`spt-hp-${u.name}`);
      if (hf) hf.style.width = `${(u.hp / u.maxHp) * 100}%`;
      if (ht) ht.textContent = `${u.hp}/${u.maxHp}`;
      if (u.isPlayer) {
        const mf = document.getElementById(`spf-mp-${u.name}`);
        const mt = document.getElementById(`spt-mp-${u.name}`);
        if (mf) mf.style.width = `${(u.mp / u.maxMp) * 100}%`;
        if (mt) mt.textContent = `${u.mp}/${u.maxMp}`;
      }
      // Highlight dead units
      const el = document.getElementById(`sp-${u.name}`);
      if (el) el.classList.toggle('dead', u.isDead);
    }
  }

  // ─── Combat Logic ───
  _enemyAI(unit) {
    const alive = this.playerUnits.filter(u => !u.isDead);
    if (!alive.length) { this._checkEnd(); return; }
    const tgt = Phaser.Utils.Array.GetRandom(alive);
    this._doAttack(unit, tgt);
  }

  _doAttack(atk, tgt) {
    const dmg = atk.attack + Phaser.Math.Between(-3, 3);
    const actual = tgt.takeDamage(dmg);
    UI.log(`${atk.name} 攻击 ${tgt.name}，造成 ${actual} 伤害！`);
    this._animAttack(atk.name, tgt.name);
    UI.floatDmg(this, tgt.name, actual);
    this._refreshHP();
    if (tgt.isDead) {
      UI.log(`[亡] ${tgt.name} 被击败了！`, 'kill');
      this.time.delayedCall(500, () => { if (!this.defeatedSet.has(tgt.name)) { this.defeatedSet.add(tgt.name); this._animDefeat(tgt.name); } });
    }
    this.isWaiting = false;
    this.currentUnit = null;
    this._checkEnd();
  }

  _doSkill(atk, skill, tgt) {
    if (!atk.useMp(skill.mpCost)) { UI.log('灵力不足！'); return; }
    let power = skill.power;
    if (skill.damageType === 'physical') power += atk.attack;
    else if (skill.damageType === 'magical') power += atk.spirit * 2;

    if (skill.damageType === 'heal') {
      const amt = power + atk.spirit;
      tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
      UI.log(`[灵] ${atk.name} 使用 ${skill.name}，恢复 ${amt} 生命！`, 'heal');
      this._animHeal(atk.name);
      UI.floatDmg(this, atk.name, amt, true);
      this._refreshHP();
      this.isWaiting = false;
      this.currentUnit = null;
      return;
    }

    const targets = skill.targetType === 'all'
      ? (atk.isPlayer ? this.enemyUnits : this.playerUnits).filter(u => !u.isDead)
      : [tgt];

    for (const t of targets) {
      const actual = t.takeDamage(power);
      const tag = skill.targetType === 'all' ? '火' : '雷';
      UI.log(`[${tag}] ${atk.name} 对 ${t.name} 使用 ${skill.name}，${actual} 伤害！`, 'skill');
      this._animCast(atk.name, t.name);
      UI.floatDmg(this, t.name, actual);
      if (t.isDead) {
        UI.log(`[亡] ${t.name} 被击败了！`, 'kill');
        this.time.delayedCall(700, () => { if (!this.defeatedSet.has(t.name)) { this.defeatedSet.add(t.name); this._animDefeat(t.name); } });
      }
    }
    this._refreshHP();
    this.isWaiting = false;
    this.currentUnit = null;
    this._checkEnd();
  }

  _checkEnd() {
    const ap = this.playerUnits.filter(u => !u.isDead);
    const ae = this.enemyUnits.filter(u => !u.isDead);
    if (ae.length === 0) { this.battleActive = false; UI.log('[胜] 战斗胜利！', 'system'); UI.showResult(true); }
    else if (ap.length === 0) { this.battleActive = false; UI.log('[亡] 战斗失败...', 'system'); UI.showResult(false); }
  }
}

// ═══════════════════════════════════════════════════════
// UI Module — all DOM manipulation isolated here
// ═══════════════════════════════════════════════════════
const UI = {
  log(text, type = '') {
    const c = document.getElementById('log-content');
    const d = document.createElement('div');
    d.className = `log-line ${type}`;
    d.textContent = text;
    c.appendChild(d);
    // Keep max 30 lines
    while (c.children.length > 30) c.removeChild(c.firstChild);
    document.getElementById('battle-log').scrollTop = 99999;
  },

  floatDmg(scene, name, val, heal = false) {
    const sp = scene.sprites[name];
    if (!sp) return;
    const el = document.createElement('div');
    el.className = 'dmg-float' + (heal ? ' heal' : '');
    el.textContent = heal ? `+${val}` : `-${val}`;
    // Convert render coords to CSS coords
    const cx = sp.x / DPR, cy = sp.y / DPR;
    el.style.left = `${cx + Phaser.Math.Between(-8, 8)}px`;
    el.style.top = `${cy - (sp.displayHeight / DPR) / 2 - 10}px`;
    document.getElementById('ui-overlay').appendChild(el);
    setTimeout(() => el.remove(), 1000);
  },

  hideOverhead(name) {
    const tag = document.getElementById(`tag-${name}`);
    if (tag) tag.style.display = 'none';
    const sp = document.getElementById(`sp-${name}`);
    if (sp) sp.classList.add('dead');
  },

  showAction(scene, unit) {
    const panel = document.getElementById('action-panel');
    const folder = SPRITE_MAP[unit.name];
    document.getElementById('action-portrait').src = `assets/sprites/portraits/${folder}.png`;
    document.getElementById('action-unit-name').textContent = `${unit.name} 的回合`;
    const bc = document.getElementById('action-buttons');
    bc.innerHTML = '';

    // Attack btn
    const ab = document.createElement('button');
    ab.className = 'btn-xianxia';
    ab.innerHTML = `<div class="btn-name">⚔ 普通攻击</div><div class="btn-stats">ATK:${unit.attack}  MP:0</div>`;
    ab.onclick = () => { scene.selectedSkill = null; UI.showTargets(scene); };
    bc.appendChild(ab);

    // Skill btns
    for (const sk of unit.skills) {
      const b = document.createElement('button');
      b.className = 'btn-xianxia';
      b.disabled = unit.mp < sk.mpCost;
      const ico = SKILL_ICONS[sk.name] || '🔮';
      b.innerHTML = `<div class="btn-name">${ico} ${sk.name}</div><div class="btn-stats">ATK:${sk.power}  MP:${sk.mpCost}</div><div class="btn-desc">${sk.desc}</div>`;
      b.onclick = () => {
        scene.selectedSkill = sk;
        if (sk.targetType === 'self') { panel.classList.add('hidden'); scene._doSkill(unit, sk, unit); }
        else if (sk.targetType === 'all') { panel.classList.add('hidden'); const es = scene.enemyUnits.filter(u => !u.isDead); if (es.length) scene._doSkill(unit, sk, es[0]); }
        else UI.showTargets(scene);
      };
      bc.appendChild(b);
    }
    panel.classList.remove('hidden');
  },

  showTargets(scene) {
    document.getElementById('action-panel').classList.add('hidden');
    const panel = document.getElementById('target-panel');
    const tc = document.getElementById('target-buttons');
    tc.innerHTML = '';
    for (const e of scene.enemyUnits.filter(u => !u.isDead)) {
      const b = document.createElement('button');
      b.className = 'btn-target';
      b.textContent = `${e.name}  HP:${e.hp}/${e.maxHp}`;
      b.onclick = () => {
        panel.classList.add('hidden');
        if (scene.selectedSkill) scene._doSkill(scene.currentUnit, scene.selectedSkill, e);
        else scene._doAttack(scene.currentUnit, e);
      };
      tc.appendChild(b);
    }
    panel.classList.remove('hidden');
  },

  showResult(won) {
    const p = document.getElementById('result-panel');
    const t = document.getElementById('result-text');
    t.className = won ? 'result-win' : 'result-lose';
    t.textContent = won ? '✦ 战斗胜利 ✦\n获得修为 +50' : '✧ 道消身陨 ✧';
    p.classList.remove('hidden');
    document.getElementById('action-panel').classList.add('hidden');
    document.getElementById('target-panel').classList.add('hidden');
  },
};

// ─── Global Handlers ───
window.game_cancelTarget = () => {
  document.getElementById('target-panel').classList.add('hidden');
  const s = game.scene.getScene('BattleScene');
  if (s && s.currentUnit) UI.showAction(s, s.currentUnit);
};

window.game_restart = () => {
  document.getElementById('result-panel').classList.add('hidden');
  document.getElementById('overhead-bars').innerHTML = '';
  document.getElementById('log-content').innerHTML = '';
  document.querySelectorAll('.atb-icon').forEach(e => e.remove());
  game.scene.getScene('BattleScene').scene.restart();
};

// ─── Responsive Scale ───
function syncScale() {
  const w = document.getElementById('game-wrapper');
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / GW, vh / GH);
  w.style.transform = `scale(${scale})`;
  w.style.marginLeft = `${(vw - GW * scale) / 2}px`;
  w.style.marginTop = `${(vh - GH * scale) / 2}px`;
}
window.addEventListener('resize', syncScale);

// ─── Launch ───
const config = {
  type: Phaser.AUTO,
  width: RW,   // Render at high-res
  height: RH,
  parent: 'game-container',
  backgroundColor: '#080a18',
  scene: [BattleScene],
  scale: { mode: Phaser.Scale.NONE },
  render: { antialias: true, roundPixels: false, pixelArt: false },
};

const game = new Phaser.Game(config);
requestAnimationFrame(syncScale);
