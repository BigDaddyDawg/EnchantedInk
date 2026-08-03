"""Refresh data/cards.json from LorcanaJSON."""
from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SOURCE = "https://lorcanajson.org/files/current/en/allCards.json"


def main() -> None:
    DATA.mkdir(exist_ok=True)
    print(f"Downloading {SOURCE}…")
    with urllib.request.urlopen(SOURCE, timeout=120) as resp:
        data = json.load(resp)

    sets = {
        k: {
            "code": k,
            "name": v["name"],
            "releaseDate": v.get("releaseDate"),
            "type": v.get("type"),
            "number": v.get("number"),
        }
        for k, v in data["sets"].items()
    }

    cards = []
    for c in data["cards"]:
        imgs = c.get("images") or {}
        thumb = imgs.get("thumbnail") or imgs.get("full")
        full = imgs.get("full") or thumb
        if not thumb:
            continue
        sc = str(c.get("setCode", ""))
        cards.append(
            {
                "id": c["id"],
                "fullName": c.get("fullName") or c.get("name"),
                "name": c.get("name") or "",
                "version": c.get("version") or "",
                "rarity": c.get("rarity") or "",
                "setCode": sc,
                "setName": sets.get(sc, {}).get("name") or sc,
                "story": c.get("story") or "",
                "type": c.get("type") or "",
                "color": c.get("color") or "",
                "thumb": thumb,
                "full": full,
                "number": c.get("number"),
            }
        )

    def set_key(code: str):
        info = sets.get(code, {})
        n = info.get("number")
        return (999 if n is None else n, code)

    cards.sort(key=lambda c: (set_key(c["setCode"]), c.get("number") or 0, c["id"]))

    out = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(cards),
        "sets": sorted(
            sets.values(),
            key=lambda s: (999 if s.get("number") is None else s["number"], s["code"]),
        ),
        "rarities": [
            "Common",
            "Uncommon",
            "Rare",
            "Super Rare",
            "Legendary",
            "Enchanted",
            "Epic",
            "Iconic",
            "Special",
        ],
        "stories": sorted({c["story"] for c in cards if c["story"]}),
        "cards": cards,
    }

    path = DATA / "cards.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size:,} bytes, {out['count']} cards)")


if __name__ == "__main__":
    main()
