// Level data for the three rooms of NIGHT LEDGER. Pure data: no drawing, no
// rules. Walls are solid rectangles with gaps where the doors are; tall cover
// blocks movement and line of sight, low cover blocks movement only; shadow
// pools halve detection; carpet zones are silent underfoot and everything else
// is marble. Coordinates are in the fixed 1280x720 playfield.
//
// Room 1, The Reading Room — teaches sight and cover. Two Patrollers on long,
// slow loops with generous pauses; the single page sits on a lectern where the
// first guard's cone sweeps across it, so the player learns to move on the sweep.
// Room 2, The Stacks — teaches sound and distraction. A Scanner holds the
// centre junction, shelf rows make a maze, and marble lanes between the shelves
// ring out under walking feet.

import { FIELD } from './config.js';

const WALL = 24;

function borderWalls(exitTop) {
  // Outer walls with a door gap at the bottom centre (the entrance) and, where
  // the room has one, a door gap at the top centre (the exit).
  const walls = [
    { x: 0, y: 696, w: 600, h: WALL },
    { x: 680, y: 696, w: 600, h: WALL },
    { x: 0, y: 0, w: WALL, h: 720 },
    { x: 1256, y: 0, w: WALL, h: 720 },
  ];
  if (exitTop) {
    walls.push({ x: 0, y: 0, w: 600, h: WALL });
    walls.push({ x: 680, y: 0, w: 600, h: WALL });
  } else {
    walls.push({ x: 0, y: 0, w: 1280, h: WALL });
  }
  return walls;
}

const ROOM_1 = {
  name: 'The Reading Room',
  par: 75,
  carpet: 'burgundy',
  hint: 'The sweep is coming — stay behind the tables',
  intro: 'ROOM 1 — THE READING ROOM · 1 page · 2 guards · par 75s',
  walls: borderWalls(true),
  // Four long reading tables: tall cover, the room's sight-lines are cut by them.
  cover: [
    { x: 180, y: 220, w: 340, h: 56, tall: true },
    { x: 760, y: 220, w: 340, h: 56, tall: true },
    { x: 180, y: 430, w: 340, h: 56, tall: true },
    { x: 760, y: 430, w: 340, h: 56, tall: true },
    { x: 60, y: 300, w: 44, h: 180, tall: true },
    { x: 1176, y: 300, w: 44, h: 180, tall: true },
  ],
  // Burgundy carpet fills the middle; a marble border frames the room.
  carpetZones: [{ x: 100, y: 90, w: 1080, h: 540 }],
  shadow: [
    { x: 120, y: 80, w: 150, h: 90 },
    { x: 1010, y: 80, w: 150, h: 90 },
    { x: 560, y: 560, w: 160, h: 100 },
    { x: 1010, y: 520, w: 150, h: 90 },
    // The tables throw shadow on their far side: hiding behind one is real cover.
    { x: 180, y: 276, w: 340, h: 40 },
    { x: 760, y: 276, w: 340, h: 40 },
    { x: 180, y: 486, w: 340, h: 40 },
    { x: 760, y: 486, w: 340, h: 40 },
  ],
  lamps: [
    { x: 320, y: 180, r: 110 },
    { x: 960, y: 180, r: 110 },
    { x: 320, y: 500, r: 110 },
    { x: 960, y: 500, r: 110 },
  ],
  pages: [{ x: 640, y: 118 }],
  ledger: null,
  entrance: { x: 640, y: 640 },
  exit: { x: 640, y: 12 },
  guards: [
    {
      kind: 'patroller', x: 300, y: 150, angle: 0,
      waypoints: [[300, 150], [980, 150], [980, 320], [300, 320]],
    },
    {
      kind: 'patroller', x: 300, y: 560, angle: 0,
      waypoints: [[300, 560], [980, 560], [980, 380], [300, 380]],
    },
  ],
  props: [
    { kind: 'lectern', x: 640, y: 118 },
    { kind: 'globe', x: 150, y: 640 },
    { kind: 'books', x: 1120, y: 640 },
    { kind: 'plant', x: 90, y: 90 },
    { kind: 'plant', x: 1190, y: 90 },
    { kind: 'books', x: 640, y: 340 },
    { kind: 'bench', x: 640, y: 620 },
    { kind: 'candle', x: 130, y: 340 },
    { kind: 'candle', x: 1150, y: 340 },
    { kind: 'banner', x: 640, y: 60 },
    { kind: 'rug', x: 640, y: 380 },
  ],
};

