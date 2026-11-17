// Solmaris simulation: the player, cars, traffic, pedestrians, police,
// the six-mission story, combat, shops and the wanted system. Fixed 1/60 s
// steps; the renderer only reads state, it never mutates it.
import {
  STEP, WORLD, AVENUES, STREETS, ROAD_W, PLAYER, CAR, TRAFFIC_CARS,
  PEDESTRIANS, POLICE_MAX, WANTED, FINES, SHOPS, MISSIONS, PALETTE,
} from './config.js';
import { createCity, PLAZA, hitsBuilding, resolveBuildingCollision, onRoad } from './city.js';

export const EVENT_NONE = 0;
export const EVENT_MISSION = 1;
export const EVENT_BUSTED = 2;
export const EVENT_WASTED = 4;
export const EVENT_CRIME = 8;

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

export function createWorld(random, audio) {
  const city = createCity(random);
  const state = {
    time: 0,
    seed: 0,
    city,
    player: null,
    cars: [],
    peds: [],
    police: [],
    enemies: [],
    particles: [],
    toasts: [],
    cashDrops: [],
    package: null,
    missionIndex: 0,
    missionPhase: 'go', // go | escaped (mission 4 needs the heat gone first? no: reach target)
    missionTimer: 0,
    wanted: 0,
    wantedFloat: 0,
    hiddenTimer: 0,
    bustedTimer: 0,
    heli: null,
    roadblock: false,
    shopOpen: null,
    stats: { stolen: 0, missionsDone: 0, arrests: 0, deaths: 0, earned: 0 },
    over: null, // 'wasted' | 'busted'
    calmTimer: 0,
    crimeCooldown: 0,
  };

  function reset() {
    state.time = 0;
    state.cars = [];
    state.peds = [];
    state.police = [];
    state.enemies = [];
    state.particles = [];
    state.toasts = [];
    state.cashDrops = [];
    state.package = null;
    state.missionIndex = 0;
    state.missionPhase = 'go';
    state.missionTimer = 0;
    state.wanted = 0;
    state.wantedFloat = 0;
    state.hiddenTimer = 0;
    state.bustedTimer = 0;
    state.heli = null;
    state.roadblock = false;
    state.shopOpen = null;
    state.over = null;
    state.calmTimer = 0;
    state.crimeCooldown = 0;
    state.player = {
      x: PLAZA.x, y: PLAZA.y + 60, angle: -Math.PI / 2, speed: 0,
      health: 100, armor: 0, cash: 250,
      inCar: false, carId: null, ownedCarId: null,
      weapon: 'fists', hasBat: false, hasPistol: false, ammo: 0,
      punchCd: 0, shootCd: 0, hurtCd: 0, moving: false,
    };
    spawnTraffic();
    spawnPeds();
    toast('Welcome to Solmaris. Mara Kade is waiting at the plaza.');
  }

  function toast(text) {
    state.toasts.push({ text, t: 0 });
    if (state.toasts.length > 3) state.toasts.shift();
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = random.next() * TAU;
      const s = random.range(speed * 0.4, speed);
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: random.range(0.3, 0.7), max: 0.7, color, size: random.range(2, 5) });
    }
  }

  function addWanted(n, reason) {
    if (state.crimeCooldown > 0 && n <= 1) return;
    state.wantedFloat = clamp(state.wantedFloat + n, 0, 5);
    state.wanted = Math.floor(state.wantedFloat);
    state.hiddenTimer = 0;
    if (n >= 1) state.crimeCooldown = 1.5;
    if (reason) toast(reason);
  }

  function spawnTraffic() {
    for (let i = 0; i < TRAFFIC_CARS; i++) {
      state.cars.push(makeTrafficCar());
    }
  }

  function makeTrafficCar() {
    const vertical = random.chance(0.5);
    const lane = random.chance(0.5) ? -18 : 18;
    let x, y, angle;
    if (vertical) {
      x = random.pick(AVENUES) + lane;
      y = random.range(100, WORLD.height - 100);
      angle = lane < 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = random.range(100, WORLD.width - 100);
      y = random.pick(STREETS) + lane;
      angle = lane < 0 ? 0 : Math.PI;
    }
    return {
      id: `car-${Math.floor(random.next() * 1e9)}`,
      kind: 'traffic', x, y, angle, speed: random.range(90, 150),
      vertical, lane, dir: 1, color: random.pick(PALETTE.carColors),
      stolen: false, brakeLight: false,
    };
  }

  function spawnPeds() {
    for (let i = 0; i < PEDESTRIANS; i++) {
      state.peds.push(makePed());
    }
  }

  function makePed() {
    const vertical = random.chance(0.5);
    let x, y;
    if (vertical) {
      x = random.pick(AVENUES) + (random.chance(0.5) ? -48 : 48);
      y = random.range(100, WORLD.height - 100);
    } else {
      x = random.range(100, WORLD.width - 100);
      y = random.pick(STREETS) + (random.chance(0.5) ? -48 : 48);
    }
    return {
      x, y, angle: random.next() * TAU, speed: random.range(40, 70),
      color: random.pick(PALETTE.pedColors), vertical, dir: random.chance(0.5) ? 1 : -1,
      flee: 0, down: 0, walkPhase: random.next() * TAU,
    };
  }

  function mission() { return MISSIONS[state.missionIndex] || null; }

  function currentTarget() {
    const m = mission();
    if (!m) return null;
    if (m.type === 'collect' && state.package) return { x: state.package.x, y: state.package.y };
    return { x: m.x, y: m.y };
  }

  function startMissionSideEffects(m) {
    if (m.id === 3) {
      state.package = { x: m.x, y: m.y, taken: false };
      spawnEnemies(m.x, m.y, 3);
      toast('The Coral crew is guarding the package!');
    }
    if (m.id === 4) {
      state.wantedFloat = 2; state.wanted = 2; state.hiddenTimer = 0;
      toast('The harbor alarm is up — 2 stars! Lose the heat!');
    }
    if (m.id === 5) {
      spawnEnemies(m.x, m.y, 3);
    }
    if (m.id === 6) {
      state.wantedFloat = 3; state.wanted = 3; state.hiddenTimer = 0;
      toast('The whole city is hot. Run for the pier!');
    }
  }

  function spawnEnemies(x, y, n) {
    for (let i = 0; i < n; i++) {
      state.enemies.push({
        x: x + random.range(-120, 120), y: y + random.range(-120, 120),
        angle: 0, health: 40, speed: random.range(150, 190),
        punchCd: 0, shootCd: random.range(0.5, 1.5), shooter: state.missionIndex >= 4,
        color: PALETTE.enemy, down: 0,
      });
    }
  }

  function completeMission() {
    const m = mission();
    if (!m) return EVENT_NONE;
    const p = state.player;
    p.cash += m.reward;
    state.stats.earned += m.reward;
    state.stats.missionsDone++;
    toast(`Job done: ${m.name} — +$${m.reward}`);
    audio.mission();
    burst(p.x, p.y, PALETTE.hudAccent, 26, 220);
    state.missionIndex++;
    state.package = null;
    const next = mission();
    if (next) {
      toast(`New job: ${next.name} — ${next.brief}`);
      startMissionSideEffects(next);
    } else {
      toast('THE SOLMARIS JOB IS COMPLETE. The city is yours, Rae.');
    }
    save();
    return EVENT_MISSION;
  }

  // ---- player ----
  function stepPlayer(dt, input) {
    const p = state.player;
    if (state.over) return;
    p.punchCd = Math.max(0, p.punchCd - dt);
    p.shootCd = Math.max(0, p.shootCd - dt);
    p.hurtCd = Math.max(0, p.hurtCd - dt);
    state.crimeCooldown = Math.max(0, state.crimeCooldown - dt);
    const axes = input.axes();
    p.moving = axes.x !== 0 || axes.y !== 0;

    if (p.inCar) {
      const car = state.cars.find((c) => c.id === p.carId);
      if (!car) { p.inCar = false; return; }
      // Arcade driving: speed along heading, steering scales with speed.
      const accel = axes.y < 0 ? CAR.accel : axes.y > 0 ? -CAR.brake : 0;
      car.speed += accel * dt;
      if (axes.y === 0) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 220 * dt);
      if (input.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 700 * dt);
      car.speed = clamp(car.speed, -CAR.reverseMax, CAR.maxSpeed);
      const steer = axes.x * CAR.turnRate * clamp(Math.abs(car.speed) / 200, 0, 1) * (car.speed < 0 ? -1 : 1);
      car.angle += steer * dt * (input.handbrake ? 1.5 : 1);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      car.x = clamp(car.x, 40, WORLD.width - 40);
      car.y = clamp(car.y, 40, WORLD.height - 40);
      p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
      car.brakeLight = axes.y > 0 || input.handbrake;
      resolveBuildingCollision(city, car, 24);
      // Hit pedestrians with the car.
      for (const ped of state.peds) {
        if (ped.down > 0) continue;
        if (Math.abs(car.speed) > 60 && dist(car.x, car.y, ped.x, ped.y) < 34) {
          ped.down = 3; ped.flee = 0;
          burst(ped.x, ped.y, '#e5534b', 10, 160);
          addWanted(WANTED.hitPed, 'You hit a pedestrian! +1 star');
          hurtPlayer(6);
        }
      }
      // Police ram: slow the player, damage on hard hits.
      for (const pc of state.police) {
        if (dist(car.x, car.y, pc.x, pc.y) < 52) {
          const impact = Math.abs(pc.speed - car.speed);
          car.speed *= 0.86;
          if (impact > 220) hurtPlayer(5);
          burst(car.x, car.y, '#ffffff', 6, 120);
        }
      }
    } else {
      const speed = input.sprint ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const mag = Math.hypot(axes.x, axes.y) || 1;
      const vx = (axes.x / mag) * speed * (p.moving ? 1 : 0);
      const vy = (axes.y / mag) * speed * (p.moving ? 1 : 0);
      p.x = clamp(p.x + vx * dt, 24, WORLD.width - 24);
      p.y = clamp(p.y + vy * dt, 24, WORLD.height - 24);
      if (p.moving) p.angle = Math.atan2(vy, vx);
      p.speed = Math.hypot(vx, vy);
      resolveBuildingCollision(city, p, PLAYER.radius);
      // Cash drops.
      for (const d of state.cashDrops) {
        if (!d.taken && dist(p.x, p.y, d.x, d.y) < 26) {
          d.taken = true; p.cash += d.amount;
          toast(`+$${d.amount} picked up`);
          audio.pickup();
        }
      }
    }
    // Calm regen.
    if (state.wanted === 0 && state.enemies.length === 0) {
      state.calmTimer += dt;
      if (state.calmTimer > 8 && p.health < PLAYER.health) p.health = Math.min(PLAYER.health, p.health + 1.5 * dt);
    } else state.calmTimer = 0;
  }

  function hurtPlayer(dmg) {
    const p = state.player;
    if (p.hurtCd > 0 || state.over) return;
    p.hurtCd = 0.35;
    let rest = dmg;
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, rest * 0.6);
      p.armor -= absorbed; rest -= absorbed;
    }
    p.health -= rest;
    burst(p.x, p.y, '#e5534b', 8, 140);
    if (p.health <= 0) {
      p.health = 0;
      state.over = 'wasted';
      state.stats.deaths++;
      audio.wasted();
    }
  }

  function nearestCar(maxD) {
    const p = state.player;
    let best = null; let bestD = maxD;
    for (const c of state.cars) {
      if (c.kind === 'police') continue;
      const d = dist(p.x, p.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function nearestShop() {
    const p = state.player;
    for (const s of SHOPS) if (dist(p.x, p.y, s.x, s.y) < 84) return s;
    return null;
  }

  function enterCar() {
    const p = state.player;
    const car = nearestCar(64);
    if (!car) return;
    p.inCar = true;
    p.carId = car.id;
    car.kind = 'player';
    if (car.id !== p.ownedCarId) {
      p.ownedCarId = car.id;
      state.stats.stolen++;
      addWanted(WANTED.steal, 'Car stolen! +1 star');
      audio.pickup();
      toast('Stolen wheels. The law noticed.');
    } else {
      toast('Back in your car.');
    }
  }

  function exitCar() {
    const p = state.player;
    const car = state.cars.find((c) => c.id === p.carId);
    if (!car) { p.inCar = false; return; }
    car.speed = 0;
    p.inCar = false;
    p.carId = null;
    const side = p.angle + Math.PI / 2;
    p.x = clamp(car.x + Math.cos(side) * 34, 24, WORLD.width - 24);
    p.y = clamp(car.y + Math.sin(side) * 34, 24, WORLD.height - 24);
    p.speed = 0;
  }

  function punch() {
    const p = state.player;
    if (p.punchCd > 0 || p.inCar) return;
    p.punchCd = PLAYER.punchCooldown;
    audio.punch();
    const dmg = p.hasBat ? 30 : PLAYER.punchDamage;
    const range = p.hasBat ? 58 : PLAYER.punchRange;
    let hit = false;
    for (const e of state.enemies) {
      if (e.down > 0) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      if (d < range && Math.abs(angDiff(a, p.angle)) < PLAYER.punchArc) {
        e.health -= dmg;
        e.x += Math.cos(a) * 26; e.y += Math.sin(a) * 26;
        burst(e.x, e.y, '#ffffff', 6, 120);
        hit = true;
        if (e.health <= 0) killEnemy(e);
      }
    }
    if (!hit) {
      // Whiff: still a swing.
      burst(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30, '#ffffff', 3, 80);
    }
  }

  function shoot(aimAngle) {
    const p = state.player;
    if (p.shootCd > 0 || p.inCar || !p.hasPistol || p.ammo <= 0) return;
    p.shootCd = 0.28;
    p.ammo--;
    p.angle = aimAngle;
    audio.gunshot();
    const mx = p.x + Math.cos(aimAngle) * 460;
    const my = p.y + Math.sin(aimAngle) * 460;
    burst(mx, my, '#ffd34d', 4, 90);
    addWanted(WANTED.shoot, 'Shots fired! +1 star');
    // Hit the nearest target roughly along the aim line.
    let best = null; let bestScore = Infinity;
    const consider = (x, y, obj) => {
      const d = dist(p.x, p.y, x, y);
      if (d > 460) return;
      const a = Math.atan2(y - p.y, x - p.x);
      const off = Math.abs(angDiff(a, aimAngle));
      if (off > 0.16) return;
      const score = d + off * 400;
      if (score < bestScore) { bestScore = score; best = obj; }
    };
    for (const e of state.enemies) if (e.down <= 0) consider(e.x, e.y, { kind: 'enemy', ref: e });
    for (const ped of state.peds) if (ped.down <= 0) consider(ped.x, ped.y, { kind: 'ped', ref: ped });
    for (const pc of state.police) consider(pc.x, pc.y, { kind: 'police', ref: pc });
    if (best) {
      burst(best.ref.x, best.ref.y, '#e5534b', 10, 160);
      if (best.kind === 'enemy') {
        best.ref.health -= 34;
        if (best.ref.health <= 0) killEnemy(best.ref);
      } else if (best.kind === 'ped') {
        best.ref.down = 4;
        addWanted(WANTED.kill, 'You shot a civilian!');
      } else {
        best.ref.health -= 20;
        if (best.ref.health <= 0) {
          burst(best.ref.x, best.ref.y, '#ff9d00', 30, 260);
          state.police = state.police.filter((c) => c !== best.ref);
          addWanted(WANTED.kill, 'You destroyed a police car!');
        }
      }
    }
    // Peds flee the gunshot.
    for (const ped of state.peds) if (dist(p.x, p.y, ped.x, ped.y) < 260) ped.flee = 2.5;
  }

  function killEnemy(e) {
    e.down = 999;
    burst(e.x, e.y, '#c22e5e', 16, 200);
    state.cashDrops.push({ x: e.x, y: e.y, amount: 25, taken: false });
    state.enemies = state.enemies.filter((x) => x !== e);
  }

  function buy(item) {
    const p = state.player;
    if (p.cash < item.price) { audio.denied(); toast('Not enough cash.'); return false; }
    if (item.weapon === 'pistol' && p.hasPistol) { audio.denied(); toast('You already own the P9.'); return false; }
    if (item.weapon === 'bat' && p.hasBat) { audio.denied(); toast('You already own a bat.'); return false; }
    if (item.heal && p.health >= PLAYER.health) { audio.denied(); toast('Already full health.'); return false; }
    p.cash -= item.price;
    if (item.heal) p.health = Math.min(PLAYER.health, p.health + item.heal);
    if (item.armor) p.armor = Math.min(100, p.armor + item.armor);
    if (item.weapon === 'bat') { p.hasBat = true; p.weapon = 'bat'; }
    if (item.weapon === 'pistol') { p.hasPistol = true; p.weapon = 'pistol'; p.ammo += 12; }
    if (item.ammo) {
      if (!p.hasPistol) { p.cash += item.price; audio.denied(); toast('You need the P9 pistol first.'); return false; }
      p.ammo += item.ammo;
    }
    audio.buy();
    toast(`Bought ${item.name} (-$${item.price})`);
    return true;
  }

  // ---- traffic ----
  function stepTraffic(dt) {
    const p = state.player;
    for (const c of state.cars) {
      if (c.kind === 'player') continue;
      // Slow for a car ahead on the same road.
      let target = c.speed;
      for (const o of state.cars) {
        if (o === c) continue;
        const dx = o.x - c.x, dy = o.y - c.y;
        const ahead = c.vertical ? Math.abs(dx) < 40 && dy * Math.sign(Math.sin(c.angle)) > 0 && Math.abs(dy) < 90
          : Math.abs(dy) < 40 && dx * Math.sign(Math.cos(c.angle)) > 0 && Math.abs(dx) < 90;
        if (ahead) target = Math.min(target, 30);
      }
      // Slow near the player on foot.
      if (!p.inCar && dist(c.x, c.y, p.x, p.y) < 70) target = 30;
      c.speed += clamp(target - c.speed, -300 * dt, 200 * dt);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      // At an intersection, sometimes turn.
      const onCross = c.vertical
        ? STREETS.some((s) => Math.abs(c.y - s) < 6)
        : AVENUES.some((a) => Math.abs(c.x - a) < 6);
      if (onCross && random.chance(0.012)) {
        if (c.vertical) {
          c.vertical = false;
          c.angle = random.chance(0.5) ? 0 : Math.PI;
          c.y = STREETS.reduce((a, b) => Math.abs(b - c.y) < Math.abs(a - c.y) ? b : a) + c.lane;
        } else {
          c.vertical = true;
          c.angle = random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
          c.x = AVENUES.reduce((a, b) => Math.abs(b - c.x) < Math.abs(a - c.x) ? b : a) + c.lane;
        }
      }
      // Turn around at the city edge.
      if (c.x < 60 || c.x > WORLD.width - 60 || c.y < 60 || c.y > WORLD.height - 60) {
        c.angle += Math.PI;
        c.x = clamp(c.x, 60, WORLD.width - 60);
        c.y = clamp(c.y, 60, WORLD.height - 60);
      }
    }
  }

  // ---- pedestrians ----
  function stepPeds(dt) {
    const p = state.player;
    const dangerX = p.inCar ? p.x : null;
    for (const ped of state.peds) {
      if (ped.down > 0) { ped.down -= dt; continue; }
      ped.walkPhase += dt * 6;
      // Flee danger: fast cars, gunfire, police chase.
      let fx = 0, fy = 0;
      const threats = [];
      if (p.inCar && Math.abs(p.speed) > 200) threats.push([p.x, p.y]);
      if (state.wanted >= 2) for (const pc of state.police) threats.push([pc.x, pc.y]);
      if (ped.flee > 0) {
        ped.flee -= dt;
        threats.push([p.x, p.y]);
      }
      for (const [tx, ty] of threats) {
        const d = dist(ped.x, ped.y, tx, ty);
        if (d < 220) { fx += (ped.x - tx) / (d || 1); fy += (ped.y - ty) / (d || 1); }
      }
      let vx, vy;
      if (fx !== 0 || fy !== 0) {
        const m = Math.hypot(fx, fy);
        vx = (fx / m) * 260; vy = (fy / m) * 260;
      } else {
        vx = ped.vertical ? 0 : ped.dir * ped.speed;
        vy = ped.vertical ? ped.dir * ped.speed : 0;
      }
      ped.x = clamp(ped.x + vx * dt, 30, WORLD.width - 30);
      ped.y = clamp(ped.y + vy * dt, 30, WORLD.height - 30);
      ped.angle = Math.atan2(vy, vx);
      // Turn at intersections sometimes; bounce off the edge.
      if (random.chance(0.002)) { ped.vertical = !ped.vertical; ped.dir = random.chance(0.5) ? 1 : -1; }
      if (ped.x <= 32 || ped.x >= WORLD.width - 32) ped.dir *= -1;
      if (ped.y <= 32 || ped.y >= WORLD.height - 32) ped.dir *= -1;
      // Keep peds out of buildings.
      if (hitsBuilding(city, ped.x, ped.y, 10)) {
        ped.x = clamp(ped.x - vx * dt * 2, 30, WORLD.width - 30);
        ped.y = clamp(ped.y - vy * dt * 2, 30, WORLD.height - 30);
        ped.dir *= -1;
      }
    }
  }

  // ---- police ----
  function stepPolice(dt) {
    const p = state.player;
    const want = state.wanted > 0 ? Math.min(1 + state.wanted, POLICE_MAX) : 0;
    // Spawn / despawn to the wanted count.
    while (state.police.length < want) {
      const road = random.chance(0.5);
      const a = random.next() * TAU;
      let x = p.x + Math.cos(a) * random.range(650, 850);
      let y = p.y + Math.sin(a) * random.range(650, 850);
      x = clamp(x, 80, WORLD.width - 80);
      y = clamp(y, 80, WORLD.height - 80);
      if (road) x = AVENUES.reduce((aa, b) => Math.abs(b - x) < Math.abs(aa - x) ? b : aa);
      else y = STREETS.reduce((aa, b) => Math.abs(b - y) < Math.abs(aa - y) ? b : aa);
      state.police.push({
        id: `pol-${Math.floor(random.next() * 1e9)}`, kind: 'police',
        x, y, angle: Math.atan2(p.y - y, p.x - x), speed: 0,
        color: '#2b4fd8', health: 60, siren: random.next() * TAU, stuck: 0,
      });
    }
    while (state.police.length > want) state.police.pop();

    // Hiding: on foot, still, off the roads (plaza, block interiors) — the
    // police lose the trail and search the last known position instead.
    const hiding = !p.inCar && Math.abs(p.speed) < 40 && !onRoad(p.x, p.y);
    if (!hiding) state.lastKnown = { x: p.x, y: p.y };
    const searchAt = state.lastKnown || { x: p.x, y: p.y };

    let nearest = Infinity;
    for (const pc of state.police) {
      const d = dist(pc.x, pc.y, p.x, p.y);
      nearest = Math.min(nearest, d);
      const tx = hiding ? searchAt.x + Math.sin(state.time * 0.7 + pc.siren) * 60 : p.x;
      const ty = hiding ? searchAt.y + Math.cos(state.time * 0.7 + pc.siren) * 60 : p.y;
      const targetAngle = Math.atan2(ty - pc.y, tx - pc.x);
      const diff = angDiff(targetAngle, pc.angle);
      pc.angle += clamp(diff, -2.6 * dt, 2.6 * dt);
      const targetSpeed = hiding ? 200 : state.wanted >= 1 ? 470 + state.wanted * 22 : 0;
      pc.speed += clamp(targetSpeed - pc.speed, -600 * dt, 420 * dt);
      pc.x += Math.cos(pc.angle) * pc.speed * dt;
      pc.y += Math.sin(pc.angle) * pc.speed * dt;
      pc.siren += dt * 6;
      // Police mostly stay on roads: nudge back toward the nearest road.
      if (!onRoad(pc.x, pc.y)) {
        const rp = { x: pc.x, y: pc.y };
        const near = AVENUES.reduce((a, b) => Math.abs(b - pc.x) < Math.abs(a - pc.x) ? b : a);
        const nearS = STREETS.reduce((a, b) => Math.abs(b - pc.y) < Math.abs(a - pc.y) ? b : a);
        if (Math.abs(pc.x - near) < Math.abs(pc.y - nearS)) pc.x += (near - pc.x) * dt * 1.5;
        else pc.y += (nearS - pc.y) * dt * 1.5;
        void rp;
      }
      resolveBuildingCollision(city, pc, 24);
      // On foot: caught.
      if (!p.inCar && d < 40 && Math.abs(p.speed) < 120) {
        state.over = 'busted';
        state.stats.arrests++;
        audio.busted();
      }
      // In a slow car, surrounded: busted timer.
      if (p.inCar && Math.abs(p.speed) < 25 && d < 110) {
        state.bustedTimer += dt;
        if (state.bustedTimer > 2.5) {
          state.over = 'busted';
          state.stats.arrests++;
          audio.busted();
        }
      }
    }
    if (nearest > 140 || state.police.length === 0) state.bustedTimer = 0;

    // Roadblock at 3+ stars: two police cars parked across the road ahead.
    if (state.wanted >= 3 && !state.roadblock) {
      state.roadblock = true;
      const ahead = { x: p.x + Math.cos(p.angle) * 420, y: p.y + Math.sin(p.angle) * 420 };
      for (let i = -1; i <= 1; i += 2) {
        state.police.push({
          id: `rb-${i}-${Math.floor(random.next() * 1e9)}`, kind: 'police',
          x: clamp(ahead.x + i * 46, 80, WORLD.width - 80),
          y: clamp(ahead.y + i * 46, 80, WORLD.height - 80),
          angle: p.angle + Math.PI / 2, speed: 0, color: '#2b4fd8',
          health: 60, siren: 0, stuck: 0, roadblock: true,
        });
      }
      toast('Roadblock ahead!');
    }
    if (state.wanted < 3) state.roadblock = false;

    // Helicopter at 4+ stars.
    if (state.wanted >= 4) {
      if (!state.heli) state.heli = { x: p.x - 200, y: p.y - 200, angle: 0 };
      state.heli.x += (p.x - state.heli.x) * dt * 0.7;
      state.heli.y += (p.y - state.heli.y) * dt * 0.7;
      state.heli.angle += dt;
    } else state.heli = null;

    // Wanted decay: hidden when no police is near, or while laying low
    // off the roads on foot (the search passes you by).
    if (state.wanted > 0) {
      if (nearest > 520 || hiding) {
        state.hiddenTimer += dt;
        if (state.hiddenTimer > WANTED.decayDelay) {
          state.wantedFloat = Math.max(0, state.wantedFloat - WANTED.decayRate * dt);
          const w = Math.floor(state.wantedFloat);
          if (w < state.wanted) { state.wanted = w; toast(`Heat cooling… ${w} star${w === 1 ? '' : 's'}`); }
          if (state.wanted === 0) toast('You lost them. Clean.');
        }
      } else state.hiddenTimer = 0;
    }
  }

  // ---- enemies ----
  function stepEnemies(dt) {
    const p = state.player;
    for (const e of state.enemies) {
      if (e.down > 0) continue;
      e.punchCd = Math.max(0, e.punchCd - dt);
      e.shootCd = Math.max(0, e.shootCd - dt);
      const d = dist(e.x, e.y, p.x, p.y);
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      e.angle = a;
      if (d > 44) {
        e.x += Math.cos(a) * e.speed * dt;
        e.y += Math.sin(a) * e.speed * dt;
        resolveBuildingCollision(city, e, 12);
      } else if (e.punchCd <= 0) {
        e.punchCd = 1.0;
        hurtPlayer(8);
        burst(p.x, p.y, '#ffffff', 5, 100);
      }
      if (e.shooter && d > 120 && d < 420 && e.shootCd <= 0) {
        e.shootCd = 1.7;
        audio.gunshot();
        if (random.chance(0.45)) hurtPlayer(6);
        burst(p.x, p.y, '#ffd34d', 4, 90);
      }
    }
  }

  // ---- missions ----
  function stepMissions(dt) {
    const m = mission();
    if (!m || state.over) return EVENT_NONE;
    const p = state.player;
    state.missionTimer += dt;
    if (m.type === 'collect' && state.package && !state.package.taken) {
      if (dist(p.x, p.y, state.package.x, state.package.y) < 54) {
        state.package.taken = true;
        audio.pickup();
        toast('Package secured. Now move!');
        return completeMission();
      }
      return EVENT_NONE;
    }
    const t = currentTarget();
    if (t && dist(p.x, p.y, t.x, t.y) < 78) {
      if (m.type === 'drive' && !p.inCar) return EVENT_NONE;
      return completeMission();
    }
    return EVENT_NONE;
  }

  function stepParticles(dt) {
    for (const pt of state.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96; pt.vy *= 0.96;
    }
    state.particles = state.particles.filter((pt) => pt.life > 0);
    for (const t of state.toasts) t.t += dt;
    state.toasts = state.toasts.filter((t) => t.t < 4.5);
    state.cashDrops = state.cashDrops.filter((d) => !d.taken);
  }

  // Ambient city life only (title screen background, shot staging): traffic,
  // pedestrians and particles move, but no player, police or missions run.
  function ambient(dt) {
    state.time += dt;
    stepTraffic(dt);
    stepPeds(dt);
    stepParticles(dt);
  }

  function step(dt, input) {
    if (state.over) return EVENT_NONE;
    state.time += dt;
    let events = EVENT_NONE;
    stepPlayer(dt, input);
    if (state.over) return state.over === 'busted' ? EVENT_BUSTED : EVENT_WASTED;
    // Actions (edge-triggered).
    const actions = input.actions || 0;
    if (actions & 4) { // interact
      if (state.shopOpen) state.shopOpen = null;
      else if (!state.player.inCar && nearestShop()) state.shopOpen = nearestShop();
      else if (state.player.inCar) exitCar();
      else enterCar();
    }
    if (actions & 8) { // attack
      if (state.player.hasPistol && state.player.ammo > 0 && input.aimAngle !== undefined) shoot(input.aimAngle);
      else punch();
    }
    stepTraffic(dt);
    stepPeds(dt);
    stepPolice(dt);
    if (state.over) return state.over === 'busted' ? EVENT_BUSTED : EVENT_WASTED;
    stepEnemies(dt);
    if (state.over) return state.over === 'busted' ? EVENT_BUSTED : EVENT_WASTED;
    events |= stepMissions(dt);
    stepParticles(dt);
    return events;
  }

  // ---- save / load ----
  function save() {
    try {
      const p = state.player;
      const data = {
        cash: p.cash, health: p.health, armor: p.armor,
        missionIndex: state.missionIndex, hasBat: p.hasBat, hasPistol: p.hasPistol,
        ammo: p.ammo, x: p.x, y: p.y, earned: state.stats.earned,
        missionsDone: state.stats.missionsDone, stolen: state.stats.stolen,
      };
      window.localStorage.setItem('solmaris.save.v1', JSON.stringify(data));
    } catch { /* storage off: progress lasts this visit only */ }
  }

  function load() {
    try {
      const raw = window.localStorage.getItem('solmaris.save.v1');
      if (!raw) return false;
      const d = JSON.parse(raw);
      reset();
      const p = state.player;
      p.cash = d.cash ?? 250;
      p.health = d.health ?? 100;
      p.armor = d.armor ?? 0;
      p.hasBat = !!d.hasBat;
      p.hasPistol = !!d.hasPistol;
      p.ammo = d.ammo ?? 0;
      p.weapon = p.hasPistol ? 'pistol' : p.hasBat ? 'bat' : 'fists';
      p.x = d.x ?? PLAZA.x; p.y = d.y ?? PLAZA.y + 60;
      state.missionIndex = d.missionIndex ?? 0;
      state.stats.earned = d.earned ?? 0;
      state.stats.missionsDone = d.missionsDone ?? 0;
      state.stats.stolen = d.stolen ?? 0;
      const m = mission();
      if (m) startMissionSideEffects(m);
      toast('Save loaded. Welcome back to Solmaris.');
      return true;
    } catch { return false; }
  }

  function hasSave() {
    try { return !!window.localStorage.getItem('solmaris.save.v1'); } catch { return false; }
  }

  function respawn(kind) {
    const p = state.player;
    const fine = kind === 'busted' ? FINES.busted : FINES.wasted;
    p.cash = Math.max(0, p.cash - fine);
    p.health = PLAYER.health;
    p.armor = 0;
    state.wanted = 0; state.wantedFloat = 0; state.hiddenTimer = 0;
    state.police = []; state.heli = null; state.roadblock = false;
    state.enemies = [];
    if (p.inCar) { p.inCar = false; p.carId = null; }
    if (kind === 'busted') { p.x = 1050; p.y = 1350; } // Solmaris PD, Palm Court edge
    else { p.x = 1950; p.y = 750; } // Sunvale General
    p.speed = 0;
    state.over = null;
    toast(kind === 'busted' ? `BUSTED — $100 fine.` : `WASTED — $100 hospital bill.`);
    save();
  }

  reset();

  return {
    state, reset, step, ambient, save, load, hasSave, respawn, buy,
    mission, currentTarget, nearestShop, nearestCar,
    toast, addWanted, hurtPlayer,
  };
}
