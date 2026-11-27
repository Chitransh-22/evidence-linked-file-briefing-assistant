"""Split a labelled raw set into train/test (fixed seed, so the split never changes).

Det label line:  image.jpg<TAB>[{"transcription":"text","points":[[x,y],[x,y],[x,y],[x,y]]}, ...]
Rec label line:  image.png<TAB>text

python tools/split_dataset.py --task det --labels raw/labels.txt --images raw/images --test-ratio 0.1
python tools/split_dataset.py --task rec --labels raw/labels.txt --images raw/images --test-ratio 0.1
"""
import argparse, random, shutil
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("--task", choices=["det", "rec"], required=True)
ap.add_argument("--labels", required=True)
ap.add_argument("--images", required=True)
ap.add_argument("--test-ratio", type=float, default=0.1)
ap.add_argument("--seed", type=int, default=42)
a = ap.parse_args()

base = Path(__file__).resolve().parent
if not (base / "run.py").exists():
    base = base.parent
root = base / "data" / a.task
lines = [l.rstrip("\n") for l in open(a.labels, encoding="utf-8") if "\t" in l]
random.Random(a.seed).shuffle(lines)
n_test = max(1, int(len(lines) * a.test_ratio))
splits = {"test": lines[:n_test], "train": lines[n_test:]}
names = {"det": {"train": "train_label.txt", "test": "test_label.txt"},
         "rec": {"train": "train.txt", "test": "test.txt"}}[a.task]

for split, items in splits.items():
    (root / f"{split}_images").mkdir(parents=True, exist_ok=True)
    out = []
    for l in items:
        img, label = l.split("\t", 1)
        name = Path(img).name
        src = Path(a.images) / name
        if not src.exists():
            print("missing image, skipped:", src); continue
        shutil.copy(src, root / f"{split}_images" / name)
        out.append(f"{split}_images/{name}\t{label}")
    (root / names[split]).write_text("\n".join(out) + "\n", encoding="utf-8")
    print(split, len(out))
