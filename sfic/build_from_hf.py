"""Build PaddleOCR det + rec data from the HF dataset naazimsnh02/medocr-vision-dataset.

The dataset only has (image, full-page transcription) pairs - no boxes, no line crops - so PaddleOCR det/rec
can't train on it directly. This script derives the missing pieces:
  1. a pretrained PP-OCR finds text boxes + a first-pass reading for every page
  2. each reading is fuzzy-matched against the page's ground-truth text; only confident matches become
     labels, and the label is the GROUND-TRUTH substring (so the dataset corrects the pretrained model)
  3. boxes that don't match are kept in the det labels as "###" (ignored regions) so they don't count as background

python tools/build_from_hf.py --limit 50     # quick sanity run first
python tools/build_from_hf.py                # full build (uses the dataset's own train/test splits)
"""
import argparse, json, re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if not (ROOT / "run.py").exists():
    ROOT = ROOT.parent
MAX_LEN = 25          # keep in sync with max_text_length in configs/rec_ctc_nrtr.yml
MIN_SCORE = 88        # fuzzy-match threshold (0-100)


def clean_gt(t: str) -> str:
    t = re.sub(r"</?s_ocr>|</s>", " ", t or "")
    t = re.sub(r"[*#|]|-{3,}", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def align(rec_text: str, gt: str):
    """Return the ground-truth substring that the OCR reading corresponds to, or None."""
    from rapidfuzz import fuzz
    rec_text = rec_text.strip()
    if len(rec_text) < 2 or not gt:
        return None
    al = fuzz.partial_ratio_alignment(rec_text, gt)
    if al is None or al.score < MIN_SCORE:
        return None
    s, e = al.dest_start, al.dest_end
    while s > 0 and gt[s - 1] != " ":
        s -= 1
    while e < len(gt) and gt[e] != " ":
        e += 1
    cand = gt[s:e].strip()
    if not cand or abs(len(cand) - len(rec_text)) > max(3, 0.3 * len(rec_text)):
        return None
    return cand


def make_ocr():
    from paddleocr import PaddleOCR
    try:   # PaddleOCR 3.x
        return PaddleOCR(lang="en", use_doc_orientation_classify=False, use_doc_unwarping=False,
                         use_textline_orientation=False)
    except (TypeError, ValueError):   # PaddleOCR 2.x
        return PaddleOCR(lang="en", use_angle_cls=False, show_log=False)


def run_ocr(ocr, path):
    """[(quad, text, score)] for both PaddleOCR 2.x and 3.x."""
    import numpy as np
    out = []
    if hasattr(ocr, "predict"):
        for r in ocr.predict(str(path)):
            for p, t, s in zip(r["rec_polys"], r["rec_texts"], r["rec_scores"]):
                out.append((np.asarray(p).astype(int).tolist(), t, float(s)))
    else:
        res = ocr.ocr(str(path), cls=False)
        for line in (res[0] or []):
            out.append((np.asarray(line[0]).astype(int).tolist(), line[1][0], float(line[1][1])))
    return out


def crop_quad(img, quad):
    import cv2, numpy as np
    pts = np.asarray(quad, dtype="float32")
    if len(pts) != 4:
        x, y, w, h = cv2.boundingRect(pts.astype("int32"))
        return img[y:y + h, x:x + w]
    w = int(max(np.linalg.norm(pts[0] - pts[1]), np.linalg.norm(pts[2] - pts[3])))
    h = int(max(np.linalg.norm(pts[0] - pts[3]), np.linalg.norm(pts[1] - pts[2])))
    if w < 4 or h < 4:
        return None
    dst = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype="float32")
    c = cv2.warpPerspective(img, cv2.getPerspectiveTransform(pts, dst), (w, h), flags=cv2.INTER_CUBIC)
    return np.rot90(c) if h >= 1.5 * w else c


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None, help="max pages per split (for a quick test)")
    ap.add_argument("--min-ocr-score", type=float, default=0.5)
    a = ap.parse_args()

    import cv2
    from datasets import load_dataset
    ds = load_dataset("naazimsnh02/medocr-vision-dataset")
    print("splits:", {k: len(v) for k, v in ds.items()}, "columns:", ds["train"].column_names)
    splits = {"train": ds["train"], "test": ds["test"] if "test" in ds else ds["validation"]}
    ocr = make_ocr()

    det_dir, rec_dir = ROOT / "data/det", ROOT / "data/rec"
    stats, chars = Counter(), Counter()
    for split, data in splits.items():
        for d in (det_dir, rec_dir):
            (d / f"{split}_images").mkdir(parents=True, exist_ok=True)
        det_lines, rec_lines = [], []
        n = min(len(data), a.limit) if a.limit else len(data)
        for i in range(n):
            row = data[i]
            gt = clean_gt(row["text"])
            name = f"med_{split}_{i:05d}"
            img_path = det_dir / f"{split}_images" / f"{name}.jpg"
            row["image"].convert("RGB").save(img_path, quality=95)
            img = cv2.imread(str(img_path))
            anns = []
            for quad, rtext, score in run_ocr(ocr, img_path):
                stats["boxes"] += 1
                label = align(rtext, gt) if score >= a.min_ocr_score else None
                if label and len(label) <= MAX_LEN:
                    anns.append({"transcription": label, "points": quad})
                    crop = crop_quad(img, quad)
                    if crop is not None and crop.size:
                        cn = f"{name}_{len(rec_lines):05d}.png"
                        cv2.imwrite(str(rec_dir / f"{split}_images" / cn), crop)
                        rec_lines.append(f"{split}_images/{cn}\t{label}")
                        stats[f"{split}_rec_crops"] += 1
                        if split == "train":
                            chars.update(label)
                else:
                    anns.append({"transcription": "###", "points": quad})
                    stats["ignored_boxes"] += 1
            det_lines.append(f"{split}_images/{name}.jpg\t{json.dumps(anns, ensure_ascii=False)}")
            if (i + 1) % 50 == 0:
                print(split, i + 1, "/", n, dict(stats))
        names = {"train": ("train_label.txt", "train.txt"), "test": ("test_label.txt", "test.txt")}[split]
        (det_dir / names[0]).write_text("\n".join(det_lines) + "\n", encoding="utf-8")
        (rec_dir / names[1]).write_text("\n".join(rec_lines) + "\n", encoding="utf-8")
        stats[f"{split}_pages"] = n

    # recognizer dictionary = every character seen in TRAIN labels (space is handled by use_space_char)
    (rec_dir / "dict.txt").write_text("\n".join(sorted(c for c in chars if c != " ")) + "\n", encoding="utf-8")
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports/hf_build_stats.json").write_text(json.dumps(dict(stats), indent=2))
    print("done", dict(stats), "| dict size:", len(chars))


if __name__ == "__main__":
    main()