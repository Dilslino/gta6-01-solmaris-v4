// Solmaris tuning: every number and colour in one place.
// The world is a fixed 2700x2100 coastal city; the renderer scales a 1280x720
// viewport onto it and the camera follows the player, so no rule depends on
// the screen size.
export const STEP = 1 / 60;
export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 2700, height: 2100 };

// Road graph: 9 avenues x 7 streets, spacing 300, road width 72.
export const AVENUES = [150, 450, 750, 1050, 1350, 1650, 1950, 2250, 2550];
export const STREETS = [150, 450, 750, 1050, 1350, 1650, 1950];
export const ROAD_W = 72;
export const BLOCK = 300 - ROAD_W; // 228

export const PLAYER = {
  radius: 13,
  walkSpeed: 210,
  runSpeed: 320,
  health: 100,
  punchDamage: 15,
  punchRange: 46,
  punchArc: 1.1,
  punchCooldown: 0.38,
};

export const CAR = {
  accel: 520,
  brake: 900,
  reverseMax: 160,
  maxSpeed: 560,
  turnRate: 2.5,
  grip: 6.5,
  handbrakeGrip: 2.2,
  length: 52,
  width: 26,
};

export const TRAFFIC_CARS = 14;
export const PEDESTRIANS = 26;
export const POLICE_MAX = 8;

export const WANTED = {
  decayDelay: 6, // seconds unseen before heat starts falling
  decayRate: 0.12, // stars per second while hidden
  steal: 1,
  hitPed: 1,
  shoot: 1,
  kill: 1,
};

export const FINES = { busted: 100, wasted: 100 };

export const SHOPS = [
  {
    id: 'taco',
    name: 'Taco Sol',
    kind: 'food',
    x: 1350, y: 870,
    color: '#e2703a',
    items: [
      { key: '1', name: 'Sol Taco', price: 5, desc: '+25 health', heal: 25 },
      { key: '2', name: 'Burrito Grande', price: 12, desc: '+60 health', heal: 60 },
      { key: '3', name: 'Churro Box', price: 8, desc: '+35 health', heal: 35 },
    ],
  },
  {
    id: 'lumen',
    name: 'Lumen Outfits',
    kind: 'clothes',
    x: 1650, y: 1170,
    color: '#b06fd6',
    items: [
      { key: '1', name: 'Street Jacket', price: 120, desc: '+25 armor', armor: 25 },
      { key: '2', name: 'Kevlar Vest', price: 200, desc: '+50 armor', armor: 50 },
      { key: '3', name: 'Marina Cap', price: 40, desc: '+10 armor', armor: 10 },
    ],
  },
  {
    id: 'harbor',
    name: 'Harbor Arms',
    kind: 'weapons',
    x: 750, y: 1350,
    color: '#5b7d8a',
    items: [
      { key: '1', name: 'Street Bat', price: 80, desc: 'melee, heavy hits', weapon: 'bat' },
      { key: '2', name: 'P9 Pistol', price: 400, desc: 'mouse aim, 12 rounds', weapon: 'pistol' },
      { key: '3', name: 'Ammo Box (24)', price: 50, desc: '+24 pistol rounds', ammo: 24 },
    ],
  },
];

// The six-job story chain. target is a world position; type drives the win rule.
export const MISSIONS = [
  {
    id: 1, name: 'First Fare', reward: 150, type: 'goto',
    brief: 'Mara Kade wants a driver. Meet her contact at the Palm Court plaza.',
    objective: 'Go to the plaza marker in Palm Court',
    x: 1350, y: 1050,
  },
  {
    id: 2, name: 'Harbor Run', reward: 300, type: 'drive',
    brief: 'A crate is waiting at Old Harbor. Grab a car and drive it down south.',
    objective: 'Drive to the Old Harbor docks',
    x: 750, y: 1800,
  },
  {
    id: 3, name: 'The Lift', reward: 600, type: 'collect',
    brief: 'The crate is guarded by the Coral crew. Take the package and get out.',
    objective: 'Grab the package — watch the crew',
    x: 750, y: 1800,
  },
  {
    id: 4, name: 'Hot Wheels', reward: 900, type: 'escape',
    brief: 'The harbor alarm is up. Lose the heat, then reach the Sunvale garage.',
    objective: 'Escape the police, then reach Sunvale',
    x: 2250, y: 1350,
  },
  {
    id: 5, name: 'The Delivery', reward: 1800, type: 'deliver',
    brief: 'Mara’s buyer waits at Coral Heights. The Coral crew wants their goods back.',
    objective: 'Deliver the package to Coral Heights',
    x: 2250, y: 450,
  },
  {
    id: 6, name: 'The Getaway', reward: 5000, type: 'escape',
    brief: 'One last run: the whole city is hot. Reach the Marina pier and vanish.',
    objective: 'Reach the Marina Bay pier — final getaway',
    x: 300, y: 450,
  },
];

export const DISTRICTS = [
  { name: 'Marina Bay', test: (x, y) => x < 900 && y < 900, roof: '#e8b04b', wall: '#f2d492', accent: '#2e8b8b' },
  { name: 'Old Harbor', test: (x, y) => x < 900 && y >= 900, roof: '#8a6f4d', wall: '#b99b72', accent: '#c65b3c' },
  { name: 'Coral Heights', test: (x, y) => x >= 900 && y < 600, roof: '#d96a6a', wall: '#f0a8a0', accent: '#7d5ba6' },
  { name: 'Palm Court', test: (x, y) => x >= 900 && x < 1650 && y >= 600 && y < 1350, roof: '#5b8dd9', wall: '#9cc0e8', accent: '#e8b04b' },
  { name: 'Sunvale', test: (x, y) => x >= 1650, roof: '#e8d44b', wall: '#f5e79a', accent: '#d96a6a' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (d.test(x, y)) return d;
  return DISTRICTS[3];
}

export const PALETTE = {
  sky: '#f7e8c8',
  grass: '#8fce7d',
  sand: '#eed9a4',
  water: '#2fa8b8',
  waterDeep: '#1d7f92',
  road: '#3d3a38',
  roadEdge: '#57524e',
  sidewalk: '#c9bda6',
  laneDash: '#e8d44b',
  plaza: '#d8cbb0',
  buildingShadow: 'rgba(0,0,0,0.28)',
  text: '#1d1a16',
  hudPanel: 'rgba(20,18,16,0.72)',
  hudText: '#f5efe2',
  hudAccent: '#ffd34d',
  star: '#ffd34d',
  starEmpty: 'rgba(255,255,255,0.35)',
  health: '#58c96b',
  armor: '#5b8dd9',
  marker: '#ffd34d',
  police: '#2b4fd8',
  policeLight: '#ff3b30',
  enemy: '#c22e5e',
  pedColors: ['#e2703a', '#5b8dd9', '#58c96b', '#b06fd6', '#d96a6a', '#2e8b8b', '#e8b04b'],
  carColors: ['#c22e5e', '#2b6fd8', '#e8b04b', '#58c96b', '#8a6f4d', '#d96a6a', '#3d3a38', '#e8e4da', '#5b8dd9'],
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const SAVE_KEY = 'solmaris.save.v1';
export const SHOT_SEED = 1337;
