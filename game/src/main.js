// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. Screens: title, play, paused, wasted,
// busted; the shop opens over play.
//
// ?seed=N fixes the city. ?shot=title|driving|chase|mission stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, SHOT_SEED } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_INTERACT, ACTION_ATTACK, ACTION_MUTE } from './input.js';
import { createWorld, EVENT_BUSTED, EVENT_WASTED, EVENT_MISSION } from './world.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_WASTED, SCREEN_BUSTED } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const AUTOSAVE_SECONDS = 10;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : (shot ? SHOT_SEED : Math.floor(Math.random() * 4294967296));

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const world = createWorld(createRandom(seed), audio);
const renderer = createRenderer(canvas);

// Exposed for headless play-tests: window.__solmaris.world.state is the
// live simulation; window.__solmaris.screen is the current screen.
window.__solmaris = { world, screen: SCREEN_TITLE, seed };

function runShot(name) {
  const scene = stageShot(name, world);
  window.__solmaris.screen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { hasSave: world.hasSave() });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else { window.__shotReady = true; document.title = 'SHOT-READY'; }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let autosaveTimer = 0;
  let last = performance.now();
  let accumulator = 0;
  let overKind = null;

  window.__solmaris.screen = screen;

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    if (fresh) world.reset();
    screen = SCREEN_PLAY;
    window.__solmaris.screen = screen;
    audio.unlock();
    announce('Playing. Follow the mission marker.');
  }

  function endOver(kind) {
    overKind = kind;
    screen = kind === 'wasted' ? SCREEN_WASTED : SCREEN_BUSTED;
    window.__solmaris.screen = screen;
    announce(kind === 'wasted' ? 'Wasted. Press Enter to get back up.' : 'Busted. Press Enter to get back out.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const pressed = input.takePressed();
    const mouse = input.mouse();

    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }

    // Shop buying: number keys while the shop is open.
    if (world.state.shopOpen) {
      for (const key of ['1', '2', '3']) {
        if (pressed.has(key)) {
          const item = world.state.shopOpen.items.find((i) => i.key === key);
          if (item) world.buy(item);
        }
      }
      if ((actions & ACTION_PAUSE) || (actions & ACTION_INTERACT)) world.state.shopOpen = null;
    } else if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        if (world.hasSave()) { world.load(); startGame(false); }
        else startGame(true);
      }
    } else if (screen === SCREEN_WASTED || screen === SCREEN_BUSTED) {
      if (actions & ACTION_CONFIRM) {
        world.respawn(overKind);
        overKind = null;
        screen = SCREEN_PLAY;
        window.__solmaris.screen = screen;
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        window.__solmaris.screen = screen;
        world.save();
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        window.__solmaris.screen = screen;
        announce('Playing.');
      }
    }

    if (screen === SCREEN_PLAY && !world.state.shopOpen) {
      const cam = renderer.cameraFor(world.state);
      const scaleX = canvas.width / canvas.clientWidth;
      const scaleY = canvas.height / canvas.clientHeight;
      const aimAngle = Math.atan2(
        (mouse.y * scaleY + cam.y) - world.state.player.y,
        (mouse.x * scaleX + cam.x) - world.state.player.x,
      );
      let firstStep = true;
      while (accumulator >= STEP) {
        const stepInput = {
          axes: () => input.axes(),
          sprint: input.sprint,
          handbrake: input.handbrake,
          actions: firstStep ? actions : 0,
          aimAngle,
        };
        firstStep = false;
        const events = world.step(STEP, stepInput);
        accumulator -= STEP;
        if (events & EVENT_BUSTED) { endOver('busted'); break; }
        if (events & EVENT_WASTED) { endOver('wasted'); break; }
        if (events & EVENT_MISSION) world.save();
      }
      autosaveTimer += STEP;
      if (autosaveTimer > AUTOSAVE_SECONDS) { autosaveTimer = 0; world.save(); }
      audio.update(STEP, Math.abs(world.state.player.speed || 0), world.state.wanted);
    } else {
      accumulator = 0;
      if (screen === SCREEN_TITLE) world.ambient(STEP);
    }

    world.state.nearShop = world.state.shopOpen ? world.state.shopOpen : world.nearestShop();
    renderer.draw(world.state, screen, { hasSave: world.hasSave(), shopOpen: !!world.state.shopOpen });
  }

  announce('Solmaris. Press Enter to start the job.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
