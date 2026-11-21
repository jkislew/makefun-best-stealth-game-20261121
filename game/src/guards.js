// Guard behaviour: three kinds, three awareness levels, one readable rule —
// if a guard's behaviour changes, the player can always tell what caused it.
// A guard fills a 0-100 detection meter when Wren is inside its vision cone
// (or its short peripheral wedge) with a clear line of sight; the fill speed is
// a readable formula of distance, light, posture and motion. When sight is lost
// the guard walks to a ghost marker at her last seen position, looks around,
// then gives up back to patrol. Sounds pull guards to the noise point the same
// way. Nothing here draws anything; the renderer reads these fields.

import { DETECTION, GUARD } from './config.js';
import { angleDiff, angleTo } from './world.js';

/** Awareness levels, derived from the meter. */
export const AWARE_CALM = 0;
export const AWARE_SUSPICIOUS = 1;
export const AWARE_ALERT = 2;

/**
 * The ghost marker a guard walks to: its last seen position, shown while it
 * investigates or looks around. Null when there is nothing to walk to.
 */
export function ghostOf(guard) {
  if (guard.state === 'investigate' || guard.state === 'look' || guard.state === 'suspicious') {
    return guard.lastSeen;
  }
  return null;
}

/** One-word label for the guard's current behaviour, for debugging and tests. */
export function guardLabel(guard) {
  if (guard.meter >= DETECTION.alertAt) return 'alert';
  if (guard.meter >= DETECTION.suspiciousAt) return 'suspicious';
  return guard.state;
}

export function awareness(guard) {
  if (guard.meter >= DETECTION.alertAt) return AWARE_ALERT;
  if (guard.meter >= DETECTION.suspiciousAt) return AWARE_SUSPICIOUS;
  return AWARE_CALM;
}

export function createGuard(def, roomIndex, random) {
  const kind = def.kind;
  return {
    kind,
    x: def.x,
    y: def.y,
    angle: def.angle,
    baseAngle: def.baseAngle ?? def.angle,
    coneLength: GUARD.coneLength[kind],
    coneHalf: GUARD.coneHalf[kind],
    waypoints: (def.waypoints || []).map((w) => ({ x: w[0], y: w[1] })),
    wpIndex: 0,
    pauseTimer: 0,
    state: kind === 'scanner' ? 'scan' : 'patrol',
    meter: 0,
    lastSeen: null,
    target: null,
    lookTimer: 0,
    sweepT: random() * 6,
    heardId: 0,
    loseTimer: 0,
    speed: GUARD.patrolSpeed[roomIndex],
    roomIndex,
  };
}

function faceToward(guard, x, y) {
  guard.angle = angleTo(guard.x, guard.y, x, y);
}

function moveToward(guard, dt, tx, ty, speed, moveCircle) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  faceToward(guard, tx, ty);
  const step = Math.min(dist, speed * dt);
  moveCircle(guard, (dx / dist) * step, (dy / dist) * step, GUARD.radius);
  return dist - step < 8;
}

/**
 * One fixed step for one guard. `env` carries the player, the room, the live
 * noises and the world's geometry helpers. Detection runs first; the state
 * machine moves second.
 */
