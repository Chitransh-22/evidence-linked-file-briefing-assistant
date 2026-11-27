"""Single entry point. Training AUTO-RESUMES from output/<task>/latest, so you never restart from zero.

  python run.py setup                       # clone PaddleOCR
  python run.py train det|rec               # train / resume
  python run.py train det --fresh           # ignore checkpoints, start over
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
    return prefix.with_suffix(".pdparams").exists()


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
        sys.exit("PaddleOCR/ not found. Run: python run.py setup")
    cmd = [sys.executable, script, *map(str, args)]
    print("[run]", " ".join(cmd))
    if capture:
        p = subprocess.run(cmd, cwd=PADDLE, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(p.stdout)
        return p.stdout
    subprocess.run(cmd, cwd=PADDLE, check=True)


def best(task):
    for name in ("best_accuracy", "latest"):
        if have(OUT[task] / name):
            return (OUT[task] / name).as_posix()
    sys.exit(f"No trained weights in {OUT[task]} yet. Train first.")


def parse_metrics(text):
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["setup", "train", "eval", "f1", "export", "infer"])
    ap.add_argument("task", nargs="?", choices=["det", "rec"])
    ap.add_argument("--fresh", action="store_true")
    ap.add_argument("--ckpt", default=None)
    a = ap.parse_args()
    for d in ("data/det/train_images", "data/det/test_images", "data/rec/train_images", "data/rec/test_images",
              "output/det", "output/rec", "inference", "reports", "pretrained"):
        (ROOT / d).mkdir(parents=True, exist_ok=True)

    if a.cmd == "setup":
        if not PADDLE.exists():
            try:
                subprocess.run(["git", "clone", "--depth", "1", "https://github.com/PaddlePaddle/PaddleOCR.git", str(PADDLE)], check=True)
            except FileNotFoundError:   # git not installed -> download the zip instead
                import urllib.request, zipfile, shutil
                url = "https://github.com/PaddlePaddle/PaddleOCR/archive/refs/heads/main.zip"
                z = ROOT / "_paddleocr.zip"
                print("git not found, downloading", url)
                urllib.request.urlretrieve(url, z)
                with zipfile.ZipFile(z) as f:
                    top = f.namelist()[0].split("/")[0]
                    f.extractall(ROOT)
                shutil.move(str(ROOT / top), str(PADDLE))
                z.unlink()
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(PADDLE / "requirements.txt")], check=True)
        return
    if not a.task:
        sys.exit("task (det|rec) required")
    t = a.task

    if a.cmd == "train":
        paddle("tools/train.py", "-c", resolve(t, a.fresh, a.ckpt))
    elif a.cmd == "eval":
        out = paddle("tools/eval.py", "-c", resolve(t, ckpt=best(t)), capture=True)
        save_report(f"{t}_eval", parse_metrics(out))
    elif a.cmd == "infer":
        paddle("tools/infer_det.py" if t == "det" else "tools/infer_rec.py", "-c", resolve(t, ckpt=best(t)),
               "-o", f"Global.pretrained_model={best(t)}", "Global.checkpoints=null")
    elif a.cmd == "f1":
        if t != "rec":
            sys.exit("det F1 == hmean, already reported by `eval det`")
        paddle("tools/infer_rec.py", "-c", resolve(t, ckpt=best(t)),
               "-o", f"Global.pretrained_model={best(t)}", "Global.checkpoints=null")
        subprocess.run([sys.executable, str(locate("f1_rec.py", "tools")),
                        "--gt", str(ROOT / "data/rec/test.txt"),
                        "--pred", str(OUT["rec"] / "predicts.txt"),
                        "--out", str(ROOT / "reports/rec_f1.json")], check=True)
    elif a.cmd == "export":
        paddle("tools/export_model.py", "-c", resolve(t, ckpt=best(t)),
               "-o", f"Global.pretrained_model={best(t)}", "Global.checkpoints=null")
        subprocess.run([sys.executable, str(locate("export_pt.py", "tools")),
                        best(t) + ".pdparams", str(ROOT / f"output/{t}/{t}_best.pt")], check=True)


if __name__ == "__main__":
    main()
