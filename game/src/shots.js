// Deterministic screenshot staging: an autopilot plays the real rules forward
// from a fresh world for a fixed number of steps, so each shot is what a short
// game really looks like and the same seed always gives the same frame.
// ?shot=start shows the opening sneak, ?shot=play a mid-heist chase, ?shot=end
// the getaway after the prize is taken.
import { CAMERA, STEP } from './config.js';
import { createRandom } from './random.js';
import { angleDifference, createWorld, stepWorld } from './world.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 22;
const END_LIMIT_SECONDS = 180;

// Waypoints the autopilot follows per level: entrance, a route through the
// room, the main loot (where it holds E to crack it), then the getaway door.
// A waypoint with a third element 'gate' is a safe waiting spot: the pilot
// holds there until every guard is far from the next waypoint and none is
// alert, so a crossing is timed to the patrols instead of walked into.
// The pilot sneaks near guards, dashes when one gives chase, and drops smoke
// over the main loot when a guard is close enough to spoil the crack.
const ROUTES = [
  [
    [200, 700],
    [200, 500],
    [350, 430],
    [700, 430],
    [760, 380],
    [760, 160],
    [640, 108],
    [900, 160],
    [1150, 160],
    [1240, 125],
  ],
  [
    [200, 700],
    [200, 500],
    [400, 500],
    [650, 560],
    [650, 640],
    [760, 640],
    [760, 320],
    [760, 240],
    [500, 110],
    [760, 240],
    [760, 320],
    [1100, 320],
    [1100, 720],
    [1210, 765],
  ],
  [
    [120, 640],
    [180, 500],
    [180, 640],
    [400, 640],
    [640, 640],
    [640, 600],
    [640, 500],
    [400, 500],
    [640, 560],
    [640, 600],
    [400, 640],
    [180, 640],
    [180, 320],
    [60, 320],
    [34, 125],
  ],
];

function nearestGuardDistance(state) {
  let best = Infinity;
  for (const guard of state.guards) {
    const d = Math.hypot(guard.x - state.player.x, guard.y - state.player.y);
    if (d < best) best = d;
  }
  return best;
}

function anyGuardAlert(state) {
  return state.guards.some((guard) => guard.state === 'alert');
}

// Steer the thief toward `target`: returns the input for one fixed step.
function autopilotInput(state, target, levelIndex) {
  const player = state.player;
  const dx = target[0] - player.x;
  const dy = target[1] - player.y;
  const dist = Math.hypot(dx, dy);
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    interact: false,
    dash: false,
    smoke: false,
    emp: false,
    coin: false,
    coinTarget: null,
  };
  if (dist < 12) return input;
  const nearGuard = nearestGuardDistance(state);
  const alert = anyGuardAlert(state);
  input.sneak = nearGuard < 240 && !alert;
  // A camera about to fill its suspicion gets an EMP first: eight seconds
  // of blind cameras is cheaper than a tipped-off room.
  if (state.tools.emp > 0) {
    for (const camera of state.cameras) {
      if (camera.disabledTimer > 0) continue;
      const d = Math.hypot(camera.x - player.x, camera.y - player.y);
      if (d > 190) continue;
      const toPlayer = Math.atan2(player.y - camera.y, player.x - camera.x);
      if (Math.abs(angleDifference(toPlayer, camera.angle)) < CAMERA.viewHalfAngle) {
        input.emp = true;
        break;
      }
    }
  }
  if (alert && nearGuard < 160 && player.dashCooldown <= 0) {
    input.dash = true;
    if (state.tools.smoke > 0 && nearGuard < 120) input.smoke = true;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  // An almost-zero threshold: the thief must still slide sideways around a
  // wall corner even when the waypoint is nearly straight ahead, or it pins
  // itself against the corner and never moves again.
  if (nx > 0.01) input.right = true;
  if (nx < -0.01) input.left = true;
  if (ny > 0.01) input.down = true;
  if (ny < -0.01) input.up = true;
  // Standing on the main loot: hold E and crack it instead of moving on.
  // If a guard is close enough to spoil the crack, drop smoke over the loot
  // first: the cloud hides the thief for longer than the crack takes.
  // (Read the live loot from state.loot: the level definition never flips
  // taken, so reading it here would pin the thief at the prize forever.)
  const main = state.loot.find((item) => item.kind === 'main');
  if (main && !main.taken && Math.hypot(main.x - player.x, main.y - player.y) < 33) {
    const nearGuard = nearestGuardDistance(state);
    const smokeNear = state.smoke.some((cloud) => Math.hypot(cloud.x - player.x, cloud.y - player.y) < 80);
    if ((anyGuardAlert(state) || nearGuard < 220) && state.tools.smoke > 0 && !smokeNear) {
      input.smoke = true;
    }
    input.interact = true;
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
  }
  return input;
}

