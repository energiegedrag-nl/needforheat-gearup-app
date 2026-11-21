"""uhi_pc4_rivm_2022.json: the RIVM urban heat island effect per PC4, from AnonyMate's PC6 table.

Usage: python -I make_uhi_pc4.py uhi-pc6-rivm-20220601-v2.parquet ../uhi_pc4_rivm_2022.json
(the parquet: https://github.com/anonymate-nl/anonymate/releases/download/bronnen-cache/
uhi-pc6-rivm-20220601-v2.parquet). Mean per PC4 weighted by the number of addresses, in tenths
of a kelvin; prints how far the PC6 values lie from their PC4 mean.
"""
import json
import sys

import numpy as np
import pandas as pd

d = pd.read_parquet(sys.argv[1])
d["pc4"] = d.pc6.str[:4]
d["w"] = d.n_adressen.clip(lower=1)
mean = d.groupby("pc4").apply(lambda x: np.average(x.uhi__degC, weights=x.w), include_groups=False)
dev = d.uhi__degC - d.pc4.map(mean)
print(f"{len(mean)} PC4; RMS PC6 vs PC4 mean {np.sqrt(np.average(dev ** 2, weights=d.w)):.2f} K")
table = {k: int(round(v * 10)) for k, v in mean.items()}
with open(sys.argv[2], "w") as f:
    f.write(json.dumps(table, separators=(",", ":")))
