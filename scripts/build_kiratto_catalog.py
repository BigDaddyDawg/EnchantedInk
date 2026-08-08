"""Build data/kiratto-cards.json from Tenyo's official Art Gallery page."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "kiratto-cards.json"
SOURCE = "https://tenyo.jp/agcard"
IMG_BASE = "https://tenyo.jp/assets/agcard/img/pickup"
CACHE = Path(__file__).with_name("_agcard_cache.html")

RARITY_BY_TYPE = {
    "3": "Crystal & Gold",
    "2": "Gold",
    "1": "Crystal",
}

PACKS = {
    "b": {"code": "BLUE", "name": "Blue Pack", "prefix": "b", "number": 1},
    "r": {"code": "RED", "name": "Red Pack", "prefix": "r", "number": 2},
    "g": {"code": "GREEN", "name": "Green Pack", "prefix": "g", "number": 3},
}

NAME_MAP = {
    "ミッキーマウス": "Mickey Mouse",
    "ピーター・パン": "Peter Pan",
    "トイ・ストーリー": "Toy Story",
    "ラプンツェル": "Rapunzel",
    "エルサ": "Elsa",
    "アナ": "Anna",
    "ベイマックス": "Baymax",
    "メリー・ポピンズ": "Mary Poppins",
    "オーロラ姫": "Aurora",
    "白雪姫": "Snow White",
    "トイ・ストーリー 4": "Toy Story 4",
    "トイ・ストーリー4": "Toy Story 4",
    "ズートピア": "Zootopia",
    "とんすけ&フラワー": "Thumper & Flower",
    "とんすけ＆ミス・バニー": "Thumper & Miss Bunny",
    "101匹わんちゃん": "101 Dalmatians",
    "シンバ": "Simba",
    "グーフィー": "Goofy",
    "ジーニー": "Genie",
    "ティンカー・ベル": "Tinker Bell",
    "チップ&デール": "Chip & Dale",
    "チップ＆デール": "Chip & Dale",
    "チップ＆デール＆クラリス": "Chip, Dale & Clarice",
    "スティッチ": "Stitch",
    "アリス": "Alice",
    "ドナルドダック": "Donald Duck",
    "シンデレラ": "Cinderella",
    "アリエル": "Ariel",
    "プーさん&ピグレット": "Pooh & Piglet",
    "ラビット": "Rabbit",
    "ヤングオイスター": "Young Oysters",
    "ヘラクレス": "Hercules",
    "ウェンディ": "Wendy",
    "ジャスミン": "Jasmine",
    "Mr.インクレディブル": "Mr. Incredible",
    "チップ": "Chip",
    "ジミニー・クリケット": "Jiminy Cricket",
    "ミニーマウス": "Minnie Mouse",
    "インサイド・ヘッド": "Inside Out",
    "ダンボ": "Dumbo",
    "おしゃれキャット": "The Aristocats",
    "ミッキーマウス&ミニーマウス": "Mickey & Minnie",
    "マックス": "Max",
    "プルート": "Pluto",
    "デイジーダック": "Daisy Duck",
    "ティガー": "Tigger",
    "ピグレット": "Piglet",
    "くまのプーさん": "Winnie the Pooh",
    "プーさん": "Winnie the Pooh",
    "アラジン": "Aladdin",
    "美女と野獣": "Beauty and the Beast",
    "ジュディ・ホップス": "Judy Hopps",
    "ニック・ワイルド": "Nick Wilde",
    "ウッディ": "Woody",
    "バズ・ライトイヤー": "Buzz Lightyear",
    "カーズ": "Cars",
    "カールじいさんの空飛ぶ家": "Up",
    "アナ & オラフ": "Anna & Olaf",
    "アナ＆オラフ": "Anna & Olaf",
    "チェシャ猫": "Cheshire Cat",
    "クレオ": "Cleo",
    "オウル": "Owl",
    "カンガ&ルー": "Kanga & Roo",
    "バンビ": "Bambi",
    "ハイアワサ": "Little Hiawatha",
    "ランピー": "Lumpy",
    "ミス・バニー": "Miss Bunny",
    "ディズニー マリー": "Marie",
    "リメンバー･ミー": "Coco",
    "リメンバー・ミー": "Coco",
    "ピノキオ": "Pinocchio",
    "リロ&スティッチ": "Lilo & Stitch",
    "プルート & フィフィ": "Pluto & Fifi",
    "ピート": "Pete",
    "クララベル・カウ": "Clarabelle Cow",
    "モーティー&フェルディ": "Morty & Ferdie",
    "ルー": "Roo",
    "オラフ": "Olaf",
    "エイリアン": "Alien",
    "ポカホンタス": "Pocahontas",
    "ベル": "Belle",
    "ミッキーと仲間たち": "Mickey and Friends",
    "レミーのおいしいレストラン": "Ratatouille",
    "ヒューイ・デューイ・ルーイ": "Huey, Dewey & Louie",
    "野獣": "Beast",
    "ファンタジア": "Fantasia",
    "ティガー＆イーヨー": "Tigger & Eeyore",
    "レディ＆トランプ": "Lady & Tramp",
    "三人の騎士": "The Three Caballeros",
    "アーロと少年": "The Good Dinosaur",
    "ファインディング・ドリー": "Finding Dory",
    "クラリス": "Clarice",
    "モンスターズ・インク": "Monsters, Inc.",
    "カーズ３": "Cars 3",
    "ホーレス・ホースカラー": "Horace Horsecollar",
    "塔の上のラプンツェル": "Tangled",
    "ふしぎの国のアリス": "Alice in Wonderland",
    "デール": "Dale",
}

SERIES_MAP = {
    "It's Magic!": "It's Magic!",
    "Rainbow": "Rainbow",
    "ミュージカルマジック": "Musical Magic",
    "ステンドグラス・アート": "Stained Glass Art",
    "ピュアリーディズニープリンセス": "Purely Disney Princess",
    "One Day at Sunset": "One Day at Sunset",
    "ベストショット!": "Best Shot!",
    "Sweet Little Friends": "Sweet Little Friends",
    "ポートレート": "Portrait",
    "Cover Style": "Cover Style",
    "Sweet Dreams": "Sweet Dreams",
    "ディスティニー・ローズ": "Destiny Rose",
    "お花でおめかし": "Flower Dress-Up",
    "ふわふわ ベビー": "Fluffy Baby",
    "ドラマティック ライト": "Dramatic Light",
    "シルエットロマンス": "Silhouette Romance",
    "スティルイン マイマインド": "Still in My Mind",
    "ギアワールド": "Gear World",
    "Dear My Baby": "Dear My Baby",
    "kiss! kiss! kiss!": "kiss! kiss! kiss!",
    "美しき神秘の星座": "Mystical Constellation",
    "ちいさな出会い": "Little Encounters",
    "トゥインクルシャワー": "Twinkle Shower",
    "ワンス・アポン・ア・タイム": "Once Upon a Time",
    "カラーズ・オブ・ライト": "Colors of Light",
    "つながるアート": "Connecting Art",
}


def fetch_html() -> str:
    req = Request(SOURCE, headers={"User-Agent": "EnchantedInkCatalogBuilder/1.0"})
    with urlopen(req, timeout=30) as res:
        return res.read().decode("utf-8", errors="replace")


def clean_alt(alt: str) -> tuple[str, str]:
    # Official alts wrap mid-title with <br>; strip those before matching.
    text = re.sub(r"<br\s*/?>", "", alt, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    for jp in sorted(SERIES_MAP.keys(), key=len, reverse=True):
        if text.startswith(jp):
            rest = text[len(jp) :].strip(" ・-–—")
            # Some alts repeat the character twice after the series title.
            parts = rest.split()
            if len(parts) == 2 and parts[0] == parts[1]:
                rest = parts[0]
            return SERIES_MAP[jp], rest
    parts = text.split(" ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return text, text


def translate_name(jp: str) -> str:
    jp = jp.strip()
    if jp in NAME_MAP:
        return NAME_MAP[jp]
    norm = jp.replace("＆", "&").replace("･", "・")
    for key, val in NAME_MAP.items():
        if key.replace("＆", "&").replace("･", "・") == norm:
            return val
    return jp


def parse_cards(html: str) -> list[dict]:
    img_re = re.compile(
        r'src="/assets/agcard/img/pickup/(?P<pack>[brg])-(?P<num>\d{3})\.jpg[^"]*"'
        r'[^>]*alt="(?P<alt>[^"]*)"',
        re.I,
    )
    type_re = re.compile(r"type_([123])\.png", re.I)
    cards: list[dict] = []
    seen: set[str] = set()
    for m in img_re.finditer(html):
        pack_key = m.group("pack").lower()
        num = int(m.group("num"))
        card_id = f"kiratto-{pack_key}-{num:03d}"
        if card_id in seen:
            continue
        seen.add(card_id)

        window = html[max(0, m.start() - 400) : m.start()]
        types = type_re.findall(window)
        type_code = types[-1] if types else "1"
        pack = PACKS[pack_key]
        series_raw, name_jp = clean_alt(m.group("alt"))
        name = translate_name(name_jp)
        rarity = RARITY_BY_TYPE.get(type_code, "Crystal")
        version = series_raw
        thumb = full = f"{IMG_BASE}/{pack['prefix']}-{num:03d}.jpg"
        cards.append(
            {
                "id": card_id,
                "fullName": f"{name} — {version}",
                "name": name,
                "version": version,
                "rarity": rarity,
                "setCode": pack["code"],
                "setName": pack["name"],
                "story": name,
                "type": "Gallery Card",
                "color": pack["name"].replace(" Pack", ""),
                "thumb": thumb,
                "full": full,
                "number": num,
                "source": "tenyo",
                "url": SOURCE,
            }
        )
    cards.sort(key=lambda c: c["number"])
    return cards


def build(html: str) -> dict:
    cards = parse_cards(html)
    if len(cards) != 150:
        raise SystemExit(f"Expected 150 cards, found {len(cards)}")
    stories = sorted({c["story"] for c in cards})
    rarities = ["Crystal & Gold", "Gold", "Crystal"]
    sets = [
        {
            "code": p["code"],
            "name": p["name"],
            "releaseDate": None,
            "type": "pack",
            "number": p["number"],
        }
        for p in PACKS.values()
    ]
    return {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(cards),
        "sets": sets,
        "rarities": rarities,
        "stories": stories,
        "cards": cards,
        "source": SOURCE,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache-only", action="store_true", help="Skip network fetch")
    args = parser.parse_args()

    html = None
    if not args.cache_only:
        try:
            html = fetch_html()
            CACHE.write_text(html, encoding="utf-8")
            print(f"Fetched {SOURCE}")
        except Exception as exc:
            print(f"Fetch failed ({exc}); falling back to cache")
    if html is None:
        if not CACHE.exists():
            raise SystemExit("No HTML cache available")
        html = CACHE.read_text(encoding="utf-8")
        print(f"Using cache {CACHE.name}")

    data = build(html)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({data['count']} cards)")
    leftover = sorted(
        {c["name"] for c in data["cards"] if re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", c["name"])}
    )
    if leftover:
        print("Untranslated names:", leftover)


if __name__ == "__main__":
    main()
