// The heist simulation: movement, collision, guard and camera vision, the alarm
// meter, loot, tools and the win/lose rules. Pure logic — no DOM, no canvas —
// so it can be stepped headlessly for tests and for screenshot staging.
import { ALARM, CAMERA, CANVAS_HEIGHT, CANVAS_WIDTH, GUARD, LOOT, PLAYER, ROOM, SCORE, TOOLS } from './config.js';
import { sightBlockers } from './levels.js';

export const EVENT_LOOT = 'loot';
export const EVENT_MAIN_LOOT = 'main-loot';
export const EVENT_CAUGHT = 'caught';
export const EVENT_COMPLETE = 'complete';
export const EVENT_ALARM = 'alarm';
export const EVENT_SMOKE = 'smoke';
export const EVENT_EMP = 'emp';
export const EVENT_COIN = 'coin';
export const EVENT_DASH = 'dash';

const TAU = Math.PI * 2;

// The room's border, as four walls, so movement, sight and raycasts share it.
export function borderRects() {
  return [
    { x: 0, y: ROOM.y - 16, w: CANVAS_WIDTH, h: 16 },
    { x: 0, y: ROOM.y + ROOM.height, w: CANVAS_WIDTH, h: 16 },
    { x: 0, y: ROOM.y, w: 16, h: ROOM.height },
    { x: ROOM.x + ROOM.width, y: ROOM.y, w: 16, h: ROOM.height },
  ];
}

