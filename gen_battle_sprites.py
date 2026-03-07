#!/usr/bin/env python3
"""Generate battle sprites for 3 female characters using Gemini, matching V10/V11 designs."""
import json, base64, os, time, subprocess, shutil
from urllib.request import Request, urlopen

KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}"
OUT = "/home/node/.openclaw/workspace/daotu-phaser/assets/sprites/poses"

STYLE = "Generate a single game character sprite on pure white background. Full body head to toe visible, centered, facing right. Ultra-detailed semi-realistic anime illustration, extremely detailed beautiful mature face, intricate clothing details, rich vibrant colors, sharp clean lines, masterpiece quality Chinese xianxia mobile game art."

CHARS = {
    "fengming": "Gorgeous mature Chinese woman dancer assassin age 24, tall with very long slender toned legs. Long flowing wavy chestnut brown hair with ornate gold filigree chain headpiece with ruby centerpiece and cherry blossom hairpins. Red cinnabar diamond forehead mark. Beautiful mature face with sharp confident eyes. Wearing strapless deep crimson silk bandeau top with gold plum blossom embroidery showing bare shoulders, ultra short crimson silk battle skirt, golden chain waist belt with jade pendant, sheer crimson detached wide sleeves, combat dagger strapped to thigh, gold strappy heeled sandals.",
    
    "moye": "Stunning mature Chinese woman ice cultivator age 23, East Asian features, tall with very long slender legs. Long flowing ice-blue hair with part in elegant bun with silver jade hairpin, ice crystal bu-yao step-shake ornament. Blue sapphire forehead mark. Beautiful mature Chinese face with sharp cold phoenix eyes, composed expression. Wearing ice-blue and white Chinese modified hanfu, off-shoulder cross-collar wrap top with ice plum blossom embroidery, ice-white long skirt with extreme high slit showing full leg, silver filigree waist sash, frost-patterned detached sleeves, white boots. Holding ice jade scepter with frost orb.",
    
    "zixuan": "Elegant mature Chinese woman divine herbalist healer age 22, tall with very long slender legs. Dark green hair in elegant updo with golden jade hairpins and dangling jade step-shake ornaments. Green emerald forehead mark. Beautiful mature face with gentle warm intelligent eyes. Wearing white and emerald green off-shoulder hanfu wrap top with lotus embroidery, form-fitting emerald short skirt to mid-thigh, golden sash belt with jade ornaments and golden medicine gourd, translucent green detached sleeves, jade green strappy sandals. Holding jade ruyi staff with glowing lotus bloom.",
}

POSES = {
    "idle": "standing ready in elegant battle stance, alert and confident",
    "attack": "dynamic aggressive attack pose, lunging forward with weapon, fierce expression",
    "cast": "channeling magical energy, arms raised with mystical aura glowing around hands",
    "hit": "recoiling from impact, body twisted backward in pain expression",
    "defeated": "collapsed and defeated on ground, fallen down, energy fading",
}

def gen(prompt, retries=3):
    body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}}
    for i in range(retries):
        try:
            req = Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST")
            resp = urlopen(req, timeout=120)
            data = json.loads(resp.read())
            for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", []):
                if "inlineData" in part:
                    return base64.b64decode(part["inlineData"]["data"])
        except Exception as e:
            print(f"  retry {i+1}: {e}", flush=True)
            time.sleep(10)
    return None

def remove_bg(inp, out):
    """Remove white background using ImageMagick fuzz+transparent"""
    subprocess.run([
        "convert", str(inp),
        "-fuzz", "18%", "-transparent", "white",
        "-channel", "A", "-morphology", "Close", "Disk:1", "+channel",
        str(out)
    ], check=True, capture_output=True, timeout=30)

def flip(inp, out):
    subprocess.run(["convert", str(inp), "-flop", str(out)], check=True, capture_output=True, timeout=30)

total = len(CHARS) * len(POSES)
done = 0
fail = []

print(f"🚀 Generating {total} poses for {len(CHARS)} characters...", flush=True)

for cname, cdesc in CHARS.items():
    cdir = f"{OUT}/{cname}"
    os.makedirs(cdir, exist_ok=True)
    
    for pname, pdesc in POSES.items():
        rp = f"{cdir}/{pname}_right.png"
        lp = f"{cdir}/{pname}_left.png"
        
        prompt = f"{STYLE} Character: {cdesc} Pose: {pdesc}. Clean sharp edges, no ground shadow, no environment."
        
        print(f"🎨 [{done+1}/{total}] {cname}/{pname}...", flush=True)
        png = gen(prompt)
        if not png:
            print(f"  ❌ FAILED", flush=True)
            fail.append(f"{cname}/{pname}")
            done += 1
            continue

        raw = f"{cdir}/{pname}_raw.png"
        with open(raw, "wb") as f:
            f.write(png)
        
        # Remove white background
        try:
            remove_bg(raw, rp)
        except:
            shutil.copy(raw, rp)
        
        # Mirror for left
        try:
            flip(rp, lp)
        except:
            pass
        
        # Clean up
        try:
            os.unlink(raw)
        except:
            pass
        
        sz = os.path.getsize(rp) // 1024
        print(f"  ✅ {sz}KB", flush=True)
        done += 1
        time.sleep(4)

# Generate portraits from idle
print(f"\n📸 Generating portraits...", flush=True)
for cname in CHARS:
    idle = f"{OUT}/{cname}/idle_right.png"
    port = f"/home/node/.openclaw/workspace/daotu-phaser/assets/sprites/portraits/{cname}.png"
    if os.path.exists(idle):
        subprocess.run(["convert", idle, "-gravity", "North", "-crop", "1024x600+0+0", "+repage", "-resize", "1024x1024", "-background", "transparent", "-gravity", "center", "-extent", "1024x1024", port], capture_output=True)
        print(f"  ✅ {cname} portrait", flush=True)

print(f"\n{'='*40}", flush=True)
print(f"✅ Complete: {done}/{total}", flush=True)
if fail:
    print(f"❌ Failed: {', '.join(fail)}", flush=True)
