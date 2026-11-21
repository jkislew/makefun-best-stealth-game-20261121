// NIGHT LEDGER — tuning and palette in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size. Every number the design
// promises lives here: detection fill times, cone sizes, speeds, coin ranges.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Total par for the whole run, in seconds (75 + 110 + 130). */
export const TOTAL_PAR = 315;
/** Speed Archivist feat: finish the run under this many seconds. */
export const SPEED_FEAT_TIME = 240;
/** Par time per room, in seconds (shown on the room intro card). */
export const ROOM_PAR = [75, 110, 130];
/** Seconds the room intro card stays up; seconds a caught banner flashes. */
export const INTRO_CARD_TIME = 2.6;
export const CAUGHT_FLASH_TIME = 0.9;
/** Seconds the escape banner stays pinned at the top of the Vault Hall. */
export const ESCAPE_BANNER_TIME = 3.2;

export const PLAYER = {
  radius: 13,
  walkSpeed: 168,
  sneakSpeed: 96,
  /** Pickup radius for pages and the Ledger. */
  pickupRadius: 30,
  /** Distance at which the exit door opens the next room. */
  doorRadius: 34,
};

export const GUARD = {
  radius: 14,
  /** Patrol speeds per room index (0, 1, 2). */
  patrolSpeed: [70, 78, 86],
  investigateSpeed: 112,
  chaseSpeed: 132,
  /** Escape phase multiplies patrol and chase speed. */
  escapeSpeedMul: 1.15,
  /** Escape phase stretches every cone by this factor. */
  escapeConeMul: 1.1,
  /** Cone lengths per guard kind, in pixels. */
  coneLength: { patroller: 200, scanner: 240, captain: 170 },
  /** Cone half-angles in degrees (full angle is twice this). */
  coneHalf: { patroller: 35, scanner: 42, captain: 32 },
  /** Peripheral wedge: short, wide, slow fill. */
  peripheralRadius: 95,
  peripheralHalf: 50,
  peripheralFill: 14,
  /** Seconds a guard looks around at a ghost / noise point before giving up. */
  lookAroundTime: 2.4,
  /** Seconds a guard pauses at each patrol waypoint. */
  waypointPause: 1.1,
  /** Scanner sweep: degrees each way from its base facing, and sweep speed. */
  sweepHalf: 60,
  sweepSpeed: 38,
};

/** Detection: a 0-100 meter per guard. Fill times are "at mid-range, in light, walking". */
export const DETECTION = {
  /** Fill time in seconds per room index, at mid-range in light. */
  fillSeconds: [1.6, 1.3, 1.1],
  /** Distance factor: closer fills faster (1.7x at point blank, 0.8x at cone edge). */
  closeMul: 1.7,
  farMul: 0.8,
  /** Shadow halves the fill rate; the captain's lamp light removes the protection. */
  shadowMul: 0.5,
  /** Sneaking slows the fill; moving fills faster than standing still. */
  sneakMul: 0.65,
  movingMul: 1.25,
  stillMul: 0.85,
  /** Meter drains this fast per second while the guard cannot see Wren. */
  drainPerSecond: 42,
  /** Awareness thresholds on the 0-100 meter. */
  suspiciousAt: 35,
  alertAt: 70,
};

export const SOUND = {
  /** Footstep ring radius on marble, and the step cadence while walking. */
  footstepRadius: 110,
  footstepInterval: 0.42,
  /** A thrown coin's noise ring radius. */
  coinRadius: 260,
  /** How far a coin can be thrown, in pixels. */
  throwRange: 280,
  /** Seconds a thrown coin spends in the air. */
  throwTime: 0.45,
  /** A wall between guard and noise halves the heard radius. */
  wallDamp: 0.5,
};

export const COINS_PER_ROOM = [2, 3, 3];
export const PAGES_PER_ROOM = [1, 2, 2];
export const TOTAL_PAGES = 5;
export const TOTAL_GUARDS = 9;
export const TOTAL_COINS = 8;
export const TOTAL_FEATS = 8;

