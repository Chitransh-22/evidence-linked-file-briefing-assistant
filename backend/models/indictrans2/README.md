# IndicTrans2 On-Premises Model Directory

Place the AI4Bharat IndicTrans2 checkpoint files in this directory:

Recommended checkpoint:
- `ai4bharat/indictrans2-indic-en-dist-200M` (Distilled, ~800 MB - Fast for CPU execution)
or
- `ai4bharat/indictrans2-indic-en-1B` (Full, ~4.5 GB - Requires High RAM / GPU)

Required files:
- `config.json`
- `model.safetensors` (or `pytorch_model.bin`)
- `tokenizer_config.json`
- `vocab.json`
- `source.spm` / `target.spm`

To download automatically:
```bash
python backend/scripts/download_indictrans2.py
```
