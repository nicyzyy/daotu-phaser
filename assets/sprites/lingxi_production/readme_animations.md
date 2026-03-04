# 灵溪 (Lingxi) — Game Asset Package
**Version:** 1.0  
**Date:** 2026-03-04  
**Style:** Light Cyber + New Chinese Style (轻赛博新国风)  
**Target:** Top-down 2D RPG / Xianxia game

---

## 📦 Asset Inventory

### 1. Character Design Reference
| File | Description | Size | Use Case |
|------|-------------|------|----------|
| `design/lingxi_front.png` | Front view (正面) | 1024×1024 | 3D modeling, costume reference |
| `design/lingxi_side.png` | Side view (侧面) | 1024×1024 | Silhouette, proportions |
| `design/lingxi_back.png` | Back view (背面) | 1024×1024 | Full turnaround |
| `design/lingxi_colorpalette.png` | Color palette + materials | 1024×1024 | Shader setup, color grading |

**Color Palette:**
- Main: Crimson Red `#C41E3A`
- Secondary: Pure White `#FAFAFA`
- Accent: Warm Gold `#D4A843`
- Skin: Porcelain `#F5E6D3`
- Hair: Dark Auburn `#8B4513`
- Metal: Antique Bronze `#CD7F32`

---

### 2. Dialogue Portraits (Half-Body)
| File | Emotion | Use Case |
|------|---------|----------|
| `dialogue/lingxi_dialogue_neutral.png` | 平静 Neutral | Default dialogue |
| `dialogue/lingxi_dialogue_happy.png` | 开心 Happy | Positive outcomes |
| `dialogue/lingxi_dialogue_surprised.png` | 惊讶 Surprised | Plot twists, discoveries |
| `dialogue/lingxi_dialogue_confused.png` | 疑惑 Confused | Questions, puzzles |
| `dialogue/lingxi_dialogue_angry.png` | 生气 Angry | Conflict, warnings |
| `dialogue/lingxi_dialogue_sad.png` | 悲伤 Sad | Negative outcomes |

**Specs:**
- Resolution: 1024×1024 RGBA PNG
- Composition: Half-body (chest up)
- Gaze: 5-15° off-camera to left
- UI Safe Zone: Center 80% (key features within)
- Background: Soft gradient (neutral warm tone)

---

### 3. Overworld Walk Sprites

#### 3.1 Idle Animation (待机)
**Format:** 4-frame horizontal sprite sheets  
**Naming:** `walk/lingxi_idle_{direction}.png`  
**Frame Rate:** 4 fps (250ms per frame)  
**Loop:** Seamless (Frame 4 → Frame 1)

| Direction Code | File | Description |
|----------------|------|-------------|
| `s` | `lingxi_idle_s.png` | South (facing camera) |
| `sw` | `lingxi_idle_sw.png` | Southwest |
| `w` | `lingxi_idle_w.png` | West (left profile) |
| `nw` | `lingxi_idle_nw.png` | Northwest |
| `n` | `lingxi_idle_n.png` | North (back) |
| `ne` | `lingxi_idle_ne.png` | Northeast |
| `e` | `lingxi_idle_e.png` | East (right profile) |
| `se` | `lingxi_idle_se.png` | Southeast |

**Animation Details:**
- Frame 1: Neutral standing pose
- Frame 2: Inhale (body rises 1-2px)
- Frame 3: Full inhale + subtle weight shift
- Frame 4: Exhale (return to neutral)

---

#### 3.2 Walk Cycle (行走)
**Format:** 8-frame horizontal sprite sheets  
**Naming:** `walk/lingxi_walk_{direction}.png`  
**Frame Rate:** 8-10 fps (100-125ms per frame)  
**Loop:** Seamless (Frame 8 → Frame 1)

