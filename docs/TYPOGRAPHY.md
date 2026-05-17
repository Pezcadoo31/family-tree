# Family Tree — Typography System

> Identity guide for type usage across the platform.
> Last updated: 2026-05-16

## Philosophy

Family Tree blends three emotional languages into one coherent identity:

- **Technology** (the platform itself, the future)
- **Urban heritage** (lineage, street culture, family identity)
- **History** (generations, dates, the weight of time)

Typography is how those three voices speak together without shouting.

## The four families

| Family | Role | Emotional voice |
|---|---|---|
| Geist Sans | UI baseline (80% of text) | Neutral, technical, premium |
| Permanent Marker | Family hero titles | Urban, confident, signature |
| Great Vibes | Personal names, intimate moments | Elegant, sentimental, Chicano script |
| UnifrakturCook | Dates, generations, historical anchors | Heritage, gravity, ceremony |

## Hierarchy table

| Context | Family | Size | Weight | Tracking |
|---|---|---|---|---|
| Family hero (`VICENCIO ANTONIO`) | Permanent Marker | 48-72px | 400 | 0.02em |
| Person name hero (`Abdiel Vicencio`) | Great Vibes | 40-56px | 400 | normal |
| Pet name hero (`Canelita`) | Great Vibes | 40-56px | 400 | normal |
| Generation/era (`GEN II`, `1948`) | UnifrakturCook | 18-32px | 700 | normal |
| Page title (H1) | Geist Sans | 32px | 500 | -0.02em |
| Section title (H2) | Geist Sans | 18px | 500 | -0.01em |
| Section label (`PERSONAS`) | Geist Sans | 11-13px | 500 | 0.08em UPPER |
| Card name | Geist Sans | 17px | 500 | normal |
| Nickname inline (`"Pez"`) | Great Vibes | 18-24px | 400 | normal |
| Body text | Geist Sans | 14-15px | 400 | normal, line-height 1.6 |
| Metadata | Geist Sans | 12px | 400 | normal |
| Technical data (IDs, timestamps) | Geist Mono | 11-12px | 400 | normal |
| Buttons | Geist Sans | 13-14px | 500 | normal |

## Usage rules

### Permanent Marker
- UPPERCASE only
- Family names only, never individuals
- Max 1 per screen
- Color: violeta `#a855f7` or cyan `#00ffd4`
- Never on white pure

### Great Vibes
- Minimum size: 18px (below that it's illegible)
- Never for buttons, navigation, or technical text
- Never UPPERCASE
- Best in violeta or cyan tones, never harsh white

### UnifrakturCook
- Numbers and short words only (1-3 words max)
- Never for descriptive paragraphs
- Color: muted (`#71717a` zinc-500), never bright
- Max 2-3 instances per screen
- Weight: 700 (the regular weight is too thin on dark mode)

### Geist Sans
- 80% of all text
- Weights: 400 (regular) and 500 (medium) only
- Never 700 — it looks heavy against dark mode
- Big titles: `letter-spacing: -0.02em`
- Small UPPERCASE labels: `letter-spacing: 0.06-0.08em`

## Color rules

- Headings (Geist Sans 500): `#fafafa` (zinc-50)
- Body (Geist Sans 400): `#fafafa` or `#e4e4e7` (zinc-200)
- Secondary (metadata): `#a1a1aa` (zinc-400)
- Tertiary (hints, labels): `#71717a` (zinc-500)
- Disabled/decorative numbers (UnifrakturCook): `#52525b` (zinc-600)
- Accent violeta (persons): `#a855f7`
- Accent cyan (pets): `#00ffd4`
- Glow violeta: `rgba(168, 85, 247, 0.3)`
- Glow cyan: `rgba(0, 255, 212, 0.3)`

## Anti-patterns

- More than 4 font families on one screen
- Mixing Great Vibes with Permanent Marker in the same hero
- UnifrakturCook for paragraphs or long phrases
- Permanent Marker in lowercase (looks broken)
- Geist Sans weight 700 (too heavy in dark mode)
- Drop shadows or gradients on text
- Emoji in headings
- Comic Sans, Papyrus, or any decorative font outside the four chosen