// The gate is open when no guard is chasing and every guard is far from the
// next waypoint and from the waiting thief.
function gateOpen(state, nextWaypoint) {
  if (anyGuardAlert(state)) return false;
  for (const guard of state.guards) {
    if (Math.hypot(guard.x - nextWaypoint[0], guard.y - nextWaypoint[1]) < 230) return false;
    if (Math.hypot(guard.x - state.player.x, guard.y - state.player.y) < 260) return false;
  }
  return true;
}

const WAIT_INPUT = {
  up: false,
  down: false,
  left: false,
  right: false,
  sneak: true,
  interact: false,
  dash: false,
  smoke: false,
  emp: false,
  coin: false,
  coinTarget: null,
};

// Run the autopilot for `seconds` (or until the level ends) and return the
// world. `routeIndex` picks the waypoint list for this level. `trace` is an
// optional debug hook called with the world every half second.
export function runAutopilot(state, levelIndex, seconds, trace = null) {
  const route = ROUTES[levelIndex] ?? ROUTES[0];
  let waypoint = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (state.status !== 'playing') break;
    const target = route[Math.min(waypoint, route.length - 1)];
    const isGate = target.length > 2 && target[2] === 'gate';
    const dist = Math.hypot(target[0] - state.player.x, target[1] - state.player.y);
    if (isGate && dist < 26) {
      const next = route[Math.min(waypoint + 1, route.length - 1)];
      if (!gateOpen(state, next)) {
        stepWorld(state, WAIT_INPUT, STEP);
        continue;
      }
    }
    const input = autopilotInput(state, target, levelIndex);
    stepWorld(state, input, STEP);
    // Never walk past the prize: hold the waypoint while the main loot is
    // close and still untaken, so the crack finishes before moving on.
    // A closed gate holds the waypoint too: the advance check runs on the
    // post-step distance, so without this the pilot would step past a gate
    // in the same frame it first arrives, before the wait above ever runs.
    const main = state.loot.find((item) => item.kind === 'main');
    const nearLoot = main && !main.taken
      && Math.hypot(main.x - state.player.x, main.y - state.player.y) < 40;
    const nextWaypoint = route[Math.min(waypoint + 1, route.length - 1)];
    const gateClosed = isGate && !gateOpen(state, nextWaypoint);
    if (!nearLoot && !gateClosed
      && Math.hypot(target[0] - state.player.x, target[1] - state.player.y) < 26) waypoint += 1;
    if (trace && i % 30 === 0) trace(state, waypoint);
  }
  return state;
}

// Stage the named scene in a fresh world and return the screen to draw.
export function stageShot(name, level, seed, levelIndex) {
  const world = createWorld(level, createRandom(seed >>> 0));
  if (name === 'play') {
    runAutopilot(world, levelIndex, PLAY_SECONDS);
    return { world, screen: 'play' };
  }
  if (name === 'end') {
    runAutopilot(world, levelIndex, END_LIMIT_SECONDS);
    return { world, screen: world.status === 'complete' ? 'complete' : 'play' };
  }
  runAutopilot(world, levelIndex, START_SECONDS);
  return { world, screen: 'play' };
}