| Direction Code | File |
|----------------|------|
| `s` | `lingxi_walk_s.png` |
| `sw` | `lingxi_walk_sw.png` |
| `w` | `lingxi_walk_w.png` |
| `nw` | `lingxi_walk_nw.png` |
| `n` | `lingxi_walk_n.png` |
| `ne` | `lingxi_walk_ne.png` |
| `e` | `lingxi_walk_e.png` |
| `se` | `lingxi_walk_se.png` |

**Animation Details (Standard Walk Cycle):**
1. Contact (right foot forward, heel strike)
2. Recoil (weight transfer, slight dip)
3. Passing (left leg passes, body rises)
4. High point (left foot forward, body highest)
5. Contact (left foot forward, heel strike)
6. Recoil (weight transfer, slight dip)
7. Passing (right leg passes, body rises)
8. High point (right foot forward, body highest)

**Notes:**
- Lower body displacement > upper body movement
- Head vertical movement: max 2-3 pixels
- Hair and robes flow naturally with movement
- Bronze furnace floats beside character, subtle lag animation recommended

---

### 4. Ride/Mount Sprites

#### 4.1 Ride Idle (骑行待机)
**Format:** 4-frame horizontal sprite sheets  
**Naming:** `ride/lingxi_ride_idle_{direction}.png`  
**Frame Rate:** 4 fps  
**Loop:** Seamless

| Direction | File |
|-----------|------|
| South | `lingxi_ride_idle_s.png` |
| Southwest | `lingxi_ride_idle_sw.png` |
| West | `lingxi_ride_idle_w.png` |
| Northwest | `lingxi_ride_idle_nw.png` |
| North | `lingxi_ride_idle_n.png` |
| Northeast | `lingxi_ride_idle_ne.png` |
| East | `lingxi_ride_idle_e.png` |
| Southeast | `lingxi_ride_idle_se.png` |

**Animation Details:**
- 灵溪 sits sidesaddle on white spirit deer (灵鹿)
- Gentle breathing animation
- Deer: ear flicks, subtle weight shifts
- Character: upper body breathing motion
- Bronze furnace floats beside mount

---

#### 4.2 Ride Move (骑行移动)
**Format:** 8-frame horizontal sprite sheets  
**Naming:** `ride/lingxi_ride_move_{direction}.png`  
**Frame Rate:** 10-12 fps  
**Loop:** Seamless

| Direction | File |
|-----------|------|
| South | `lingxi_ride_move_s.png` |
| Southwest | `lingxi_ride_move_sw.png` |
| West | `lingxi_ride_move_w.png` |
| Northwest | `lingxi_ride_move_nw.png` |
| North | `lingxi_ride_move_n.png` |
| Northeast | `lingxi_ride_move_ne.png` |
| East | `lingxi_ride_move_e.png` |
| Southeast | `lingxi_ride_move_se.png` |

**Animation Details (Deer Gallop Cycle):**
1. Stride (legs extended)
2. Gather (legs pulling in)
3. Lift (preparing to leap)
4. Airborne (all legs off ground)
5. Land (front legs contact)
6. Stride (opposite phase)
7. Gather
8. Lift

**Character Reaction:**
- Torso remains stable
- Hair and robes flow backward
- Slight up-down bob matching deer's gait
- Hands hold reins gently

---

#### 4.3 Mount/Dismount Transitions
**Format:** 6-frame horizontal sprite sheets  
**Naming:** `ride/lingxi_mount_s.png`, `ride/lingxi_dismount_s.png`  
**Frame Rate:** 12 fps (83ms per frame)  
**Loop:** One-shot (does not loop)

| File | Transition | Frames |
|------|-----------|--------|
| `lingxi_mount_s.png` | Walk Idle → Ride Idle | 6 |
| `lingxi_dismount_s.png` | Ride Idle → Walk Idle | 6 |

**Mount Sequence:**
1. Standing beside deer
2. Placing hands, lifting foot
3. Mid-leap over deer
4. Swinging leg over
5. Settling into sidesaddle
6. Adjusting robes (transition complete)

