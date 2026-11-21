// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Everything is drawn live by the game — no external
// images, no text baked into images. The clarity layer comes first in the draw
// order: cones, ghost markers, the hidden glyph and the aim preview are never
// hidden behind scenery.

import {
  FIELD, FONT, PALETTE, TOTAL_FEATS, TOTAL_GUARDS, TOTAL_PAGES,
} from './config.js';
import { conePolygon, peripheralPolygon } from './world.js';
import { awareness, ghostOf, AWARE_ALERT, AWARE_SUSPICIOUS } from './guards.js';
import { doorRect } from './levels.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

const CARPET_COLORS = {
  burgundy: [PALETTE.carpetBurgundy, PALETTE.carpetBurgundyAlt],
  slate: [PALETTE.carpetSlate, PALETTE.carpetSlateAlt],
  green: [PALETTE.carpetGreen, PALETTE.carpetGreenAlt],
};

function guardColor(kind) {
  if (kind === 'scanner') return PALETTE.guardScanner;
  if (kind === 'captain') return PALETTE.guardCaptain;
  return PALETTE.guardPatroller;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    const key = `${size}`;
    if (!fonts.has(key)) fonts.set(key, `${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function circle(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  function polygon(points, fill, stroke) {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
    context.closePath();
    if (fill) {
      context.fillStyle = fill;
      context.fill();
    }
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = 1.5;
      context.stroke();
    }
  }

  // ------------------------------------------------------------ the room

  function drawFloor(state) {
    const room = state.room;
    context.fillStyle = PALETTE.floorMarble;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Marble checker, faint, so the two floor materials read at a glance.
    context.fillStyle = PALETTE.floorMarbleAlt;
    for (let y = 0; y < FIELD.height; y += 64) {
      for (let x = 0; x < FIELD.width; x += 64) {
        if (((x + y) / 64) % 2 === 0) context.fillRect(x, y, 64, 64);
      }
    }
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 64) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, FIELD.height); context.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 64) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(FIELD.width, y); context.stroke();
    }
    // Carpet zones: silent underfoot, drawn in the room's colour.
    const carpet = CARPET_COLORS[room.carpet] || CARPET_COLORS.burgundy;
    for (let i = 0; i < room.carpetZones.length; i += 1) {
      const z = room.carpetZones[i];
      context.fillStyle = carpet[0];
      context.fillRect(z.x, z.y, z.w, z.h);
      context.fillStyle = carpet[1];
      context.fillRect(z.x + 8, z.y + 8, z.w - 16, z.h - 16);
      context.strokeStyle = 'rgba(242, 201, 76, 0.25)';
      context.lineWidth = 2;
      context.strokeRect(z.x + 4, z.y + 4, z.w - 8, z.h - 8);
    }
    // The gold runner to the dais, Vault Hall only.
    if (room.runner) {
      const r = room.runner;
      context.fillStyle = PALETTE.runnerGold;
      context.fillRect(r.x, r.y, r.w, r.h);
      context.fillStyle = 'rgba(255, 220, 130, 0.35)';
      context.fillRect(r.x + 6, r.y, 4, r.h);
      context.fillRect(r.x + r.w - 10, r.y, 4, r.h);
    }
    // Shadow pools: dark, soft-edged, and unmistakable.
    for (let i = 0; i < room.shadow.length; i += 1) {
      const s = room.shadow[i];
      context.fillStyle = 'rgba(5, 7, 15, 0.52)';
      context.fillRect(s.x, s.y, s.w, s.h);
      context.strokeStyle = 'rgba(120, 160, 255, 0.28)';
      context.lineWidth = 2;
      context.setLineDash([8, 6]);
      context.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      context.setLineDash([]);
    }
    // Warm lamp pools on the floor.
    for (let i = 0; i < room.lamps.length; i += 1) {
      const lamp = room.lamps[i];
      const escape = state.escape;
      const grad = context.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, lamp.r);
      grad.addColorStop(0, escape ? 'rgba(255, 90, 60, 0.30)' : 'rgba(255, 179, 71, 0.26)');
      grad.addColorStop(1, 'rgba(255, 179, 71, 0)');
      context.fillStyle = grad;
      context.beginPath();
      context.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
      context.fill();
      // The sconce itself: a brass bracket with a flickering candle flame.
      const flicker = 0.75 + 0.25 * Math.sin(state.elapsed * 7 + lamp.x);
      context.fillStyle = '#8a6d2f';
      context.fillRect(lamp.x - 3, lamp.y - 2, 6, 12);
      circle(lamp.x, lamp.y - 6, 4 * flicker + 2, escape ? PALETTE.lampEscape : PALETTE.lampCore);
    }
  }

  function drawWalls(state) {
    const room = state.room;
    for (let i = 0; i < room.walls.length; i += 1) {
      const w = room.walls[i];
      context.fillStyle = PALETTE.wall;
      context.fillRect(w.x, w.y, w.w, w.h);
      context.fillStyle = PALETTE.wallTop;
      if (w.h <= 24) context.fillRect(w.x, w.y, w.w, 5);
      else context.fillRect(w.x, w.y, 5, w.h);
    }
  }

  function drawCover(state) {
    const room = state.room;
    for (let i = 0; i < room.cover.length; i += 1) {
      const c = room.cover[i];
      const isShelf = c.w < 70 && c.h > 100;
      const isPillar = c.w === 44 && c.h === 44;
      const isDais = !c.tall && c.w === 160;
      context.fillStyle = isPillar ? '#4a4238' : isDais ? '#5a4a26' : (isShelf ? PALETTE.shelfWood : PALETTE.coverWood);
      context.fillRect(c.x, c.y, c.w, c.h);
      context.fillStyle = isPillar ? '#6b6152' : isDais ? '#8a6d2f' : (isShelf ? PALETTE.shelfWoodTop : PALETTE.coverWoodTop);
      context.fillRect(c.x, c.y, c.w, 7);
      context.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      context.lineWidth = 2;
      context.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      if (isShelf) {
        // Book spines along the shelf.
        context.fillStyle = 'rgba(242, 201, 76, 0.5)';
        for (let y = c.y + 18; y < c.y + c.h - 8; y += 22) context.fillRect(c.x + 8, y, c.w - 16, 3);
      } else if (!isPillar && !isDais) {
        // Table: stacked books and a candle at each end.
        context.fillStyle = '#7a5a34';
        context.fillRect(c.x + 30, c.y + c.h / 2 - 6, 46, 12);
        context.fillRect(c.x + c.w - 76, c.y + c.h / 2 - 6, 46, 12);
        circle(c.x + 18, c.y + 14, 4, PALETTE.lampCore);
        circle(c.x + c.w - 18, c.y + 14, 4, PALETTE.lampCore);
      }
      if (isDais) {
        context.strokeStyle = 'rgba(242, 201, 76, 0.7)';
        context.lineWidth = 2;
        context.strokeRect(c.x + 5, c.y + 5, c.w - 10, c.h - 10);
      }
    }
  }

  function drawProps(state) {
    const room = state.room;
    for (let i = 0; i < room.props.length; i += 1) {
      const prop = room.props[i];
      if (prop.kind === 'lectern') {
        context.fillStyle = '#6b4a2c';
        context.beginPath();
        context.moveTo(prop.x - 16, prop.y + 12);
        context.lineTo(prop.x + 16, prop.y + 12);
        context.lineTo(prop.x, prop.y - 10);
        context.closePath();
        context.fill();
        context.fillRect(prop.x - 3, prop.y + 12, 6, 14);
      } else if (prop.kind === 'globe') {
        context.fillStyle = '#5a4630';
        context.fillRect(prop.x - 10, prop.y + 6, 20, 8);
        circle(prop.x, prop.y - 2, 12, '#3d6b8a');
        context.strokeStyle = '#9fe8ff';
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(prop.x, prop.y - 2, 12, -0.6, 1.2);
        context.stroke();
      } else if (prop.kind === 'books') {
        context.fillStyle = '#7a3b2e';
        context.fillRect(prop.x - 14, prop.y - 4, 28, 8);
        context.fillStyle = '#2e4a6b';
        context.fillRect(prop.x - 11, prop.y - 11, 24, 7);
        context.fillStyle = '#5a6b2e';
        context.fillRect(prop.x - 8, prop.y - 17, 18, 6);
      } else if (prop.kind === 'plant') {
        context.fillStyle = '#8a5a34';
        context.fillRect(prop.x - 10, prop.y - 2, 20, 14);
        context.fillStyle = '#2e5a34';
        circle(prop.x - 6, prop.y - 10, 8, '#2e5a34');
        circle(prop.x + 6, prop.y - 12, 9, '#3a6b40');
        circle(prop.x, prop.y - 16, 7, '#2e5a34');
      } else if (prop.kind === 'bench') {
        context.fillStyle = '#4a3421';
        context.fillRect(prop.x - 34, prop.y - 8, 68, 16);
        context.fillStyle = '#6b4a2c';
        context.fillRect(prop.x - 34, prop.y - 8, 68, 4);
      } else if (prop.kind === 'candle') {
        // A standing candle on the floor: brass stick, warm flame.
        context.fillStyle = '#8a6d2f';
        context.fillRect(prop.x - 2, prop.y - 2, 4, 14);
        const flicker = 0.75 + 0.25 * Math.sin(state.elapsed * 6 + prop.x);
        circle(prop.x, prop.y - 6, 3 * flicker + 2, PALETTE.lampCore);
      } else if (prop.kind === 'banner') {
        // A hanging house banner: deep red cloth, gold fringe and emblem.
        context.fillStyle = '#5a1f2b';
        context.fillRect(prop.x - 14, prop.y - 26, 28, 52);
        context.fillStyle = PALETTE.gold;
        context.fillRect(prop.x - 14, prop.y + 22, 28, 4);
        circle(prop.x, prop.y, 7, PALETTE.gold);
        context.fillStyle = '#5a1f2b';
        circle(prop.x, prop.y, 3.5, '#5a1f2b');
      } else if (prop.kind === 'rug') {
        // A small patterned rug: burgundy field, gold border.
        context.fillStyle = '#4a1f2b';
        context.fillRect(prop.x - 40, prop.y - 24, 80, 48);
        context.strokeStyle = 'rgba(242, 201, 76, 0.5)';
        context.lineWidth = 2;
        context.strokeRect(prop.x - 34, prop.y - 18, 68, 36);
        context.fillStyle = 'rgba(242, 201, 76, 0.4)';
        context.fillRect(prop.x - 4, prop.y - 4, 8, 8);
      } else if (prop.kind === 'dome') {
        context.strokeStyle = 'rgba(159, 232, 255, 0.8)';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(prop.x, prop.y + 4, 26, Math.PI, 0);
        context.stroke();
        context.fillStyle = 'rgba(159, 232, 255, 0.12)';
        context.beginPath();
        context.arc(prop.x, prop.y + 4, 26, Math.PI, 0);
        context.closePath();
        context.fill();
      }
    }
  }

  function drawPagesAndLedger(state) {
    const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 4);
    for (let i = 0; i < state.pages.length; i += 1) {
      const page = state.pages[i];
      if (page.taken) continue;
      const glow = context.createRadialGradient(page.x, page.y, 2, page.x, page.y, 34);
      glow.addColorStop(0, `rgba(255, 233, 168, ${0.55 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 233, 168, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(page.x, page.y, 34, 0, Math.PI * 2);
      context.fill();
      // A glowing page: a small parchment diamond with a folded corner.
      context.save();
      context.translate(page.x, page.y);
      context.rotate(Math.PI / 4);
      context.fillStyle = PALETTE.pageGlow;
      context.fillRect(-8, -8, 16, 16);
      context.fillStyle = PALETTE.pageGold;
      context.fillRect(-8, -8, 16, 4);
      context.restore();
      text('PAGE', page.x, page.y - 22, 11, PALETTE.pageGold, 'center');
    }
    if (state.roomIndex === 2 && !state.ledgerTaken && state.room.ledger) {
      const ledger = state.room.ledger;
      const glow = context.createRadialGradient(ledger.x, ledger.y, 2, ledger.x, ledger.y, 48);
      glow.addColorStop(0, `rgba(159, 232, 255, ${0.6 * pulse})`);
      glow.addColorStop(1, 'rgba(159, 232, 255, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(ledger.x, ledger.y, 48, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#1d3a5a';
      context.fillRect(ledger.x - 14, ledger.y - 10, 28, 20);
      context.fillStyle = PALETTE.ledgerGlow;
      context.fillRect(ledger.x - 14, ledger.y - 10, 28, 4);
      context.fillStyle = PALETTE.gold;
      context.fillRect(ledger.x - 2, ledger.y - 6, 4, 12);
      text('THE LEDGER', ledger.x, ledger.y - 34, 12, PALETTE.ledgerGlow, 'center');
    }
  }

  function drawDoors(state) {
    const room = state.room;
    // Exit door (top, rooms 1-2) or the entrance door (room 3 escape).
    const exit = doorRect(room, 'exit');
    const exitOpen = state.roomIndex === 2 ? state.escape : (() => {
      for (let i = 0; i < state.pages.length; i += 1) if (!state.pages[i].taken) return false;
      return true;
    })();
    drawDoor(exit, exitOpen, 'EXIT');
    const entrance = doorRect(room, 'entrance');
    drawDoor(entrance, true, 'IN');
  }

  function drawDoor(rect, open, label) {
    context.fillStyle = PALETTE.doorWood;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (open) {
      context.fillStyle = 'rgba(126, 226, 160, 0.35)';
      context.fillRect(rect.x, rect.y, rect.w, rect.h);
      context.strokeStyle = PALETTE.exitOpen;
      context.lineWidth = 2;
      context.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      text(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 4, 12, PALETTE.exitOpen, 'center');
    } else {
      // Sealed: a padlock alone says it — no text, so nothing collides with
      // the HUD above a top door or the title panel.
      context.strokeStyle = PALETTE.exitSealed;
      context.lineWidth = 2;
      context.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      context.fillStyle = PALETTE.exitSealed;
      context.fillRect(cx - 6, cy - 1, 12, 9);
      context.strokeStyle = PALETTE.exitSealed;
      context.beginPath();
      context.arc(cx, cy - 1, 5, Math.PI, 0);
      context.stroke();
    }
  }

  // ------------------------------------------------------------ the living

  function drawCones(state) {
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      const aware = awareness(g);
      const fill = aware === AWARE_ALERT ? PALETTE.coneAlert
        : aware === AWARE_SUSPICIOUS ? PALETTE.coneSuspicious : PALETTE.coneCalm;
      const edge = aware === AWARE_ALERT ? PALETTE.coneAlertEdge
        : aware === AWARE_SUSPICIOUS ? PALETTE.coneSuspiciousEdge : PALETTE.coneCalmEdge;
      polygon(peripheralPolygon(g, state.room), PALETTE.conePeripheral, null);
      polygon(conePolygon(g, state.room, state.escape), fill, edge);
    }
  }

  function drawGhosts(state) {
    for (let i = 0; i < state.guards.length; i += 1) {
      const ghost = ghostOf(state.guards[i]);
      if (!ghost) continue;
      // A faint silhouette at the last seen position, with a small "?" over it.
      context.save();
      context.globalAlpha = 0.55;
      circle(ghost.x, ghost.y, 13, PALETTE.ghost);
      context.globalAlpha = 1;
      context.restore();
      context.strokeStyle = PALETTE.ghost;
      context.lineWidth = 2;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.arc(ghost.x, ghost.y, 16, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      text('?', ghost.x, ghost.y - 20, 18, PALETTE.ghost, 'center');
    }
  }

  function drawGuards(state) {
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      const aware = awareness(g);
      const color = guardColor(g.kind);
      // The captain's lamp throws a moving pool of light around him.
      if (g.kind === 'captain') {
        const grad = context.createRadialGradient(g.x, g.y, 6, g.x, g.y, 130);
        grad.addColorStop(0, state.escape ? 'rgba(255, 90, 60, 0.22)' : 'rgba(255, 196, 107, 0.22)');
        grad.addColorStop(1, 'rgba(255, 196, 107, 0)');
        context.fillStyle = grad;
        context.beginPath();
        context.arc(g.x, g.y, 130, 0, Math.PI * 2);
        context.fill();
      }
      // Body: a circle with a facing nose and, for the captain, a helmet plume.
      circle(g.x, g.y, GUARD_RADIUS, color);
      context.fillStyle = 'rgba(0, 0, 0, 0.35)';
      const rad = (g.angle * Math.PI) / 180;
      context.beginPath();
      context.moveTo(g.x + Math.cos(rad) * 8, g.y + Math.sin(rad) * 8);
      context.lineTo(g.x + Math.cos(rad + 2.4) * 12, g.y + Math.sin(rad + 2.4) * 12);
      context.lineTo(g.x + Math.cos(rad - 2.4) * 12, g.y + Math.sin(rad - 2.4) * 12);
      context.closePath();
      context.fill();
      if (g.kind === 'captain') {
        context.fillStyle = PALETTE.gold;
        circle(g.x, g.y - 10, 4, PALETTE.gold);
        context.fillRect(g.x - 2, g.y - 20, 4, 10);
      }
      if (g.kind === 'scanner') {
        // The Scanner wears a visor: a bright band across its face.
        context.strokeStyle = 'rgba(159, 232, 255, 0.9)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(g.x - 8, g.y - 4);
        context.lineTo(g.x + 8, g.y - 4);
        context.stroke();
      }
      // The detection eye arc over the guard: a ring that fills with the meter.
      if (g.meter > 1) {
        context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        context.lineWidth = 4;
        context.beginPath();
        context.arc(g.x, g.y - 24, 11, 0, Math.PI * 2);
        context.stroke();
        context.strokeStyle = aware === AWARE_ALERT ? PALETTE.red : PALETTE.amber;
        context.lineWidth = 4;
        context.beginPath();
        context.arc(g.x, g.y - 24, 11, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.meter) / 100);
        context.stroke();
      }
      // Awareness icons: amber "?" when suspicious, red "!" when alert.
      if (aware === AWARE_SUSPICIOUS) text('?', g.x, g.y - 34, 22, PALETTE.amber, 'center');
      else if (aware === AWARE_ALERT) text('!', g.x, g.y - 34, 24, PALETTE.red, 'center');
    }
  }

  const GUARD_RADIUS = 14;

  function drawPlayer(state) {
    const p = state.player;
    const inShadow = p.inShadow;
    // Wren in shadow is a dark silhouette with a teal rim light; in lamplight
    // she is a bright teal hood. The change is the binary light rule, readable.
    if (inShadow) {
      circle(p.x, p.y, 13, PALETTE.playerShadow);
      context.strokeStyle = PALETTE.playerRim;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(p.x, p.y, 13, 0, Math.PI * 2);
      context.stroke();
    } else {
      circle(p.x, p.y, 13, PALETTE.player);
      context.fillStyle = 'rgba(255, 255, 255, 0.55)';
      circle(p.x - 4, p.y - 4, 4, 'rgba(255, 255, 255, 0.55)');
    }
    // Hood point in the facing direction.
    const rad = (p.angle * Math.PI) / 180;
    context.fillStyle = inShadow ? PALETTE.playerRim : '#0d7a6e';
    context.beginPath();
    context.moveTo(p.x + Math.cos(rad) * 15, p.y + Math.sin(rad) * 15);
    context.lineTo(p.x + Math.cos(rad + 2.5) * 9, p.y + Math.sin(rad + 2.5) * 9);
    context.lineTo(p.x + Math.cos(rad - 2.5) * 9, p.y + Math.sin(rad - 2.5) * 9);
    context.closePath();
    context.fill();
    // The hidden glyph: a small drawn crescent over Wren when fully concealed.
    if (p.hidden) {
      context.fillStyle = '#9fe8ff';
      context.beginPath();
      context.arc(p.x, p.y - 26, 8, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(5, 7, 15, 0.9)';
      context.beginPath();
      context.arc(p.x + 4, p.y - 28, 7, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawCoinFlight(state) {
    const flight = state.coinFlight;
    if (!flight) return;
    const t = flight.t;
    const x = flight.fromX + (flight.toX - flight.fromX) * t;
    const y = flight.fromY + (flight.toY - flight.fromY) * t - Math.sin(t * Math.PI) * 46;
    circle(flight.toX, flight.toY, 4, 'rgba(242, 201, 76, 0.4)');
    circle(x, y, 7, PALETTE.pageGold);
    context.strokeStyle = PALETTE.pageGold;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, 7, 0, Math.PI * 2);
    context.stroke();
  }

  function drawAimPreview(state) {
    const aim = state.aim;
    if (!aim.active) return;
    const p = state.player;
    // Dotted arc from Wren to the landing point, then the landing marker and
    // the exact noise ring the throw will make. Nothing about the throw is a guess.
    const mx = (p.x + aim.x) / 2;
    const my = (p.y + aim.y) / 2 - 40;
    context.strokeStyle = PALETTE.pageGold;
    context.lineWidth = 2;
    context.setLineDash([2, 8]);
    context.beginPath();
    context.moveTo(p.x, p.y);
    context.quadraticCurveTo(mx, my, aim.x, aim.y);
    context.stroke();
    context.setLineDash([]);
    context.strokeStyle = 'rgba(242, 201, 76, 0.9)';
    context.beginPath();
    context.arc(aim.x, aim.y, 10, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(aim.x - 5, aim.y);
    context.lineTo(aim.x + 5, aim.y);
    context.moveTo(aim.x, aim.y - 5);
    context.lineTo(aim.x, aim.y + 5);
    context.stroke();
    context.strokeStyle = PALETTE.coinRing;
    context.setLineDash([6, 6]);
    context.beginPath();
    context.arc(aim.x, aim.y, 260, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    text('NOISE 260', aim.x, aim.y - 268, 11, PALETTE.coinRing, 'center');
  }

  function drawRings(state) {
    for (let i = 0; i < state.rings.length; i += 1) {
      const ring = state.rings[i];
      const progress = 1 - ring.ttl / ring.maxTtl;
      const radius = ring.r + (ring.maxR - ring.r) * progress;
      context.strokeStyle = ring.kind === 'coin' ? PALETTE.coinRing : PALETTE.ring;
      context.globalAlpha = 0.7 * (1 - progress);
      context.lineWidth = 2;
      context.beginPath();
      context.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------ HUD & screens

  function topMeter(state) {
    let top = 0;
    for (let i = 0; i < state.guards.length; i += 1) {
      if (state.guards[i].meter > top) top = state.guards[i].meter;
    }
    return top;
  }

  function drawHud(state, muted) {
    const room = state.room;
    // Top bar: room name and room dots, pages, coins, alarms.
    text(`${room.name.toUpperCase()}`, 24, 30, 18, PALETTE.text, 'left', 'top');
    for (let i = 0; i < 3; i += 1) {
      circle(30 + i * 22, 48, 5, i === state.roomIndex ? PALETTE.gold : (i < state.roomIndex ? PALETTE.green : '#3a4258'));
    }
    text(`PAGES ${state.pagesGot}/${TOTAL_PAGES}`, 480, 30, 18, PALETTE.pageGold, 'center', 'top');
    text(`COINS ${state.coins}`, 640, 30, 18, PALETTE.text, 'center', 'top');
    text(`ALARMS ${state.alarms}`, 800, 30, 18, state.alarms > 0 ? PALETTE.red : PALETTE.text, 'center', 'top');
    if (muted) text('MUTED', 1256, 30, 14, PALETTE.muted, 'right', 'top');
    // The top detection bar: the most-aware guard's meter, slim, always visible.
    const meter = topMeter(state);
    const barW = 320;
    const barX = (FIELD.width - barW) / 2;
    context.fillStyle = 'rgba(0, 0, 0, 0.55)';
    context.fillRect(barX - 4, 52, barW + 8, 12);
    context.fillStyle = meter >= 70 ? PALETTE.red : meter >= 35 ? PALETTE.amber : '#3a4258';
    context.fillRect(barX, 54, barW * (meter / 100), 8);
    context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    context.lineWidth = 1;
    context.strokeRect(barX - 4, 52, barW + 8, 12);
    text('SEEN', barX - 10, 60, 11, PALETTE.muted, 'right', 'top');
    // One-line contextual hint, changing per room and phase. It sits just
    // above the bottom wall so it never covers the entrance door.
    const hint = state.escape
      ? 'You have the Ledger. Cross back in shadow'
      : room.hint;
    text(hint, FIELD.width / 2, FIELD.height - 44, 15, PALETTE.muted, 'center', 'top');
    text('WASD move · Shift sneak · hold mouse to aim a coin · P pause · R restart · M mute', FIELD.width - 24, FIELD.height - 44, 12, PALETTE.dim, 'right', 'top');
  }

  function drawBanner(state) {
    const banner = state.banner;
    if (!banner) return;
    const escape = state.escape && banner.title.indexOf('LEDGER') !== -1;
    context.fillStyle = escape ? 'rgba(60, 8, 4, 0.88)' : 'rgba(10, 13, 24, 0.88)';
    const w = 860;
    const h = banner.sub ? 92 : 66;
    context.fillRect((FIELD.width - w) / 2, 84, w, h);
    context.strokeStyle = escape ? PALETTE.red : PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect((FIELD.width - w) / 2, 84, w, h);
    text(banner.title, FIELD.width / 2, 84 + (banner.sub ? 44 : 42), escape ? 30 : 26, escape ? '#ffb0a0' : PALETTE.text, 'center');
    if (banner.sub) text(banner.sub, FIELD.width / 2, 84 + 74, 16, PALETTE.muted, 'center');
  }

  function drawPanel(title, lines, prompt, titleColor) {
    const width = 760;
    const lineH = 30;
    const height = 150 + lines.length * lineH;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);
    text(title, FIELD.width / 2, y + 62, 44, titleColor || PALETTE.text, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 112 + i * lineH, 19, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 30, 20, PALETTE.gold, 'center');
  }

  function drawTitle(state, best) {
    // The archive's Reading Room shows behind a dark veil.
    context.fillStyle = 'rgba(5, 7, 15, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const x = 190;
    const w = 900;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, 36, w, 648);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, 36, w, 648);
    text('NIGHT LEDGER', FIELD.width / 2, 108, 56, PALETTE.gold, 'center');
    text('Wren, a young archivist, slips through a moonlit archive to steal back the stolen Night Ledger.', FIELD.width / 2, 142, 16, PALETTE.text, 'center');
    // The quantified header strip: every count the game offers, up front.
    text('3 rooms  ·  9 guards  ·  5 pages  ·  8 coins  ·  3 guard kinds  ·  8 feats', FIELD.width / 2, 178, 18, PALETTE.teal, 'center');
    context.strokeStyle = PALETTE.panelEdge;
    context.beginPath();
    context.moveTo(x + 40, 196);
    context.lineTo(x + w - 40, 196);
    context.stroke();
    text('GOAL — take every ledger page, steal the Ledger from the Vault Hall, and leave unseen.', FIELD.width / 2, 226, 16, PALETTE.text, 'center');
    text('WIN — reach the entrance door with the Ledger.  LOSE — a guard\'s meter fills and you are caught.', FIELD.width / 2, 252, 16, PALETTE.text, 'center');
    text('WASD / arrows move · Shift sneak · hold left mouse to aim a coin, release to throw', FIELD.width / 2, 288, 16, PALETTE.muted, 'center');
    text('P pause · R restart room · M mute · Enter or click to begin', FIELD.width / 2, 314, 16, PALETTE.muted, 'center');
    context.strokeStyle = PALETTE.panelEdge;
    context.beginPath();
    context.moveTo(x + 40, 336);
    context.lineTo(x + w - 40, 336);
    context.stroke();
    // The bestiary: the three guard kinds and their cone traits.
    text('THE WATCH', FIELD.width / 2, 366, 18, PALETTE.gold, 'center');
    const kinds = [
      ['Patroller', 'crimson · walks loops, pauses to look · 200 px cone'],
      ['Scanner', 'indigo · stands and sweeps 120° · 240 px cone, never moves'],
      ['Lantern Captain', 'crimson + brass lamp · 170 px cone · no shadow inside its light'],
    ];
    for (let i = 0; i < kinds.length; i += 1) {
      text(`${kinds[i][0]} — ${kinds[i][1]}`, FIELD.width / 2, 396 + i * 26, 15, PALETTE.text, 'center');
    }
    context.strokeStyle = PALETTE.panelEdge;
    context.beginPath();
    context.moveTo(x + 40, 486);
    context.lineTo(x + w - 40, 486);
    context.stroke();
    // The grade list, so the player knows what a perfect run is called.
    text('GRADES — Ghost (no alarms, all pages) · Shadow (no alarms) · Phantom (under 315s) · Night Clerk', FIELD.width / 2, 516, 15, PALETTE.muted, 'center');
    text('8 feats on the victory screen: Never Seen · No Alarms · All Five Pages · Under Par · Coin Artist', FIELD.width / 2, 542, 15, PALETTE.muted, 'center');
    text('Shadow Walker · Clean Escape · Speed Archivist', FIELD.width / 2, 568, 15, PALETTE.muted, 'center');
    if (best) text(`Best grade so far: ${best}`, FIELD.width / 2, 606, 16, PALETTE.green, 'center');
    text('Press Enter or click to begin', FIELD.width / 2, 646, 20, PALETTE.gold, 'center');
  }

  function drawVictory(state) {
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60);
    const timeText = `${mins}:${String(secs).padStart(2, '0')}`;
    const shadowPct = state.time > 0 ? Math.round((state.shadowTime / state.time) * 100) : 0;
    const x = 240;
    const w = 800;
    const h = 560;
    const y = (FIELD.height - h) / 2;
    context.fillStyle = 'rgba(5, 7, 15, 0.75)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, w, h);
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.strokeRect(x, y, w, h);
    text('THE LEDGER IS SAFE', FIELD.width / 2, y + 58, 40, PALETTE.gold, 'center');
    text(`Grade: ${state.grade}`, FIELD.width / 2, y + 104, 28, PALETTE.text, 'center');
    text(`Time ${timeText}  ·  Alarms ${state.alarms}  ·  Pages ${state.pagesGot}/${TOTAL_PAGES}  ·  Shadow ${shadowPct}%  ·  Coins left ${state.coins}`, FIELD.width / 2, y + 140, 16, PALETTE.muted, 'center');
    text('FEATS', FIELD.width / 2, y + 178, 18, PALETTE.gold, 'center');
    const defs = [
      ['never-seen', 'Never Seen — no guard ever grew suspicious'],
      ['no-alarms', 'No Alarms — finished without being caught once'],
      ['all-pages', 'All Five Pages — collected every ledger page'],
      ['under-par', 'Under Par — finished inside 315 seconds'],
      ['coin-artist', 'Coin Artist — finished with coins to spare'],
      ['shadow-walker', 'Shadow Walker — half the run spent in shadow'],
      ['clean-escape', 'Clean Escape — no alarm during the escape'],
      ['speed-archivist', 'Speed Archivist — finished inside 240 seconds'],
    ];
    for (let i = 0; i < defs.length; i += 1) {
      const earned = state.feats && state.feats[defs[i][0]];
      text(`${earned ? '★' : '☆'}  ${defs[i][1]}`, FIELD.width / 2, y + 208 + i * 26, 15, earned ? PALETTE.text : PALETTE.dim, 'center');
    }
    text(`${TOTAL_GUARDS} guards · ${TOTAL_PAGES} pages · ${TOTAL_FEATS} feats — press Enter to play again`, FIELD.width / 2, y + h - 36, 16, PALETTE.gold, 'center');
  }

  function drawField(state) {
    drawFloor(state);
    drawProps(state);
    drawPagesAndLedger(state);
    drawDoors(state);
    drawCones(state);
    drawGhosts(state);
    drawCover(state);
    drawGuards(state);
    drawPlayer(state);
    drawCoinFlight(state);
    drawAimPreview(state);
    drawRings(state);
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.textBaseline = 'alphabetic';
    if (screen === SCREEN_TITLE) {
      drawField(state);
      drawTitle(state, best);
      return;
    }
    drawField(state);
    if (screen === SCREEN_VICTORY) {
      drawVictory(state);
      return;
    }
    drawHud(state, muted);
    drawBanner(state);
    if (state.flashTtl > 0) {
      context.fillStyle = `rgba(255, 30, 30, ${0.35 * (state.flashTtl / 0.9)})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The archive waits for you.'], 'Press P or Enter to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Caught', [`Alarms: ${state.alarms}`, `Pages kept: ${state.pagesGot} of ${TOTAL_PAGES}`], 'Press Enter to try the room again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
