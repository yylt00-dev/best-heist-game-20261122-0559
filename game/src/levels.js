// The three heists. Each level is one room that fits a single screen: the thief
// crosses it, guards walk their patrols, cameras sweep, loot glints, and the
// getaway door waits. Walls and cover block movement and sight; vents hide the
// thief; every level offers at least three routes from the door to the prize.
//
// Coordinates live in the 1280x800 canvas; the room itself is x 16..1264,
// y 68..784 (the HUD takes the top strip). Patrol segments never cross a wall.
export const LEVELS = [
  {
    id: 'gallery',
    name: 'Heist 1 · The Meridian Gallery',
    subtitle: 'Steal The Starlight Canvas, then slip out the east door.',
    parTime: 90,
    playerStart: { x: 70, y: 730 },
    exit: { x: 1228, y: 92, w: 36, h: 68, label: 'GETAWAY' },
    walls: [
      { x: 420, y: 68, w: 16, h: 332 },
      { x: 420, y: 470, w: 400, h: 16 },
      { x: 880, y: 300, w: 16, h: 484 },
    ],
    cover: [
      { x: 250, y: 300, w: 52, h: 52, kind: 'crate' },
      { x: 308, y: 300, w: 52, h: 52, kind: 'crate' },
      { x: 640, y: 300, w: 56, h: 56, kind: 'pedestal' },
      { x: 150, y: 150, w: 44, h: 44, kind: 'plant' },
      { x: 1150, y: 200, w: 44, h: 44, kind: 'plant' },
      { x: 1150, y: 690, w: 44, h: 44, kind: 'plant' },
      { x: 1040, y: 500, w: 52, h: 52, kind: 'crate' },
      { x: 1098, y: 500, w: 52, h: 52, kind: 'crate' },
      { x: 560, y: 620, w: 56, h: 56, kind: 'pedestal' },
    ],
    vents: [
      { x: 500, y: 650, w: 64, h: 40 },
      { x: 1100, y: 150, w: 64, h: 40 },
    ],
    guards: [
      {
        name: 'Marco',
        waypoints: [
          [480, 160],
          [820, 160],
          [820, 260],
          [480, 260],
        ],
      },
      {
        name: 'Sena',
        waypoints: [
          [80, 430],
          [780, 430],
        ],
      },
      {
        name: 'Rook',
        waypoints: [
          [1000, 120],
          [1000, 700],
        ],
      },
    ],
    cameras: [
      { x: 40, y: 92, baseAngle: 0.7, sweep: 0.55 },
      { x: 1240, y: 400, baseAngle: Math.PI, sweep: 0.6 },
    ],
    loot: [
      { id: 'canvas', kind: 'main', label: 'The Starlight Canvas', value: 8000, x: 640, y: 108, crack: 2.6 },
      { id: 'vase-a', kind: 'small', label: 'Porcelain Vase', value: 900, x: 230, y: 180 },
      { id: 'vase-b', kind: 'small', label: 'Jade Vase', value: 1200, x: 1060, y: 640 },
      { id: 'bust', kind: 'small', label: 'Marble Bust', value: 1500, x: 850, y: 420 },
      { id: 'vase-c', kind: 'small', label: 'Celadon Vase', value: 700, x: 300, y: 620 },
    ],
  },
  {
    id: 'bank',
    name: 'Heist 2 · The Harbor Bank',
    subtitle: 'Crack the vault safe, grab the gold, vanish through the south door.',
    parTime: 120,
    playerStart: { x: 70, y: 730 },
    exit: { x: 1180, y: 748, w: 60, h: 36, label: 'GETAWAY' },
    walls: [
      { x: 16, y: 280, w: 684, h: 16 },
      { x: 700, y: 280, w: 16, h: 320 },
      { x: 1000, y: 68, w: 16, h: 212 },
    ],
    cover: [
      { x: 300, y: 400, w: 52, h: 52, kind: 'crate' },
      { x: 358, y: 400, w: 52, h: 52, kind: 'crate' },
      { x: 850, y: 650, w: 56, h: 56, kind: 'pedestal' },
      { x: 1150, y: 330, w: 44, h: 44, kind: 'plant' },
      { x: 120, y: 120, w: 44, h: 44, kind: 'plant' },
      { x: 300, y: 120, w: 52, h: 52, kind: 'crate' },
      { x: 950, y: 470, w: 52, h: 52, kind: 'crate' },
    ],
    vents: [
      { x: 350, y: 200, w: 64, h: 40 },
      { x: 1150, y: 650, w: 64, h: 40 },
    ],
    guards: [
      {
        name: 'Dara',
        waypoints: [
          [150, 640],
          [800, 640],
        ],
      },
      {
        name: 'Ivo',
        waypoints: [
          [760, 150],
          [940, 150],
        ],
      },
      {
        name: 'Kess',
        waypoints: [
          [620, 330],
          [620, 520],
        ],
      },
    ],
    cameras: [
      { x: 1240, y: 92, baseAngle: 2.4, sweep: 0.55 },
      { x: 40, y: 760, baseAngle: 0.2, sweep: 0.25 },
    ],
    loot: [
      { id: 'safe', kind: 'main', label: 'The Vault Safe', value: 10000, x: 500, y: 110, crack: 3.2 },
      { id: 'gold-a', kind: 'small', label: 'Gold Bars', value: 1500, x: 200, y: 150 },
      { id: 'gold-b', kind: 'small', label: 'Gold Bars', value: 1500, x: 1180, y: 500 },
      { id: 'gold-c', kind: 'small', label: 'Gold Bars', value: 1200, x: 400, y: 700 },
      { id: 'gold-d', kind: 'small', label: 'Gold Bars', value: 900, x: 950, y: 350 },
    ],
  },
  {
    id: 'museum',
    name: 'Heist 3 · The Crown Museum',
    subtitle: 'Lift the Aurora Diamond from its chamber, then reach the west door.',
    parTime: 150,
    playerStart: { x: 60, y: 600 },
    exit: { x: 16, y: 92, w: 36, h: 68, label: 'GETAWAY' },
    walls: [
      { x: 200, y: 300, w: 420, h: 16 },
      { x: 660, y: 300, w: 420, h: 16 },
      { x: 200, y: 560, w: 420, h: 16 },
      { x: 660, y: 560, w: 420, h: 16 },
      { x: 200, y: 300, w: 16, h: 260 },
      { x: 1080, y: 300, w: 16, h: 260 },
    ],
    cover: [
      { x: 320, y: 180, w: 56, h: 56, kind: 'pedestal' },
      { x: 920, y: 180, w: 56, h: 56, kind: 'pedestal' },
      { x: 320, y: 660, w: 56, h: 56, kind: 'pedestal' },
      { x: 920, y: 660, w: 56, h: 56, kind: 'pedestal' },
      { x: 700, y: 520, w: 52, h: 52, kind: 'crate' },
      { x: 780, y: 400, w: 52, h: 52, kind: 'crate' },
      { x: 120, y: 430, w: 44, h: 44, kind: 'plant' },
      { x: 1150, y: 400, w: 44, h: 44, kind: 'plant' },
    ],
    vents: [
      { x: 320, y: 430, w: 64, h: 40 },
      { x: 940, y: 480, w: 64, h: 40 },
    ],
    guards: [
      {
        name: 'Vera',
        waypoints: [
          [200, 150],
          [1080, 150],
        ],
      },
      {
        name: 'Odin',
        waypoints: [
          [200, 740],
          [1080, 740],
        ],
      },
      {
        name: 'Mira',
        waypoints: [
          [400, 380],
          [880, 380],
        ],
      },
    ],
    cameras: [
      { x: 640, y: 316, baseAngle: Math.PI / 2, sweep: 0.5 },
      { x: 1240, y: 92, baseAngle: 2.4, sweep: 0.55 },
    ],
    loot: [
      { id: 'diamond', kind: 'main', label: 'The Aurora Diamond', value: 12000, x: 400, y: 500, crack: 3.0 },
      { id: 'crown-a', kind: 'small', label: 'Silver Tiara', value: 1500, x: 150, y: 150 },
      { id: 'crown-b', kind: 'small', label: 'Silver Tiara', value: 1500, x: 1130, y: 150 },
      { id: 'crown-c', kind: 'small', label: 'Silver Tiara', value: 1200, x: 150, y: 700 },
      { id: 'crown-d', kind: 'small', label: 'Silver Tiara', value: 1200, x: 1130, y: 700 },
    ],
  },
];

// Guards and cameras may never see through a wall, a crate or a pedestal.
// Everything that blocks sight: interior walls plus every cover piece.
export function sightBlockers(level) {
  return level.walls.concat(level.cover);
}

// Everything that blocks walking: sight blockers plus the room's border.
export function solidRects(level) {
  return sightBlockers(level);
}
