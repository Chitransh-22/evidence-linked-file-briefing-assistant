"""Generate a synthetic det + rec dataset straight into data/det and data/rec (train/test split built in).

python tools/make_synthetic.py --n-det 2000 --n-rec 20000 --test-ratio 0.1
Optional: --words words.txt (one word per line) to use real vocabulary instead of random strings.
Characters are drawn from data/rec/dict.txt so labels always match the recognizer dictionary.
"""
import argparse, glob, json, random, string
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
if not (ROOT / "run.py").exists():
    ROOT = ROOT.parent
FONT_GLOBS = ["C:/Windows/Fonts/*.ttf", "/usr/share/fonts/**/*.ttf", "/System/Library/Fonts/**/*.ttf", "/Library/Fonts/*.ttf"]
BAD = ("symbol", "wingding", "webdings", "marlett", "emoji", "dingbat", "bookshelf")

ap = argparse.ArgumentParser()
ap.add_argument("--n-det", type=int, default=2000)
ap.add_argument("--n-rec", type=int, default=20000)
ap.add_argument("--test-ratio", type=float, default=0.1)
ap.add_argument("--seed", type=int, default=42)
ap.add_argument("--words", default=None)
a = ap.parse_args()
rnd = random.Random(a.seed); np.random.seed(a.seed)

fonts = [f for g in FONT_GLOBS for f in glob.glob(g, recursive=True) if not any(b in f.lower() for b in BAD)]
print(f"{len(fonts)} fonts found")
chars = [c for c in (ROOT / "data/rec/dict.txt").read_text(encoding="utf-8").split("\n") if c]
words = [w.strip() for w in open(a.words, encoding="utf-8")] if a.words else None

def get_font(size):
    for _ in range(10):
        if not fonts: break
        try: return ImageFont.truetype(rnd.choice(fonts), size)
        except Exception: continue
    return ImageFont.load_default(size)

def rand_text():
    if words and rnd.random() < 0.7:
        return " ".join(rnd.choice(words) for _ in range(rnd.randint(1, 3)))[:24]
    return "".join(rnd.choice(chars) for _ in range(rnd.randint(3, 14)))

def colors():
    bg = tuple(rnd.randint(150, 255) for _ in range(3)) if rnd.random() < .7 else tuple(rnd.randint(0, 100) for _ in range(3))
    fg = tuple(rnd.randint(0, 90) for _ in range(3)) if sum(bg) > 380 else tuple(rnd.randint(170, 255) for _ in range(3))
    return bg, fg

def degrade(img):
    if rnd.random() < .4: img = img.filter(ImageFilter.GaussianBlur(rnd.uniform(0.3, 1.2)))
    arr = np.asarray(img).astype(np.int16) + np.random.normal(0, rnd.uniform(0, 8), (img.height, img.width, 3))
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def make_rec():
    text = rand_text(); font = get_font(rnd.randint(28, 56)); bg, fg = colors()
    tmp = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    x0, y0, x1, y1 = tmp.textbbox((0, 0), text, font=font)
    pad = rnd.randint(4, 12)
    img = Image.new("RGB", (x1 - x0 + 2 * pad, y1 - y0 + 2 * pad), bg)
    ImageDraw.Draw(img).text((pad - x0, pad - y0), text, font=font, fill=fg)
    if rnd.random() < .3: img = img.rotate(rnd.uniform(-3, 3), expand=True, fillcolor=bg)
    return degrade(img), text

def make_det():
    W, H = 640, 480; bg, _ = colors()
    img = Image.new("RGB", (W, H), bg); d = ImageDraw.Draw(img); boxes, anns = [], []
    for _ in range(rnd.randint(3, 9)):
        for _try in range(20):
            text = rand_text(); font = get_font(rnd.randint(18, 44))
            _, fg = colors(); fg = tuple(rnd.randint(0, 80) for _ in range(3)) if sum(bg) > 380 else tuple(rnd.randint(175, 255) for _ in range(3))
            x0, y0, x1, y1 = d.textbbox((0, 0), text, font=font); w, h = x1 - x0, y1 - y0
            if w >= W - 20 or h >= H - 20: continue
            x, y = rnd.randint(5, W - w - 5), rnd.randint(5, H - h - 5)
            if any(not (x + w + 6 < bx or bx2 + 6 < x or y + h + 6 < by or by2 + 6 < y) for bx, by, bx2, by2 in boxes): continue
            d.text((x - x0, y - y0), text, font=font, fill=fg); boxes.append((x, y, x + w, y + h))
            anns.append({"transcription": text, "points": [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]}); break
    return degrade(img), anns

def build(task, n, make, ext):
    n_test = max(1, int(n * a.test_ratio)); root = ROOT / "data" / task
    lab = {"det": ("train_label.txt", "test_label.txt"), "rec": ("train.txt", "test.txt")}[task]
    for split, cnt, fn in (("train", n - n_test, lab[0]), ("test", n_test, lab[1])):
        (root / f"{split}_images").mkdir(parents=True, exist_ok=True); lines = []
        for i in range(cnt):
            img, label = make(); name = f"syn_{split}_{i:06d}.{ext}"
            img.save(root / f"{split}_images" / name)
            label = json.dumps(label, ensure_ascii=False) if task == "det" else label
            lines.append(f"{split}_images/{name}\t{label}")
            if (i + 1) % 1000 == 0: print(task, split, i + 1, "/", cnt)
        (root / fn).write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"{task} {split}: {cnt} -> {root / fn}")

if a.n_det: build("det", a.n_det, make_det, "jpg")
if a.n_rec: build("rec", a.n_rec, make_rec, "png")
