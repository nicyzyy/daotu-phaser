if (typeof Phaser === 'undefined') { console.log('Phaser not loaded, skipping game init'); } else {
/* ═══════════════════════════════════════════════════════
   道途 — Phaser 3 AP战斗系统 V5 (3+2轮换+头顶HP+音效+落地感)
   ═══════════════════════════════════════════════════════ */

// ─── Audio System ───
class AudioSystem {
  constructor() {
    this.audioContext = null;
    this.bgmGain = null;
    this.bgmOscillators = [];
    this.speechSynthesis = window.speechSynthesis;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.bgmGain = this.audioContext.createGain();
      this.bgmGain.connect(this.audioContext.destination);
      this.bgmGain.gain.value = 0.15;
    }
  }

  // BGM: 战斗音乐（多层次、紧张感）
  startBGM() {
    this.init();
    this.stopBGM();
    
    const ctx = this.audioContext;
    this.bgmGain.gain.value = 0.15;
    
    // 低频鼓点节奏（每 0.8 秒）
    const drumLoop = () => {
      if (!this.bgmOscillators.length) return;
      
      const drum = ctx.createOscillator();
      const drumGain = ctx.createGain();
      drum.type = 'sine';
      drum.frequency.value = 60;
      drumGain.gain.setValueAtTime(0.3, ctx.currentTime);
      drumGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      drum.connect(drumGain);
      drumGain.connect(this.bgmGain);
      drum.start(ctx.currentTime);
      drum.stop(ctx.currentTime + 0.15);
      
      setTimeout(drumLoop, 800);
    };
    
    // 战斗弦乐（锯齿波 + 低通滤波）
    const stringLoop = () => {
      if (!this.bgmOscillators.length) return;
      
      const notes = [220, 247, 277, 294, 330];
      const pattern = [0, 2, 1, 3, 2, 4, 2, 1];
      let time = 0;
      
      for (let i = 0; i < pattern.length; i++) {
        setTimeout(() => {
          if (!this.bgmOscillators.length) return;
          
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.value = notes[pattern[i]] * 0.5;
          filter.type = 'lowpass';
          filter.frequency.value = 800;
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
          
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.bgmGain);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.2);
        }, time);
        time += 600;
      }
      
      setTimeout(stringLoop, time);
    };
    
    // 高音点缀（模拟古筝拨弦）
    const pluckLoop = () => {
      if (!this.bgmOscillators.length) return;
      
      const notes = [440, 494, 554, 587];
      const note = notes[Math.floor(Math.random() * notes.length)];
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      
      setTimeout(pluckLoop, 2400 + Math.random() * 1600);
    };
    
    this.bgmOscillators.push(true);
    drumLoop();
    stringLoop();
    setTimeout(pluckLoop, 1200);
  }

  stopBGM() {
    this.bgmOscillators = [];
  }

  // 技能音效
  playSkillSound(element) {
    this.init();
    const ctx = this.audioContext;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // 根据五行属性设置不同音效
    switch (element) {
      case '金': // 清脆金属声
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.15);
        break;
      case '水': // 流水声
        osc.type = 'sine';
        osc.frequency.value = 440;
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.3);
        break;
      case '火': // 爆裂声
        osc.type = 'sawtooth';
        osc.frequency.value = 100;
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.2);
        break;
      case '木':
      case '毒': // 嘶嘶声
        osc.type = 'sawtooth';
        osc.frequency.value = 200;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.stop(ctx.currentTime + 0.4);
        break;
      case '土': // 低沉声
        osc.type = 'triangle';
        osc.frequency.value = 110;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
        break;
      default: // 物理攻击
        osc.type = 'sine';
        osc.frequency.value = 330;
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.2);
    }
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
  }

  // 我方角色语音播报技能名（优化版）
  speakSkillName(skillName) {
    if (!this.speechSynthesis) {
      // Fallback: 短促音效
      this.playChargeSound();
      return;
    }
    
    // 先播放蓄力音效
    this.playChargeSound();
    
    // 延迟播放语音
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(skillName);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.3;  // 快速有力
      utterance.pitch = 1.1;  // 稍高
      utterance.volume = 0.8;
      
      // 尝试选择中文语音
      const voices = this.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.startsWith('zh'));
      if (zhVoice) {
        utterance.voice = zhVoice;
      }
      
      this.speechSynthesis.cancel();
      this.speechSynthesis.speak(utterance);
    }, 80);
  }
  
  // 蓄力音效
  playChargeSound() {
    this.init();
    const ctx = this.audioContext;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }
}

const Audio = new AudioSystem();

// ─── Data Classes ───
class SkillData {
  constructor(name, desc, apCost, mpCost, power, targetType = 'single', damageType = 'physical', element = '无', effects = []) {
    this.name = name;
    this.desc = desc;
    this.apCost = apCost;
    this.mpCost = mpCost;
    this.power = power;
    this.targetType = targetType;
    this.damageType = damageType;
    this.element = element;
    this.effects = effects;
  }
}

