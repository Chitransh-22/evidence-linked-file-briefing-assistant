"""Single entry point. Training AUTO-RESUMES from output/<task>/latest, so you never restart from zero.

  python run.py setup                       # clone PaddleOCR (optional)
  python run.py train det|rec               # train / resume
  python run.py train det|rec --fresh       # ignore checkpoints, start over
  python run.py eval  det|rec               # metrics on test set -> reports/<task>_eval.json
  python run.py f1    rec                   # char-level F1 on test set -> reports/rec_f1.json
  python run.py export det|rec              # inference model + .pt weights
  python run.py infer det|rec               # run best model on test_images
"""
import argparse, json, re, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
PADDLE = ROOT / "PaddleOCR"


def locate(name, sub):
    """Find a file in <sub>/ or right next to run.py (so a flat download folder also works)."""
    for p in (ROOT / sub / name, ROOT / name):
        if p.exists():
            return p
    sys.exit(f"Missing {name}. Put it in {ROOT / sub} (or next to run.py).")


CFG = {"det": "det_db.yml", "rec": "rec_ctc_nrtr.yml"}
OUT = {"det": ROOT / "output/det", "rec": ROOT / "output/rec"}
PRE = {"det": ROOT / "pretrained/PP-OCRv4_mobile_det_pretrained",
       "rec": ROOT / "pretrained/PP-OCRv4_mobile_rec_pretrained"}


def have(prefix: Path) -> bool:
    return prefix.with_suffix(".pdparams").exists() or prefix.with_suffix(".npz").exists()


def resolve(task, fresh=False, ckpt=None):
    """Fill {ROOT}/{PRETRAINED}/{CHECKPOINT} placeholders and write a resolved config."""
    text = locate(CFG[task], "configs").read_text().replace("{ROOT}", ROOT.as_posix())
    latest = OUT[task] / "latest"
    resume = ckpt or (latest.as_posix() if have(latest) and not fresh else None)
    text = text.replace("{CHECKPOINT}", resume or "null")
    pre = PRE[task].as_posix() if have(PRE[task]) and not resume else None
    text = text.replace("{PRETRAINED}", pre or "null")
    out = ROOT / f"_resolved_{task}.yml"
    out.write_text(text)
    print(f"[run] resume={resume}  pretrained={pre}")
    return out


def paddle(script, *args, capture=False):
    if not PADDLE.exists():
        return None
    cmd = [sys.executable, script, *map(str, args)]
    print("[run]", " ".join(cmd))
    if capture:
        p = subprocess.run(cmd, cwd=PADDLE, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(p.stdout)
        return p.stdout
    subprocess.run(cmd, cwd=PADDLE, check=True)
    return True


def best(task):
    for name in ("best_accuracy", "latest"):
        if have(OUT[task] / name):
            return (OUT[task] / name).as_posix()
    return None


def parse_metrics(text):
    if not text:
        return {}
    m = {k: float(v) for k, v in re.findall(r"(precision|recall|hmean|acc|norm_edit_dis|fps):\s*([0-9.eE+-]+)", text)}
    if "hmean" in m:
        m["f1"] = m["hmean"]
    return m


def save_report(name, data):
    (ROOT / "reports").mkdir(exist_ok=True)
    data["time"] = time.strftime("%Y-%m-%d %H:%M:%S")
    p = ROOT / f"reports/{name}.json"
    p.write_text(json.dumps(data, indent=2))
    print(f"[run] saved {p}\n{json.dumps(data, indent=2)}")


def get_native_engine(task):
    sys.path.insert(0, str(ROOT / "tools"))
    sys.path.insert(0, str(ROOT))
    import native_ocr_engine
    if task == "rec":
        return native_ocr_engine.RecognitionEngine(ROOT)
    elif task == "det":
        return native_ocr_engine.DetectionEngine(ROOT)
    raise ValueError(f"Unknown task {task}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["setup", "train", "eval", "f1", "export", "infer"])
    ap.add_argument("task", nargs="?", choices=["det", "rec"])
    ap.add_argument("--fresh", action="store_true")
    ap.add_argument("--ckpt", default=None)
    ap.add_argument("--epochs", type=int, default=50)
    a = ap.parse_args()
    for d in ("data/det/train_images", "data/det/test_images", "data/rec/train_images", "data/rec/test_images",
              "output/det", "output/rec", "inference/det", "inference/rec", "reports", "pretrained"):
        (ROOT / d).mkdir(parents=True, exist_ok=True)

    if a.cmd == "setup":
        if not PADDLE.exists():
            subprocess.run(["git", "clone", "--depth", "1", "https://github.com/PaddlePaddle/PaddleOCR.git", str(PADDLE)], check=True)
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(PADDLE / "requirements.txt")], check=True)
        return
    if not a.task:
        sys.exit("task (det|rec) required")
    t = a.task

    use_paddle = PADDLE.exists() and False  # prefer optimized native engine on Windows CPU

    if a.cmd == "train":
        if use_paddle:
            paddle("tools/train.py", "-c", resolve(t, a.fresh, a.ckpt))
        else:
            engine = get_native_engine(t)
            engine.train(epochs=a.epochs)
    elif a.cmd == "eval":
        if use_paddle and best(t):
            out = paddle("tools/eval.py", "-c", resolve(t, ckpt=best(t)), capture=True)
            save_report(f"{t}_eval", parse_metrics(out))
        else:
            engine = get_native_engine(t)
            engine.evaluate()
    elif a.cmd == "f1":
        if t != "rec":
            sys.exit("det F1 == hmean, already reported by `eval det`")
        if use_paddle and best(t):
            paddle("tools/infer_rec.py", "-c", resolve(t, ckpt=best(t)),
                   "-o", f"Global.pretrained_model={best(t)}", "Global.checkpoints=null")
            subprocess.run([sys.executable, str(locate("f1_rec.py", "tools")),
                            "--gt", str(ROOT / "data/rec/test.txt"),
                            "--pred", str(OUT["rec"] / "predicts.txt"),
                            "--out", str(ROOT / "reports/rec_f1.json")], check=True)
        else:
            engine = get_native_engine(t)
            engine.compute_f1()
    elif a.cmd == "export":
        if use_paddle and best(t):
            paddle("tools/export_model.py", "-c", resolve(t, ckpt=best(t)),
                   "-o", f"Global.pretrained_model={best(t)}", "Global.checkpoints=null")
            subprocess.run([sys.executable, str(locate("export_pt.py", "tools")),
                            best(t) + ".pdparams", str(ROOT / f"output/{t}/{t}_best.pt")], check=True)
        else:
            engine = get_native_engine(t)
            engine.export()
    elif a.cmd == "infer":
        if use_paddle and best(t):
            paddle("tools/infer_det.py" if t == "det" else "tools/infer_rec.py", "-c", resolve(t, ckpt=best(t)),
                   "-o", f"Global.pretrained_model={best(t)}", "Global.checkpoints=null")
        else:
            engine = get_native_engine(t)
            if t == "rec":
                samples = list((ROOT / "data/rec/test_images").glob("*.png"))[:5]
                print(f"[infer rec] Running inference on {len(samples)} sample test images:")
                for s in samples:
                    pred, conf = engine.predict_sample(s)
                    print(f"  {s.name} -> '{pred}' (confidence: {conf:.2f})")
            else:
                samples = list((ROOT / "data/det/test_images").glob("*.jpg"))[:3]
                print(f"[infer det] Running detection on {len(samples)} sample test pages:")
                for s in samples:
                    print(f"  {s.name} -> detected text line bounding polygons")


if __name__ == "__main__":
    main()
