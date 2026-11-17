# Solmaris

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Dilslino/gta6-01-solmaris-v4/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Dilslino/gta6-01-solmaris-v4/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmaris** is an original open-world crime game built for make.fun's "Make GTA 6" bounty — a sun-soaked coastal city you can explore on foot and by car, with traffic, pedestrians, car theft, a wanted system with police chases, a six-mission story, combat, shops, a HUD with a circular minimap, and a save that persists between visits. Everything in it — the city, the characters, the vehicles, the names, the story, the art and the sound — is original. No Rockstar Games names, characters, maps or assets appear anywhere.

## The city

Solmaris is a coastal city of five districts on a road graph of 9 avenues × 7 streets:

- **Marina Bay** — yachts, palms and the waterfront promenade.
- **Old Harbor** — warehouses, cranes and the fish market.
- **Palm Court** — the downtown plaza, shops and offices.
- **Sunvale** — bright residential streets in the east.
- **Coral Heights** — hillside homes in the north-east.

Buildings are drawn in 2.5D: drop shadows, raised roofs with parapets and a shaded southern face give the flat canvas its depth.

## The story — "The Solmaris Job"

You are **Rae Voss**, a driver-for-hire who just rolled into Solmaris with $250 and a borrowed jacket. **Mara Kade**, a fixer at the Marina, has six jobs for you — a pickup, a harbor run, a package lift, a police escape, a delivery and a final getaway — paying $150 up to $5,000. Finish the chain and the city is yours to keep.

## How to play

Open `game/index.html` in a desktop browser (or serve the `game/` folder with any static server — no network, no build step, no libraries). Keyboard and mouse only.

| Input | Action |
|---|---|
| W A S D | Move on foot / drive (W accelerate, S brake/reverse, A D steer) |
| Mouse + click | Aim and shoot the pistol |
| E | Steal / enter a car, exit a car, open a shop |
| F | Punch (bat when owned) |
| Space | Handbrake |
| Shift | Sprint on foot |
| P / Esc | Pause |
| M | Mute sound |
| 1 / 2 / 3 | Buy in a shop |

### Systems

- **Driving & theft** — any traffic car can be stolen with E. Stealing in front of the law raises your wanted level.
- **Traffic & pedestrians** — about 14 cars follow the road graph and about 26 pedestrians walk the sidewalks; both flee danger, and hitting one is a crime.
- **Wanted 0–5 stars** — police chase and ram you, set roadblocks at 3 stars, and send a helicopter with a searchlight at 4+. Lay low and the heat decays. Get caught: **BUSTED** ($100 fine). Get beaten down: **WASTED**.
- **Missions** — six chained jobs with a beacon marker, an on-screen objective and cash rewards.
- **Combat** — fists, a bat and a pistol (mouse aim, limited ammo) against rival crews.
- **Economy** — three shops: **Taco Sol** (food heals), **Lumen Outfits** (armor), **Harbor Arms** (bat, pistol, ammo).
- **HUD & minimap** — cash, health, armor, ammo, wanted stars, mission objective and a circular minimap with traffic, police and the mission marker.
- **Save** — progress autosaves to the browser (cash, health, gear, mission, position) and loads from the title screen.
- **Sound** — all sound is synthesized live with WebAudio: engine hum, sirens, gunshots, pickups and a mission jingle. No audio files.

## Screenshots

The four screenshots under `screenshots/` are deterministic renders of the game's own code (`?shot=title|driving|chase|mission`, 1280×720): the title screen, driving through Palm Court, a three-star police chase with the helicopter, and the first mission at the plaza.

## Run it

```sh
# Any static server works, for example:
npx serve game
# then open http://localhost:3000
```

Or open `game/index.html` directly in Chrome. Deterministic scenes for screenshots:

```
game/index.html?shot=title
game/index.html?shot=driving
game/index.html?shot=chase
game/index.html?shot=mission
```

## Build / submit

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).

Entered on [make.fun](https://make.fun/?ref=5548afh3&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
