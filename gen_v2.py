#!/usr/bin/env python3
"""Generate all 10 character battle sprites via OpenAI gpt-image-1."""
import subprocess, os, sys, shutil

BASE = "assets/sprites/poses"
GEN = "python3 /app/skills/openai-image-gen/scripts/gen.py --model gpt-image-1 --size 1024x1536 --quality high --background transparent --count 1"
COMMON = "full body from head to toe clearly visible, centered in frame, high detail sharp edges, no white outline, no white border, no glow edge, clean transparent background, 2D Chinese xianxia RPG game art, vibrant colors"

CHARACTERS = {
    "yunyi": "young Chinese male sword cultivator, white blue hanfu robes, glowing cyan jade sword, long black hair topknot",
    "lingxi": "young Chinese female alchemy cultivator, red gold hanfu dress, spirit fan with golden tassels, long dark hair",
    "fengming": "young Chinese female musician cultivator, purple silver robes, ancient guqin zither, silver-white flowing hair",
    "moye": "young Chinese male assassin cultivator, black crimson tight outfit, dual daggers, short dark hair, shadow energy",
    "zixuan": "young Chinese female healer cultivator, white lavender robes, glowing lotus staff, gentle expression",
    "wolf": "giant demonic black wolf beast, red eyes, sharp fangs, purple energy wisps, massive muscular body",
    "snake": "half-woman half-snake demon, green upper body, serpent lower body coiled, jade snake staff",
    "golem": "massive stone golem, lava crack lines, huge rocky arms, glowing red eyes, ancient rune markings",
    "yaohu": "beautiful nine-tailed fox demon, white fur golden markings, nine flowing tails with blue fire tips, fierce golden eyes",
    "guiwang": "terrifying ghost king, tall skeletal figure dark robes, ghostly blue-green flames, skull crown, chains on arms",
}

POSES = {
    "idle": "standing in battle-ready stance",
    "attack": "aggressive attacking pose forward",
    "cast": "channeling magical energy hands glowing",
    "hit": "recoiling in pain leaning backward",
    "defeated": "collapsed on ground defeated",
}

def generate(char, desc, pose, pdesc, direction):
    outdir = os.path.join(BASE, char)
    outfile = f"{pose}_{direction}.png"
    outpath = os.path.join(outdir, outfile)
    
    if os.path.exists(outpath):
        # Check if it's already 1024x1536
        result = subprocess.run(["identify", "-format", "%wx%h", outpath], capture_output=True, text=True)
        if result.stdout.strip() == "1024x1536":
            print(f"  SKIP {char}/{outfile} (already 1024x1536)")
            return True
        else:
            os.remove(outpath)
    
    tmpdir = f"/tmp/gen_{os.getpid()}_{char}_{pose}_{direction}"
    prompt = f"{desc}, {pdesc}, facing {direction}, 3/4 view, {COMMON}"
    
    cmd = f'{GEN} --out-dir "{tmpdir}" --prompt "{prompt}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
    
    # Find generated PNG
    if os.path.exists(tmpdir):
        pngs = [f for f in os.listdir(tmpdir) if f.endswith('.png')]
        if pngs:
            src = os.path.join(tmpdir, pngs[0])
            os.makedirs(outdir, exist_ok=True)
            shutil.copy2(src, outpath)
            shutil.rmtree(tmpdir, ignore_errors=True)
            print(f"  ✅ {char}/{outfile}")
            return True
    
    shutil.rmtree(tmpdir, ignore_errors=True)
    print(f"  ❌ {char}/{outfile}")
    return False

def main():
    # Filter: only generate specified chars, or all
    only = sys.argv[1:] if len(sys.argv) > 1 else list(CHARACTERS.keys())
    
    total = len(only) * len(POSES) * 2
    done = 0
    failed = 0
    
    print(f"═══ Generating {total} sprites for {len(only)} characters ═══\n")
    
    for char in only:
        if char not in CHARACTERS:
            print(f"Unknown character: {char}")
            continue
        desc = CHARACTERS[char]
        print(f"─── {char} ───")
        
        for pose, pdesc in POSES.items():
            for direction in ["right", "left"]:
                done += 1
                print(f"[{done}/{total}]", end="")
                if not generate(char, desc, pose, pdesc, direction):
                    failed += 1
    
    print(f"\n═══ Done: {done - failed}/{total} success, {failed} failed ═══")

if __name__ == "__main__":
    main()