const ROOM_2 = {
  name: 'The Stacks',
  par: 110,
  carpet: 'slate',
  hint: 'Marble carries sound. Sneak, or throw a coin',
  intro: 'ROOM 2 — THE STACKS · 2 pages · 3 guards · par 110s',
  walls: borderWalls(true),
  // Three shelf columns in two segments each; the gaps make the middle lane and
  // the top and bottom bands. The vertical lanes between columns are marble.
  cover: [
    { x: 300, y: 90, w: 56, h: 190, tall: true },
    { x: 300, y: 400, w: 56, h: 190, tall: true },
    { x: 560, y: 90, w: 56, h: 190, tall: true },
    { x: 560, y: 400, w: 56, h: 190, tall: true },
    { x: 820, y: 90, w: 56, h: 190, tall: true },
    { x: 820, y: 400, w: 56, h: 190, tall: true },
  ],
  // Carpet in the side corridors, the middle lane and the top and bottom bands;
  // the lanes between the shelves stay bare marble, where feet ring out.
  carpetZones: [
    { x: 24, y: 90, w: 240, h: 540 },
    { x: 1016, y: 90, w: 240, h: 540 },
    { x: 24, y: 24, w: 1232, h: 66 },
    { x: 24, y: 630, w: 1232, h: 66 },
    { x: 24, y: 300, w: 1232, h: 80 },
  ],
  shadow: [
    { x: 40, y: 120, w: 90, h: 480 },
    { x: 1150, y: 120, w: 90, h: 480 },
    { x: 560, y: 600, w: 160, h: 80 },
  ],
  lamps: [
    { x: 180, y: 330, r: 100 },
    { x: 1100, y: 330, r: 100 },
    { x: 640, y: 90, r: 90 },
    { x: 640, y: 640, r: 90 },
  ],
  pages: [
    { x: 200, y: 150 },
    { x: 1080, y: 150 },
  ],
  ledger: null,
  entrance: { x: 640, y: 640 },
  exit: { x: 640, y: 12 },
  guards: [
    {
      kind: 'patroller', x: 140, y: 140, angle: 90,
      waypoints: [[140, 140], [140, 580], [470, 580], [470, 140]],
    },
    {
      kind: 'patroller', x: 1140, y: 140, angle: 90,
      waypoints: [[1140, 140], [1140, 580], [810, 580], [810, 140]],
    },
    {
      kind: 'scanner', x: 640, y: 340, angle: -90, baseAngle: -90,
      waypoints: [],
    },
  ],
  props: [
    { kind: 'books', x: 200, y: 150 },
    { kind: 'books', x: 1080, y: 150 },
    { kind: 'globe', x: 640, y: 60 },
    { kind: 'books', x: 470, y: 340 },
    { kind: 'books', x: 810, y: 340 },
    { kind: 'plant', x: 90, y: 640 },
    { kind: 'plant', x: 1190, y: 640 },
    { kind: 'candle', x: 470, y: 340 },
    { kind: 'candle', x: 810, y: 340 },
    { kind: 'banner', x: 640, y: 60 },
  ],
};

// Room 3, The Vault Hall — teaches mastery and adds the Lantern Captain. The
// Ledger waits on the central dais under a glass dome; taking it starts the
// ESCAPE phase, and the only way out is the entrance door Wren came in by,
// crossed again through alerted patrols along the wall shadow corridors.
const ROOM_3 = {
  name: 'The Vault Hall',
  par: 130,
  carpet: 'green',
  hint: 'Take the Ledger — then vanish the way you came',
  intro: 'ROOM 3 — THE VAULT HALL · 1 page + the Ledger · 4 guards · par 130s',
  walls: borderWalls(false),
  cover: [
    // Four pillars around the dais: tall cover, cones die on them.
    { x: 400, y: 200, w: 44, h: 44, tall: true },
    { x: 836, y: 200, w: 44, h: 44, tall: true },
    { x: 400, y: 440, w: 44, h: 44, tall: true },
    { x: 836, y: 440, w: 44, h: 44, tall: true },
    // The dais itself is low: it blocks feet, not sight — the glass dome is clear.
    { x: 560, y: 180, w: 160, h: 110, tall: false },
    // Side altars are low cover too.
    { x: 150, y: 120, w: 90, h: 50, tall: false },
    { x: 1040, y: 120, w: 90, h: 50, tall: false },
  ],
  carpetZones: [{ x: 100, y: 90, w: 1080, h: 540 }],
  // A gold runner runs from the dais to the entrance door.
  runner: { x: 600, y: 300, w: 80, h: 340 },
  shadow: [
    { x: 36, y: 100, w: 100, h: 520 },
    { x: 1144, y: 100, w: 100, h: 520 },
    { x: 200, y: 36, w: 880, h: 70 },
  ],
  lamps: [
    { x: 300, y: 120, r: 110 },
    { x: 980, y: 120, r: 110 },
    { x: 300, y: 600, r: 110 },
    { x: 980, y: 600, r: 110 },
  ],
  pages: [{ x: 195, y: 145 }],
  ledger: { x: 640, y: 235 },
  entrance: { x: 640, y: 640 },
  // No top exit: during the escape the entrance door is the way out.
  exit: { x: 640, y: 708 },
  guards: [
    {
      kind: 'patroller', x: 300, y: 150, angle: 0,
      waypoints: [[300, 150], [980, 150], [980, 540], [300, 540]],
    },
    {
      kind: 'patroller', x: 480, y: 300, angle: 90,
      waypoints: [[480, 300], [800, 300], [800, 480], [480, 480]],
    },
    {
      kind: 'scanner', x: 640, y: 360, angle: -90, baseAngle: -90,
      waypoints: [],
    },
    {
      kind: 'captain', x: 380, y: 160, angle: 0,
      waypoints: [[380, 160], [900, 160], [900, 520], [380, 520]],
    },
  ],
  props: [
    { kind: 'dome', x: 640, y: 235 },
    { kind: 'books', x: 195, y: 145 },
    { kind: 'globe', x: 150, y: 640 },
    { kind: 'globe', x: 1130, y: 640 },
    { kind: 'plant', x: 90, y: 90 },
    { kind: 'plant', x: 1190, y: 90 },
    { kind: 'bench', x: 320, y: 340 },
    { kind: 'bench', x: 960, y: 340 },
    { kind: 'candle', x: 320, y: 300 },
    { kind: 'candle', x: 960, y: 300 },
    { kind: 'banner', x: 320, y: 60 },
    { kind: 'banner', x: 960, y: 60 },
    { kind: 'rug', x: 640, y: 470 },
  ],
};

export const LEVELS = [ROOM_1, ROOM_2, ROOM_3];

/** The door rectangle a room's exit occupies, for drawing and for the walk-in test. */
export function doorRect(room, which) {
  const door = which === 'entrance' ? room.entrance : room.exit;
  const top = door.y < FIELD.height / 2;
  return top
    ? { x: door.x - 40, y: 0, w: 80, h: 24 }
    : { x: door.x - 40, y: 696, w: 80, h: 24 };
}
