"""Build data/coming-soon.json from LorcanaJSON + official Disney Lorcana pages."""
from __future__ import annotations

import html as html_lib
import json
import re
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CARDS_URL = "https://lorcanajson.org/files/current/en/allCards.json"
NEWS_URL = "https://www.disneylorcana.com/en-US/news/"
USER_AGENT = "EnchantedInk/1.0 (+https://github.com/BigDaddyDawg/EnchantedInk; fan gallery refresh)"

PRODUCT_SLUGS = {
    "14": "hyperia-city",
    "15": "into-the-inkdark",
    "Q3": "great-hunny-rescue",
}

SET_BLURBS = {
    "14": (
        "Drop in for the music and magic of a bustling metropolis — and the debut of "
        "glimmers from Pixar’s Coco."
    ),
    "15": "The next chapter after Hyperia City. Details are still swirling in the ink…",
    "Q3": "Illumineer’s Quest: The Great Hunny Rescue — a Pooh-flavored adventure for October 2026.",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def fetch_text(url: str) -> str:
    return fetch(url).decode("utf-8", errors="ignore")


def slim_card(c: dict, sets: dict) -> dict:
    imgs = c.get("images") or {}
    thumb = imgs.get("thumbnail") or imgs.get("full")
    full = imgs.get("full") or thumb
    sc = str(c.get("setCode", ""))
    return {
        "id": c.get("id"),
        "fullName": c.get("fullName") or c.get("name"),
        "name": c.get("name") or "",
        "version": c.get("version") or "",
        "rarity": c.get("rarity") or "",
        "setCode": sc,
        "setName": (sets.get(sc) or {}).get("name") or sc,
        "story": c.get("story") or "",
        "type": c.get("type") or "",
        "color": c.get("color") or "",
        "thumb": thumb,
        "full": full,
        "isExternalReveal": bool(c.get("isExternalReveal")),
    }


def clean(text: str) -> str:
    text = html_lib.unescape(text or "")
    return re.sub(r"\s+", " ", text).strip()


def parse_news_html(raw: str) -> list[dict]:
    """Parse SSR news cards from the official Disney Lorcana news page."""
    items: list[dict] = []
    seen: set[str] = set()

    # Blocks usually look like: date + optional category + heading + description
    pattern = re.compile(
        r'<p class="date">(?P<date>[^<]+)</p>\s*'
        r'(?:<p class="category">(?P<category>[^<]*)</p>\s*)?'
        r'<h1 class="heading">(?P<title>[^<]+)</h1>\s*'
        r'(?:<p class="description">(?P<summary>.*?)</p>)?',
        re.I | re.S,
    )

    for m in pattern.finditer(raw):
        title = clean(m.group("title"))
        if not title or title.lower() in {"news", "latest news", "featured news", "all news"}:
            continue
        key = title.lower()
        if key in seen:
            continue
        seen.add(key)

        # Find nearest article link around this match
        window = raw[max(0, m.start() - 500) : m.end() + 500]
        href_match = re.search(
            r'href="(/en-US/news/\d{4}/\d{2}/[^"]+|/en-US/news/[a-z0-9\-]+)"',
            window,
            re.I,
        )
        url = NEWS_URL
        if href_match:
            url = "https://www.disneylorcana.com" + href_match.group(1)

        # Image nearby
        img = None
        img_match = re.search(r'<img[^>]+src="([^"]+)"', window, re.I)
        if img_match:
            img = img_match.group(1)

        items.append(
            {
                "title": title,
                "date": clean(m.group("date")),
                "category": clean(m.group("category") or "News"),
                "summary": clean(m.group("summary") or "")[:320],
                "url": url,
                "image": img,
            }
        )

    return items[:18]


def enrich_set_from_product(code: str, slug: str) -> dict:
    """Pull blurb / hero art / dates from the official product page via jina markdown."""
    out: dict = {"productUrl": f"https://www.disneylorcana.com/en-US/product/{slug}"}
    try:
        md = fetch_text(f"https://r.jina.ai/http://www.disneylorcana.com/en-US/product/{slug}")
    except Exception as exc:  # noqa: BLE001
        print(f"  product enrich failed for {slug}: {exc}")
        return out

    # Hero image
    img = re.search(r"!\[[^\]]*\]\((https://ravensburger\.cloud/[^)\s]+)\)", md)
    if img:
        out["heroImage"] = img.group(1)

    # Dates
    pre = re.search(r"Prerelease:\s*([A-Za-z]+ \d{1,2}, \d{4})", md)
    everywhere = re.search(r"Everywhere:\s*([A-Za-z]+ \d{1,2}, \d{4})", md)
    if pre:
        out["prereleaseLabel"] = pre.group(1)
    if everywhere:
        out["releaseLabel"] = everywhere.group(1)

    # First meaningful paragraph after the welcome / description headings
    paras = [
        clean(p)
        for p in re.findall(r"\n([A-Z][^#\n]{40,400})\n", md)
        if "Welcome" in p or "metro" in p.lower() or "adventure" in p.lower() or "quest" in p.lower()
    ]
    if not paras:
        # fallback: longest decent paragraph
        paras = sorted(
            (clean(p) for p in re.findall(r"\n([A-Z][^#\n]{60,400})\n", md)),
            key=len,
            reverse=True,
        )
    if paras:
        out["blurb"] = paras[0][:420]

    # Card preview image links if any
    preview_imgs = re.findall(
        r"!\[[^\]]*\]\((https://(?:ravensburger\.cloud|api\.lorcana\.ravensburger\.com)/[^)\s]+)\)",
        md,
    )
    # Skip product packaging if we can identify card-ish urls later; keep a few heroes
    if preview_imgs:
        out["gallery"] = preview_imgs[:6]

    print(f"  enriched {code} ({slug})")
    return out


def main() -> None:
    DATA.mkdir(exist_ok=True)
    print("Fetching LorcanaJSON…")
    payload = json.loads(fetch(CARDS_URL))
    sets_raw = payload["sets"]
    today = date.today().isoformat()

    upcoming = []
    for code, info in sets_raw.items():
        release = info.get("releaseDate")
        incomplete = not info.get("hasAllCards", True)
        future = bool(release and release > today)
        if not (incomplete or future):
            continue
        cards_in_set = [c for c in payload["cards"] if str(c.get("setCode")) == str(code)]
        entry = {
            "code": code,
            "name": info.get("name"),
            "releaseDate": release,
            "prereleaseDate": info.get("prereleaseDate"),
            "hasAllCards": bool(info.get("hasAllCards")),
            "type": info.get("type"),
            "number": info.get("number"),
            "cardCounts": info.get("cardCounts"),
            "revealedCount": len(cards_in_set),
            "blurb": SET_BLURBS.get(str(code), ""),
        }
        slug = PRODUCT_SLUGS.get(str(code))
        if slug:
            entry.update({k: v for k, v in enrich_set_from_product(code, slug).items() if v})
            if not entry.get("blurb"):
                entry["blurb"] = SET_BLURBS.get(str(code), "")
        upcoming.append(entry)

    upcoming.sort(
        key=lambda s: (
            s.get("releaseDate") or "9999-99-99",
            s.get("number") if s.get("number") is not None else 999,
            s["code"],
        )
    )

    incomplete_codes = {s["code"] for s in upcoming}
    reveals = []
    for c in payload["cards"]:
        if c.get("isExternalReveal") or str(c.get("setCode")) in incomplete_codes:
            sc = slim_card(c, sets_raw)
            if sc.get("thumb") or sc.get("full"):
                reveals.append(sc)

    print(f"Upcoming sets: {len(upcoming)}, reveals: {len(reveals)}")

    news: list[dict] = []
    try:
        print("Fetching official news…")
        news = parse_news_html(fetch_text(NEWS_URL))
        print(f"News items: {len(news)}")
    except Exception as exc:  # noqa: BLE001
        print(f"News fetch failed: {exc}")

    out = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": {
            "cards": "LorcanaJSON (https://lorcanajson.org/)",
            "news": NEWS_URL,
        },
        "upcomingSets": upcoming,
        "reveals": reveals,
        "news": news,
    }
    path = DATA / "coming-soon.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
