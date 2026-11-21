// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play,
// paused and victory. Being caught never ends the run: the world soft-resets
// Wren to the room entrance and play continues.
//
// ?seed=N fixes the game. ?shot=vault-escape|stacks-coin|reading-shadow|title
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_COIN, EVENT_LEDGER, EVENT_PAGE, EVENT_ROOM, EVENT_UNLOCK, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
// Playtests and the shot harness read the live world through this handle.
window.__nl = { world, state: world.state };

function readBest() {
  try {
    return window.localStorage.getItem(BEST_KEY) || '';
  } catch {
    return '';
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, value);
  } catch {
    // Storage can be off (private windows): the best grade then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, audio.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const ratio = window.devicePixelRatio || 1;
  const input = createInput(canvas, (dx, dy) => ({
    x: (dx * ratio - renderer.view.x) / renderer.view.scale,
    y: (dy * ratio - renderer.view.y) / renderer.view.scale,
  }));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let muted = false;
  let accumulator = 0;
  let last = performance.now();
  // The playtest harness reads the live screen through this handle.
  window.__nl.screen = () => screen;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.confirm();
    announce('Playing. Steal the pages, then the Ledger, and leave unseen.');
  }

  function winGame() {
    screen = SCREEN_VICTORY;
    audio.victory();
    const gradeRank = { Ghost: 4, Shadow: 3, Phantom: 2, 'Night Clerk': 1 };
    if (!best || gradeRank[world.state.grade] > gradeRank[best]) {
      best = world.state.grade;
      saveBest(best);
    }
    announce(`Victory. Grade ${world.state.grade}. Time ${Math.floor(world.state.time)} seconds, ${world.state.alarms} alarms.`);
  }

  function handleEvents(events) {
    if (events & EVENT_PAGE) audio.page();
    if (events & EVENT_COIN) audio.coin();
    if (events & EVENT_UNLOCK) audio.unlockSound();
    if (events & EVENT_LEDGER) audio.ledger();
    if (events & EVENT_CAUGHT) {
      audio.alarm();
      announce(`Caught. Alarm ${world.state.alarms}. Back to the door — the pages are still yours.`);
    }
    if (events & EVENT_ROOM) {
      audio.unlockSound();
      announce(`${world.state.room.name}.`);
    }
    if (events & EVENT_WIN) winGame();
  }

  function topMeter() {
    let top = 0;
    for (let i = 0; i < world.state.guards.length; i += 1) {
      if (world.state.guards[i].meter > top) top = world.state.guards[i].meter;
    }
    return top;
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      muted = !muted;
      audio.setMuted(muted);
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen === SCREEN_PLAY) {
      world.resetRoom();
      announce('Room restarted.');
    }
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_VICTORY) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The title's backdrop is the Reading Room, alive: guards on patrol.
      world.step(STEP, { x: 0, y: 0 }, false, { aiming: false, x: 0, y: 0 });
      return;
    }
    const pointer = input.pointer;
    const events = world.step(STEP, input.move(), input.sneaking(), pointer);
    handleEvents(events);
    const meter = topMeter();
    if (meter >= 35) audio.suspicion(meter);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, muted);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  // Audio starts only after a gesture; unlock on the first of any kind.
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  window.addEventListener('keydown', () => audio.unlock(), { once: true });

  announce('Night Ledger. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
