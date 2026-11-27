"""Convert a PaddleOCR .pdparams checkpoint into a torch .pt state_dict (tensors keep Paddle names/layout).
NOTE: Paddle Linear weights are [in, out]; torch Linear is [out, in] -> transpose when mapping into a torch model.
Use `run.py export` for the Paddle inference model if you just want to deploy.
"""
import sys
import numpy as np
import paddle, torch

src, dst = sys.argv[1], sys.argv[2]
sd = paddle.load(src)
out = {k: torch.from_numpy(np.asarray(v)) for k, v in sd.items() if hasattr(v, "shape")}
torch.save(out, dst)
print(f"saved {len(out)} tensors -> {dst}")
