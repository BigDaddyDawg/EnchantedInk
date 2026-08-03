# Enchanted Ink

A magical static gallery of every Disney Lorcana card ever released — browse by set, rarity, or character/story, and tap any card to see its details.

## Live site

After Pages is enabled: `https://bigdaddydawg.github.io/EnchantedInk/`

## Local

Open `index.html` via a local static server (needed so `data/cards.json` can load):

```powershell
python -m http.server 8080
```

Then visit http://localhost:8080

## Data

Card catalog is built from [LorcanaJSON](https://lorcanajson.org/) into `data/cards.json`.

## Coming Soon tab

Sources of truth:
- **Upcoming sets & spoilers:** [LorcanaJSON](https://lorcanajson.org/) (incomplete / future sets + early reveals)
- **News & set blurbs:** Official [Disney Lorcana news](https://www.disneylorcana.com/en-US/news/) and product pages

Refresh behavior:
- When she opens **Coming Soon**, the app reloads `data/coming-soon.json` and tries a **live** pull of official news
- GitHub Actions also refreshes the snapshot twice a week (Sun/Wed) — or run locally:

```powershell
python scripts/refresh_coming_soon.py
```

Then commit + push, or trigger the **Refresh Coming Soon** workflow from GitHub Actions.

## Credit

Fan project. Disney Lorcana and related marks are trademarks of Disney and Ravensburger. Not affiliated with Disney or Ravensburger.
