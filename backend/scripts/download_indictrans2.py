import os
import sys
from pathlib import Path

# Target directory
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
DEFAULT_MODEL_DIR = BACKEND_DIR / "models" / "indictrans2"

DIST_MODEL = "ai4bharat/indictrans2-indic-en-dist-200M"
FULL_MODEL = "ai4bharat/indictrans2-indic-en-1B"


def download_model(model_name: str = DIST_MODEL, output_dir: Path = DEFAULT_MODEL_DIR):
    print(f"=== IndicTrans2 Model Downloader ===")
    print(f"Target Model : {model_name}")
    print(f"Destination  : {output_dir}")
    print("--------------------------------------------------")

    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("[!] huggingface_hub is not installed. Installing huggingface_hub...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "huggingface_hub"])
        from huggingface_hub import snapshot_download

    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"[+] Downloading model weights from Hugging Face ({model_name})...")
    print("    This may take several minutes depending on network bandwidth...")

    try:
        snapshot_download(
            repo_id=model_name,
            local_dir=str(output_dir),
            local_dir_use_symlinks=False,
            ignore_patterns=["*.msgpack", "*.h5", "*.ot"],
        )
        print("\n[SUCCESS] IndicTrans2 model weights downloaded successfully!")
        print(f"          Installed to: {output_dir}")
        print("\nNext steps:")
        print("1. In .env, ensure:")
        print("   INDICTRANS2_ENABLED=true")
        print(f"   INDICTRANS2_MODEL_PATH={output_dir}")
        print("2. Install runtime dependencies:")
        print("   pip install torch transformers sentencepiece sacremoses")
        print("3. Restart the backend service.")
    except Exception as e:
        print(f"\n[ERROR] Failed to download model: {e}")
        print("Please check your internet connection and retry.")


if __name__ == "__main__":
    choice = input("Select model to download:\n1. Distilled 200M (~800 MB, Fast on CPU - Recommended)\n2. Full 1B (~4.5 GB, Requires GPU / High RAM)\nChoice [1/2, default: 1]: ").strip()
    selected = FULL_MODEL if choice == "2" else DIST_MODEL
    download_model(selected)
