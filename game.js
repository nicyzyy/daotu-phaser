/* ═══════════════════════════════════════════════════════
   道途 — Phaser 3 ATB 战斗系统 V2 (全面修复版)
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

// 布局: x/y 百分比基于 1280x720, h = 目标显示高度
const LAYOUT = {
  '剑修·云逸': { h: 210, x: 0.22, y: 0.50 },
  '丹修·灵溪': { h: 190, x: 0.09, y: 0.56 },
  '妖狼':     { h: 190, x: 0.60, y: 0.52 },
  '毒蛇精':   { h: 180, x: 0.74, y: 0.50 },
  '石魔':     { h: 220, x: 0.86, y: 0.47 },  // 从 0.90 调到 0.86
};

const GW = 1280, GH = 720;
// HiDPI: 渲染分辨率 = 逻辑尺寸 × devicePixelRatio
const DPR = Math.min(Math.ceil(window.devicePixelRatio || 1), 3);
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
    // BG cover (render space = RW×RH)
    const bg = this.add.image(RW / 2, RH / 2, 'battle_bg');
    const src = this.textures.get('battle_bg').getSourceImage();
    bg.setScale(Math.max(RW / src.width, RH / src.height)).setDepth(-10);
    this.tweens.add({ targets: bg, x: { from: RW / 2 - 4 * DPR, to: RW / 2 + 4 * DPR }, duration: 10000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this._createUnits();
    this._spawnSprites();
    this._buildATB();
    this._buildOverhead();
    this.battleActive = true;
    UI.log('[战] 战斗开始!', 'system');
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
    for (const u of this.allUnits) {
      const folder = SPRITE_MAP[u.name];
      const lay = LAYOUT[u.name];
      if (!folder || !lay) continue;
      const dir = u.isPlayer ? 'right' : 'left';
      const sp = this.add.image(RW * lay.x, RH * lay.y, `${folder}_idle_${dir}`);
      const texH = sp.texture.getSourceImage().height;
      const sc = (lay.h * DPR) / texH;
      sp.setScale(sc).setDepth(Math.floor(RH * lay.y));
      sp.setData('folder', folder);
      sp.setData('dir', dir);
      sp.setData('sc', sc);
      this.sprites[u.name] = sp;
      this.basePos[u.name] = { x: RW * lay.x, y: RH * lay.y };
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

  // ─── Animations ───
  _animAttack(atk, tgt) {
    const sp = this.sprites[atk], bp = this.basePos[atk], tbp = this.basePos[tgt];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._pose(atk, 'attack');
    const midX = bp.x + (tbp.x - bp.x) * 0.35;
    this.tweens.add({
      targets: sp, x: midX, duration: 180, ease: 'Quad.easeOut',
      onComplete: () => {
        this._fxSlash(tgt);
        this._animHit(tgt);
        this.tweens.add({ targets: sp, x: bp.x, duration: 280, ease: 'Quad.easeIn', onComplete: () => this._resetIdle(atk) });
      }
    });
  }

  _fxSlash(tgt) {
    const sp = this.sprites[tgt];
    if (!sp) return;
    for (let i = 0; i < 3; i++) {
      const s = this.add.rectangle(sp.x - 20 + i * 12, sp.y - 60 - i * 18, 45, 3, 0xffff80, 0.9).setAngle(-20 + i * 15).setDepth(999);
      this.tweens.add({ targets: s, alpha: 0, scaleX: 2.5, duration: 250, onComplete: () => s.destroy() });
    }
  }

  _animHit(tgt) {
    const sp = this.sprites[tgt], bp = this.basePos[tgt];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._pose(tgt, 'hit');
    sp.setTint(0xff3333);
    this.tweens.add({ targets: sp, x: [bp.x + 12, bp.x - 12, bp.x + 6, bp.x], duration: 160 });
    this.time.delayedCall(200, () => { sp.clearTint(); });
    this.time.delayedCall(500, () => this._resetIdle(tgt));
  }

  _animDefeat(name) {
    const sp = this.sprites[name];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._pose(name, 'defeated');
    sp.setTint(0xff4444);
    this.tweens.add({
      targets: sp, alpha: 0, y: sp.y + 40, duration: 1000, ease: 'Quad.easeIn',
      onComplete: () => { sp.setVisible(false); UI.hideOverhead(name); }
    });
  }

  _animCast(caster, tgt) {
    const sp = this.sprites[caster];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._pose(caster, 'cast');
    sp.setTint(0xddbbff);
    this.time.delayedCall(250, () => {
      this._fxFire(tgt);
      this._animHit(tgt);
      sp.clearTint();
      this.time.delayedCall(400, () => this._resetIdle(caster));
    });
  }

  _animHeal(name) {
    const sp = this.sprites[name];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._pose(name, 'cast');
    for (let i = 0; i < 6; i++) {
      const p = this.add.rectangle(sp.x + Phaser.Math.Between(-18, 18), sp.y + Phaser.Math.Between(-5, 15), 4, 4, 0x40ff60, 0.8).setDepth(999);
      this.tweens.add({ targets: p, y: p.y - 70, alpha: 0, duration: 700 + Math.random() * 300, onComplete: () => p.destroy() });
    }
    sp.setTint(0x80ff80);
    this.time.delayedCall(500, () => { sp.clearTint(); this._resetIdle(name); });
  }

  _fxFire(tgt) {
    const sp = this.sprites[tgt];
    if (!sp) return;
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const c = Phaser.Display.Color.GetColor(255, 100 + Math.random() * 100, 25);
      const p = this.add.rectangle(sp.x + Math.cos(a) * 10, sp.y - 35 + Math.sin(a) * 10, 5, 5, c, 0.9).setDepth(999);
      this.tweens.add({ targets: p, x: p.x + Math.cos(a) * 35, y: p.y + Math.sin(a) * 35, alpha: 0, duration: 350, onComplete: () => p.destroy() });
    }
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

  // ─── Overhead HP ───
  _buildOverhead() {
    const c = document.getElementById('overhead-bars');
    c.innerHTML = '';
    for (const u of this.allUnits) {
      const side = u.isPlayer ? 'ally' : 'enemy';
      const el = document.createElement('div');
      el.className = `oh-bar ${u.isPlayer ? 'oh-ally' : 'oh-enemy'}`;
      el.id = `oh-${u.name}`;
      let h = '';
      if (!u.isPlayer) h += `<div class="oh-name">${u.name}</div>`;
      h += `<div class="oh-track"><div class="oh-fill hp-${side}" id="ohf-hp-${u.name}"></div></div>`;
      h += `<div class="oh-text" id="oht-hp-${u.name}">${u.hp}/${u.maxHp}</div>`;
      if (u.isPlayer) {
        h += `<div class="oh-track-mp"><div class="oh-fill mp" id="ohf-mp-${u.name}"></div></div>`;
        h += `<div class="oh-text" id="oht-mp-${u.name}">${u.mp}/${u.maxMp}</div>`;
      }
      el.innerHTML = h;
      c.appendChild(el);
    }
  }

  _tickOverhead() {
    for (const u of this.allUnits) {
      const sp = this.sprites[u.name];
      const el = document.getElementById(`oh-${u.name}`);
      if (!sp || !el || !sp.visible) continue;
      // Convert render-space coords to CSS-space (divide by DPR)
      const cx = sp.x / DPR, cy = sp.y / DPR;
      const headY = cy - (sp.displayHeight / DPR) / 2;
      el.style.left = `${cx - 55}px`;
      el.style.top = `${headY - el.offsetHeight - 6}px`;
    }
    this._refreshHP();
  }

  _refreshHP() {
    for (const u of this.allUnits) {
      const hf = document.getElementById(`ohf-hp-${u.name}`);
      const ht = document.getElementById(`oht-hp-${u.name}`);
      if (hf) hf.style.width = `${(u.hp / u.maxHp) * 100}%`;
      if (ht) ht.textContent = `${u.hp}/${u.maxHp}`;
      if (u.isPlayer) {
        const mf = document.getElementById(`ohf-mp-${u.name}`);
        const mt = document.getElementById(`oht-mp-${u.name}`);
        if (mf) mf.style.width = `${(u.mp / u.maxMp) * 100}%`;
        if (mt) mt.textContent = `${u.mp}/${u.maxMp}`;
      }
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
    el.style.top = `${cy - (sp.displayHeight / DPR) / 2 - 15}px`;
    document.getElementById('ui-overlay').appendChild(el);
    setTimeout(() => el.remove(), 1000);
  },

  hideOverhead(name) {
    const el = document.getElementById(`oh-${name}`);
    if (el) el.style.display = 'none';
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
  render: { antialias: true },
};

const game = new Phaser.Game(config);
requestAnimationFrame(syncScale);