export function stepGuard(g, dt, env) {
  const p = env.player;
  const dx = p.x - g.x;
  const dy = p.y - g.y;
  const dist = Math.hypot(dx, dy);
  const coneLen = g.coneLength * (env.escape ? GUARD.escapeConeMul : 1);
  const speed = g.speed * (env.escape ? GUARD.escapeSpeedMul : 1);
  const facing = Math.abs(angleDiff(angleTo(g.x, g.y, p.x, p.y), g.angle));

  const inCone = dist < coneLen && facing < g.coneHalf;
  const inPeripheral = dist < GUARD.peripheralRadius && facing < GUARD.peripheralHalf;
  const seen = (inCone || inPeripheral) && env.hasLOS(g.x, g.y, p.x, p.y);

  if (seen) {
    g.lastSeen = { x: p.x, y: p.y };
    g.loseTimer = 0;
    if (inCone) {
      // Gradual detection: closer fills faster, shadow halves it (unless the
      // captain's lamp light covers her), sneaking slows it, moving quickens it.
      const distFactor = DETECTION.closeMul
        + (DETECTION.farMul - DETECTION.closeMul) * Math.min(1, dist / coneLen);
      let factor = distFactor;
      if (env.inShadow(p.x, p.y) && !env.inCaptainLight(p.x, p.y)) factor *= DETECTION.shadowMul;
      factor *= p.sneaking ? DETECTION.sneakMul : 1;
      factor *= p.moving ? DETECTION.movingMul : DETECTION.stillMul;
      const fillTime = DETECTION.fillSeconds[env.roomIndex];
      g.meter = Math.min(100, g.meter + (100 / fillTime) * factor * dt);
    } else {
      // Peripheral vision is slow: standing shoulder-to-shoulder is not invisibility.
      g.meter = Math.min(100, g.meter + GUARD.peripheralFill * dt);
    }
  } else {
    g.meter = Math.max(0, g.meter - DETECTION.drainPerSecond * dt);
    g.loseTimer += dt;
  }

  const aware = awareness(g);

  // Hearing: a noise inside earshot (halved through a wall) pulls the guard to
  // the point — unless it is already chasing a player it can see.
  if (aware !== AWARE_ALERT || !seen) {
    for (let i = 0; i < env.noises.length; i += 1) {
      const noise = env.noises[i];
      if (noise.id === g.heardId) continue;
      const nd = Math.hypot(noise.x - g.x, noise.y - g.y);
      const heard = env.hasLOS(g.x, g.y, noise.x, noise.y)
        ? nd < noise.r
        : nd < noise.r * 0.5;
      if (heard) {
        g.heardId = noise.id;
        if (g.state !== 'alert') {
          g.state = 'investigate';
          g.target = { x: noise.x, y: noise.y };
          g.lastSeen = { x: noise.x, y: noise.y };
        }
      }
    }
  }

  // --- state machine -------------------------------------------------------
  if (aware === AWARE_ALERT && seen) {
    // Full chase while Wren is visible.
    g.state = 'alert';
    moveToward(g, dt, p.x, p.y, GUARD.chaseSpeed * (env.escape ? GUARD.escapeSpeedMul : 1), env.moveCircle);
    return;
  }
  if (g.state === 'alert' && !seen) {
    // Lost her mid-chase: go to the ghost marker at her last seen spot.
    g.state = 'investigate';
    g.target = g.lastSeen ? { x: g.lastSeen.x, y: g.lastSeen.y } : { x: g.x, y: g.y };
  }

  if (g.state === 'suspicious' || (aware === AWARE_SUSPICIOUS && seen)) {
    // Suspicious: stop, face her, and watch. Lose her for a while and go look.
    g.state = 'suspicious';
    if (seen) faceToward(g, p.x, p.y);
    if (!seen && g.loseTimer > 1.2) {
      g.state = 'investigate';
      g.target = g.lastSeen ? { x: g.lastSeen.x, y: g.lastSeen.y } : { x: g.x, y: g.y };
    }
    return;
  }

  if (g.state === 'investigate') {
    const target = g.target || { x: g.x, y: g.y };
    if (g.kind === 'scanner') {
      // The Scanner never walks: it turns to the point and studies it.
      faceToward(g, target.x, target.y);
      g.lookTimer += dt;
      if (g.lookTimer > GUARD.lookAroundTime) {
        g.lookTimer = 0;
        g.state = 'scan';
        g.meter = 0;
      }
      return;
    }
    const arrived = moveToward(g, dt, target.x, target.y, GUARD.investigateSpeed, env.moveCircle);
    if (arrived) {
      g.state = 'look';
      g.lookTimer = 0;
    }
    return;
  }

  if (g.state === 'look') {
    // At the ghost marker: turn slowly, scanning, then give up.
    g.lookTimer += dt;
    g.angle += 55 * dt;
    if (g.angle > 180) g.angle -= 360;
    if (g.lookTimer > GUARD.lookAroundTime) {
      g.lookTimer = 0;
      g.state = g.kind === 'scanner' ? 'scan' : 'patrol';
      g.meter = 0;
      g.target = null;
    }
    return;
  }

  if (g.state === 'scan') {
    // The Scanner sweeps its cone back and forth through its arc.
    g.sweepT += dt;
    g.angle = g.baseAngle + GUARD.sweepHalf * Math.sin(g.sweepT * 0.7);
    return;
  }

  // Patrol: walk the waypoint loop, pausing at each point to look around.
  if (g.pauseTimer > 0) {
    g.pauseTimer -= dt;
    g.angle += 30 * dt;
    if (g.angle > 180) g.angle -= 360;
    return;
  }
  const wp = g.waypoints[g.wpIndex];
  if (!wp) return;
  const arrived = moveToward(g, dt, wp.x, wp.y, speed, env.moveCircle);
  if (arrived) {
    g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
    g.pauseTimer = GUARD.waypointPause;
  }
}
