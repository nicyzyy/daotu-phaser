/* ═══════════════════════════════════════════════════════
   道途 — Phaser 3 ATB 战斗系统 (完整移植)
   ═══════════════════════════════════════════════════════ */

// ─── Data Classes ───
class SkillData {
  constructor(name, desc, mpCost, power, targetType = 'single', damageType = 'physical') {
    this.name = name;
    this.desc = desc;
    this.mpCost = mpCost;
    this.power = power;
    this.targetType = targetType;   // single | all | self
    this.damageType = damageType;   // physical | magical | heal
  }
}

class BattleUnit {
  constructor(name, isPlayer, stats) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.maxMp = stats.mp;
    this.mp = stats.mp;
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

// ─── Sprite Map ───
const SPRITE_MAP = {
  '剑修·云逸': 'yunyi', '丹修·灵溪': 'lingxi',
  '妖狼': 'wolf', '毒蛇精': 'snake', '石魔': 'golem',
};

const SKILL_ICONS = {
  '御剑术': '⚔️', '万剑归宗': '🗡️', '聚灵诀': '💠',
  '灵火术': '🔥', '天火焚原': '🌋', '回春术': '🌿',
};

const LAYOUT = {
  '剑修·云逸': { h: 220, x: 0.20, y: 0.50 },
  '丹修·灵溪': { h: 200, x: 0.08, y: 0.58 },
  '妖狼':     { h: 200, x: 0.62, y: 0.52 },
  '毒蛇精':   { h: 190, x: 0.76, y: 0.50 },
  '石魔':     { h: 240, x: 0.90, y: 0.46 },
};

// ─── Phaser Scene ───
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
    // Background
    this.load.image('battle_bg', 'assets/bg/battle_bg.png');
    // Sprites
    for (const [uname, folder] of Object.entries(SPRITE_MAP)) {
      for (const pose of ['idle', 'attack', 'cast', 'hit', 'defeated']) {
        this.load.image(`${folder}_${pose}_left`, `assets/sprites/poses/${folder}/${pose}_left.png`);
        this.load.image(`${folder}_${pose}_right`, `assets/sprites/poses/${folder}/${pose}_right.png`);
      }
      this.load.image(`${folder}_portrait`, `assets/sprites/portraits/${folder}.png`);
    }
  }

  create() {
    // Background (cover)
    const bg = this.add.image(640, 360, 'battle_bg');
    const bgTex = this.textures.get('battle_bg').getSourceImage();
    const scaleX = 1280 / bgTex.width, scaleY = 720 / bgTex.height;
    const bgScale = Math.max(scaleX, scaleY);
    bg.setScale(bgScale).setDepth(-10);
    // Subtle parallax
    this.tweens.add({ targets: bg, x: { from: 636, to: 644 }, duration: 10000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this._createUnits();
    this._spawnSprites();
    this._buildATBIcons();
    this._buildOverheadBars();
    this.battleActive = true;
    this._log('[战] 战斗开始!', 'system');
  }

  update(time, delta) {
    if (!this.battleActive || this.isWaiting) return;
    // Tick ATB
    for (const u of this.allUnits) {
      if (u.isDead) continue;
      u.atb += u.getAtbSpeed() * this.atbSpeed * delta * 0.001;
    }
    this._updateATB();
    this._updateOverheadPos();

    // Check ready
    let readyUnit = null, maxAtb = 0;
    for (const u of this.allUnits) {
      if (!u.isDead && u.atb >= 100 && u.atb > maxAtb) {
        maxAtb = u.atb;
        readyUnit = u;
      }
    }
    if (readyUnit) {
      readyUnit.atb = 0;
      this.currentUnit = readyUnit;
      if (readyUnit.isPlayer) {
        this.isWaiting = true;
        this._showActionPanel(readyUnit);
        // Flash sprite
        const sp = this.sprites[readyUnit.name];
        if (sp) this.tweens.add({ targets: sp, alpha: { from: 1, to: 0.6 }, duration: 150, yoyo: true, repeat: 2 });
      } else {
        this._enemyAI(readyUnit);
      }
    }
  }

  // ─── Unit Creation ───
  _createUnits() {
    const p1 = new BattleUnit('剑修·云逸', true, {
      hp: 120, mp: 60, attack: 20, defense: 8, agility: 75, spirit: 10, realm: '炼气期九层',
      skills: [
        new SkillData('御剑术', '剑气斩击单体', 10, 25, 'single', 'physical'),
        new SkillData('万剑归宗', '剑雨攻击全体', 25, 15, 'all', 'magical'),
        new SkillData('聚灵诀', '恢复自身生命', 15, 30, 'self', 'heal'),
      ]
    });
    const p2 = new BattleUnit('丹修·灵溪', true, {
      hp: 90, mp: 100, attack: 10, defense: 6, agility: 55, spirit: 25, realm: '炼气期七层',
      skills: [
        new SkillData('灵火术', '灵火灼烧单体', 12, 30, 'single', 'magical'),
        new SkillData('天火焚原', '烈焰焚烧全体', 30, 20, 'all', 'magical'),
        new SkillData('回春术', '恢复自身生命', 18, 40, 'self', 'heal'),
      ]
    });
    this.playerUnits = [p1, p2];

    const e1 = new BattleUnit('妖狼', false, { hp: 80, mp: 20, attack: 15, defense: 5, agility: 65, spirit: 5 });
    const e2 = new BattleUnit('毒蛇精', false, { hp: 60, mp: 30, attack: 18, defense: 3, agility: 80, spirit: 12 });
    const e3 = new BattleUnit('石魔', false, { hp: 150, mp: 10, attack: 22, defense: 15, agility: 30, spirit: 3 });
    this.enemyUnits = [e1, e2, e3];
    this.allUnits = [...this.playerUnits, ...this.enemyUnits];

    // Randomize starting ATB
    for (const u of this.allUnits) {
      u.atb = Math.random() * 20 + u.agility * 0.3;
    }
  }

  // ─── Sprite Rendering ───
  _spawnSprites() {
    for (const u of this.allUnits) {
      const folder = SPRITE_MAP[u.name];
      const layout = LAYOUT[u.name];
      if (!folder || !layout) continue;

      const dir = u.isPlayer ? 'right' : 'left';
      const key = `${folder}_idle_${dir}`;
      const sp = this.add.image(1280 * layout.x, 720 * layout.y, key);

      // Scale to target height
      const texH = sp.texture.getSourceImage().height;
      const sc = layout.h / texH;
      sp.setScale(sc).setDepth(Math.floor(720 * layout.y));

      this.sprites[u.name] = sp;
      this.basePos[u.name] = { x: 1280 * layout.x, y: 720 * layout.y };

      // Store pose info for switching
      sp.setData('folder', folder);
      sp.setData('dir', dir);
      sp.setData('scale', sc);

      // Idle animation (breathing)
      this._startIdle(u.name);
    }
  }

  _startIdle(uname) {
    const sp = this.sprites[uname];
    const bp = this.basePos[uname];
    if (!sp || !bp) return;

    // Vertical float
    this.tweens.add({
      targets: sp, y: { from: bp.y - 4, to: bp.y + 4 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // Horizontal sway
    this.tweens.add({
      targets: sp, x: { from: bp.x - 2, to: bp.x + 2 },
      duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // Breathing scale
    const sc = sp.getData('scale');
    this.tweens.add({
      targets: sp, scaleX: { from: sc * 0.997, to: sc * 1.008 }, scaleY: { from: sc * 0.997, to: sc * 1.008 },
      duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _setPose(uname, pose) {
    const sp = this.sprites[uname];
    if (!sp) return;
    const folder = sp.getData('folder');
    const dir = sp.getData('dir');
    const key = `${folder}_${pose}_${dir}`;
    if (this.textures.exists(key)) sp.setTexture(key);
  }

  _resetToIdle(uname) {
    const unit = this.allUnits.find(u => u.name === uname);
    if (unit && unit.isDead) return;
    const sp = this.sprites[uname];
    const bp = this.basePos[uname];
    if (!sp || !bp) return;
    this._setPose(uname, 'idle');
    sp.setAlpha(1).setAngle(0);
    sp.setPosition(bp.x, bp.y);
    const sc = sp.getData('scale');
    sp.setScale(sc);
    this.tweens.killTweensOf(sp);
    this._startIdle(uname);
  }

  // ─── Battle Animations ───
  _playAttackAnim(attacker, target) {
    const sp = this.sprites[attacker];
    const tsp = this.sprites[target];
    if (!sp || !tsp) return;

    this.tweens.killTweensOf(sp);
    this._setPose(attacker, 'attack');

    const bp = this.basePos[attacker];
    const tbp = this.basePos[target];
    const midX = bp.x + (tbp.x - bp.x) * 0.4;

    this.tweens.add({
      targets: sp,
      x: midX,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this._spawnSlash(target);
        this._playHitAnim(target);
        this.tweens.add({
          targets: sp, x: bp.x, duration: 300, ease: 'Quad.easeIn',
          onComplete: () => this._resetToIdle(attacker)
        });
      }
    });
  }

  _spawnSlash(target) {
    const sp = this.sprites[target];
    if (!sp) return;
    for (let i = 0; i < 3; i++) {
      const slash = this.add.rectangle(
        sp.x - 25 + i * 8, sp.y - 70 - i * 20,
        50, 4, 0xffff80, 0.9
      ).setAngle(-25 + i * 18).setDepth(999);
      this.tweens.add({
        targets: slash, alpha: 0, scaleX: 2, duration: 300,
        onComplete: () => slash.destroy()
      });
    }
  }

  _playHitAnim(target) {
    const sp = this.sprites[target];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._setPose(target, 'hit');
    const bp = this.basePos[target];

    this.tweens.add({
      targets: sp,
      tint: { from: 0xff3333, to: 0xffffff },
      duration: 200,
    });
    this.tweens.add({
      targets: sp,
      x: [bp.x + 15, bp.x - 15, bp.x + 8, bp.x],
      duration: 150,
      onComplete: () => {
        this.time.delayedCall(300, () => this._resetToIdle(target));
      }
    });
  }

  _playDefeatedAnim(uname) {
    const sp = this.sprites[uname];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._setPose(uname, 'defeated');

    // Red flash → blink → sink → disappear
    this.tweens.add({
      targets: sp,
      alpha: { from: 1, to: 0 },
      y: sp.y + 50,
      duration: 1200,
      ease: 'Quad.easeIn',
      onUpdate: (tw) => {
        const p = tw.progress;
        if (p < 0.2) sp.setTint(0xff4444);
        else if (p < 0.7) sp.setAlpha(Math.sin(p * 30) * 0.5 + 0.5);
      },
      onComplete: () => {
        sp.setVisible(false);
        this._hideOverhead(uname);
      }
    });
  }

  _playCastAnim(caster, target) {
    const sp = this.sprites[caster];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._setPose(caster, 'cast');

    sp.setTint(0xddbbff);
    this.time.delayedCall(300, () => {
      this._spawnFireParticles(target);
      this._playHitAnim(target);
      sp.clearTint();
      this.time.delayedCall(400, () => this._resetToIdle(caster));
    });
  }

  _playHealAnim(uname) {
    const sp = this.sprites[uname];
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this._setPose(uname, 'cast');

    // Green particles floating up
    for (let i = 0; i < 5; i++) {
      const p = this.add.rectangle(
        sp.x + Phaser.Math.Between(-20, 20),
        sp.y + Phaser.Math.Between(-10, 20),
        4, 4, 0x40ff60, 0.8
      ).setDepth(999);
      this.tweens.add({
        targets: p, y: p.y - 80, alpha: 0,
        duration: 800 + Math.random() * 300,
        onComplete: () => p.destroy()
      });
    }

    sp.setTint(0x80ff80);
    this.time.delayedCall(600, () => {
      sp.clearTint();
      this._resetToIdle(uname);
    });
  }

  _spawnFireParticles(target) {
    const sp = this.sprites[target];
    if (!sp) return;
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const p = this.add.rectangle(
        sp.x + Math.cos(angle) * 12,
        sp.y - 40 + Math.sin(angle) * 12,
        6, 6, Phaser.Display.Color.GetColor(255, 100 + Math.random() * 100, 25), 0.9
      ).setDepth(999);
      this.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * 40,
        y: p.y + Math.sin(angle) * 40,
        alpha: 0, duration: 400,
        onComplete: () => p.destroy()
      });
    }
  }

  _spawnDmg(uname, value, isHeal = false) {
    const sp = this.sprites[uname];
    if (!sp) return;
    const el = document.createElement('div');
    el.className = 'dmg-float' + (isHeal ? ' heal' : '');
    el.textContent = isHeal ? `+${value}` : `-${value}`;
    el.style.left = `${sp.x + Phaser.Math.Between(-10, 10)}px`;
    el.style.top = `${sp.y - (sp.displayHeight / 2) - 20}px`;
    document.getElementById('ui-overlay').appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ─── ATB UI ───
  _buildATBIcons() {
    const bar = document.getElementById('atb-bar');
    for (const u of this.allUnits) {
      const folder = SPRITE_MAP[u.name];
      const side = u.isPlayer ? 'ally' : 'enemy';
      const icon = document.createElement('div');
      icon.className = 'atb-icon';
      icon.id = `atb-${u.name}`;
      icon.innerHTML = `
        <div class="atb-icon-bg"><img src="assets/sprites/portraits/${folder}.png" alt="${u.name}"></div>
        <div class="atb-icon-frame ${side}"></div>
        <div class="atb-icon-accent ${side}"></div>
      `;
      bar.appendChild(icon);
    }
  }

  _updateATB() {
    const barW = 1280 - 80; // track width
    for (const u of this.allUnits) {
      const icon = document.getElementById(`atb-${u.name}`);
      if (!icon) continue;
      icon.style.left = `${40 + (u.atb / 100) * barW}px`;
      icon.classList.toggle('dead', u.isDead);
    }
  }

  // ─── Overhead HP Bars ───
  _buildOverheadBars() {
    const container = document.getElementById('overhead-bars');
    for (const u of this.allUnits) {
      const side = u.isPlayer ? 'ally' : 'enemy';
      const bar = document.createElement('div');
      bar.className = 'oh-bar';
      bar.id = `oh-${u.name}`;

      let html = '';
      if (!u.isPlayer) html += `<div class="oh-name">${u.name}</div>`;

      html += `
        <div class="oh-track"><div class="oh-fill hp-${side}" id="ohf-hp-${u.name}" style="width:100%"></div></div>
        <div class="oh-text" id="oht-hp-${u.name}">${u.hp}/${u.maxHp}</div>
      `;

      if (u.isPlayer) {
        html += `
          <div class="oh-track-mp"><div class="oh-fill mp" id="ohf-mp-${u.name}" style="width:100%"></div></div>
          <div class="oh-text" id="oht-mp-${u.name}">${u.mp}/${u.maxMp}</div>
        `;
      }

      bar.innerHTML = html;
      container.appendChild(bar);
    }
  }

  _updateOverheadPos() {
    for (const u of this.allUnits) {
      const sp = this.sprites[u.name];
      const bar = document.getElementById(`oh-${u.name}`);
      if (!sp || !bar || !sp.visible) continue;
      const headY = sp.y - sp.displayHeight / 2;
      bar.style.left = `${sp.x - 55}px`;
      bar.style.top = `${headY - bar.offsetHeight - 6}px`;
    }
  }

  _updateOverheadHP() {
    for (const u of this.allUnits) {
      const hpFill = document.getElementById(`ohf-hp-${u.name}`);
      const hpText = document.getElementById(`oht-hp-${u.name}`);
      if (hpFill) hpFill.style.width = `${(u.hp / u.maxHp) * 100}%`;
      if (hpText) hpText.textContent = `${u.hp}/${u.maxHp}`;
      if (u.isPlayer) {
        const mpFill = document.getElementById(`ohf-mp-${u.name}`);
        const mpText = document.getElementById(`oht-mp-${u.name}`);
        if (mpFill) mpFill.style.width = `${(u.mp / u.maxMp) * 100}%`;
        if (mpText) mpText.textContent = `${u.mp}/${u.maxMp}`;
      }
    }
  }

  _hideOverhead(uname) {
    const bar = document.getElementById(`oh-${uname}`);
    if (bar) bar.style.display = 'none';
  }

  // ─── Battle Logic ───
  _enemyAI(unit) {
    const alive = this.playerUnits.filter(u => !u.isDead);
    if (alive.length === 0) { this._checkEnd(); return; }
    const target = Phaser.Utils.Array.GetRandom(alive);
    this._executeAttack(unit, target);
  }

  _executeAttack(attacker, target) {
    const dmg = attacker.attack + Phaser.Math.Between(-3, 3);
    const actual = target.takeDamage(dmg);
    this._log(`${attacker.name} 攻击 ${target.name}，造成 ${actual} 伤害！`);
    this._playAttackAnim(attacker.name, target.name);
    this._spawnDmg(target.name, actual);
    this._updateOverheadHP();

    if (target.isDead) {
      this._log(`[亡] ${target.name} 被击败了！`, 'kill');
      this.time.delayedCall(500, () => {
        if (!this.defeatedSet.has(target.name)) {
          this.defeatedSet.add(target.name);
          this._playDefeatedAnim(target.name);
        }
      });
    }
    this.isWaiting = false;
    this.currentUnit = null;
    this._checkEnd();
  }

  _executeSkill(attacker, skill, target) {
    if (!attacker.useMp(skill.mpCost)) {
      this._log('灵力不足！');
      return;
    }

    let power = skill.power;
    if (skill.damageType === 'physical') power += attacker.attack;
    else if (skill.damageType === 'magical') power += attacker.spirit * 2;

    if (skill.damageType === 'heal') {
      const healAmt = power + attacker.spirit;
      target.hp = Math.min(target.maxHp, target.hp + healAmt);
      this._log(`[灵] ${attacker.name} 使用 ${skill.name}，恢复 ${healAmt} 生命！`, 'heal');
      this._playHealAnim(attacker.name);
      this._spawnDmg(attacker.name, healAmt, true);
      this._updateOverheadHP();
      this.isWaiting = false;
      this.currentUnit = null;
      return;
    }

    if (skill.targetType === 'all') {
      const targets = attacker.isPlayer ? this.enemyUnits : this.playerUnits;
      for (const t of targets) {
        if (t.isDead) continue;
        const actual = t.takeDamage(power);
        this._log(`[火] ${attacker.name} 对 ${t.name} 使用 ${skill.name}，${actual} 伤害！`, 'skill');
        this._playCastAnim(attacker.name, t.name);
        this._spawnDmg(t.name, actual);
        if (t.isDead) {
          this._log(`[亡] ${t.name} 被击败了！`, 'kill');
          this.time.delayedCall(800, () => {
            if (!this.defeatedSet.has(t.name)) {
              this.defeatedSet.add(t.name);
              this._playDefeatedAnim(t.name);
            }
          });
        }
      }
    } else {
      const actual = target.takeDamage(power);
      this._log(`[雷] ${attacker.name} 对 ${target.name} 使用 ${skill.name}，${actual} 伤害！`, 'skill');
      this._playCastAnim(attacker.name, target.name);
      this._spawnDmg(target.name, actual);
      if (target.isDead) {
        this._log(`[亡] ${target.name} 被击败了！`, 'kill');
        this.time.delayedCall(800, () => {
          if (!this.defeatedSet.has(target.name)) {
            this.defeatedSet.add(target.name);
            this._playDefeatedAnim(target.name);
          }
        });
      }
    }

    this._updateOverheadHP();
    this.isWaiting = false;
    this.currentUnit = null;
    this._checkEnd();
  }

  _checkEnd() {
    const aliveP = this.playerUnits.filter(u => !u.isDead);
    const aliveE = this.enemyUnits.filter(u => !u.isDead);

    if (aliveE.length === 0) {
      this.battleActive = false;
      this._log('[胜] 战斗胜利！', 'system');
      this._showResult(true);
    } else if (aliveP.length === 0) {
      this.battleActive = false;
      this._log('[亡] 战斗失败...', 'system');
      this._showResult(false);
    }
  }

  // ─── UI Panels ───
  _showActionPanel(unit) {
    const panel = document.getElementById('action-panel');
    const folder = SPRITE_MAP[unit.name];
    document.getElementById('action-portrait').src = `assets/sprites/portraits/${folder}.png`;
    document.getElementById('action-unit-name').textContent = `  ${unit.name} 的回合  `;

    const btnContainer = document.getElementById('action-buttons');
    btnContainer.innerHTML = '';

    // Normal attack
    const atkBtn = document.createElement('button');
    atkBtn.className = 'btn-xianxia';
    atkBtn.innerHTML = `<div class="btn-name">⚔ 普通攻击</div><div class="btn-stats">ATK:${unit.attack}  MP:0</div>`;
    atkBtn.onclick = () => {
      this.selectedSkill = null;
      this._showTargets();
    };
    btnContainer.appendChild(atkBtn);

    // Skills
    for (const sk of unit.skills) {
      const btn = document.createElement('button');
      btn.className = 'btn-xianxia';
      btn.disabled = unit.mp < sk.mpCost;
      const icon = SKILL_ICONS[sk.name] || '🔮';
      btn.innerHTML = `
        <div class="btn-name">${icon} ${sk.name}</div>
        <div class="btn-stats">ATK:${sk.power}  MP:${sk.mpCost}</div>
        <div class="btn-desc">${sk.desc}</div>
      `;
      btn.onclick = () => {
        this.selectedSkill = sk;
        if (sk.targetType === 'self') {
          panel.classList.add('hidden');
          this._executeSkill(unit, sk, unit);
        } else if (sk.targetType === 'all') {
          panel.classList.add('hidden');
          const enemies = this.enemyUnits.filter(u => !u.isDead);
          if (enemies.length > 0) this._executeSkill(unit, sk, enemies[0]);
        } else {
          this._showTargets();
        }
      };
      btnContainer.appendChild(btn);
    }

    panel.classList.remove('hidden');
  }

  _showTargets() {
    document.getElementById('action-panel').classList.add('hidden');
    const panel = document.getElementById('target-panel');
    const container = document.getElementById('target-buttons');
    container.innerHTML = '';

    for (const e of this.enemyUnits.filter(u => !u.isDead)) {
      const btn = document.createElement('button');
      btn.className = 'btn-target';
      btn.textContent = `${e.name}  HP:${e.hp}/${e.maxHp}`;
      btn.onclick = () => {
        panel.classList.add('hidden');
        const unit = this.currentUnit;
        if (this.selectedSkill) {
          this._executeSkill(unit, this.selectedSkill, e);
        } else {
          this._executeAttack(unit, e);
        }
      };
      container.appendChild(btn);
    }

    panel.classList.remove('hidden');
  }

  _showResult(won) {
    const panel = document.getElementById('result-panel');
    const text = document.getElementById('result-text');
    if (won) {
      text.className = 'result-win';
      text.textContent = '✦ 战斗胜利 ✦\n获得修为 +50';
    } else {
      text.className = 'result-lose';
      text.textContent = '✧ 道消身陨 ✧';
    }
    panel.classList.remove('hidden');
    document.getElementById('action-panel').classList.add('hidden');
    document.getElementById('target-panel').classList.add('hidden');
  }

  // ─── Battle Log ───
  _log(text, type = '') {
    const container = document.getElementById('log-content');
    const line = document.createElement('div');
    line.className = 'log-line ' + type;
    line.textContent = text;
    container.appendChild(line);
    const logEl = document.getElementById('battle-log');
    logEl.scrollTop = logEl.scrollHeight;
  }
}

// ─── Global Functions (for HTML onclick) ───
window.game_cancelTarget = function() {
  document.getElementById('target-panel').classList.add('hidden');
  const scene = game.scene.getScene('BattleScene');
  if (scene && scene.currentUnit) scene._showActionPanel(scene.currentUnit);
};

window.game_restart = function() {
  document.getElementById('result-panel').classList.add('hidden');
  document.getElementById('overhead-bars').innerHTML = '';
  document.getElementById('log-content').innerHTML = '';
  // Remove ATB icons
  document.querySelectorAll('.atb-icon').forEach(el => el.remove());
  game.scene.getScene('BattleScene').scene.restart();
};

// ─── Responsive Scaling (canvas + UI overlay sync) ───
function syncScale() {
  const wrapper = document.getElementById('game-wrapper');
  const overlay = document.getElementById('ui-overlay');
  const W = 1280, H = 720;
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const w = W * scale, h = H * scale;
  wrapper.style.width = w + 'px';
  wrapper.style.height = h + 'px';
  // Scale the overlay using CSS transform (keeps internal 1280x720 coordinate system)
  overlay.style.transformOrigin = '0 0';
  overlay.style.transform = `scale(${scale})`;
  overlay.style.width = W + 'px';
  overlay.style.height = H + 'px';
}

window.addEventListener('resize', syncScale);

// ─── Launch Phaser ───
const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#080a18',
  scene: [BattleScene],
  scale: {
    mode: Phaser.Scale.NONE,  // We handle scaling manually
  },
  render: {
    antialias: true,
    pixelArt: false,
  }
};

const game = new Phaser.Game(config);

// Initial scale sync after Phaser creates the canvas
requestAnimationFrame(syncScale);
