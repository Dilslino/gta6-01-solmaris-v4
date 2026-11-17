// The city itself: road graph, districts, buildings, palms, the plaza and
// the marina water. Generation is seeded, so the same seed builds the same
// city. Buildings are AABBs the world collides against.
import { AVENUES, STREETS, ROAD_W, BLOCK, WORLD, districtAt, PALETTE } from './config.js';

export function createCity(random) {
  const buildings = [];
  const palms = [];
  // Plaza block: the cell between avenue 4 and 5, street 3 and 4 — kept open.
  const plazaCell = { ax: 4, sy: 3 };
  for (let ax = 0; ax < AVENUES.length - 1; ax++) {
    for (let sy = 0; sy < STREETS.length - 1; sy++) {
      const bx = AVENUES[ax] + ROAD_W / 2;
      const by = STREETS[sy] + ROAD_W / 2;
      if (ax === plazaCell.ax && sy === plazaCell.sy) {
        // Plaza: fountain in the middle, palms around the edge.
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          palms.push({ x: bx + BLOCK / 2 + Math.cos(a) * 88, y: by + BLOCK / 2 + Math.sin(a) * 88, r: 9 });
        }
        continue;
      }
      const cx = bx + BLOCK / 2;
      const cy = by + BLOCK / 2;
      const d = districtAt(cx, cy);
      const kind = random.next();
      if (kind < 0.62) {
        // One big block building.
        const w = BLOCK * random.range(0.55, 0.8);
        const h = BLOCK * random.range(0.5, 0.75);
        buildings.push(makeBuilding(cx - w / 2, cy - h / 2, w, h, d, random));
      } else if (kind < 0.88) {
        // Two side-by-side buildings.
        const w = BLOCK * 0.42;
        const h = BLOCK * random.range(0.5, 0.72);
        buildings.push(makeBuilding(bx + 6, cy - h / 2, w, h, d, random));
        buildings.push(makeBuilding(bx + BLOCK - w - 6, cy - h / 2, w, h * random.range(0.7, 1), d, random));
      } else {
        // Small shops row.
        for (let i = 0; i < 3; i++) {
          const w = BLOCK / 3 - 10;
          buildings.push(makeBuilding(bx + 5 + i * (BLOCK / 3), by + BLOCK * 0.2, w, BLOCK * 0.45, d, random));
        }
      }
      // A palm or two on most blocks.
      if (random.chance(0.7)) {
        palms.push({ x: bx + random.range(14, BLOCK - 14), y: by + random.range(14, BLOCK - 14), r: 8 });
      }
    }
  }
  // Marina palms along the west promenade.
  for (let y = 200; y < WORLD.height - 100; y += 130) {
    palms.push({ x: 96, y: y + random.range(-20, 20), r: 9 });
  }
  return { buildings, palms };
}

function makeBuilding(x, y, w, h, district, random) {
  const height = random.range(10, 42); // 2.5D roof lift in px
  const floors = Math.max(1, Math.round(height / 11));
  return {
    x, y, w, h, height, floors,
    roof: district.roof,
    wall: district.wall,
    accent: district.accent,
    windows: random.int(2, 5),
  };
}

// Plaza centre (mission 1 target / spawn).
export const PLAZA = { x: AVENUES[4] + ROAD_W / 2 + BLOCK / 2, y: STREETS[3] + ROAD_W / 2 + BLOCK / 2 };

// True when a circle of radius r at (x, y) overlaps any building.
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// Push a circle out of buildings; returns the building hit, if any.
export function resolveBuildingCollision(city, pos, r) {
  const b = hitsBuilding(city, pos.x, pos.y, r);
  if (!b) return null;
  const overlapL = pos.x + r - b.x;
  const overlapR = b.x + b.w - (pos.x - r);
  const overlapT = pos.y + r - b.y;
  const overlapB = b.y + b.h - (pos.y - r);
  const min = Math.min(overlapL, overlapR, overlapT, overlapB);
  if (min === overlapL) pos.x = b.x - r;
  else if (min === overlapR) pos.x = b.x + b.w + r;
  else if (min === overlapT) pos.y = b.y - r;
  else pos.y = b.y + b.h + r;
  return b;
}

// Nearest road point: snap a position onto the road graph (used by traffic).
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const ax of AVENUES) {
    const d = Math.abs(x - ax);
    if (d < bestD) { bestD = d; best = { x: ax, y, vertical: true }; }
  }
  for (const sy of STREETS) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; best = { x, y: sy, vertical: false }; }
  }
  return best;
}

// Is (x, y) on a road (within the asphalt)?
export function onRoad(x, y) {
  for (const ax of AVENUES) if (Math.abs(x - ax) <= ROAD_W / 2) return true;
  for (const sy of STREETS) if (Math.abs(y - sy) <= ROAD_W / 2) return true;
  return false;
}

export { PALETTE };