**Dismount Sequence:**
1. Seated, preparing to dismount
2. Swinging leg over
3. Sliding down, both feet to one side
4. Landing, one foot touching ground
5. Both feet grounded, steadying
6. Standing beside deer (transition complete)

**Note:** Currently generated for South direction only. For full 8-direction support, generate additional directional variants if needed.

---

## 🎨 Technical Specifications

### Sprite Sheet Format
- **Resolution:** 1024×1024 per sheet
- **File Format:** PNG with transparency (RGBA)
- **Background:** Solid green `#00FF00` (chroma key for extraction)
- **Frame Layout:** Horizontal strip (frames arranged left to right)
- **Character Scale:** Chibi/SD proportion (3-head-tall ratio) for overworld
- **Camera Angle:** Top-down RPG perspective (~30° elevation)

### Frame Extraction
Each sprite sheet contains multiple frames in a single horizontal row. To extract individual frames:

1. **Calculate frame width:** `frame_width = sheet_width / frame_count`
2. **Extract frames:** Crop each frame using `(x * frame_width, 0, (x+1) * frame_width, sheet_height)`
3. **Remove green background:** Apply chroma key masking on `#00FF00`
4. **Trim transparent pixels:** Crop to content bounding box (optional, for optimization)

Example (Python + Pillow):
```python
from PIL import Image

sheet = Image.open("lingxi_walk_s.png")
frame_count = 8
frame_width = sheet.width // frame_count

frames = []
for i in range(frame_count):
    frame = sheet.crop((i * frame_width, 0, (i+1) * frame_width, sheet.height))
    # Chroma key removal (green -> transparent)
    frame = frame.convert("RGBA")
    datas = frame.getdata()
    newData = []
    for item in datas:
        if item[0] < 10 and item[1] > 240 and item[2] < 10:  # Green threshold
            newData.append((255, 255, 255, 0))  # Transparent
        else:
            newData.append(item)
    frame.putdata(newData)
    frames.append(frame)
```

---

### Anchor Points / Pivot
Recommended pivot point for all sprites: **Center-Bottom** (0.5, 1.0)
- X: Horizontal center of character
- Y: Bottom of feet (ground contact point)

This ensures:
- Character stands correctly on ground tiles
- Rotation pivots around natural center
- Consistent positioning across animations

**Adjustments for riding sprites:**
- Deer's feet touch ground → pivot at deer's bottom
- Character offset is baked into sprite positioning

---

### Animation Blending / Transitions

#### State Machine Suggestions
```
Walk Idle ←→ Walk Cycle (instant transition)
Walk Idle → Mount (6-frame transition) → Ride Idle
Ride Idle ←→ Ride Move (instant transition)
Ride Idle → Dismount (6-frame transition) → Walk Idle
```

#### Blend Timing
- **Walk ↔ Idle:** Frame 1 of walk cycle = Idle frame 1 → seamless
- **Mount/Dismount:** One-shot animations, no loop
- **Direction changes:** Cross-fade over 2-3 frames (100-150ms) or instant snap based on game feel

---

## 📐 Naming Convention

### Standard Format
```
{character}_{category}_{detail}_{direction}.png
```

**Examples:**
- `lingxi_walk_s.png` → 灵溪 walk animation, south direction
- `lingxi_ride_idle_nw.png` → 灵溪 riding idle, northwest direction
- `lingxi_dialogue_happy.png` → 灵溪 dialogue portrait, happy emotion

### Direction Codes
| Code | Full Name | Angle |
|------|-----------|-------|
| `n` | North | 0° (back) |
| `ne` | Northeast | 45° |
| `e` | East | 90° (right) |
| `se` | Southeast | 135° |
| `s` | South | 180° (front) |
| `sw` | Southwest | 225° |
| `w` | West | 270° (left) |
| `nw` | Northwest | 315° |

---

## 🔍 Quality Assurance Checklist

