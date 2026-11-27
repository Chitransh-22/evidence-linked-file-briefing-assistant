# PaddleOCR – local training project

```
ocr-project/
├── run.py                  # setup / train / eval / f1 / export / infer
├── configs/
│   ├── det_db.yml          # detection: DB + DBLoss, metric precision/recall/hmean(F1)
│   └── rec_ctc_nrtr.yml    # recognition: SVTR_LCNet + MultiLoss(CTC + NRTR)
├── data/
│   ├── det/  train_images/ test_images/ train_label.txt test_label.txt
│   └── rec/  train_images/ test_images/ train.txt test.txt dict.txt
├── pretrained/             # put PP-OCRv4 *_pretrained.pdparams here (fine-tuning start point)
├── output/
│   ├── det/  latest.pdparams/.pdopt/.states  best_accuracy.*  iter_epoch_*  det_best.pt  train.log
│   └── rec/  (same)
├── inference/              # exported deployment models
├── reports/                # det_eval.json, rec_eval.json, rec_f1.json
└── tools/                  # split_dataset.py, f1_rec.py, export_pt.py
```

## Steps
1. `pip install -r requirements.txt` then `python run.py setup`
2. Using the HF dataset naazimsnh02/medocr-vision-dataset: `python tools/build_from_hf.py --limit 50` (sanity run), then
   `python tools/build_from_hf.py` (full). It pseudo-labels boxes/crops against the page ground truth and rebuilds data/rec/dict.txt.
   No data yet? Generate a synthetic set: `python tools/make_synthetic.py --n-det 2000 --n-rec 20000`
   (writes straight into data/det and data/rec). Or put labelled data in `raw/` and split once (fixed seed):
   `python tools/split_dataset.py --task det --labels raw/det_labels.txt --images raw/det_images`
   `python tools/split_dataset.py --task rec --labels raw/rec_labels.txt --images raw/rec_images`
3. Edit `data/rec/dict.txt` to match your characters (one per line, UTF-8).
4. (Recommended) download PP-OCRv4 mobile det/rec *pretrained* weights from the PaddleOCR model zoo and place them as
   `pretrained/PP-OCRv4_mobile_det_pretrained.pdparams` and `pretrained/PP-OCRv4_mobile_rec_pretrained.pdparams`.
5. Train: `python run.py train det` and `python run.py train rec`
6. Stop with Ctrl+C any time; run the same command again and it resumes from `output/<task>/latest`
   (weights + optimizer + epoch/best-metric state). `--fresh` starts over.
7. Evaluate: `python run.py eval det`, `python run.py eval rec`, `python run.py f1 rec`
8. Export: `python run.py export det|rec` -> `inference/<task>/` and `output/<task>/<task>_best.pt`

## Weights, context, .pt
- PaddleOCR's native training format is `.pdparams` (weights), `.pdopt` (optimizer) and `.states` (epoch, best metric).
  Those three files are the saved "context" that make resuming possible. `best_accuracy.*` is picked by F1 (det) / acc (rec).
- `.pt` is a convenience export of the weights; to use it you need a matching torch model (e.g. PytorchOCR).

## Notes
- No GPU? set `use_gpu: false` in both configs and install `paddlepaddle` instead of `paddlepaddle-gpu`.
- Out of VRAM: lower `batch_size_per_card`.
- CTC-only recognition: in rec config set `Architecture.Head` to `name: CTCHead` (with the same svtr Neck), `Loss` to
  `name: CTCLoss`, and `keep_keys: [image, label, length]`, drop `MultiLabelEncode`/`RecConAug` and use `CTCLabelEncode`.
- Eval-time `latest` vs `best_accuracy`: `run.py` prefers `best_accuracy`.
