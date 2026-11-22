// Shared tuning for Velvet Vault: canvas size, speeds, vision and alarm numbers.
// Every number the world and the renderer agree on lives here, so a balance
// change is one edit in one place.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 800;
export const HUD_HEIGHT = 56;

// The room every heist plays in: a single floor plan that fits one screen.
export const ROOM = { x: 16, y: 68, width: 1248, height: 716 };

export const STEP = 1 / 60;
export const BEST_KEY = 'velvet-vault-best-loot';

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 95,
  dashSpeed: 340,
  dashTime: 0.16,
  dashCooldown: 1.4,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 148,
  investigateSpeed: 95,
  returnSpeed: 80,
  viewRange: 185,
  viewHalfAngle: 0.62,
  catchRadius: 20,
  // How fast a guard's suspicion fills while the thief is in its cone.
  detectRate: 1.5,
  detectFalloff: 0.45,
  // At full suspicion the guard goes alert and the alarm jumps.
  alertAlarmJump: 18,
  waypointPause: 1.1,
  lookAroundTime: 2.2,
};

export const CAMERA = {
  viewRange: 210,
  viewHalfAngle: 0.5,
  detectRate: 0.9,
  detectFalloff: 0.35,
  alarmJump: 22,
  sweepSpeed: 0.45,
  disabledSeconds: 8,
};

export const ALARM = {
  risePerSecond: 26,
  fallPerSecond: 7,
  lockdownFallPerSecond: 4,
  lockdownAt: 100,
  ghostLimit: 25,
};

export const TOOLS = {
  smokeCount: 2,
  smokeRadius: 95,
  smokeSeconds: 5,
  empCount: 2,
  coinCount: 4,
  coinRange: 260,
  coinHearRadius: 230,
};

export const LOOT = {
  crackSeconds: 2.6,
  smallPickupRadius: 26,
  mainPickupRadius: 34,
};

export const SCORE = {
  ghostBonus: 2000,
  timeBonusPerSecond: 12,
};

export const COLORS = {
  floorA: '#1c2436',
  floorB: '#202a40',
  floorLine: '#2a3550',
  wall: '#0d1220',
  wallTop: '#3a4a6b',
  cover: '#4a3a28',
  coverTop: '#6b5636',
  plant: '#1e4d33',
  vent: '#101827',
  ventEdge: '#4d6b8a',
  exit: '#1f7a4d',
  exitGlow: '#37d67a',
  lootSmall: '#ffd166',
  lootMain: '#ff5d8f',
  guardBody: '#8a2f2f',
  guardCone: 'rgba(255, 64, 64, 0.20)',
  guardConeEdge: 'rgba(255, 96, 96, 0.55)',
  cameraCone: 'rgba(255, 176, 32, 0.16)',
  cameraConeEdge: 'rgba(255, 190, 64, 0.5)',
  player: '#e8e6df',
  playerHood: '#232946',
  smoke: 'rgba(200, 205, 215, 0.55)',
  hudBg: 'rgba(8, 11, 20, 0.88)',
  hudText: '#e8e6df',
  hudDim: '#9aa5bd',
  alarmLow: '#37d67a',
  alarmMid: '#ffb020',
  alarmHigh: '#ff4040',
};