### Character Consistency
- [ ] Hair color (dark auburn) matches across all sprites
- [ ] Plum blossom hairpins visible in all angles
- [ ] Cinnabar forehead mark present
- [ ] Red-white hanfu coloring consistent
- [ ] High slit shows legs clearly (except back views)
- [ ] Bronze furnace floats beside character
- [ ] Proportions consistent (3-head-tall for overworld)

### Animation Quality
- [ ] Idle animations loop seamlessly (no pop on frame 4→1)
- [ ] Walk cycles have natural weight shift
- [ ] Head bob limited to 2-3 pixels
- [ ] Hair/robe secondary motion present
- [ ] Deer anatomy looks natural in ride sprites
- [ ] Mount/dismount transitions are smooth

### Technical
- [ ] All files are 1024×1024 RGBA PNG
- [ ] Green background is pure `#00FF00`
- [ ] Frames are evenly spaced horizontally
- [ ] No frame overlap or gaps
- [ ] Transparent edges are clean (no green fringe)

---

## 🚀 Integration Example (Phaser 3)

```javascript
// Load sprite sheets
this.load.spritesheet('lingxi_walk_s', 'assets/sprites/lingxi_production/walk/lingxi_walk_s.png', {
    frameWidth: 128,  // 1024 / 8 frames = 128px per frame
    frameHeight: 1024
});

this.load.spritesheet('lingxi_idle_s', 'assets/sprites/lingxi_production/walk/lingxi_idle_s.png', {
    frameWidth: 256,  // 1024 / 4 frames = 256px per frame
    frameHeight: 1024
});

// Create animations
this.anims.create({
    key: 'walk_south',
    frames: this.anims.generateFrameNumbers('lingxi_walk_s', { start: 0, end: 7 }),
    frameRate: 10,
    repeat: -1  // Loop infinitely
});

this.anims.create({
    key: 'idle_south',
    frames: this.anims.generateFrameNumbers('lingxi_idle_s', { start: 0, end: 3 }),
    frameRate: 4,
    repeat: -1
});

// Use in game
const lingxi = this.add.sprite(400, 300, 'lingxi_idle_s');
lingxi.play('idle_south');

// Switch to walking
lingxi.play('walk_south');
```

---

## 📝 Production Notes

### AI Generation Details
- **Model:** Gemini 2.5 Flash Image
- **Generation Date:** 2026-03-04
- **Reference:** `daotu-game/assets/concept/v3/02_lingxi.png`
- **Style Keywords:** Light cyber, new Chinese style (轻赛博新国风), chibi, top-down RPG

### Known Limitations
1. **Frame consistency:** AI-generated sprite sheets may have slight character drift between frames. For production use, consider:
   - Manual cleanup pass in Aseprite/Photoshop
   - Skeletal animation tool (Spine, DragonBones) for pixel-perfect consistency
   - Using these as reference for hand-drawn sprites

2. **Talisman text:** The 符箓 (talisman papers) have AI-generated pseudo-Chinese characters. Replace with real seal script (篆书) for authenticity.

3. **Mount/dismount:** Currently only South direction generated. Extend to 8 directions if game requires full directional transitions.

4. **Deer anatomy:** Some frames may have stiff leg positioning. Review and adjust if needed.

### Recommended Post-Processing
1. **Chroma key cleanup:** Check for green fringe around edges after extraction
2. **Frame alignment:** Ensure characters are vertically aligned across frames (no floating/sinking)
3. **Optimize file size:** Batch compress PNGs with tools like `pngquant` or `oxipng`
4. **Atlas packing:** Combine all extracted frames into a texture atlas for better performance

---

## 📧 Asset Credits
**Character Design:** 灵溪 (Lingxi)  
**Art Direction:** Light Cyber + New Chinese Style  
**Production:** AI-assisted asset generation  
**Technical Documentation:** OpenClaw Agent System  
**Game:** 道途 (Daotu) — Xianxia RPG  

---

**End of Document**  
For questions or additional asset requests, contact the project team.