export const PALETTE = {
  backdrop: '#0a0d18',
  ink: '#10142a',
  floorMarble: '#232838',
  floorMarbleAlt: '#272d40',
  floorLine: '#2f3550',
  carpetBurgundy: '#4a1f2b',
  carpetBurgundyAlt: '#54242f',
  carpetSlate: '#232c3a',
  carpetSlateAlt: '#28323f',
  carpetGreen: '#17301f',
  carpetGreenAlt: '#1c3826',
  runnerGold: '#8a6d2f',
  wall: '#3a2f22',
  wallTop: '#5a4630',
  coverWood: '#4a3421',
  coverWoodTop: '#6b4a2c',
  shelfWood: '#3d2c1b',
  shelfWoodTop: '#5d4226',
  shadow: '#05070f',
  lampWarm: '#ffb347',
  lampCore: '#ffd98a',
  lampEscape: '#ff5a3c',
  pageGlow: '#ffe9a8',
  pageGold: '#f2c94c',
  ledgerGlow: '#9fe8ff',
  exitSealed: '#5a6278',
  exitOpen: '#7ee2a0',
  doorWood: '#2c2118',
  player: '#2dd4bf',
  playerRim: '#7ef0e0',
  playerShadow: '#0d3f4a',
  guardPatroller: '#c0392b',
  guardScanner: '#4a5fc0',
  guardCaptain: '#b03030',
  guardLamp: '#ffc46b',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneCalmEdge: 'rgba(255, 214, 90, 0.55)',
  coneSuspicious: 'rgba(255, 150, 40, 0.30)',
  coneSuspiciousEdge: 'rgba(255, 150, 40, 0.75)',
  coneAlert: 'rgba(255, 60, 50, 0.34)',
  coneAlertEdge: 'rgba(255, 60, 50, 0.85)',
  conePeripheral: 'rgba(255, 214, 90, 0.08)',
  ghost: 'rgba(180, 200, 255, 0.5)',
  ring: 'rgba(255, 255, 255, 0.65)',
  coinRing: 'rgba(242, 201, 76, 0.8)',
  text: '#eef1f5',
  muted: '#9aa3b8',
  dim: '#6b7386',
  panel: 'rgba(10, 13, 24, 0.92)',
  panelEdge: '#3a4258',
  gold: '#f2c94c',
  red: '#ff4d4d',
  amber: '#ffb347',
  green: '#7ee2a0',
  teal: '#2dd4bf',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best grade is kept between visits (this browser only). */
export const BEST_KEY = 'night-ledger.best';

export const HINTS = [
  'The sweep is coming — stay behind the tables',
  'Marble carries sound. Sneak, or throw a coin',
  'You have the Ledger. Cross back in shadow',
];

export const GRADES = ['Ghost', 'Shadow', 'Phantom', 'Night Clerk'];

/** The three guard kinds, in the order the title bestiary lists them. */
export const GUARD_KINDS = [
  { kind: 'patroller', name: 'Patroller', trait: 'Walks loops · 200 px cone · pauses to look' },
  { kind: 'scanner', name: 'Scanner', trait: 'Stands and sweeps · 240 px cone · never moves' },
  { kind: 'captain', name: 'Lantern Captain', trait: 'Carries a lamp · 170 px cone · no shadow inside its light' },
];

/** Contextual hint per room, plus the escape line, keyed by phase. */
export const HINT_ESCAPE = 'You have the Ledger. Cross back in shadow';

export const FEAT_DEFS = [
  { id: 'never-seen', name: 'Never Seen', desc: 'No guard ever grew suspicious' },
  { id: 'no-alarms', name: 'No Alarms', desc: 'Finished without being caught once' },
  { id: 'all-pages', name: 'All Five Pages', desc: 'Collected every ledger page' },
  { id: 'under-par', name: 'Under Par', desc: 'Finished inside 315 seconds' },
  { id: 'coin-artist', name: 'Coin Artist', desc: 'Finished with coins to spare' },
  { id: 'shadow-walker', name: 'Shadow Walker', desc: 'Half the run spent in shadow' },
  { id: 'clean-escape', name: 'Clean Escape', desc: 'No alarm during the escape' },
  { id: 'speed-archivist', name: 'Speed Archivist', desc: 'Finished inside 240 seconds' },
];