export function angleDifference(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Slab test: does the segment (x1,y1)-(x2,y2) cross the rectangle?
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Ray against one rectangle: the smallest t in [0, maxT] where the ray enters,
// or Infinity when it never does.
function rayRectT(ox, oy, dx, dy, rect, maxT) {
  let tmin = 0;
  let tmax = maxT;
  if (Math.abs(dx) < 1e-9) {
    if (ox < rect.x || ox > rect.x + rect.w) return Infinity;
  } else {
    let t1 = (rect.x - ox) / dx;
    let t2 = (rect.x + rect.w - ox) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < rect.y || oy > rect.y + rect.h) return Infinity;
  } else {
    let t1 = (rect.y - oy) / dy;
    let t2 = (rect.y + rect.h - oy) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

// The visible wedge of a guard or camera, clipped by walls: cast rays across
// the cone and join their ends. The renderer draws this polygon.
export function conePolygon(x, y, angle, halfAngle, range, blockers, rays = 22) {
  const points = [{ x, y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = range;
    for (const rect of blockers) {
      const t = rayRectT(x, y, dx, dy, rect, range);
      if (t < best) best = t;
    }
    points.push({ x: x + dx * best, y: y + dy * best });
  }
  return points;
}

export function createWorld(level, rng) {
  const blockers = sightBlockers(level).concat(borderRects());
  const state = {
    level,
    rng,
    blockers,
    time: 0,
    status: 'playing',
    statusReason: '',
    alarm: 0,
    maxAlarm: 0,
    lockdown: false,
    lootValue: 0,
    score: 0,
    mainTaken: false,
    ghost: true,
    player: {
      x: level.playerStart.x,
      y: level.playerStart.y,
      angle: -Math.PI / 2,
      moving: false,
      sneaking: false,
      dashTime: 0,
      dashCooldown: 0,
      inVent: false,
    },
    guards: level.guards.map((def) => ({
      name: def.name,
      waypoints: def.waypoints,
      waypointIndex: 0,
      x: def.waypoints[0][0],
      y: def.waypoints[0][1],
      angle: 0,
      state: 'patrol',
      suspicion: 0,
      pauseTimer: 0,
      lookTimer: 0,
      lostTimer: 0,
      target: null,
    })),
    cameras: level.cameras.map((def, index) => ({
      x: def.x,
      y: def.y,
      baseAngle: def.baseAngle,
      sweep: def.sweep,
      phase: index * 1.7,
      angle: def.baseAngle,
      suspicion: 0,
      disabledTimer: 0,
      alarmCooldown: 0,
    })),
    loot: level.loot.map((item) => ({ ...item, taken: false })),
    smoke: [],
    coins: [],
    empTimer: 0,
    crack: null,
    tools: {
      smoke: TOOLS.smokeCount,
      emp: TOOLS.empCount,
      coin: TOOLS.coinCount,
    },
  };
  return state;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function circleHitsRect(x, y, radius, rect) {
  const cx = clamp(x, rect.x, rect.x + rect.w);
  const cy = clamp(y, rect.y, rect.y + rect.h);
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) < radius * radius;
}

// Move a circle axis by axis so it slides along walls instead of sticking.
function moveCircle(state, body, dx, dy) {
  const solids = state.blockers;
  const nx = body.x + dx;
  if (!solids.some((rect) => circleHitsRect(nx, body.y, body.radius, rect))) body.x = nx;
  const ny = body.y + dy;
  if (!solids.some((rect) => circleHitsRect(body.x, ny, body.radius, rect))) body.y = ny;
}

function lineOfSight(state, x1, y1, x2, y2) {
  for (const rect of state.blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

function inSmoke(state, x, y) {
  return state.smoke.some((cloud) => distance(x, y, cloud.x, cloud.y) < cloud.r);
}

function smokeBlocksSight(state, x1, y1, x2, y2) {
  for (const cloud of state.smoke) {
    // A smoke cloud hides anything behind it: the segment passes near its centre.
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    let t = ((cloud.x - x1) * dx + (cloud.y - y1) * dy) / len2;
    t = clamp(t, 0, 1);
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    if (distance(px, py, cloud.x, cloud.y) < cloud.r * 0.8) return true;
  }
  return false;
}

// Can this viewer (guard or camera) see the thief right now?
function canSeePlayer(state, vx, vy, angle, range, halfAngle) {
  const player = state.player;
  if (player.inVent) return false;
  if (inSmoke(state, player.x, player.y)) return false;
  const dist = distance(vx, vy, player.x, player.y);
  if (dist > range) return false;
  if (Math.abs(angleDifference(Math.atan2(player.y - vy, player.x - vx), angle)) > halfAngle) return false;
  if (!lineOfSight(state, vx, vy, player.x, player.y)) return false;
  if (smokeBlocksSight(state, vx, vy, player.x, player.y)) return false;
  return true;
}

function guardSeesPlayer(state, guard) {
  return canSeePlayer(state, guard.x, guard.y, guard.angle, GUARD.viewRange, GUARD.viewHalfAngle);
}

function stepGuard(state, guard, dt, events) {
  const player = state.player;
  const seen = guardSeesPlayer(state, guard);
  if (seen) {
    const dist = distance(guard.x, guard.y, player.x, player.y);
    const proximity = 1.7 - dist / GUARD.viewRange;
    guard.suspicion += GUARD.detectRate * proximity * (player.sneaking ? 0.5 : 1) * dt;
    guard.lostTimer = 0;
    if (guard.suspicion >= 1) {
      guard.suspicion = 1;
      if (guard.state !== 'alert') {
        guard.state = 'alert';
        state.alarm = Math.min(100, state.alarm + GUARD.alertAlarmJump);
        state.ghost = false;
        guard.target = { x: player.x, y: player.y };
        events.push(EVENT_ALARM);
      }
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.detectFalloff * dt);
    if (guard.state === 'alert') {
      guard.lostTimer += dt;
      if (guard.lostTimer > 3) {
        guard.state = 'suspicious';
        guard.lookTimer = 0;
      }
    }
  }

  let speed = 0;
  let dest = null;
  if (guard.state === 'patrol') {
    dest = { x: guard.waypoints[guard.waypointIndex][0], y: guard.waypoints[guard.waypointIndex][1] };
    speed = GUARD.patrolSpeed;
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      speed = 0;
    } else if (distance(guard.x, guard.y, dest.x, dest.y) < 8) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseTimer = GUARD.waypointPause;
      speed = 0;
    }
  } else if (guard.state === 'alert') {
    dest = seen ? { x: player.x, y: player.y } : guard.target;
    speed = GUARD.chaseSpeed;
    if (seen) guard.target = { x: player.x, y: player.y };
    if (distance(guard.x, guard.y, player.x, player.y) < GUARD.catchRadius) {
      state.status = 'busted';
      state.statusReason = `${guard.name} caught the thief`;
      events.push(EVENT_CAUGHT);
      return;
    }
  } else if (guard.state === 'suspicious') {
    if (guard.target) {
      dest = guard.target;
      speed = GUARD.investigateSpeed;
      if (distance(guard.x, guard.y, dest.x, dest.y) < 10) {
        guard.lookTimer += dt;
        speed = 0;
        guard.angle += Math.sin(state.time * 1.4) * dt * 1.2;
        if (guard.lookTimer > GUARD.lookAroundTime) {
          guard.state = 'return';
          guard.target = null;
        }
      }
    } else {
      guard.state = 'return';
    }
  } else if (guard.state === 'return') {
    let best = 0;
    let bestDist = Infinity;
    guard.waypoints.forEach((point, index) => {
      const d = distance(guard.x, guard.y, point[0], point[1]);
      if (d < bestDist) {
        bestDist = d;
        best = index;
      }
    });
    dest = { x: guard.waypoints[best][0], y: guard.waypoints[best][1] };
    speed = GUARD.returnSpeed;
    if (bestDist < 8) {
      guard.waypointIndex = best;
      guard.state = 'patrol';
    }
  }

  if (dest && speed > 0) {
    const dx = dest.x - guard.x;
    const dy = dest.y - guard.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.01) {
      guard.angle = Math.atan2(dy, dx);
      const body = { x: guard.x, y: guard.y, radius: GUARD.radius };
      moveCircle(state, body, (dx / len) * speed * dt, (dy / len) * speed * dt);
      guard.x = body.x;
      guard.y = body.y;
    }
  }
}

function stepCamera(state, camera, dt, events) {
  camera.angle = camera.baseAngle + Math.sin(state.time * CAMERA.sweepSpeed + camera.phase) * camera.sweep;
  if (camera.disabledTimer > 0) {
    camera.disabledTimer -= dt;
    camera.suspicion = 0;
    return;
  }
  if (camera.alarmCooldown > 0) camera.alarmCooldown -= dt;
  const seen = canSeePlayer(state, camera.x, camera.y, camera.angle, CAMERA.viewRange, CAMERA.viewHalfAngle);
  if (seen) {
    const dist = distance(camera.x, camera.y, state.player.x, state.player.y);
    const proximity = 1.6 - dist / CAMERA.viewRange;
    camera.suspicion += CAMERA.detectRate * proximity * (state.player.sneaking ? 0.5 : 1) * dt;
    if (camera.suspicion >= 1 && camera.alarmCooldown <= 0) {
      camera.suspicion = 0.4;
      camera.alarmCooldown = 4;
      state.alarm = Math.min(100, state.alarm + CAMERA.alarmJump);
      state.ghost = false;
      // The camera tips every guard off to the thief's position.
      for (const guard of state.guards) {
        if (guard.state !== 'alert') {
          guard.state = 'suspicious';
          guard.target = { x: state.player.x, y: state.player.y };
          guard.lookTimer = 0;
        }
      }
      events.push(EVENT_ALARM);
    }
  } else {
    camera.suspicion = Math.max(0, camera.suspicion - CAMERA.detectFalloff * dt);
  }
}

// One fixed step. `input` carries held keys plus edge-triggered actions the
// caller sets for this step only. Returns the events of this step.
export function stepWorld(state, input, dt) {
  const events = [];
  if (state.status !== 'playing') return events;
  state.time += dt;
  const player = state.player;

  // --- tools (edge-triggered) ---
  if (input.smoke && state.tools.smoke > 0) {
    state.tools.smoke -= 1;
    state.smoke.push({ x: player.x, y: player.y, r: TOOLS.smokeRadius, t: TOOLS.smokeSeconds });
    events.push(EVENT_SMOKE);
  }
  if (input.emp && state.tools.emp > 0) {
    state.tools.emp -= 1;
    state.empTimer = CAMERA.disabledSeconds;
    for (const camera of state.cameras) camera.disabledTimer = CAMERA.disabledSeconds;
    events.push(EVENT_EMP);
  }
  if (input.coin && state.tools.coin > 0 && input.coinTarget) {
    state.tools.coin -= 1;
    const dx = input.coinTarget.x - player.x;
    const dy = input.coinTarget.y - player.y;
    const len = Math.hypot(dx, dy) || 1;
    const range = Math.min(TOOLS.coinRange, len);
    const cx = player.x + (dx / len) * range;
    const cy = player.y + (dy / len) * range;
    state.coins.push({ x: cx, y: cy, t: 1.4 });
    for (const guard of state.guards) {
      if (guard.state !== 'alert' && distance(guard.x, guard.y, cx, cy) < TOOLS.coinHearRadius) {
        guard.state = 'suspicious';
        guard.target = { x: cx, y: cy };
        guard.lookTimer = 0;
      }
    }
    events.push(EVENT_COIN);
  }

  // --- movement ---
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  player.moving = moving;
  player.sneaking = Boolean(input.sneak);
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (input.dash && player.dashCooldown <= 0 && moving) {
    player.dashTime = PLAYER.dashTime;
    player.dashCooldown = PLAYER.dashCooldown;
    events.push(EVENT_DASH);
  }
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    player.angle = Math.atan2(my, mx);
    const speed = player.dashTime > 0 ? PLAYER.dashSpeed : player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    if (player.dashTime > 0) player.dashTime -= dt;
    const body = { x: player.x, y: player.y, radius: PLAYER.radius };
    moveCircle(state, body, mx * speed * dt, my * speed * dt);
    player.x = body.x;
    player.y = body.y;
  } else if (player.dashTime > 0) {
    player.dashTime -= dt;
  }
  player.inVent = state.level.vents.some((vent) => pointInRect(player.x, player.y, vent));

  // --- loot ---
  let nearMain = null;
  for (const item of state.loot) {
    if (item.taken) continue;
    const dist = distance(player.x, player.y, item.x, item.y);
    if (item.kind === 'small') {
      if (dist < LOOT.smallPickupRadius) {
        item.taken = true;
        state.lootValue += item.value;
        state.score += item.value;
        events.push(EVENT_LOOT);
      }
    } else if (dist < LOOT.mainPickupRadius) {
      nearMain = item;
    }
  }
  if (nearMain) {
    if (input.interact) {
      if (!state.crack || state.crack.lootId !== nearMain.id) state.crack = { lootId: nearMain.id, progress: 0 };
      state.crack.progress += dt;
      if (state.crack.progress >= (nearMain.crack ?? LOOT.crackSeconds)) {
        nearMain.taken = true;
        state.mainTaken = true;
        state.lootValue += nearMain.value;
        state.score += nearMain.value;
        state.crack = null;
        events.push(EVENT_MAIN_LOOT);
      }
    } else if (state.crack) {
      state.crack.progress = Math.max(0, state.crack.progress - dt * 2);
      if (state.crack.progress === 0) state.crack = null;
    }
  } else if (state.crack) {
    state.crack = null;
  }

  // --- getaway ---
  if (state.mainTaken && pointInRect(player.x, player.y, state.level.exit)) {
    state.status = 'complete';
    const timeBonus = Math.max(0, Math.round((state.level.parTime - state.time) * SCORE.timeBonusPerSecond));
    const ghostBonus = state.ghost && state.maxAlarm <= ALARM.ghostLimit ? SCORE.ghostBonus : 0;
    state.score += timeBonus + ghostBonus;
    state.statusReason = `escaped with $${state.lootValue.toLocaleString('en-US')}`;
    state.timeBonus = timeBonus;
    state.ghostBonus = ghostBonus;
    events.push(EVENT_COMPLETE);
    return events;
  }

  // --- guards, cameras, alarm ---
  for (const guard of state.guards) {
    stepGuard(state, guard, dt, events);
    if (state.status !== 'playing') return events;
  }
  for (const camera of state.cameras) stepCamera(state, camera, dt, events);

  const anySeen = state.guards.some((guard) => guardSeesPlayer(state, guard))
    || state.cameras.some((camera) => camera.disabledTimer <= 0
      && canSeePlayer(state, camera.x, camera.y, camera.angle, CAMERA.viewRange, CAMERA.viewHalfAngle));
  if (anySeen) {
    state.alarm = Math.min(100, state.alarm + ALARM.risePerSecond * dt);
    state.ghost = false;
  } else {
    const fall = state.lockdown ? ALARM.lockdownFallPerSecond : ALARM.fallPerSecond;
    state.alarm = Math.max(0, state.alarm - fall * dt);
  }
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);
  state.lockdown = state.alarm >= ALARM.lockdownAt - 0.001;
  if (state.lockdown) {
    for (const guard of state.guards) {
      if (guard.state !== 'alert') {
        guard.state = 'alert';
        guard.target = { x: player.x, y: player.y };
      }
    }
  }

  // --- timers ---
  state.smoke = state.smoke.filter((cloud) => (cloud.t -= dt) > 0);
  state.coins = state.coins.filter((coin) => (coin.t -= dt) > 0);
  if (state.empTimer > 0) state.empTimer -= dt;
  return events;
}

// The best loot this browser remembers, for the title screen.
export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem('velvet-vault-best-loot') ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    window.localStorage.setItem('velvet-vault-best-loot', String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}
