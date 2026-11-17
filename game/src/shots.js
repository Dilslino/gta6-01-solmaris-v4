// Deterministic screenshot scenes behind ?shot=title|driving|chase|mission.
// Each one plays the real rules forward from a fresh seeded world for a
// fixed number of steps, steered by a simple autopilot, so the frame is what
// a short game really looks like and the same seed always gives the same
// frame. Returns the screen to draw.
import { STEP, WORLD } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;

function autopilotDrive(world, desiredAngle) {
  const p = world.state.player;
  const car = world.state.cars.find((c) => c.id === p.carId);
  if (!car) return { x: 0, y: -1 };
  let diff = desiredAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { x: Math.max(-1, Math.min(1, diff * 2)), y: -1 };
}

function idleInput() {
  return { axes: () => ({ x: 0, y: 0 }), sprint: false, handbrake: false, actions: 0, aimAngle: undefined };
}

function driveInput(world, desiredAngle) {
  const a = autopilotDrive(world, desiredAngle);
  return { axes: () => a, sprint: false, handbrake: false, actions: 0, aimAngle: undefined };
}

function putPlayerInCar(world, x, y, angle) {
  const p = world.state.player;
  // Find the nearest traffic car and take it.
  let best = null; let bestD = Infinity;
  for (const c of world.state.cars) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return;
  best.x = x; best.y = y; best.angle = angle; best.speed = 0; best.kind = 'player';
  p.inCar = true; p.carId = best.id; p.ownedCarId = best.id;
  p.x = x; p.y = y; p.angle = angle;
}

export function stageShot(name, world) {
  world.reset();
  const p = world.state.player;
  if (name === 'driving') {
    // Palm Court street, heading east through downtown traffic.
    putPlayerInCar(world, 450, 750, 0);
    for (let i = 0; i < 3.5 / SAMPLE; i++) world.step(SAMPLE, driveInput(world, 0));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // Three-star chase: player fleeing east on the Old Harbor street, PD behind.
    putPlayerInCar(world, 450, 1650, 0);
    world.state.wantedFloat = 3; world.state.wanted = 3;
    world.toast('Three stars — Solmaris PD is on you!');
    for (let i = 0; i < 4 / SAMPLE; i++) world.step(SAMPLE, driveInput(world, 0));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // Mission 1: Rae on foot, walking up to the Palm Court plaza marker.
    p.x = 1350; p.y = 1500; p.angle = -Math.PI / 2;
    for (let i = 0; i < 1 / SAMPLE; i++) {
      world.step(SAMPLE, { axes: () => ({ x: 0, y: -1 }), sprint: true, handbrake: false, actions: 0, aimAngle: undefined });
    }
    return { screen: SCREEN_PLAY };
  }
  // title (default): ambient city life behind the title card.
  for (let i = 0; i < 5 / SAMPLE; i++) world.ambient(SAMPLE);
  return { screen: SCREEN_TITLE };
}
