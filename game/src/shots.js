// The screenshot scenes behind ?shot=vault-escape|stacks-coin|reading-shadow|title.
// Each one stages a real game state through the world's own fields — the same
// state the loop builds while playing — then lets the renderer paint it, so the
// frame is what the game really looks like. A short fixed settle (one or a few
// 1/60 s steps, no input) lets the world's own flags (shadow, hidden, sweep
// angles) settle from the staged positions, and the same seed always gives the
// same frame. Nothing here draws anything and nothing is faked: every cone,
// ghost, glyph and ring on screen is a live object of the world.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const IDLE_POINTER = { aiming: false, x: 0, y: 0 };
const NO_MOVE = { x: 0, y: 0 };

/** One fixed step with no input, so staged positions settle into real flags. */
function settle(world, steps) {
  for (let i = 0; i < steps; i += 1) world.step(STEP, NO_MOVE, false, IDLE_POINTER);
}

/**
 * The cover: the escape phase in the Vault Hall. Wren in shadow-silhouette
 * along the wall shadow corridor, the Lantern Captain's lamp pool and two
 * converging cones narrowly missing her, a ghost marker where a guard lost
 * her, the entrance exit glowing open, pages 5/5, the detection bar half full.
 */
function stageVaultEscape(world) {
  const s = world.state;
  world.reset();
  world.loadRoom(2);
  s.ledgerTaken = true;
  s.escape = true;
  s.pagesGot = 5;
  s.coins = 3;
  s.alarms = 1;
  s.time = 282;
  for (let i = 0; i < s.pages.length; i += 1) s.pages[i].taken = true;
  // Wren in the left wall shadow corridor, mid-crossing, facing the exit.
  s.player.x = 86;
  s.player.y = 500;
  s.player.angle = 20;
  // The Lantern Captain closes in from the dais ring, lamp lit.
  const captain = s.guards[3];
  captain.x = 420;
  captain.y = 430;
  captain.angle = 161;
  // A Patroller converges from the north, meter half full, cone just short.
  const patroller = s.guards[0];
  patroller.x = 320;
  patroller.y = 420;
  patroller.angle = 161;
  patroller.meter = 50;
  // A second Patroller walks to a ghost marker where he lost her.
  const hunter = s.guards[1];
  hunter.x = 620;
  hunter.y = 500;
  hunter.state = 'investigate';
  hunter.target = { x: 500, y: 560 };
  hunter.lastSeen = { x: 500, y: 560 };
  // The Scanner sweeps the dais steps, cone turned away from her corridor.
  const scanner = s.guards[2];
  scanner.sweepT = 2.2;
  settle(world, 1);
  patroller.meter = 50;
  s.banner = {
    title: 'THE LEDGER IS YOURS — NOW VANISH',
    sub: 'Cross the hall back to the entrance door, unseen',
    ttl: 99, sticky: true,
  };
  return { screen: SCREEN_PLAY, best: '' };
}

/**
 * The signature system: Wren holding a coin aim in the Stacks — dotted arc,
 * landing marker and preview noise ring visible, a Patroller mid-lane about
 * to be pulled, marble lane and carpet visibly different underfoot, the
 * Scanner cone sweeping the far junction.
 */
function stageStacksCoin(world) {
  const s = world.state;
  world.reset();
  world.loadRoom(1);
  s.coins = 3;
  s.player.x = 470;
  s.player.y = 340;
  s.player.angle = 0;
  // A Patroller mid-lane, walking down toward the landing point.
  const patroller = s.guards[0];
  patroller.x = 700;
  patroller.y = 300;
  patroller.angle = 90;
  patroller.wpIndex = 1;
  // The second Patroller holds the far right corridor.
  s.guards[1].x = 1140;
  s.guards[1].y = 200;
  s.guards[1].angle = 180;
  // The Scanner sweeps away from her, cone on the far junction.
  s.guards[2].sweepT = -2.24;
  settle(world, 1);
  // Hold the aim: the preview arc, landing marker and noise ring.
  s.aim.active = true;
  s.aim.x = 700;
  s.aim.y = 340;
  s.banner = null;
  return { screen: SCREEN_PLAY, best: '' };
}

/**
 * The clarity shot: Wren hidden behind a reading table — dark silhouette,
 * hidden glyph showing — a Patroller's yellow cone visibly CUT by the table
 * edge a few pixels from her, the page glowing on its lectern across the
 * room, the exit door sealed.
 */
function stageReadingShadow(world) {
  const s = world.state;
  world.reset();
  world.loadRoom(0);
  // reset() already loaded Room 1 once (2 coins); the second load would add
  // 2 more, so set the room's grant explicitly.
  s.coins = 2;
  // Wren in the table's shadow, just below its edge, facing the guard.
  s.player.x = 300;
  s.player.y = 300;
  s.player.angle = -90;
  // The Patroller above the table, cone sweeping down onto its edge.
  const guard = s.guards[0];
  guard.x = 300;
  guard.y = 150;
  guard.angle = 90;
  // The second Patroller holds the bottom loop, far away.
  s.guards[1].x = 700;
  s.guards[1].y = 560;
  s.guards[1].angle = 180;
  settle(world, 1);
  s.banner = null;
  return { screen: SCREEN_PLAY, best: '' };
}

/**
 * The title information board: the Reading Room behind a dark veil, guards
 * on their patrols, every count and the bestiary readable.
 */
function stageTitle(world) {
  world.reset();
  world.loadRoom(0);
  world.state.coins = 2;
  settle(world, 300);
  world.state.banner = null;
  return { screen: SCREEN_TITLE, best: 'Ghost' };
}

/** The four staged scenes, in the order the screenshots are named. */
export const SHOT_NAMES = ['vault-escape', 'stacks-coin', 'reading-shadow', 'title'];

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best grade to show. Any other name stages the title.
 */
export function stageShot(name, world) {
  if (name === 'vault-escape') return stageVaultEscape(world);
  if (name === 'stacks-coin') return stageStacksCoin(world);
  if (name === 'reading-shadow') return stageReadingShadow(world);
  return stageTitle(world);
}
