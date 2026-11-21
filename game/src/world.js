// The game's rules and state, with no drawing and no browser in it: Wren, the
// guards, the pages, the coins, the doors, the escape phase and the grade.
// step() advances one fixed step and returns what happened as bit flags, so the
// caller can react without the world knowing about screens or sound. The
// simulation reads no wall clock and no Math.random: every wobble comes from
// the seeded stream, so the same seed always plays the same game.

import {
  COINS_PER_ROOM, DETECTION, FIELD, GUARD, PLAYER, SOUND, STEP, TOTAL_PAGES,
  TOTAL_PAR,
} from './config.js';
import { LEVELS, doorRect } from './levels.js';
import { createGuard, stepGuard } from './guards.js';

export const EVENT_PAGE = 1;
export const EVENT_COIN = 2;
export const EVENT_UNLOCK = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_ROOM = 16;
export const EVENT_LEDGER = 32;
export const EVENT_WIN = 64;

// ---------------------------------------------------------------- geometry

export function angleDiff(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function angleTo(ax, ay, bx, by) {
  return (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** True when the segment (ax,ay)-(bx,by) touches rectangle r. */
export function segmentHitsRect(ax, ay, bx, by, r) {
  if (pointInRect(ax, ay, r) || pointInRect(bx, by, r)) return true;
  const dx = bx - ax;
  const dy = by - ay;
  // Slab test: the segment enters the rect when the intervals overlap.
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (ax < r.x || ax > r.x + r.w) return false;
  } else {
    let t1 = (r.x - ax) / dx;
    let t2 = (r.x + r.w - ax) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (ay < r.y || ay > r.y + r.h) return false;
  } else {
    let t1 = (r.y - ay) / dy;
    let t2 = (r.y + r.h - ay) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** Distance along a ray before it hits rectangle r, or Infinity when it misses. */
function rayRectDist(ox, oy, dx, dy, r) {
  let tmin = 0;
  let tmax = Infinity;
  if (dx === 0) {
    if (ox < r.x || ox > r.x + r.w) return Infinity;
  } else {
    let t1 = (r.x - ox) / dx;
    let t2 = (r.x + r.w - ox) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  if (dy === 0) {
    if (oy < r.y || oy > r.y + r.h) return Infinity;
  } else {
    let t1 = (r.y - oy) / dy;
    let t2 = (r.y + r.h - oy) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

/**
 * The vision cone of a guard as a polygon, clipped by walls and tall cover:
 * rays fan across the cone and each stops at the first blocker or the cone's
 * length, so stepping behind a shelf visibly cuts the cone.
 */
export function conePolygon(guard, room, escape) {
  const len = guard.coneLength * (escape ? GUARD.escapeConeMul : 1);
  const half = guard.coneHalf;
  const blockers = room.walls.concat(room.cover.filter((c) => c.tall));
  const points = [{ x: guard.x, y: guard.y }];
  const steps = 26;
  for (let i = 0; i <= steps; i += 1) {
    const deg = guard.angle - half + (2 * half * i) / steps;
    const rad = (deg * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    let best = len;
    for (let b = 0; b < blockers.length; b += 1) {
      const d = rayRectDist(guard.x, guard.y, dx, dy, blockers[b]);
      if (d < best) best = d;
    }
    points.push({ x: guard.x + dx * best, y: guard.y + dy * best });
  }
  return points;
}

/** The fainter peripheral wedge: short, wide, drawn inside the main cone. */
export function peripheralPolygon(guard, room) {
  const blockers = room.walls.concat(room.cover.filter((c) => c.tall));
  const points = [{ x: guard.x, y: guard.y }];
  const steps = 16;
  for (let i = 0; i <= steps; i += 1) {
    const deg = guard.angle - GUARD.peripheralHalf + (2 * GUARD.peripheralHalf * i) / steps;
    const rad = (deg * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    let best = GUARD.peripheralRadius;
    for (let b = 0; b < blockers.length; b += 1) {
      const d = rayRectDist(guard.x, guard.y, dx, dy, blockers[b]);
      if (d < best) best = d;
    }
    points.push({ x: guard.x + dx * best, y: guard.y + dy * best });
  }
  return points;
}

// ---------------------------------------------------------------- world

export function createWorld(random) {
  const state = {
    roomIndex: 0,
    room: LEVELS[0],
    elapsed: 0,
    roomTime: 0,
    time: 0,
    alarms: 0,
    pagesGot: 0,
    coins: COINS_PER_ROOM[0],
    coinsUsed: 0,
    ledgerTaken: false,
    escape: false,
    won: false,
    grade: '',
    feats: [],
    shadowTime: 0,
    maxMeter: 0,
    escapeAlarms: 0,
    player: {
      x: 640, y: 640, angle: -90, moving: false, sneaking: false,
      inShadow: false, hidden: false, stepTimer: 0,
    },
    guards: [],
    pages: [],
    rings: [],
    noises: [],
    coinFlight: null,
    aim: { active: false, x: 0, y: 0 },
    banner: null,
    introTtl: 0,
    flashTtl: 0,
    noiseId: 0,
  };

  function inShadow(x, y) {
    const pools = state.room.shadow;
    for (let i = 0; i < pools.length; i += 1) if (pointInRect(x, y, pools[i])) return true;
    return false;
  }

  function onCarpet(x, y) {
    const zones = state.room.carpetZones;
    for (let i = 0; i < zones.length; i += 1) if (pointInRect(x, y, zones[i])) return true;
    return false;
  }

  /** True when the point sits inside the Lantern Captain's moving lamp light. */
  function inCaptainLight(x, y) {
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      if (g.kind !== 'captain') continue;
      if (Math.hypot(x - g.x, y - g.y) < 130) return true;
    }
    return false;
  }

  function hasLOS(ax, ay, bx, by) {
    const blockers = state.room.walls.concat(state.room.cover.filter((c) => c.tall));
    for (let i = 0; i < blockers.length; i += 1) {
      if (segmentHitsRect(ax, ay, bx, by, blockers[i])) return false;
    }
    return true;
  }

  function circleHitsSolid(x, y, radius) {
    const solids = state.room.walls.concat(state.room.cover);
    for (let i = 0; i < solids.length; i += 1) {
      const r = solids[i];
      const cx = Math.max(r.x, Math.min(x, r.x + r.w));
      const cy = Math.max(r.y, Math.min(y, r.y + r.h));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
    return false;
  }

  /** Move a circle by (dx, dy), sliding along walls: try x, then y. */
  function moveCircle(entity, dx, dy, radius) {
    if (dx !== 0 && !circleHitsSolid(entity.x + dx, entity.y, radius)) entity.x += dx;
    if (dy !== 0 && !circleHitsSolid(entity.x, entity.y + dy, radius)) entity.y += dy;
  }

  function emitNoise(x, y, radius, kind) {
    state.noiseId += 1;
    state.noises.push({ id: state.noiseId, x, y, r: radius, ttl: 0.6, kind });
    state.rings.push({ x, y, r: 6, maxR: radius, ttl: 0.6, maxTtl: 0.6, kind });
  }

  function loadRoom(index, keepRun) {
    const room = LEVELS[index];
    state.roomIndex = index;
    state.room = room;
    state.roomTime = 0;
    state.player.x = room.entrance.x;
    state.player.y = room.entrance.y;
    state.player.angle = -90;
    state.player.stepTimer = 0;
    state.guards = room.guards.map((def) => createGuard(def, index, random));
    state.pages = room.pages.map((p) => ({ x: p.x, y: p.y, taken: false }));
    state.rings = [];
    state.noises = [];
    state.coinFlight = null;
    state.aim.active = false;
    // Each room grants its own coins on top of what Wren still carries.
    state.coins += COINS_PER_ROOM[index];
    state.introTtl = 2.6;
    state.banner = { title: room.intro, sub: '', ttl: 2.6, sticky: false };
  }

  function reset() {
    state.elapsed = 0;
    state.roomTime = 0;
    state.time = 0;
    state.alarms = 0;
    state.pagesGot = 0;
    state.coins = 0;
    state.coinsUsed = 0;
    state.ledgerTaken = false;
    state.escape = false;
    state.won = false;
    state.grade = '';
    state.feats = [];
    state.shadowTime = 0;
    state.maxMeter = 0;
    state.escapeAlarms = 0;
    state.flashTtl = 0;
    loadRoom(0, false);
  }

  function resetRoom() {
    // Soft reset after being caught: back to the room entrance, pages kept.
    const room = state.room;
    state.player.x = room.entrance.x;
    state.player.y = room.entrance.y;
    state.player.angle = -90;
    state.guards = room.guards.map((def) => createGuard(def, state.roomIndex, random));
    state.rings = [];
    state.noises = [];
    state.coinFlight = null;
    state.aim.active = false;
    state.flashTtl = 0.9;
    state.banner = { title: 'CAUGHT', sub: 'Back to the door — the pages are still yours', ttl: 1.6, sticky: false };
  }

  function exitOpen() {
    // Rooms 1 and 2 open their exit once every page of the room is taken.
    // Room 3 has no top exit: the entrance door opens only in the escape phase.
    if (state.roomIndex === 2) return state.escape;
    for (let i = 0; i < state.pages.length; i += 1) if (!state.pages[i].taken) return false;
    return true;
  }

  function computeGradeAndFeats() {
    const t = state.time;
    const grade = state.alarms === 0 && state.pagesGot === TOTAL_PAGES
      ? 'Ghost'
      : state.alarms === 0 ? 'Shadow' : t < TOTAL_PAR ? 'Phantom' : 'Night Clerk';
    const earned = {
      'never-seen': state.maxMeter < DETECTION.suspiciousAt,
      'no-alarms': state.alarms === 0,
      'all-pages': state.pagesGot === TOTAL_PAGES,
      'under-par': t < TOTAL_PAR,
      'coin-artist': state.coins > 0,
      'shadow-walker': state.shadowTime >= t * 0.5,
      'clean-escape': state.escapeAlarms === 0,
      'speed-archivist': t < 240,
    };
    return { grade, earned };
  }

  /**
   * One fixed step. `move` is the normalised steering vector, `sneak` the held
   * sneak key, `pointer` the mouse state. Returns EVENT_* bit flags.
   */
  function step(dt, move, sneak, pointer) {
    let events = 0;
    if (state.won) return events;
    state.elapsed += dt;
    state.time += dt;
    state.roomTime += dt;
    if (state.introTtl > 0) state.introTtl -= dt;
    if (state.flashTtl > 0) state.flashTtl -= dt;
    if (state.banner && !state.banner.sticky) {
      state.banner.ttl -= dt;
      if (state.banner.ttl <= 0) state.banner = null;
    }

    const p = state.player;
    const speed = sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const moving = move.x !== 0 || move.y !== 0;
    p.moving = moving;
    p.sneaking = sneak;
    if (moving) {
      p.angle = angleTo(0, 0, move.x, move.y);
      moveCircle(p, move.x * speed * dt, move.y * speed * dt, PLAYER.radius);
    }
    p.inShadow = inShadow(p.x, p.y);
    // Fully concealed: in shadow and no guard can see her right now.
    p.hidden = p.inShadow && !inCaptainLight(p.x, p.y);
    if (p.inShadow) state.shadowTime += dt;

    // Footsteps: walking on marble rings out; sneaking and carpet stay silent.
    if (moving && !sneak && !onCarpet(p.x, p.y)) {
      p.stepTimer -= dt;
      if (p.stepTimer <= 0) {
        p.stepTimer = SOUND.footstepInterval;
        emitNoise(p.x, p.y, SOUND.footstepRadius, 'step');
      }
    } else {
      p.stepTimer = 0;
    }

    // Coin aim: hold to preview, release to throw.
    if (pointer.aiming && state.coins > 0 && !state.coinFlight) {
      const dx = pointer.x - p.x;
      const dy = pointer.y - p.y;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, SOUND.throwRange);
      const scale = dist === 0 ? 0 : clamped / dist;
      state.aim.active = true;
      state.aim.x = p.x + dx * scale;
      state.aim.y = p.y + dy * scale;
    } else if (state.aim.active && !pointer.aiming) {
      // Released: the coin flies in an arc to the previewed landing point.
      state.coinFlight = {
        fromX: p.x, fromY: p.y, toX: state.aim.x, toY: state.aim.y, t: 0,
      };
      state.coins -= 1;
      state.coinsUsed += 1;
      state.aim.active = false;
      events |= EVENT_COIN;
    } else if (!pointer.aiming) {
      state.aim.active = false;
    }

    // A thrown coin lands with a ring every guard in earshot investigates.
    if (state.coinFlight) {
      const flight = state.coinFlight;
      flight.t += dt / SOUND.throwTime;
      if (flight.t >= 1) {
        emitNoise(flight.toX, flight.toY, SOUND.coinRadius, 'coin');
        state.coinFlight = null;
      }
    }

    // Decay rings and noises.
    for (let i = state.rings.length - 1; i >= 0; i -= 1) {
      state.rings[i].ttl -= dt;
      if (state.rings[i].ttl <= 0) state.rings.splice(i, 1);
    }
    for (let i = state.noises.length - 1; i >= 0; i -= 1) {
      state.noises[i].ttl -= dt;
      if (state.noises[i].ttl <= 0) state.noises.splice(i, 1);
    }

    // Guards: detection, patrol, investigation. A full meter means caught.
    let caught = false;
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      stepGuard(g, dt, {
        player: p,
        room: state.room,
        roomIndex: state.roomIndex,
        noises: state.noises,
        escape: state.escape,
        elapsed: state.elapsed,
        hasLOS,
        moveCircle,
        inShadow,
        inCaptainLight,
      });
      if (g.meter > state.maxMeter) state.maxMeter = g.meter;
      if (g.meter >= 100) caught = true;
    }

    if (caught) {
      state.alarms += 1;
      if (state.escape) state.escapeAlarms += 1;
      resetRoom();
      return events | EVENT_CAUGHT;
    }

    // Pages glow and pulse; walking over one takes it.
    for (let i = 0; i < state.pages.length; i += 1) {
      const page = state.pages[i];
      if (page.taken) continue;
      if (Math.hypot(p.x - page.x, p.y - page.y) < PLAYER.pickupRadius) {
        page.taken = true;
        state.pagesGot += 1;
        state.banner = {
          title: `PAGE ${state.pagesGot} OF ${TOTAL_PAGES}`,
          sub: state.pagesGot === TOTAL_PAGES ? 'Every page is yours' : '',
          ttl: 1.6, sticky: false,
        };
        events |= EVENT_PAGE;
        if (exitOpen()) events |= EVENT_UNLOCK;
      }
    }

    // The Ledger, on the dais under its glass dome, starts the escape phase.
    if (state.roomIndex === 2 && !state.ledgerTaken && state.room.ledger) {
      const ledger = state.room.ledger;
      if (Math.hypot(p.x - ledger.x, p.y - ledger.y) < PLAYER.pickupRadius) {
        state.ledgerTaken = true;
        state.pagesGot += 1;
        state.escape = true;
        state.banner = {
          title: 'THE LEDGER IS YOURS — NOW VANISH',
          sub: 'Cross the hall back to the entrance door, unseen',
          ttl: 3.2, sticky: true,
        };
        events |= EVENT_LEDGER | EVENT_UNLOCK;
      }
    }

    // Walking into an open exit door moves on — or wins the run.
    if (exitOpen()) {
      const exit = state.room.exit;
      if (Math.hypot(p.x - exit.x, p.y - exit.y) < PLAYER.doorRadius) {
        if (state.roomIndex === 2) {
          state.won = true;
          const result = computeGradeAndFeats();
          state.grade = result.grade;
          state.feats = result.earned;
          state.banner = null;
          return events | EVENT_WIN;
        }
        loadRoom(state.roomIndex + 1);
        return events | EVENT_ROOM;
      }
    }

    return events;
  }

  reset();

  return {
    state, reset, resetRoom, loadRoom, step, exitOpen, inShadow, onCarpet,
    inCaptainLight, hasLOS, moveCircle, emitNoise, pointInRect,
  };
}
