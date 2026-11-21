"""Expected values for signature.test.tsx, computed by AnonyMate itself.

Usage (from a checkout of anonymate-nl/anonymate with its virtual environment):
    <anonymate>/.venv/Scripts/python -I make_fixtures.py <anonymate>/src ../signature.fixtures.json

Keeps the cases already in the fixture file (their inputs) and adds the cases below; every case is
computed again with the AnonyMate checkout given, for all methods, with detail=True. Façades per
orientation go in as `gevel__m` / `gevelzij__m` (8 values, N NE E SE S SW W NW, clockwise): the
exposed wall length per sector, as the app measures it from the BAG footprints. AnonyMate's columns
gevel_<r>__m2 take an area; only the shares per orientation matter, so a length works the same.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, sys.argv[1])
import pandas as pd  # noqa: E402

from anonymate import signature  # noqa: E402

RICHTINGEN = ("n", "no", "o", "zo", "z", "zw", "w", "nw")
METHODS = ["nta8800", "mwa", "best", "ep", "ep_3dbag", "passend"]
OUT = Path(sys.argv[2])

NEW_CASES = [
    {   # row house, front south, back north; type from the neighbours (no label)
        "name": "tussenwoning 1975 zuid-noord, type uit buren",
        "bouwjaar__yr": 1975, "oppervlakte__m2": 110, "pand_woningen__0": 1,
        "aaneengebouwd__bool": True, "daktype__cat": "slanted", "bouwlagen__0": 2,
        "opp_buitenmuur__m2": 66, "opp_grond__m2": 55, "opp_dak_plat__m2": 0,
        "opp_dak_schuin__m2": 70, "opp_scheidingsmuur__m2": 100,
        "gevel__m": [5.5, 0, 0, 0, 5.5, 0, 0, 0], "gevelzij__m": [0] * 8,
        "buren__0": 2, "blok_panden__0": 6,
    },
    {   # row house, front east, back west
        "name": "tussenwoning 1975 oost-west, type uit buren",
        "bouwjaar__yr": 1975, "oppervlakte__m2": 110, "pand_woningen__0": 1,
        "aaneengebouwd__bool": True, "daktype__cat": "slanted", "bouwlagen__0": 2,
        "opp_buitenmuur__m2": 66, "opp_grond__m2": 55, "opp_dak_plat__m2": 0,
        "opp_dak_schuin__m2": 70, "opp_scheidingsmuur__m2": 100,
        "gevel__m": [0, 0, 5.5, 0, 0, 0, 5.5, 0], "gevelzij__m": [0] * 8,
        "buren__0": 2, "blok_panden__0": 6,
    },
    {   # end of a row: side façade to the west; 3D-BAG share alone would say mid-terrace
        "name": "hoekwoning 1960 met zijgevel west, type uit buren",
        "bouwjaar__yr": 1960, "oppervlakte__m2": 100, "pand_woningen__0": 1,
        "aaneengebouwd__bool": True, "daktype__cat": "slanted", "bouwlagen__0": 2,
        "opp_buitenmuur__m2": 140, "opp_grond__m2": 50, "opp_dak_plat__m2": 0,
        "opp_dak_schuin__m2": 65, "opp_scheidingsmuur__m2": 50,
        "gevel__m": [5.5, 0, 0, 0, 5.5, 0, 9.0, 0], "gevelzij__m": [0, 0, 0, 0, 0, 0, 9.0, 0],
        "buren__0": 1, "blok_panden__0": 4,
    },
    {   # semi-detached, flat roof, side façade east
        "name": "twee-onder-een-kap 2005 plat dak, zijgevel oost",
        "bouwjaar__yr": 2005, "oppervlakte__m2": 140, "pand_woningen__0": 1,
        "aaneengebouwd__bool": True, "daktype__cat": "horizontal", "bouwlagen__0": 3,
        "opp_buitenmuur__m2": 190, "opp_grond__m2": 70, "opp_dak_plat__m2": 70,
        "opp_dak_schuin__m2": 0, "opp_scheidingsmuur__m2": 75,
        "gevel__m": [7.0, 0, 10.0, 0, 7.0, 0, 0, 0], "gevelzij__m": [0, 0, 10.0, 0, 0, 0, 0, 0],
        "buren__0": 1, "blok_panden__0": 2,
    },
    {   # detached, turned 45 degrees; a label (C) as well
        "name": "vrijstaand 1990 diagonaal, label C",
        "bouwjaar__yr": 1990, "oppervlakte__m2": 160, "pand_woningen__0": 1,
        "aaneengebouwd__bool": False, "daktype__cat": "slanted", "bouwlagen__0": 2,
        "opp_buitenmuur__m2": 200, "opp_grond__m2": 90, "opp_dak_plat__m2": 0,
        "opp_dak_schuin__m2": 115, "opp_scheidingsmuur__m2": 0,
        "gevel__m": [0, 10.0, 0, 9.0, 0, 10.0, 0, 9.0], "gevelzij__m": [0] * 8,
        "buren__0": 0, "blok_panden__0": 1, "energielabel__cat": "C",
    },
]

KEEP = ["H__W_K_1", "C__Wh_K_1", "tau__h", "Asol__m2", "Ainf__cm2", "woningtype_gebruikt__cat",
        "isolatieniveau__0", "qv10__dm3_s_1_m_2", "ELA__cm2", "asol_bron__str"]


def frame(case: dict) -> pd.DataFrame:
    row = {k: v for k, v in case.items() if k not in ("name", "gevel__m", "gevelzij__m")}
    for key, col in (("gevel__m", "gevel_{}__m2"), ("gevelzij__m", "gevelzij_{}__m2")):
        if key in case:
            for r, v in zip(RICHTINGEN, case[key]):
                row[col.format(r)] = v
    return pd.DataFrame([row])


def expected(case: dict) -> dict:
    out = {}
    df = frame(case)
    for m in METHODS:
        res = signature.compute(df.copy(), m, detail=True).iloc[0]
        rec = {}
        for k in KEEP:
            col = signature.namen.uitvoer_kolom(k.split("__")[0]) if k.split("__")[0] in (
                "H", "C", "tau", "Asol", "Ainf") else k
            v = res.get(col, res.get(k))
            rec[k] = None if v is None or (isinstance(v, float) and v != v) else (
                v.item() if hasattr(v, "item") else v)
        out[m] = rec
    return out


old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"cases": []}
names = {c["input"]["name"] for c in old["cases"]}
inputs = [c["input"] for c in old["cases"]] + [c for c in NEW_CASES if c["name"] not in names]
data = {
    "bron": "AnonyMate signature.compute (anonymate-nl/anonymate), gegenereerd voor "
            "needforheat-gearup-app met tools/make_fixtures.py",
    "cases": [{"input": c, "expected": expected(c)} for c in inputs],
}
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"{len(data['cases'])} cases -> {OUT}")