class StatusEffect {
  constructor(name, type, duration, stacks = 1, icon = '•') {
    this.name = name;
    this.type = type;
    this.duration = duration;
    this.stacks = stacks;
    this.icon = icon;
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
    this.element = stats.element || '无';
    this.skills = stats.skills || [];
    this.atb = 0;
    this.isDead = false;
    this.maxAp = stats.maxAp || 3;
    this.ap = 0;
    this.statusEffects = [];
    this.isBench = false; // 是否在待机区
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
  addStatus(name, type, duration, stacks = 1, icon = '•') {
    const existing = this.statusEffects.find(s => s.name === name);
    if (existing) {
      existing.stacks += stacks;
      existing.duration = Math.max(existing.duration, duration);
    } else {
      this.statusEffects.push(new StatusEffect(name, type, duration, stacks, icon));
    }
  }
  hasStatus(name) {
    return this.statusEffects.some(s => s.name === name);
  }
  removeStatus(name) {
    this.statusEffects = this.statusEffects.filter(s => s.name !== name);
  }
  tickStatusEffects(scene) {
    for (const s of this.statusEffects) {
      if (s.name === '中毒') {
        const dmg = Math.ceil(this.maxHp * 0.03 * s.stacks);
        this.hp = Math.max(0, this.hp - dmg);
        UI.log(`${this.name} 受到中毒伤害 ${dmg}`, 'skill');
        UI.floatDmg(scene, this.name, dmg);
      } else if (s.name === '剧毒') {
        const dmg = Math.ceil(this.maxHp * 0.06 * s.stacks);
        this.hp = Math.max(0, this.hp - dmg);
        UI.log(`${this.name} 受到剧毒伤害 ${dmg}`, 'skill');
        UI.floatDmg(scene, this.name, dmg);
      } else if (s.name === '出血') {
        const dmg = Math.ceil(this.maxHp * 0.04 * s.stacks);
        this.hp = Math.max(0, this.hp - dmg);
        UI.log(`${this.name} 受到出血伤害 ${dmg}`, 'skill');
        UI.floatDmg(scene, this.name, dmg);
      } else if (s.name === '灼烧') {
        const dmg = Math.ceil(this.maxHp * 0.05 * s.stacks);
        this.hp = Math.max(0, this.hp - dmg);
        UI.log(`${this.name} 受到灼烧伤害 ${dmg}`, 'skill');
        UI.floatDmg(scene, this.name, dmg);
      } else if (s.name === '再生') {
        const heal = Math.ceil(this.maxHp * 0.05 * s.stacks);
        this.hp = Math.min(this.maxHp, this.hp + heal);
        UI.log(`${this.name} 再生恢复 ${heal} 生命`, 'heal');
        UI.floatDmg(scene, this.name, heal, true);
      }
    }
    
    this.statusEffects = this.statusEffects.filter(s => {
      s.duration--;
      return s.duration > 0;
    });

    if (this.hp <= 0 && !this.isDead) {
      this.isDead = true;
      UI.log(`[亡] ${this.name} 被击败了！`, 'kill');
      scene.time.delayedCall(300, () => {
        if (!scene.defeatedSet.has(this.name)) {
          scene.defeatedSet.add(this.name);
          scene._animDefeat(this.name);
        }
      });
    }
  }
}

// ─── Config ───
const SPRITE_MAP = {
  '云逸': 'yunyi', '灵溪': 'lingxi',
  '红袖': 'fengming', '雪蔷薇': 'moye', '药仙': 'zixuan',
  '妖狼': 'wolf', '毒蝎精': 'snake', '石魔': 'golem',
  '九尾妖狐': 'yaohu', '幽冥鬼王': 'guiwang',
};

const SKILL_ICONS = {
  '普通攻击': '⚔️',
  '破风剑': '⚔️', '三叠剑意': '🗡️', '万剑归宗': '⚡',
  '袖中刃': '🗡️', '毒舞天罗': '💃', '媚术': '💋', '蚀骨销魂': '☠️',
  '寒冰针': '❄️', '霜锁脉门': '🧊', '冰棺之术': '🔒', '碎冰爆': '💥',
  '灵泉术': '🌿', '生生诀': '🌸', '易伤咒': '👁️', '加速灵阵': '⚡', '天地归元': '☯️',
  '散毒粉': '☁️', '回春丹': '💊', '以毒攻毒': '⚗️', '灵丹妙药': '✨', '万毒归一': '☠️',
  '防御': '🛡️',
};

const STATUS_ICONS = {
  '破甲': '🔻', '灼烧': '🔥', '冰缓': '❄️', '冻结': '🧊', '封脉': '🚫',
  '剑意': '⚔️', '出血': '💢', '中毒': '☠️', '剧毒': '☠️', '心神不宁': '💫',
  '魅惑': '💋', '虚弱': '😵', '再生': '💚', '易伤': '👁️', '沉默': '🔇',
};

// ─── 五行克制系统 ───
function getElementMultiplier(attackElement, targetElement) {
  if (attackElement === '无' || targetElement === '无') return 1.0;
  if (attackElement === targetElement) return 1.0;
  
  const counterMap = {
    '金': '木',
    '木': '土',
    '土': '水',
    '水': '火',
    '火': '金',
  };
  
  if (counterMap[attackElement] === targetElement) return 1.5;
  if (counterMap[targetElement] === attackElement) return 0.75;
  return 1.0;
}

// ─── 站位系统（调整 y 坐标以对齐地面）───
const CHAR_HEIGHT = 200;
const GROUND_Y = 0.68; // 地面线位置

const ALLY_SLOTS = [
  { x: 0.20, y: GROUND_Y - 0.09, row: 'front' },
  { x: 0.23, y: GROUND_Y + 0.03, row: 'front' },
  { x: 0.20, y: GROUND_Y + 0.15, row: 'front' },
];

const ENEMY_SLOTS = [
  { x: 0.80, y: GROUND_Y - 0.09, row: 'front' },
  { x: 0.77, y: GROUND_Y + 0.03, row: 'front' },
  { x: 0.80, y: GROUND_Y + 0.15, row: 'front' },
];

const GW = 1280, GH = 720;
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
    this.activeAllies = []; // 3+2 轮换：上场的 3 人
    this.benchAllies = []; // 待机区的 2 人
    this.sprites = {};
    this.basePos = {};
    this.shadows = {}; // 角色阴影
    this.hpBars = {}; // 头顶 HP 条
    this.currentUnit = null;
    this.selectedSkill = null;
    this.isWaiting = false;
    this._waitStart = 0;
    this.battleActive = false;
    this.defeatedSet = new Set();
    this.atbSpeed = 30;
  }

  preload() {
    const V = 'v=46';
    this.load.image('battle_bg', `assets/bg/battle_bg.png?${V}`);
    // 只预加载 idle + portrait（快速启动），其他 pose 延迟加载
    for (const [, folder] of Object.entries(SPRITE_MAP)) {
      this.load.image(`${folder}_idle_left`, `assets/sprites/poses/${folder}/idle_left.png?${V}`);
      this.load.image(`${folder}_idle_right`, `assets/sprites/poses/${folder}/idle_right.png?${V}`);
      this.load.image(`${folder}_portrait`, `assets/sprites/portraits/${folder}.png?${V}`);
    }
  }

  create() {
    const bg = this.add.image(RW / 2, RH / 2, 'battle_bg');
    const src = this.textures.get('battle_bg').getSourceImage();
    bg.setScale(Math.max(RW / src.width, RH / src.height)).setDepth(-10);
    this.tweens.add({ targets: bg, x: { from: RW / 2 - 6 * DPR, to: RW / 2 + 6 * DPR }, duration: 12000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this._createAmbientEffects();
    this._createUnits();
    this._spawnSprites();
    this._buildATB();
    this.battleActive = true;
    UI.log('[战] 战斗开始!', 'system');
    
    // 延迟加载其他 pose（不阻塞战斗开始）
    const V = 'v=46';
    for (const [, folder] of Object.entries(SPRITE_MAP)) {
      for (const pose of ['attack', 'cast', 'hit', 'defeated']) {
        if (!this.textures.exists(`${folder}_${pose}_left`)) {
          this.load.image(`${folder}_${pose}_left`, `assets/sprites/poses/${folder}/${pose}_left.png?${V}`);
          this.load.image(`${folder}_${pose}_right`, `assets/sprites/poses/${folder}/${pose}_right.png?${V}`);
        }
      }
    }
    this.load.start();
    
    // Debug overlay
    const dbg = document.createElement('div');
    dbg.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);color:#0f0;font:14px monospace;text-shadow:0 0 4px #0f0;background:rgba(0,0,0,0.7);padding:2px 6px;z-index:99999;pointer-events:none;';
    document.body.appendChild(dbg);
    this._dbg = dbg;
    
    // 启动 BGM
    Audio.startBGM();
  }

  _createAmbientEffects() {
    // 原有粒子效果
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

    // 云雾
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

    // 灵气涌动
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

    // ✨ 新增：树叶/花瓣飘落效果 ✨
    this.time.addEvent({
      delay: 1500, loop: true,
      callback: () => {
        const x = Phaser.Math.Between(0, RW);
        const y = -20 * DPR;
        const sz = (3 + Math.random() * 4) * DPR;
        const colors = [0xffc0d0, 0xffe0b0, 0xd0e0a0, 0xffd0e0];
        const c = colors[Math.floor(Math.random() * colors.length)];
        const petal = this.add.ellipse(x, y, sz * 1.5, sz, c, 0.6 + Math.random() * 0.3).setDepth(-2);
        
        const drift = Phaser.Math.Between(-120, 120) * DPR;
        const fallTime = 8000 + Math.random() * 6000;
        
        this.tweens.add({
          targets: petal,
          x: x + drift,
          y: RH + 20 * DPR,
          angle: 360 + Math.random() * 720,
          alpha: 0,
          duration: fallTime,
          ease: 'Sine.easeInOut',
          onComplete: () => petal.destroy()
        });
      }
    });

    // ✨ 新增：地面灵气涌动光效 ✨
    this.time.addEvent({
      delay: 2000, loop: true,
      callback: () => {
        const x = Phaser.Math.Between(RW * 0.1, RW * 0.9);
        const y = RH * GROUND_Y + Phaser.Math.Between(-10, 10) * DPR;
        
        for (let i = 0; i < 3; i++) {
          const glow = this.add.circle(x, y, (2 + i * 2) * DPR, 0x80e0ff, 0.3 - i * 0.1).setDepth(-6);
          this.tweens.add({
            targets: glow,
            scaleX: 3 + i,
            scaleY: 0.5,
            alpha: 0,
            duration: 1500 + i * 300,
            ease: 'Quad.easeOut',
            onComplete: () => glow.destroy()
          });
        }
      }
    });

    const vig = this.add.graphics().setDepth(-1);
    vig.fillStyle(0x000000, 0.3);
    vig.fillRect(0, 0, RW, 40 * DPR);
    vig.fillRect(0, RH - 30 * DPR, RW, 30 * DPR);
  }

  update(_, delta) {
    // Debug 状态显示
    if (this._dbg) { 
      const ap = document.getElementById('action-panel');
      const tp = document.getElementById('target-panel');
      this._dbg.textContent = `W:${this.isWaiting?1:0} CU:${this.currentUnit?.name||'-'} AP:${this.currentUnit?.ap??'-'} BA:${this.battleActive?1:0} 面板:${ap?.classList.contains('hidden')?'隐':'显'} 目标:${tp?.classList.contains('hidden')?'隐':'显'}`;
    }
    
    if (!this.battleActive) return;
    if (this.isWaiting) {
      if (!this._waitStart) this._waitStart = Date.now();
      if (Date.now() - this._waitStart > 8000) {
        console.warn('[道途] isWaiting stuck for 8s, force unlocking');
        UI.log('[系统] 回合超时，自动恢复', 'system');
        document.getElementById('action-panel').classList.add('hidden');
        document.getElementById('target-panel').classList.add('hidden');
        this.isWaiting = false;
        this.currentUnit = null;
        this._waitStart = 0;
        this._checkEnd();
      }
      return;
    }
    this._waitStart = 0;

    for (const u of this.allUnits) {
      if (!u.isDead && !u.isBench) u.atb += u.getAtbSpeed() * this.atbSpeed * delta * 0.001;
    }
    this._tickATB();
    this._tickOverhead();

    let best = null, maxAtb = 0;
    for (const u of this.allUnits) {
      if (!u.isDead && !u.isBench && u.atb >= 100 && u.atb > maxAtb) { maxAtb = u.atb; best = u; }
    }
    if (best) {
      best.atb = 0;
      this.currentUnit = best;
      
      best.ap = best.maxAp;
      best.tickStatusEffects(this);
      this._refreshHP();
      
      // DOT 可能杀死 best，或冻结跳过回合
      if (best.isDead) {
        this._checkEnd();
        return; // isWaiting 还是 false，正常继续
      }
      
      if (best.hasStatus('冻结')) {
        UI.log(`${best.name} 被冻结，无法行动！`, 'system');
        best.removeStatus('冻结');
        return; // isWaiting 还是 false，正常继续
      }
      
      this.isWaiting = true; // 锁定，防止 update 重复触发
      this._waitStart = 0; // 重置看门狗
      if (best.isPlayer) {
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
      new BattleUnit('云逸', true, {
        hp: 120, mp: 60, attack: 20, defense: 8, agility: 75, spirit: 10, realm: '炼气期九层',
        element: '金', maxAp: 3,
        skills: [
          new SkillData('破风剑', '剑气破甲', 1, 5, 80, 'single', 'physical', '金', [
            { type: 'debuff', name: '破甲', duration: 3 }
          ]),
          new SkillData('三叠剑意', '三重剑意斩击', 2, 15, 150, 'single', 'physical', '金', [
            { type: 'self', name: '剑意', duration: 99, stacks: 1 }
          ]),
          new SkillData('万剑归宗', '万剑齐发', 4, 40, 200, 'all', 'magical', '金', []),
        ]
      }),
      new BattleUnit('红袖', true, {
        hp: 90, mp: 50, attack: 26, defense: 4, agility: 92, spirit: 10, realm: '炼气期九层',
        element: '毒', maxAp: 3,
        skills: [
          new SkillData('袖中刃', '暗器穿刺', 1, 8, 32, 'single', 'physical', '物理', [
            { type: 'debuff', name: '出血', duration: 2, chance: 0.5 }
          ]),
          new SkillData('毒舞天罗', '毒雾旋舞', 2, 20, 18, 'all', 'magical', '木', [
            { type: 'debuff', name: '剧毒', duration: 2 }
          ]),
          new SkillData('媚术', '魅惑降低命中', 1, 12, 0, 'single', 'debuff', '无', [
            { type: 'debuff', name: '心神不宁', duration: 3 }
          ]),
          new SkillData('蚀骨销魂', '剧毒连击', 3, 30, 200, 'single', 'magical', '毒', [
            { type: 'debuff', name: '沉默', duration: 2, condition: ['剧毒', '心神不宁'] }
          ]),
        ]
      }),
      new BattleUnit('灵溪', true, {
        hp: 90, mp: 100, attack: 10, defense: 6, agility: 55, spirit: 25, realm: '炼气期七层',
        element: '水', maxAp: 3,
        skills: [
          new SkillData('寒冰针', '冰锥刺穿', 1, 6, 70, 'single', 'magical', '水', [
            { type: 'debuff', name: '冰缓', duration: 2, chance: 0.2 }
          ]),
          new SkillData('霜锁脉门', '封锁灵脉', 2, 18, 100, 'single', 'magical', '水', [
            { type: 'debuff', name: '封脉', duration: 2 }
          ]),
          new SkillData('冰棺之术', '冰冻敌人', 3, 30, 0, 'single', 'debuff', '水', [
            { type: 'debuff', name: '冻结', duration: 1, requireStatus: '冰缓' }
          ]),
          new SkillData('碎冰爆', '碎冰溅射', 1, 12, 250, 'single', 'magical', '水', [
            { type: 'splash', ratio: 0.5, requireStatus: '冻结' }
          ]),
        ]
      }),
      new BattleUnit('雪蔷薇', true, {
        hp: 85, mp: 110, attack: 8, defense: 5, agility: 55, spirit: 30, realm: '炼气期八层',
        element: '木', maxAp: 3,
        skills: [
          new SkillData('灵泉术', '治愈术', 1, 10, 60, 'single_ally', 'heal', '木', []),
          new SkillData('生生诀', '再生术', 2, 25, 80, 'single_ally', 'heal', '木', [
            { type: 'buff', name: '再生', duration: 3 }
          ]),
          new SkillData('易伤咒', '降低防御', 1, 15, 0, 'single', 'debuff', '无', [
            { type: 'debuff', name: '易伤', duration: 2 }
          ]),
          new SkillData('加速灵阵', '增加行动点', 2, 20, 0, 'single_ally', 'buff', '无', [
            { type: 'ap_boost', amount: 2 }
          ]),
          new SkillData('天地归元', '群体治疗', 4, 50, 40, 'all_ally', 'heal', '木', [
            { type: 'cleanse', count: 1 }
          ]),
        ]
      }),
      new BattleUnit('药仙', true, {
        hp: 100, mp: 120, attack: 6, defense: 7, agility: 45, spirit: 30, realm: '炼气期七层',
        element: '木', maxAp: 3,
        skills: [
          new SkillData('散毒粉', '毒雾散播', 1, 8, 50, 'all', 'magical', '木', [
            { type: 'debuff', name: '中毒', duration: 3, chance: 0.4 }
          ]),
          new SkillData('回春丹', '治疗解毒', 1, 12, 30, 'single_ally', 'heal', '木', [
            { type: 'cleanse', poison: true }
          ]),
          new SkillData('以毒攻毒', '毒伤加倍', 2, 18, 0, 'single', 'debuff', '毒', [
            { type: 'debuff', name: '虚弱', duration: 2, requireStatus: '中毒' }
          ]),
          new SkillData('灵丹妙药', '随机增益', 2, 25, 0, 'single_ally', 'buff', '无', [
            { type: 'random_buff' }
          ]),
          new SkillData('万毒归一', '消耗全场毒层', 3, 35, 0, 'all', 'magical', '毒', [
            { type: 'consume_poison' }
          ]),
        ]
      }),
    ];
    
    // 3+2 轮换系统：前 3 人上场，后 2 人待机
    this.activeAllies = this.playerUnits.slice(0, 3);
    this.benchAllies = this.playerUnits.slice(3);
    for (const u of this.benchAllies) {
      u.isBench = true;
    }
    
    this.enemyUnits = [
      new BattleUnit('妖狼', false, {
        hp: 80, mp: 20, attack: 15, defense: 5, agility: 65, spirit: 5,
        element: '无', maxAp: 3,
        skills: [
          new SkillData('狂嗥', '群体嘶吼', 2, 10, 12, 'all', 'physical', '无', []),
          new SkillData('噬咬', '猛烈撕咬', 1, 5, 22, 'single', 'physical', '无', []),
        ]
      }),
      new BattleUnit('毒蝎精', false, {
        hp: 60, mp: 30, attack: 18, defense: 3, agility: 80, spirit: 12,
        element: '毒', maxAp: 3,
        skills: [
          new SkillData('毒雾', '毒气弥漫', 2, 15, 15, 'all', 'magical', '毒', []),
          new SkillData('蝎尾刺', '剧毒穿刺', 1, 8, 28, 'single', 'magical', '毒', []),
        ]
      }),
      new BattleUnit('石魔', false, {
        hp: 150, mp: 10, attack: 22, defense: 15, agility: 30, spirit: 3,
        element: '土', maxAp: 3,
        skills: [
          new SkillData('地裂', '大地震动', 2, 10, 18, 'all', 'physical', '土', []),
        ]
      }),
    ];
    
    this.allUnits = [...this.playerUnits, ...this.enemyUnits];
    for (const u of this.allUnits) {
      if (!u.isBench) u.atb = Math.random() * 20 + u.agility * 0.3;
    }
  }

  // ─── Sprites ───
  _spawnSprites() {
    let activeIdx = 0, enemyIdx = 0;
    
    for (const u of this.allUnits) {
      const folder = SPRITE_MAP[u.name];
      if (!folder) continue;
      
      if (u.isPlayer) {
        if (u.isBench) continue; // 待机区的不显示
        
        if (activeIdx >= ALLY_SLOTS.length) continue;
        const slot = ALLY_SLOTS[activeIdx++];
        
        const dir = 'right';
        const sp = this.add.image(RW * slot.x, RH * slot.y, `${folder}_idle_${dir}`);
        const texH = sp.texture.getSourceImage().height;
        const sc = (CHAR_HEIGHT * DPR) / texH;
        sp.setOrigin(0.5, 1.0); // 改为底部对齐
        sp.setScale(sc);
        sp.setDepth(Math.floor(RH * slot.y));
        sp.setData('folder', folder);
        sp.setData('dir', dir);
        sp.setData('sc', sc);
        sp.setData('slot', slot);
        this.sprites[u.name] = sp;
        this.basePos[u.name] = { x: RW * slot.x, y: RH * slot.y };
        
        // 添加阴影
        const shadow = this.add.ellipse(RW * slot.x, RH * slot.y + 5 * DPR, 40 * DPR, 12 * DPR, 0x000000, 0.25);
        shadow.setDepth(Math.floor(RH * slot.y) - 1);
        this.shadows[u.name] = shadow;
        
        this._idleAnim(u.name);
      } else {
        if (enemyIdx >= ENEMY_SLOTS.length) continue;
        const slot = ENEMY_SLOTS[enemyIdx++];
        
        const dir = 'left';
        const sp = this.add.image(RW * slot.x, RH * slot.y, `${folder}_idle_${dir}`);
        const texH = sp.texture.getSourceImage().height;
        const sc = (CHAR_HEIGHT * DPR) / texH;
        sp.setOrigin(0.5, 1.0);
        sp.setScale(sc);
        sp.setDepth(Math.floor(RH * slot.y));
        sp.setData('folder', folder);
        sp.setData('dir', dir);
        sp.setData('sc', sc);
        sp.setData('slot', slot);
        this.sprites[u.name] = sp;
        this.basePos[u.name] = { x: RW * slot.x, y: RH * slot.y };
        
        const shadow = this.add.ellipse(RW * slot.x, RH * slot.y + 5 * DPR, 40 * DPR, 12 * DPR, 0x000000, 0.25);
        shadow.setDepth(Math.floor(RH * slot.y) - 1);
        this.shadows[u.name] = shadow;
        
        this._idleAnim(u.name);
      }
    }
    
    // 创建头顶 HP 条
    for (const u of this.activeAllies) {
      this._createHPBar(u.name);
    }
    for (const u of this.enemyUnits) {
      this._createHPBar(u.name);
    }
  }

  _createHPBar(name) {
    const u = this.allUnits.find(x => x.name === name);
    if (!u) return;
    
    const sp = this.sprites[name];
    if (!sp) return;
    
    const barW = 80 * DPR;
    const barH = 6 * DPR;
    const offsetY = -sp.displayHeight - 8 * DPR;
    
    const graphics = this.add.graphics();
    graphics.setDepth(9999);
    
    this.hpBars[name] = {
      graphics: graphics,
      offsetY: offsetY,
      barW: barW,
      barH: barH,
    };
  }

  _updateHPBar(name) {
    const u = this.allUnits.find(x => x.name === name);
    if (!u || u.isBench) return;
    
    const sp = this.sprites[name];
    if (!sp || !sp.visible) return;
    
    const bar = this.hpBars[name];
    if (!bar) return;
    
    const g = bar.graphics;
    g.clear();
    
    const x = sp.x;
    const y = sp.y + bar.offsetY;
    
    // 背景
    g.fillStyle(0x000000, 0.6);
    g.fillRect(x - bar.barW / 2, y, bar.barW, bar.barH);
    
    // HP 条
    const hpRatio = u.hp / u.maxHp;
    const hpColor = u.isPlayer ? 0x40e860 : 0xe84040;
    g.fillStyle(hpColor, 1);
    g.fillRect(x - bar.barW / 2, y, bar.barW * hpRatio, bar.barH);
    
    // 边框
    g.lineStyle(1, u.isPlayer ? 0x60ffa0 : 0xff6060, 0.8);
    g.strokeRect(x - bar.barW / 2, y, bar.barW, bar.barH);
  }

  _hideHPBar(name) {
    const bar = this.hpBars[name];
    if (bar) {
      bar.graphics.clear();
    }
  }

  _idleAnim(name) {
    const sp = this.sprites[name], bp = this.basePos[name];
    if (!sp) return;
    const shadow = this.shadows[name];
    
    this.tweens.add({ targets: sp, y: { from: bp.y - 3 * DPR, to: bp.y + 3 * DPR }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: sp, x: { from: bp.x - 1.5 * DPR, to: bp.x + 1.5 * DPR }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    
    if (shadow) {
      this.tweens.add({ targets: shadow, x: { from: bp.x - 1.5 * DPR, to: bp.x + 1.5 * DPR }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    
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

    if (u && u.isPlayer && u.hp > 0 && u.hp <= u.maxHp * 0.25) {
      this._pose(name, 'idle');
      sp.setAlpha(1).setAngle(0).setPosition(bp.x, bp.y);
      const sc = sp.getData('sc');
      sp.setScale(sc);
      this.tweens.killTweensOf(sp);
      this.tweens.add({ targets: sp, x: { from: bp.x - 3 * DPR, to: bp.x + 3 * DPR }, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: sp, y: { from: bp.y - 2 * DPR, to: bp.y + 4 * DPR }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: sp, alpha: { from: 1.0, to: 0.6 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      sp.setTint(0xff8888);
      return;
    }

    this._pose(name, 'idle');
    sp.setAlpha(1).setAngle(0).setPosition(bp.x, bp.y);
    sp.setScale(sp.getData('sc'));
    sp.clearTint();
    this.tweens.killTweensOf(sp);
    this._idleAnim(name);
  }

  // ─── Animations ───
  _shake(intensity = 6, dur = 150) {
    this.cameras.main.shake(dur, intensity / 1000);
  }

  _flash(color = 0xffffff, dur = 80) {
    this.cameras.main.flash(dur, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff, true);
  }

  _animAttack(atk, tgt) {
    try {
    const sp = this.sprites[atk], bp = this.basePos[atk], tbp = this.basePos[tgt];
    if (!sp || !bp || !tbp || !sp.active) return;
    this.tweens.killTweensOf(sp);
    this._pose(atk, 'attack');

    const dir = tbp.x > bp.x ? 1 : -1;
    const sc = sp.getData('sc');
    this.tweens.chain({
      targets: sp,
      tweens: [
        { x: bp.x - dir * 15 * DPR, scaleX: sc * 0.92, scaleY: sc * 1.06, duration: 100, ease: 'Quad.easeOut' },
        { x: tbp.x - dir * 60 * DPR, scaleX: sc * 1.08, scaleY: sc * 0.95, duration: 120, ease: 'Back.easeIn',
          onComplete: () => {
            this._fxSlash(tgt);
            this._fxImpactBurst(tgt);
            this._animHit(tgt);
            this._shake(8, 120);
            this._flash(0xffffff, 60);
            Audio.playSkillSound('物理');
          }
        },
        { x: tbp.x - dir * 80 * DPR, duration: 60, ease: 'Quad.easeOut' },
        { x: bp.x, scaleX: sc, scaleY: sc, duration: 300, ease: 'Cubic.easeOut',
          onComplete: () => {
            try { this._resetIdle(atk); } catch(e) {}
          }
        },
      ]
    });
    } catch(e) { console.error('[道途] _animAttack error:', e); }
  }

  _fxSlash(tgt) {
    const sp = this.sprites[tgt];
    if (!sp) return;
    const cx = sp.x, cy = sp.y - 30 * DPR;

    for (let i = 0; i < 5; i++) {
      const w = (35 + i * 8) * DPR, h = 2 * DPR;
      const s = this.add.rectangle(cx - 10 * DPR + i * 8 * DPR, cy - i * 14 * DPR, w, h, 0x60ddff, 0.9)
        .setAngle(-25 + i * 12).setDepth(999);
      this.tweens.add({ targets: s, alpha: 0, scaleX: 2.8, scaleY: 0.3, duration: 200 + i * 30,
        ease: 'Quad.easeOut', onComplete: () => s.destroy() });
    }

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

  _fxImpactBurst(tgt) {
    const sp = this.sprites[tgt];
    if (!sp) return;
    const cx = sp.x, cy = sp.y;

    const ring = this.add.circle(cx, cy, 5 * DPR, 0xffffff, 0.7).setDepth(998);
    ring.setStrokeStyle(2 * DPR, 0xffdd44);
    this.tweens.add({
      targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 300,
      ease: 'Quad.easeOut', onComplete: () => ring.destroy()
    });
  }

  _animHit(tgt) {
    const sp = this.sprites[tgt], bp = this.basePos[tgt];
    if (!sp || !bp) return;
    this.tweens.killTweensOf(sp);
    this._pose(tgt, 'hit');
    sp.setTint(0xff3333);

    const sc = sp.getData('sc');
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
    
    const shadow = this.shadows[name];
    if (shadow) {
      this.tweens.add({ targets: shadow, alpha: 0, duration: 600 });
    }

    if (isAlly) {
      this.tweens.chain({
        targets: sp,
        tweens: [
          { alpha: 0.7, duration: 80, yoyo: true, repeat: 1 },
          { y: baseY + 25 * DPR, angle: -25,
            alpha: 1.0, duration: 700, ease: 'Bounce.easeOut' },
        ]
      });
      this._hideHPBar(name);
    } else {
      this.tweens.chain({
        targets: sp,
        tweens: [
          { alpha: 0.4, duration: 100, yoyo: true, repeat: 2 },
          { y: baseY + 40 * DPR, scaleY: sc * 0.7, alpha: 0.5,
            duration: 600, ease: 'Bounce.easeOut' },
          { alpha: 0, duration: 500, ease: 'Quad.easeIn',
            onComplete: () => { sp.setVisible(false); this._hideHPBar(name); }
          },
        ]
      });

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

  _animCast(caster, tgt, element = '无') {
    try {
    const sp = this.sprites[caster], bp = this.basePos[caster];
    if (!sp || !bp || !sp.active) return;
    this.tweens.killTweensOf(sp);
    this._pose(caster, 'cast');

    const sc = sp.getData('sc');
    sp.setTint(0xddbbff);
    this.tweens.add({
      targets: sp, scaleX: sc * 1.08, scaleY: sc * 1.08, duration: 200, yoyo: true, ease: 'Sine.easeInOut',
    });

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

    this.time.delayedCall(350, () => {
      const tgtSp = this.sprites[tgt];
      if (tgtSp && tgtSp.visible) {
        this._fxMagicProjectile(sp.x, sp.y, tgtSp);
        this.time.delayedCall(250, () => {
          this._fxFireExplosion(tgt);
          this._animHit(tgt);
          this._shake(6, 100);
          Audio.playSkillSound(element);
        });
      } else {
        Audio.playSkillSound(element);
      }
      sp.clearTint();
      this.time.delayedCall(700, () => {
        try { this._resetIdle(caster); } catch(e) {}
      });
    });
    } catch(e) { console.error('[道途] _animCast error:', e); }
  }

  _fxMagicProjectile(fromX, fromY, targetSp) {
    if (!targetSp) return;
    const ball = this.add.circle(fromX, fromY - 20 * DPR, 6 * DPR, 0xff6600, 1).setDepth(999);
    const glow = this.add.circle(fromX, fromY - 20 * DPR, 12 * DPR, 0xff8833, 0.3).setDepth(998);

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

  _fxFireExplosion(tgt) {
    const sp = this.sprites[tgt];
    if (!sp) return;
    const cx = sp.x, cy = sp.y;

    const flash = this.add.circle(cx, cy, 8 * DPR, 0xffaa00, 0.9).setDepth(999);
    this.tweens.add({ targets: flash, scaleX: 5, scaleY: 5, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

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
        y: cy + Math.sin(a) * speed * DPR - 15 * DPR,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 350 + Math.random() * 250,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      });
    }

    for (let i = 0; i < 5; i++) {
      const s = this.add.circle(cx + Phaser.Math.Between(-15, 15) * DPR, cy, (4 + Math.random() * 6) * DPR, 0x333333, 0.4).setDepth(997);
      this.tweens.add({
        targets: s, y: s.y - (50 + Math.random() * 30) * DPR, alpha: 0, scaleX: 2, scaleY: 2,
        duration: 600 + Math.random() * 300, ease: 'Quad.easeOut',
        onComplete: () => s.destroy()
      });
    }
  }

  _animHeal(name) {
    try {
    const sp = this.sprites[name];
    if (!sp || !this.basePos[name] || !sp.active) return;
    this.tweens.killTweensOf(sp);
    this._pose(name, 'cast');

    const sc = sp.getData('sc');

    sp.setTint(0x44ff66);
    this.tweens.add({ targets: sp, scaleX: sc * 1.05, scaleY: sc * 1.05, duration: 300, yoyo: true, ease: 'Sine.easeInOut' });

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

    this.time.delayedCall(700, () => {
      try { sp.clearTint(); this._resetIdle(name); } catch(e) {}
    });
    } catch(e) { console.error('[道途] _animHeal error:', e); }
  }

  // ─── ATB Bar ───
  _buildATB() {
    const bar = document.getElementById('atb-bar');
    bar.querySelectorAll('.atb-icon').forEach(e => e.remove());
    for (const u of this.allUnits) {
      if (u.isBench) continue; // 待机区的不显示
      
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
    const trackW = GW - 100;
    for (const u of this.allUnits) {
      if (u.isBench) continue;
      
      const el = document.getElementById(`atb-${u.name}`);
      if (!el) continue;
      const pct = Math.min(u.atb / 100, 1);
      el.style.left = `${50 + pct * trackW}px`;
      el.classList.toggle('dead', u.isDead);
    }
  }

  _tickOverhead() {
    for (const u of this.allUnits) {
      if (u.isBench) continue;
      
      this._updateHPBar(u.name);
    }
    this._refreshHP();
  }

  _refreshHP() {
    // 头顶 HP 条已经在 _tickOverhead 中更新了
  }

  // ─── Combat Logic ───
  _enemyAI(unit) {
    const alive = this.activeAllies.filter(u => !u.isDead);
    if (!alive.length) { this.isWaiting = false; this.currentUnit = null; this._checkEnd(); return; }

    const sorted = [...alive].sort((a, b) => a.hp - b.hp);
    const tgt = Math.random() < 0.6 ? sorted[0] : Phaser.Utils.Array.GetRandom(alive);

    if (unit.skills && unit.skills.length > 0 && Math.random() < 0.4) {
      const usable = unit.skills.filter(sk => unit.mp >= sk.mpCost && unit.ap >= sk.apCost);
      if (usable.length > 0) {
        const sk = Phaser.Utils.Array.GetRandom(usable);
        if (sk.damageType === 'heal' && unit.hp > unit.maxHp * 0.5) {
          this._doAttack(unit, tgt);
          return;
        }
        this._doSkill(unit, sk, sk.targetType === 'self' ? unit : tgt);
        return;
      }
    }
    this._doAttack(unit, tgt);
  }

  _doAttack(atk, tgt) {
    try {
    const dmg = atk.attack + Phaser.Math.Between(-3, 3);
    const actual = tgt.takeDamage(dmg);
    UI.log(`${atk.name} 攻击 ${tgt.name}，造成 ${actual} 伤害！`);
    UI.floatDmg(this, tgt.name, actual);
    this._refreshHP();
    if (tgt.isDead) {
      UI.log(`[亡] ${tgt.name} 被击败了！`, 'kill');
      this.time.delayedCall(500, () => { if (!this.defeatedSet.has(tgt.name)) { this.defeatedSet.add(tgt.name); this._animDefeat(tgt.name); } });
    }
    atk.ap -= 1;
    
    // 动画是纯视觉，fire-and-forget
    this._animAttack(atk.name, tgt.name);
    
    // 固定 800ms 后推进游戏（与动画完全解耦）
    setTimeout(() => { try { this._afterAction(atk); } catch(e) { this.isWaiting=false; this.currentUnit=null; } }, 800);
    } catch(e) {
      console.error('[道途] _doAttack error:', e);
      this.isWaiting = false; this.currentUnit = null; this._checkEnd();
    }
  }

  _doSkill(atk, skill, tgt) {
    if (!atk.useMp(skill.mpCost)) { UI.log('灵力不足！'); return; }
    try {
    
    atk.ap -= skill.apCost;
    
    // 我方角色语音播报技能名
    if (atk.isPlayer) {
      Audio.speakSkillName(skill.name);
    }
    
    let power = skill.power;
    if (skill.damageType === 'physical') power += atk.attack;
    else if (skill.damageType === 'magical') power += atk.spirit * 2;

    // 治疗技能
    if (skill.damageType === 'heal') {
      const amt = Math.floor(power + atk.spirit * (skill.power / 100));
      if (skill.targetType === 'all_ally') {
        const allies = this.activeAllies.filter(u => !u.isDead);
        for (const a of allies) {
          a.hp = Math.min(a.maxHp, a.hp + amt);
          UI.floatDmg(this, a.name, amt, true);
        }
        UI.log(`[灵] ${atk.name} 使用 ${skill.name}，全体恢复 ${amt} 生命！`, 'heal');
      } else if (skill.targetType === 'single_ally') {
        tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
        UI.log(`[灵] ${atk.name} 使用 ${skill.name}，${tgt.name} 恢复 ${amt} 生命！`, 'heal');
        UI.floatDmg(this, tgt.name, amt, true);
      } else {
        atk.hp = Math.min(atk.maxHp, atk.hp + amt);
        UI.log(`[灵] ${atk.name} 使用 ${skill.name}，恢复 ${amt} 生命！`, 'heal');
        UI.floatDmg(this, atk.name, amt, true);
      }
      
      for (const eff of skill.effects) {
        if (eff.type === 'buff') {
          tgt.addStatus(eff.name, 'buff', eff.duration, 1, STATUS_ICONS[eff.name] || '•');
        } else if (eff.type === 'cleanse') {
          if (eff.poison) {
            tgt.removeStatus('中毒');
            tgt.removeStatus('剧毒');
          } else if (eff.count) {
            const debuffs = tgt.statusEffects.filter(s => s.type === 'debuff');
            for (let i = 0; i < eff.count && debuffs.length > 0; i++) {
              tgt.removeStatus(debuffs[0].name);
            }
          }
        } else if (eff.type === 'ap_boost') {
          tgt.ap += eff.amount;
          UI.log(`${tgt.name} 获得 ${eff.amount} 行动点！`, 'heal');
        }
      }
      
      this._refreshHP();
      
      this._animHeal(atk.name);
      setTimeout(() => { try { this._afterAction(atk); } catch(e) { this.isWaiting=false; this.currentUnit=null; } }, 800);
      return;
    }

    // Buff/Debuff 技能
    if (skill.damageType === 'buff' || skill.damageType === 'debuff') {
      UI.log(`[灵] ${atk.name} 使用 ${skill.name}！`, 'skill');
      
      for (const eff of skill.effects) {
        if (eff.type === 'buff' || eff.type === 'debuff') {
          tgt.addStatus(eff.name, eff.type, eff.duration, eff.stacks || 1, STATUS_ICONS[eff.name] || '•');
        }
      }
      
      this._refreshHP();
      
      this._animHeal(atk.name);
      setTimeout(() => { try { this._afterAction(atk); } catch(e) { this.isWaiting=false; this.currentUnit=null; } }, 800);
      return;
    }

    // 攻击技能
    const targets = skill.targetType === 'all'
      ? (atk.isPlayer ? this.enemyUnits : this.activeAllies).filter(u => !u.isDead)
      : [tgt];

    for (const t of targets) {
      const elementMul = getElementMultiplier(skill.element, t.element);
      
      let swordWillBonus = 1.0;
      if (skill.name === '万剑归宗') {
        const swordWill = atk.statusEffects.filter(s => s.name === '剑意');
        if (swordWill.length > 0) {
          swordWillBonus = 1.0 + swordWill[0].stacks * 0.2;
        }
      }
      
      let vulnBonus = 1.0;
      if (t.hasStatus('易伤')) {
        vulnBonus = 1.25;
      }
      
      let comboBonus = 1.0;
      if (skill.name === '蚀骨销魂' && t.hasStatus('剧毒') && t.hasStatus('心神不宁')) {
        comboBonus = 2.5;
      }
      
      const finalDmg = Math.floor(power * elementMul * swordWillBonus * vulnBonus * comboBonus);
      const actual = t.takeDamage(finalDmg);
      
      const tag = skill.targetType === 'all' ? '火' : '雷';
      let logMsg = `[${tag}] ${atk.name} 对 ${t.name} 使用 ${skill.name}，${actual} 伤害！`;
      if (elementMul > 1.0) logMsg += ' (克制!)';
      if (elementMul < 1.0) logMsg += ' (被克)';
      UI.log(logMsg, 'skill');
      
      UI.floatDmg(this, t.name, actual);
      
      for (const eff of skill.effects) {
        if (eff.type === 'debuff') {
          if (eff.chance && Math.random() > eff.chance) continue;
          if (eff.requireStatus && !t.hasStatus(eff.requireStatus)) continue;
          if (eff.condition && !eff.condition.every(s => t.hasStatus(s))) continue;
          
          t.addStatus(eff.name, 'debuff', eff.duration, eff.stacks || 1, STATUS_ICONS[eff.name] || '•');
        } else if (eff.type === 'self') {
          atk.addStatus(eff.name, 'buff', eff.duration, eff.stacks || 1, STATUS_ICONS[eff.name] || '•');
        }
      }
      
      if (t.isDead) {
        UI.log(`[亡] ${t.name} 被击败了！`, 'kill');
        this.time.delayedCall(700, () => { if (!this.defeatedSet.has(t.name)) { this.defeatedSet.add(t.name); this._animDefeat(t.name); } });
      }
    }
    
    this._refreshHP();
    
    this._animCast(atk.name, tgt.name, skill.element);
    setTimeout(() => { try { this._afterAction(atk); } catch(e) { this.isWaiting=false; this.currentUnit=null; } }, 1000);
    } catch(e) {
      console.error('[道途] _doSkill error:', e);
      this.time.delayedCall(500, () => { this.isWaiting = false; this.currentUnit = null; this._checkEnd(); });
    }
  }

  // ✨ 3+2 轮换：换人 ✨
  swapUnit(activeUnit, benchUnit) {
    if (!activeUnit || !benchUnit) return;
    if (activeUnit.ap < 1) {
      UI.log('行动点不足，无法换人！', 'system');
      return;
    }
    
    activeUnit.ap -= 1;
    
    // 交换上场/待机状态
    activeUnit.isBench = true;
    benchUnit.isBench = false;
    benchUnit.atb = 0;
    
    // 更新列表
    const activeIdx = this.activeAllies.indexOf(activeUnit);
    const benchIdx = this.benchAllies.indexOf(benchUnit);
    
    if (activeIdx >= 0 && benchIdx >= 0) {
      this.activeAllies[activeIdx] = benchUnit;
      this.benchAllies[benchIdx] = activeUnit;
    }
    
    // 隐藏旧精灵
    const oldSp = this.sprites[activeUnit.name];
    if (oldSp) {
      oldSp.setVisible(false);
    }
    this._hideHPBar(activeUnit.name);
    const oldShadow = this.shadows[activeUnit.name];
    if (oldShadow) {
      oldShadow.setVisible(false);
    }
    
    // 显示新精灵
    const folder = SPRITE_MAP[benchUnit.name];
    const slot = ALLY_SLOTS[activeIdx];
    
    const dir = 'right';
    const sp = this.add.image(RW * slot.x, RH * slot.y, `${folder}_idle_${dir}`);
    const texH = sp.texture.getSourceImage().height;
    const sc = (CHAR_HEIGHT * DPR) / texH;
    sp.setOrigin(0.5, 1.0);
    sp.setScale(sc);
    sp.setDepth(Math.floor(RH * slot.y));
    sp.setData('folder', folder);
    sp.setData('dir', dir);
    sp.setData('sc', sc);
    sp.setData('slot', slot);
    this.sprites[benchUnit.name] = sp;
    this.basePos[benchUnit.name] = { x: RW * slot.x, y: RH * slot.y };
    
    const shadow = this.add.ellipse(RW * slot.x, RH * slot.y + 5 * DPR, 40 * DPR, 12 * DPR, 0x000000, 0.25);
    shadow.setDepth(Math.floor(RH * slot.y) - 1);
    this.shadows[benchUnit.name] = shadow;
    
    this._idleAnim(benchUnit.name);
    this._createHPBar(benchUnit.name);
    
    // 重建 ATB
    this._buildATB();
    
    UI.log(`${activeUnit.name} 退场，${benchUnit.name} 上场！`, 'system');
    
    // 继续当前角色的回合
    if (activeUnit.ap > 0) {
      UI.showAction(this, activeUnit);
    } else {
      this.isWaiting = false;
      this.currentUnit = null;
    }
  }


  // ─── 统一的回合后处理（与动画完全解耦）───
  _afterAction(unit) {
    try {
      if (!this.battleActive) return;
      this._waitStart = 0; // 重置看门狗计时！
      if (unit && unit.ap > 0 && unit.isPlayer && !unit.isDead) {
        this.isWaiting = true;
        UI.showAction(this, unit);
      } else {
        this.isWaiting = false;
        this.currentUnit = null;
        this._checkEnd();
      }
    } catch(e) {
      console.error('[道途] _afterAction error:', e);
      this.isWaiting = false;
      this.currentUnit = null;
    }
  }

  _checkEnd() {
    const ap = this.activeAllies.filter(u => !u.isDead);
    const ae = this.enemyUnits.filter(u => !u.isDead);
    if (ae.length === 0) { 
      this.battleActive = false; 
      UI.log('[胜] 战斗胜利！', 'system'); 
      UI.showResult(true); 
      Audio.stopBGM();
    }
    else if (ap.length === 0) { 
      this.battleActive = false; 
      UI.log('[亡] 战斗失败...', 'system'); 
      UI.showResult(false); 
      Audio.stopBGM();
    }
  }
}

// ═══════════════════════════════════════════════════════
// UI Module
// ═══════════════════════════════════════════════════════
const UI = {
  log(text, type = '') {
    const c = document.getElementById('log-content');
    const d = document.createElement('div');
    d.className = `log-line ${type}`;
    d.textContent = text;
    c.appendChild(d);
    while (c.children.length > 30) c.removeChild(c.firstChild);
    document.getElementById('battle-log').scrollTop = 99999;
  },

  floatDmg(scene, name, val, heal = false) {
    const sp = scene.sprites[name];
    if (!sp) return;
    const el = document.createElement('div');
    el.className = 'dmg-float' + (heal ? ' heal' : '');
    el.textContent = heal ? `+${val}` : `-${val}`;
    const cx = sp.x / DPR, cy = sp.y / DPR;
    el.style.left = `${cx + Phaser.Math.Between(-8, 8)}px`;
    el.style.top = `${cy - (sp.displayHeight / DPR) / 2 - 10}px`;
    document.getElementById('ui-overlay').appendChild(el);
    setTimeout(() => el.remove(), 1000);
  },

  showAction(scene, unit) {
    console.log('[UI] showAction called for', unit?.name, 'ap:', unit?.ap);
    const panel = document.getElementById('action-panel');
    const folder = SPRITE_MAP[unit.name];
    document.getElementById('action-portrait').src = `assets/sprites/poses/${folder}/idle_right.png`;
    document.getElementById('action-unit-name').innerHTML = `${unit.name} 的回合 <span class="ap-display">(AP: <span class="ap-dots" id="current-ap"></span>)</span>`;
    UI.updateAPDisplay(unit.ap, unit.maxAp);
    
    const bc = document.getElementById('action-buttons');
    bc.innerHTML = '';

    // 普通攻击
    const ab = document.createElement('button');
    ab.className = 'btn-skill';
    ab.disabled = unit.ap < 1;
    ab.innerHTML = `<span class="ap-badge">1</span><div class="skill-icon">⚔</div><div class="skill-name">普攻</div><div class="skill-cost">MP:0</div>`;
    ab.onclick = () => {
      scene.selectedSkill = null;
      UI.showTargets(scene);
    };
    bc.appendChild(ab);

    // 技能
    for (const sk of unit.skills) {
      const b = document.createElement('button');
      b.className = 'btn-skill';
      b.disabled = unit.mp < sk.mpCost || unit.ap < sk.apCost;
      
      let comboClass = '';
      if (sk.name === '三叠剑意' && scene.enemyUnits.some(e => !e.isDead && e.hasStatus('破甲'))) {
        comboClass = ' combo-ready';
      }
      if (sk.name === '蚀骨销魂' && scene.enemyUnits.some(e => !e.isDead && e.hasStatus('剧毒') && e.hasStatus('心神不宁'))) {
        comboClass = ' combo-ready';
      }
      if (sk.name === '碎冰爆' && scene.enemyUnits.some(e => !e.isDead && e.hasStatus('冻结'))) {
        comboClass = ' combo-ready';
      }
      
      b.className += comboClass;
      
      const ico = SKILL_ICONS[sk.name] || '🔮';
      const elementTag = sk.element !== '无' ? `<span class="element-badge">${sk.element}</span>` : '';
      b.innerHTML = `<span class="ap-badge">${sk.apCost}</span><div class="skill-icon">${ico}</div><div class="skill-name">${sk.name.slice(0, 4)}${elementTag}</div><div class="skill-cost">MP:${sk.mpCost}</div>`;
      b.onclick = () => {
        scene.selectedSkill = sk;
        if (sk.targetType === 'self') { panel.classList.add('hidden'); scene._doSkill(unit, sk, unit); }
        else if (sk.targetType === 'all') { panel.classList.add('hidden'); const es = scene.enemyUnits.filter(u => !u.isDead); if (es.length) scene._doSkill(unit, sk, es[0]); }
        else if (sk.targetType === 'all_ally') { panel.classList.add('hidden'); scene._doSkill(unit, sk, unit); }
        else if (sk.targetType === 'single_ally') { panel.classList.add('hidden'); UI.showAllyTargets(scene); }
        else UI.showTargets(scene);
      };
      bc.appendChild(b);
    }
    
    // ✨ 换人按钮 ✨
    const swapBtn = document.createElement('button');
    swapBtn.className = 'btn-skill btn-swap';
    swapBtn.disabled = unit.ap < 1 || scene.benchAllies.filter(u => !u.isDead).length === 0;
    swapBtn.innerHTML = `<span class="ap-badge">1</span><div class="skill-icon">🔄</div><div class="skill-name">换人</div><div class="skill-cost">MP:0</div>`;
    swapBtn.onclick = () => {
      UI.showSwapPanel(scene, unit);
    };
    bc.appendChild(swapBtn);
    
    // ─── 结束回合按钮（永远可用！）───
    const endBtn = document.createElement('button');
    endBtn.className = 'btn-skill btn-end-turn';
    endBtn.innerHTML = `<div class="skill-icon">⏭️</div><div class="skill-name">结束</div><div class="skill-cost">跳过</div>`;
    endBtn.onclick = () => {
      panel.classList.add('hidden');
      unit.ap = 0;
      scene.isWaiting = false;
      scene.currentUnit = null;
      scene._checkEnd();
    };
    bc.appendChild(endBtn);
    
    panel.classList.remove('hidden');
    console.log('[UI] action-panel hidden?', panel.classList.contains('hidden'), 'display:', getComputedStyle(panel).display);
  },

  updateAPDisplay(current, max) {
    const container = document.getElementById('current-ap');
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('span');
      dot.className = i < current ? 'ap-dot active' : 'ap-dot';
      dot.textContent = '●';
      container.appendChild(dot);
    }
  },

  showTargets(scene) {
    document.getElementById('action-panel').classList.add('hidden');
    const panel = document.getElementById('target-panel');
    const tc = document.getElementById('target-buttons');
    tc.innerHTML = '';
    document.querySelector('.panel-title').textContent = '选择目标';
    
    for (const e of scene.enemyUnits.filter(u => !u.isDead)) {
      const b = document.createElement('button');
      b.className = 'btn-target';
      
      let statusText = '';
      if (e.statusEffects.length > 0) {
        statusText = ' ' + e.statusEffects.map(s => s.icon).join('');
      }
      
      b.textContent = `${e.name} [${e.element}] HP:${e.hp}/${e.maxHp}${statusText}`;
      b.onclick = () => {
        panel.classList.add('hidden');
        if (!scene.currentUnit || scene.currentUnit.isDead) return;
        if (scene.selectedSkill) scene._doSkill(scene.currentUnit, scene.selectedSkill, e);
        else scene._doAttack(scene.currentUnit, e);
      };
      tc.appendChild(b);
    }
    panel.classList.remove('hidden');
  },

  showAllyTargets(scene) {
    document.getElementById('action-panel').classList.add('hidden');
    const panel = document.getElementById('target-panel');
    const tc = document.getElementById('target-buttons');
    tc.innerHTML = '';
    document.querySelector('.panel-title').textContent = '选择友方目标';
    for (const a of scene.activeAllies.filter(u => !u.isDead)) {
      const b = document.createElement('button');
      b.className = 'btn-target';
      b.style.borderColor = 'rgba(64,232,96,0.4)';
      b.textContent = `${a.name}  HP:${a.hp}/${a.maxHp}`;
      b.onclick = () => {
        panel.classList.add('hidden');
        if (!scene.currentUnit || scene.currentUnit.isDead) return;
        scene._doSkill(scene.currentUnit, scene.selectedSkill, a);
      };
      tc.appendChild(b);
    }

    panel.classList.remove('hidden');
  },

  // ✨ 显示换人面板 ✨
  showSwapPanel(scene, activeUnit) {
    document.getElementById('action-panel').classList.add('hidden');
    const panel = document.getElementById('target-panel');
    const tc = document.getElementById('target-buttons');
    tc.innerHTML = '';
    document.querySelector('.panel-title').textContent = '选择替换角色';
    
    for (const b of scene.benchAllies.filter(u => !u.isDead)) {
      const btn = document.createElement('button');
      btn.className = 'btn-target';
      btn.style.borderColor = 'rgba(64,232,224,0.4)';
      btn.textContent = `${b.name} [${b.element}] HP:${b.hp}/${b.maxHp} MP:${b.mp}/${b.maxMp}`;
      btn.onclick = () => {
        panel.classList.add('hidden');
        scene.swapUnit(activeUnit, b);
      };
      tc.appendChild(btn);
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
  document.getElementById('log-content').innerHTML = '';
  document.querySelectorAll('.atb-icon').forEach(e => e.remove());
  game.scene.getScene('BattleScene').scene.restart();
};

// ─── Responsive Scale ───
function syncScale() {
  const w = document.getElementById('game-wrapper');
  if (!w) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / GW, vh / GH);
  w.style.transform = `scale(${scale})`;
  w.style.marginLeft = `${(vw - GW * scale) / 2}px`;
  w.style.marginTop = `${(vh - GH * scale) / 2}px`;
}
window.addEventListener('resize', syncScale);
window.addEventListener('orientationchange', () => setTimeout(syncScale, 200));
// 处理iOS安全区域变化
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncScale);
}

// ─── Launch ───
const config = {
  type: Phaser.CANVAS,
  width: RW,
  height: RH,
  parent: 'game-container',
  backgroundColor: '#080a18',
  scene: [BattleScene],
  scale: { mode: Phaser.Scale.NONE },
  input: { touch: true, mouse: true },
  render: { antialias: true, roundPixels: false, pixelArt: false },
};

let game;
try {
  game = new Phaser.Game(config);
} catch(e) {
  document.getElementById('crash-info').style.display = 'block';
  document.getElementById('crash-detail').textContent = 'Phaser init: ' + e.message;
}
requestAnimationFrame(syncScale);

// ─── 独立看门狗（不依赖 Phaser update loop）───
setInterval(() => {
  try {
    if (!game) return;
    const scene = game.scene.getScene('BattleScene');
    if (!scene || !scene.battleActive) return;
    if (scene.isWaiting && scene._waitStart && Date.now() - scene._waitStart > 8000) {
      console.warn('[看门狗] 8s 超时，强制恢复');
      document.getElementById('action-panel').classList.add('hidden');
      document.getElementById('target-panel').classList.add('hidden');
      scene.isWaiting = false;
      scene.currentUnit = null;
      scene._waitStart = 0;
      scene._checkEnd();
    }
  } catch(e) {}
}, 1000);

}