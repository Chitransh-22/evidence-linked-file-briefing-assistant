"""Recognition metrics: exact-match accuracy + character-level precision/recall/F1 (micro-averaged)."""
import argparse, json
from collections import Counter
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("--gt", required=True)
ap.add_argument("--pred", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()

gt = {}
for l in open(a.gt, encoding="utf-8"):
    if "\t" in l:
        p, t = l.rstrip("\n").split("\t", 1)
        gt[Path(p).name] = t

pred = {}
for l in open(a.pred, encoding="utf-8"):
    parts = l.rstrip("\n").split("\t")
    if len(parts) >= 2:
        pred[Path(parts[0]).name] = parts[1]

tp = fp = fn = exact = n = 0
for k, g in gt.items():
    p = pred.get(k, "")
    c = Counter(g) & Counter(p)
    hit = sum(c.values())
    tp += hit; fp += len(p) - hit; fn += len(g) - hit
    exact += int(p == g); n += 1

prec = tp / (tp + fp) if tp + fp else 0.0
rec = tp / (tp + fn) if tp + fn else 0.0
f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
res = {"samples": n, "exact_acc": exact / max(n, 1), "char_precision": prec, "char_recall": rec, "char_f1": f1}
Path(a.out).parent.mkdir(exist_ok=True)
Path(a.out).write_text(json.dumps(res, indent=2))
print(json.dumps(res, indent=2))
