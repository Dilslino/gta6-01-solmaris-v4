// Keyboard + mouse state. Actions are edge-triggered (pressed this frame),
// movement is level-triggered. Mouse aim is tracked in screen space and
// converted to world space by the caller.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_ATTACK = 8;
export const ACTION_MUTE = 16;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mousePressed = false;
  let actions = 0;

  function keyName(e) {
    return e.key.toLowerCase();
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
    if (k === 'enter' || k === ' ') actions |= ACTION_CONFIRM;
    if (k === 'p' || k === 'escape') actions |= ACTION_PAUSE;
    if (k === 'e') actions |= ACTION_INTERACT;
    if (k === 'f') actions |= ACTION_ATTACK;
    if (k === 'm') actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouseDown = true; mousePressed = true; }
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });

  return {
    // WASD / arrows as -1..1 axes.
    axes() {
      const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      const y = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      return { x, y };
    },
    get sprint() { return keys.has('shift'); },
    get handbrake() { return keys.has(' '); },
    takeActions() {
      const a = actions;
      actions = 0;
      if (mousePressed) { mousePressed = false; return a | ACTION_ATTACK; }
      mousePressed = false;
      return a;
    },
    takePressed() {
      const p = new Set(pressed);
      pressed.clear();
      return p;
    },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    isDown(k) { return keys.has(k); },
  };
}
