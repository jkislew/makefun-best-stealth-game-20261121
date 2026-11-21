// Keyboard and pointer input. Held keys give a steering direction and a sneak
// flag; one-shot presses (start, pause, restart, mute) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost and
// never counted twice. The mouse aims a coin: holding the button shows the
// preview, releasing it throws. Pointer coordinates are converted into the
// fixed 1280x720 logical playfield by the caller-supplied mapping.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas, toLogical) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let sneak = false;
  let actions = 0;
  /** Pointer state in logical coordinates; aiming is true while the button is held. */
  const pointer = { x: FIELD.width / 2, y: FIELD.height / 2, aiming: false, down: false };

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    const point = toLogical(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    pointer.x = point.x;
    pointer.y = point.y;
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (SNEAK.has(event.code)) sneak = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (SNEAK.has(event.code)) sneak = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    sneak = false;
    pointer.aiming = false;
    pointer.down = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    updatePointer(event);
    pointer.down = true;
    pointer.aiming = true;
    actions |= ACTION_CONFIRM;
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    updatePointer(event);
  });
  canvas.addEventListener('pointerup', (event) => {
    updatePointer(event);
    pointer.down = false;
    pointer.aiming = false;
  });
  canvas.addEventListener('pointercancel', () => {
    pointer.down = false;
    pointer.aiming = false;
  });
  // Right-click never aims a coin: it only opens the browser menu, so swallow it.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    pointer,
    /** Normalised steering vector from the held keys. */
    move() {
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    sneaking() {
      return sneak;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
