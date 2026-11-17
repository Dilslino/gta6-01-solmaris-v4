// Every pixel of Solmaris: the 2.5D city (drop shadows, raised roofs with
// parapets, shaded southern faces), the cars, the people, the helicopter,
// the HUD with its circular minimap, and the title / pause / WASTED /
// BUSTED / shop screens. Reads state only.
import { VIEW, WORLD, AVENUES, STREETS, ROAD_W, BLOCK, PALETTE, FONT, SHOPS, MISSIONS } from './config.js';
import { PLAZA } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_BUSTED = 'busted';

const TAU = Math.PI * 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  function cameraFor(state) {
    const p = state.player;
    const x = Math.max(VIEW.width / 2, Math.min(WORLD.width - VIEW.width / 2, p.x));
    const y = Math.max(VIEW.height / 2, Math.min(WORLD.height - VIEW.height / 2, p.y));
    return { x: x - VIEW.width / 2, y: y - VIEW.height / 2 };
  }

  function drawCity(state, cam, t) {
    const { city } = state;
    // Ground: grass, then the marina water on the west edge.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(40 - cam.x, 0, 60, VIEW.height); // beach strip
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, 0, 44 - cam.x, VIEW.height);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let y = 0; y < VIEW.height; y += 46) {
      const wy = y + Math.sin((t * 1.4 + y) * 0.05) * 4;
      ctx.fillRect(6 - cam.x, wy, 30, 3);
    }
    // Sidewalks (pale blocks) then asphalt roads.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const ax of AVENUES) ctx.fillRect(ax - ROAD_W / 2 - 14 - cam.x, -cam.y, ROAD_W + 28, WORLD.height);
    for (const sy of STREETS) ctx.fillRect(-cam.x, sy - ROAD_W / 2 - 14 - cam.y, WORLD.width, ROAD_W + 28);
    ctx.fillStyle = PALETTE.road;
    for (const ax of AVENUES) ctx.fillRect(ax - ROAD_W / 2 - cam.x, -cam.y, ROAD_W, WORLD.height);
    for (const sy of STREETS) ctx.fillRect(-cam.x, sy - ROAD_W / 2 - cam.y, WORLD.width, ROAD_W);
    // Lane dashes.
    ctx.fillStyle = PALETTE.laneDash;
    for (const ax of AVENUES) {
      for (let y = 0; y < WORLD.height; y += 56) {
        if (STREETS.some((s) => Math.abs(y - s) < 60)) continue;
        ctx.fillRect(ax - 2 - cam.x, y - cam.y, 4, 26);
      }
    }
    for (const sy of STREETS) {
      for (let x = 0; x < WORLD.width; x += 56) {
        if (AVENUES.some((a) => Math.abs(x - a) < 60)) continue;
        ctx.fillRect(x - cam.x, sy - 2 - cam.y, 26, 4);
      }
    }
    // Plaza: pale stone + fountain.
    ctx.fillStyle = PALETTE.plaza;
    ctx.fillRect(PLAZA.x - BLOCK / 2 - cam.x, PLAZA.y - BLOCK / 2 - cam.y, BLOCK, BLOCK);
    ctx.fillStyle = PALETTE.water;
    ctx.beginPath();
    ctx.arc(PLAZA.x - cam.x, PLAZA.y - cam.y, 26, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.beginPath();
    ctx.arc(PLAZA.x - cam.x, PLAZA.y - cam.y, 18 + Math.sin(t * 2) * 2, 0, TAU);
    ctx.fill();
    // District labels on the ground.
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(29,26,22,0.35)';
    ctx.fillText('MARINA BAY', 480 - cam.x, 300 - cam.y);
    ctx.fillText('CORAL HEIGHTS', 2100 - cam.x, 300 - cam.y);
    ctx.fillText('PALM COURT', 1500 - cam.x, 1200 - cam.y);
    ctx.fillText('OLD HARBOR', 480 - cam.x, 1800 - cam.y);
    ctx.fillText('SUNVALE', 2100 - cam.x, 1500 - cam.y);

    // Buildings: drop shadow, southern shaded face, raised roof + parapet.
    for (const b of city.buildings) {
      const sx = b.x - cam.x, sy = b.y - cam.y;
      ctx.fillStyle = PALETTE.buildingShadow;
      ctx.fillRect(sx + 7, sy + 9, b.w, b.h);
      // South face (shading).
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(sx, sy + b.h - 10, b.w, 10);
      // Wall.
      ctx.fillStyle = b.wall;
      ctx.fillRect(sx, sy, b.w, b.h);
      // Roof, lifted toward the north-west by its height.
      ctx.fillStyle = b.roof;
      ctx.fillRect(sx - b.height * 0.35, sy - b.height * 0.5, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(sx - b.height * 0.35 + 2, sy - b.height * 0.5 + 2, b.w - 4, b.h - 4);
      // Roof windows / AC units.
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const cols = Math.max(1, Math.floor(b.w / 46));
      for (let i = 0; i < cols; i++) {
        ctx.fillRect(sx - b.height * 0.35 + 10 + i * 44, sy - b.height * 0.5 + 10, 18, 12);
      }
      // Floor count ticks on the wall edge.
      ctx.fillStyle = b.accent;
      for (let f = 0; f < b.floors; f++) {
        ctx.fillRect(sx + b.w - 8, sy + 8 + f * 12, 4, 7);
      }
    }
    // Palms.
    for (const palm of city.palms) {
      const px = palm.x - cam.x, py = palm.y - cam.y;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(px + 4, py + 5, 10, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2f7d4f';
      ctx.beginPath(); ctx.arc(px, py, palm.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3fae6a';
      ctx.beginPath(); ctx.arc(px - 3, py - 3, palm.r * 0.6, 0, TAU); ctx.fill();
    }
    // Shop fronts.
    for (const s of SHOPS) {
      const sx = s.x - cam.x, sy = s.y - cam.y;
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(sx, sy, 30, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(s.name.toUpperCase(), sx, sy - 38);
      ctx.font = `700 16px ${FONT}`;
      ctx.fillText(s.kind === 'food' ? '🍔' : s.kind === 'clothes' ? '👕' : '🔫', sx, sy + 6);
    }
  }

  function drawCarShape(x, y, angle, color, opts) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // Drop shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-26 + 4, -13 + 5, 52, 26);
    // Body.
    ctx.fillStyle = color;
    roundRect(-26, -13, 52, 26, 8);
    ctx.fill();
    // Roof + windshield.
    ctx.fillStyle = 'rgba(20,24,32,0.85)';
    roundRect(-8, -10, 18, 20, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.7)';
    ctx.fillRect(8, -9, 6, 18);
    // Headlights / brake lights.
    ctx.fillStyle = opts && opts.brakeLight ? '#ff3b30' : '#ff9d00';
    ctx.fillRect(-27, -10, 3, 6);
    ctx.fillRect(-27, 4, 3, 6);
    ctx.fillStyle = '#fff7c0';
    ctx.fillRect(25, -10, 3, 6);
    ctx.fillRect(25, 4, 3, 6);
    if (opts && opts.siren) {
      const phase = Math.sin(opts.siren) > 0;
      ctx.fillStyle = phase ? '#ff3b30' : '#2b6fd8';
      ctx.beginPath(); ctx.arc(-2, 0, 5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPerson(x, y, angle, color, opts) {
    // Drop shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 3, y + 4, 11, 6, 0, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(3, 0, 5, 0, TAU); ctx.fill();
    if (opts && opts.gun) {
      ctx.fillStyle = '#222';
      ctx.fillRect(8, -2, 12, 4);
    }
    ctx.restore();
    if (opts && opts.down) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - 18, 8, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('✕', x, y - 14);
    }
  }

  function drawWorld(state, cam, t, screen) {
    drawCity(state, cam, t);
    const p = state.player;
    // Mission package.
    if (state.package && !state.package.taken) {
      const px = state.package.x - cam.x, py = state.package.y - cam.y;
      const bob = Math.sin(t * 4) * 4;
      ctx.fillStyle = '#ffd34d';
      ctx.fillRect(px - 12, py - 12 + bob, 24, 24);
      ctx.strokeStyle = '#8a6d00';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 12, py - 12 + bob, 24, 24);
      ctx.fillStyle = '#8a6d00';
      ctx.font = `700 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('PKG', px, py + 4 + bob);
    }
    // Cash drops.
    for (const d of state.cashDrops) {
      if (d.taken) continue;
      ctx.fillStyle = '#58c96b';
      ctx.beginPath(); ctx.arc(d.x - cam.x, d.y - cam.y, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('$', d.x - cam.x, d.y - cam.y + 4);
    }
    // Traffic + player car.
    for (const c of state.cars) {
      drawCarShape(c.x - cam.x, c.y - cam.y, c.angle, c.color, { brakeLight: c.brakeLight });
    }
    // Police cars (flashing light bar).
    for (const pc of state.police) {
      drawCarShape(pc.x - cam.x, pc.y - cam.y, pc.angle, pc.color, { siren: pc.siren, brakeLight: false });
      if (pc.roadblock) {
        ctx.fillStyle = 'rgba(255,59,48,0.9)';
        ctx.font = `700 12px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('ROADBLOCK', pc.x - cam.x, pc.y - cam.y - 30);
      }
    }
    // Pedestrians.
    for (const ped of state.peds) {
      const bob = ped.down > 0 ? 0 : Math.sin(ped.walkPhase) * 1.5;
      drawPerson(ped.x - cam.x, ped.y - cam.y + bob, ped.angle, ped.color, { down: ped.down > 0 });
    }
    // Enemies.
    for (const e of state.enemies) {
      drawPerson(e.x - cam.x, e.y - cam.y, e.angle, e.color, { gun: e.shooter });
      // Health pip.
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - cam.x - 14, e.y - cam.y - 24, 28, 4);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(e.x - cam.x - 14, e.y - cam.y - 24, 28 * (e.health / 40), 4);
    }
    // Player on foot.
    if (!p.inCar) {
      drawPerson(p.x - cam.x, p.y - cam.y, p.angle, '#1d6fd8', { gun: p.hasPistol });
      // Aim line when armed.
      if (p.hasPistol) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(p.x - cam.x, p.y - cam.y);
        ctx.lineTo(p.x - cam.x + Math.cos(p.angle) * 90, p.y - cam.y + Math.sin(p.angle) * 90);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // Particles.
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - cam.x - pt.size / 2, pt.y - cam.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    // Helicopter shadow + searchlight.
    if (state.heli) {
      const h = state.heli;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(h.x - cam.x + 14, h.y - cam.y + 18, 34, 20, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,170,0.16)';
      ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, 150, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,170,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, 150, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(h.x - cam.x, h.y - cam.y, 16, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 3;
      const ra = h.angle;
      ctx.beginPath();
      ctx.moveTo(h.x - cam.x - Math.cos(ra) * 34, h.y - cam.y - Math.sin(ra) * 34);
      ctx.lineTo(h.x - cam.x + Math.cos(ra) * 34, h.y - cam.y + Math.sin(ra) * 34);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `700 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('SOLMARIS PD AIR-1', h.x - cam.x, h.y - cam.y - 26);
    }
    // Mission marker: beacon column + pulsing ring + off-screen arrow.
    const target = currentTargetOf(state);
    if (target && screen === SCREEN_PLAY) {
      const tx = target.x - cam.x, ty = target.y - cam.y;
      const pulse = 1 + Math.sin(t * 3) * 0.15;
      ctx.strokeStyle = PALETTE.marker;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(tx, ty, 34 * pulse, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,211,77,0.25)';
      ctx.beginPath(); ctx.arc(tx, ty, 26 * pulse, 0, TAU); ctx.fill();
      ctx.fillStyle = PALETTE.marker;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 52 - Math.sin(t * 3) * 5);
      ctx.lineTo(tx - 12, ty - 30);
      ctx.lineTo(tx + 12, ty - 30);
      ctx.closePath();
      ctx.fill();
      // Arrow at the screen edge when the marker is off-screen.
      if (tx < 40 || tx > VIEW.width - 40 || ty < 40 || ty > VIEW.height - 40) {
        const cx = VIEW.width / 2, cy = VIEW.height / 2;
        const a = Math.atan2(ty - cy, tx - cx);
        const ax = cx + Math.cos(a) * 300, ay = cy + Math.sin(a) * 200;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(a);
        ctx.fillStyle = PALETTE.marker;
        ctx.beginPath();
        ctx.moveTo(16, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = PALETTE.marker;
        ctx.font = `700 14px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(Math.hypot(target.x - p.x, target.y - p.y))}m`, ax, ay + 30);
      }
    }
  }

  function currentTargetOf(state) {
    const m = MISSIONS[state.missionIndex];
    if (!m) return null;
    if (m.type === 'collect' && state.package && !state.package.taken) return state.package;
    return { x: m.x, y: m.y };
  }

  function drawMinimap(state) {
    const cx = VIEW.width - 112, cy = 152, r = 92;
    const scale = (r * 2) / Math.max(WORLD.width, WORLD.height);
    const ox = cx - (WORLD.width * scale) / 2;
    const oy = cy - (WORLD.height * scale) / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(16,20,16,0.82)';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // Water.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(ox, oy, 44 * scale + 4, WORLD.height * scale);
    // Roads.
    ctx.strokeStyle = 'rgba(230,225,210,0.75)';
    ctx.lineWidth = 2;
    for (const ax of AVENUES) {
      ctx.beginPath(); ctx.moveTo(ox + ax * scale, oy); ctx.lineTo(ox + ax * scale, oy + WORLD.height * scale); ctx.stroke();
    }
    for (const sy of STREETS) {
      ctx.beginPath(); ctx.moveTo(ox, oy + sy * scale); ctx.lineTo(ox + WORLD.width * scale, oy + sy * scale); ctx.stroke();
    }
    // Shops.
    ctx.fillStyle = '#ffd34d';
    for (const s of SHOPS) {
      ctx.fillRect(ox + s.x * scale - 2, oy + s.y * scale - 2, 4, 4);
    }
    // Traffic dots.
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const c of state.cars) ctx.fillRect(ox + c.x * scale - 1.5, oy + c.y * scale - 1.5, 3, 3);
    // Police (flashing).
    if (Math.floor(state.time * 4) % 2 === 0) {
      ctx.fillStyle = '#5b8dd9';
      for (const pc of state.police) {
        ctx.beginPath(); ctx.arc(ox + pc.x * scale, oy + pc.y * scale, 4, 0, TAU); ctx.fill();
      }
    }
    // Mission marker (pulsing).
    const target = currentTargetOf(state);
    if (target) {
      ctx.fillStyle = PALETTE.marker;
      const pr = 5 + Math.sin(state.time * 4) * 1.5;
      ctx.beginPath(); ctx.arc(ox + target.x * scale, oy + target.y * scale, pr, 0, TAU); ctx.fill();
    }
    // Player arrow.
    const p = state.player;
    ctx.save();
    ctx.translate(ox + p.x * scale, oy + p.y * scale);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    // Ring + N.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - r - 8);
  }

  function drawHUD(state, screen) {
    const p = state.player;
    const m = MISSIONS[state.missionIndex];
    // Top-left panel: cash, health, armor, weapon.
    ctx.fillStyle = PALETTE.hudPanel;
    roundRect(16, 14, 268, 108, 10); ctx.fill();
    ctx.fillStyle = '#58c96b';
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`$${p.cash}`, 30, 46);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('SOLMARIS', 30, 66);
    // Health bar.
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(30, 74, 150, 10);
    ctx.fillStyle = PALETTE.health;
    ctx.fillRect(30, 74, 150 * Math.max(0, p.health / 100), 10);
    // Armor bar.
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(30, 90, 150, 10);
    ctx.fillStyle = PALETTE.armor;
    ctx.fillRect(30, 90, 150 * Math.max(0, p.armor / 100), 10);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(`HP ${Math.ceil(p.health)}  ARMOR ${Math.ceil(p.armor)}`, 190, 84);
    // Weapon.
    ctx.font = `700 15px ${FONT}`;
    const wLabel = p.inCar ? '🚗 DRIVING' : p.hasPistol ? `🔫 P9 · ${p.ammo} rds` : p.hasBat ? '🏏 BAT' : '🥊 FISTS';
    ctx.fillText(wLabel, 30, 112);
    // Wanted stars, top-right above the minimap.
    ctx.textAlign = 'right';
    ctx.font = '28px sans-serif';
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < state.wanted ? PALETTE.star : PALETTE.starEmpty;
      ctx.fillText('★', VIEW.width - 24 - i * 32, 44);
    }
    ctx.textAlign = 'left';
    // Mission objective banner, top-centre.
    if (m) {
      ctx.fillStyle = PALETTE.hudPanel;
      const text = `${m.id}/6 ${m.name} — ${m.objective}`;
      ctx.font = `700 15px ${FONT}`;
      const w = ctx.measureText(text).width + 28;
      roundRect(VIEW.width / 2 - w / 2, 14, w, 34, 8); ctx.fill();
      ctx.fillStyle = PALETTE.hudAccent;
      ctx.textAlign = 'center';
      ctx.fillText(text, VIEW.width / 2, 36);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = PALETTE.hudPanel;
      const text = 'THE SOLMARIS JOB — COMPLETE · free roam';
      ctx.font = `700 15px ${FONT}`;
      const w = ctx.measureText(text).width + 28;
      roundRect(VIEW.width / 2 - w / 2, 14, w, 34, 8); ctx.fill();
      ctx.fillStyle = PALETTE.hudAccent;
      ctx.textAlign = 'center';
      ctx.fillText(text, VIEW.width / 2, 36);
      ctx.textAlign = 'left';
    }
    drawMinimap(state);
    // Context hint, bottom-left.
    let hint = '';
    if (p.inCar) hint = 'W/S drive · A/D steer · SPACE handbrake · E exit car';
    else if (state.nearShop) hint = `E — enter ${state.nearShop.name} · F punch · click to shoot (P9)`;
    else hint = 'WASD move · SHIFT run · E steal car · F punch · P pause · M mute';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(20,18,16,0.6)';
    ctx.font = `600 13px ${FONT}`;
    const hw = ctx.measureText(hint).width + 20;
    roundRect(16, VIEW.height - 40, hw, 26, 8); ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(hint, 26, VIEW.height - 22);
    // Toasts, bottom-centre.
    ctx.textAlign = 'center';
    let ty = VIEW.height - 84;
    for (const t of state.toasts.slice(-3)) {
      ctx.globalAlpha = Math.min(1, (4.5 - t.t) / 1.2);
      ctx.fillStyle = PALETTE.hudPanel;
      const tw = ctx.measureText(t.text).width + 24;
      roundRect(VIEW.width / 2 - tw / 2, ty - 20, tw, 26, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `600 14px ${FONT}`;
      ctx.fillText(t.text, VIEW.width / 2, ty - 2);
      ty -= 32;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawTitle(state, t, hasSave) {
    ctx.fillStyle = 'rgba(10,14,20,0.45)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // Sun glare.
    const g = ctx.createRadialGradient(960, 130, 20, 960, 130, 420);
    g.addColorStop(0, 'rgba(255,214,90,0.5)');
    g.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `900 96px ${FONT}`;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 18;
    ctx.fillText('SOLMARIS', VIEW.width / 2, 220);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.hudAccent;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('AN ORIGINAL OPEN-WORLD CRIME STORY', VIEW.width / 2, 262);
    ctx.fillStyle = '#fff';
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText('Five districts. Six jobs. One getaway. Steal a car, lose the heat, finish the job.', VIEW.width / 2, 300);
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(hasSave ? 'ENTER — CONTINUE YOUR JOB' : 'ENTER — START THE JOB', VIEW.width / 2, 380);
    ctx.font = `400 15px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('WASD move / drive · E steal car · F punch · mouse + click shoot · P pause · M mute', VIEW.width / 2, 440);
    ctx.fillText('Marina Bay · Old Harbor · Palm Court · Sunvale · Coral Heights', VIEW.width / 2, 468);
    ctx.fillText('Rae Voss has $250 and a borrowed jacket. Mara Kade has six jobs.', VIEW.width / 2, 510);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Original city, characters, vehicles, story, art and sound — no Rockstar Games content.', VIEW.width / 2, 660);
    ctx.textAlign = 'left';
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10,12,16,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `900 64px ${FONT}`;
    ctx.fillText('PAUSED', VIEW.width / 2, 320);
    ctx.font = `400 18px ${FONT}`;
    ctx.fillText('P / Esc — resume · M — mute · progress autosaves', VIEW.width / 2, 364);
    ctx.textAlign = 'left';
  }

  function drawOver(kind) {
    ctx.fillStyle = kind === 'wasted' ? 'rgba(120,10,10,0.72)' : 'rgba(10,20,90,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `900 92px ${FONT}`;
    ctx.fillText(kind === 'wasted' ? 'WASTED' : 'BUSTED', VIEW.width / 2, 330);
    ctx.font = `400 19px ${FONT}`;
    ctx.fillText(kind === 'wasted' ? 'Sunvale General patched you up. $100 hospital bill.' : 'Solmaris PD took you in. $100 fine.', VIEW.width / 2, 378);
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText('ENTER — back on the streets', VIEW.width / 2, 430);
    ctx.textAlign = 'left';
  }

  function drawShop(state) {
    const shop = state.shopOpen;
    if (!shop) return;
    ctx.fillStyle = 'rgba(10,12,16,0.65)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const w = 560, h = 300, x = VIEW.width / 2 - w / 2, y = VIEW.height / 2 - h / 2;
    ctx.fillStyle = '#f5efe2';
    roundRect(x, y, w, h, 14); ctx.fill();
    ctx.fillStyle = shop.color;
    ctx.fillRect(x, y, w, 56);
    ctx.fillStyle = '#fff';
    ctx.font = `800 26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(shop.name.toUpperCase(), x + 22, y + 38);
    ctx.fillStyle = '#1d1a16';
    ctx.font = `700 18px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`Cash: $${state.player.cash}`, x + w - 22, y + 38);
    ctx.textAlign = 'left';
    shop.items.forEach((item, i) => {
      const iy = y + 84 + i * 62;
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0)';
      ctx.fillRect(x + 12, iy - 6, w - 24, 52);
      ctx.fillStyle = '#1d1a16';
      ctx.font = `700 19px ${FONT}`;
      ctx.fillText(`[${item.key}] ${item.name}`, x + 24, iy + 20);
      ctx.font = `400 14px ${FONT}`;
      ctx.fillStyle = '#5a5348';
      ctx.fillText(item.desc, x + 24, iy + 42);
      ctx.fillStyle = '#1d6f2e';
      ctx.font = `700 19px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(`$${item.price}`, x + w - 24, iy + 28);
      ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#5a5348';
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText('Press 1 / 2 / 3 to buy · E or Esc to leave', x + 24, y + h - 16);
  }

  function draw(state, screen, opts) {
    const t = state.time;
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    const cam = screen === SCREEN_TITLE
      ? { x: PLAZA.x - VIEW.width / 2, y: PLAZA.y - VIEW.height / 2 }
      : cameraFor(state);
    drawWorld(state, cam, t, screen);
    if (screen === SCREEN_PLAY) drawHUD(state, screen);
    if (screen === SCREEN_TITLE) drawTitle(state, t, opts && opts.hasSave);
    if (screen === SCREEN_PAUSED) { drawHUD(state, screen); drawPaused(); }
    if (screen === SCREEN_WASTED) drawOver('wasted');
    if (screen === SCREEN_BUSTED) drawOver('busted');
    if (opts && opts.shopOpen) drawShop(state);
  }

  return { draw, cameraFor };
}
