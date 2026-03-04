#!/bin/bash
set -e
cd /home/node/.openclaw/workspace/daotu-phaser

GEN="python3 /app/skills/openai-image-gen/scripts/gen.py --model gpt-image-1 --size 1024x1536 --quality high --background transparent --count 1"
COMMON="full body from head to toe clearly visible, character fills 90 percent of frame height, centered, high detail sharp edges, no white outline, no white border, no glow edge, clean transparent background, 2D Chinese xianxia RPG game battle sprite art, vibrant saturated colors, detailed shading, mature adult female"

gen() {
  local slot=$1 desc=$2 pose=$3 pdesc=$4
  local dir="assets/sprites/poses/$slot"
  mkdir -p "$dir"
  
  echo "  [$slot/$pose] generating..."
  $GEN --out-dir /tmp/gen_${slot}_${pose} --prompt "$desc, $pdesc, facing right, 3/4 view, $COMMON" 2>/dev/null
  
  local src=$(ls /tmp/gen_${slot}_${pose}/*.png 2>/dev/null | head -1)
  if [ -n "$src" ]; then
    cp "$src" "$dir/${pose}_right.png"
    convert "$src" -flop "$dir/${pose}_left.png"
    rm -rf /tmp/gen_${slot}_${pose}
    echo "  ✅ $pose"
  else
    echo "  ❌ $pose FAILED"
    rm -rf /tmp/gen_${slot}_${pose}
  fi
}

HONGXIU="beautiful Chinese woman dancer assassin, long wavy brown hair with gold chain headpiece and red gem earrings, wearing elegant deep crimson qipao battle dress with high slit and gold trim, hidden throwing daggers in sleeves, seductive but deadly, mature adult woman"

XUEQW="beautiful Chinese woman ice mage cultivator, long silver-white hair with ice crystal hair ornaments, wearing flowing white and ice-blue gradient hanfu dress with frost patterns, holding a crystal ice staff with glowing blue tip, cold ethereal beauty, mature adult woman"

YAOXIAN="beautiful Chinese woman healer alchemist cultivator, silver-white hair in elegant updo bun with green jade hairpins, green teardrop gem on forehead, wearing white flowing hanfu robe with green accents, accompanied by floating green and gold alchemy cauldron, serene wise expression, mature adult woman"

echo "═══ 红袖 (fengming) ═══"
gen fengming "$HONGXIU" idle "standing in elegant battle stance, one hand on hip"
gen fengming "$HONGXIU" attack "throwing hidden daggers from sleeves"
gen fengming "$HONGXIU" cast "spinning in deadly poison dance arms spread"
gen fengming "$HONGXIU" hit "stumbling backward defensive pose"
gen fengming "$HONGXIU" defeated "collapsed elegantly on ground"

echo ""
echo "═══ 雪蔷薇 (moye) ═══"
gen moye "$XUEQW" idle "standing with ice staff cold mist swirling"
gen moye "$XUEQW" attack "thrusting ice staff shooting ice shards"
gen moye "$XUEQW" cast "raising staff overhead channeling blizzard"
gen moye "$XUEQW" hit "knocked backward shielding with ice"
gen moye "$XUEQW" defeated "collapsed on icy ground staff fallen"

echo ""
echo "═══ 药仙 (zixuan) ═══"
gen zixuan "$YAOXIAN" idle "standing serenely with alchemy cauldron floating"
gen zixuan "$YAOXIAN" attack "throwing herbal spirit bombs forward"
gen zixuan "$YAOXIAN" cast "hands glowing green healing energy over cauldron"
gen zixuan "$YAOXIAN" hit "staggering backward clutching herbs"
gen zixuan "$YAOXIAN" defeated "collapsed with scattered herbs"

echo ""
echo "═══ 生成头像 ═══"
GEN_PT="python3 /app/skills/openai-image-gen/scripts/gen.py --model gpt-image-1 --size 1024x1024 --quality high --background transparent --count 1"

$GEN_PT --out-dir /tmp/pt_hx --prompt "portrait bust shot of $HONGXIU, Chinese xianxia art, transparent bg" 2>/dev/null
mv /tmp/pt_hx/*.png assets/sprites/portraits/fengming.png 2>/dev/null && echo "✅ 红袖 portrait"
rm -rf /tmp/pt_hx

$GEN_PT --out-dir /tmp/pt_xq --prompt "portrait bust shot of $XUEQW, Chinese xianxia art, transparent bg" 2>/dev/null
mv /tmp/pt_xq/*.png assets/sprites/portraits/moye.png 2>/dev/null && echo "✅ 雪蔷薇 portrait"
rm -rf /tmp/pt_xq

$GEN_PT --out-dir /tmp/pt_yx --prompt "portrait bust shot of $YAOXIAN, Chinese xianxia art, transparent bg" 2>/dev/null
mv /tmp/pt_yx/*.png assets/sprites/portraits/zixuan.png 2>/dev/null && echo "✅ 药仙 portrait"
rm -rf /tmp/pt_yx

echo ""
echo "═══ DONE ═══"
for slot in fengming moye zixuan; do
  n=$(ls assets/sprites/poses/$slot/*.png 2>/dev/null | wc -l)
  echo "  $slot: $n/10"
done
