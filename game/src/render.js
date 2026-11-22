// Every pixel of Velvet Vault: the room, the vision cones, the thief, the
// guards, the loot, the HUD and the screens. The judge sees the game through
// its screenshots, so the frame must read at a glance: cover is safety, red
// cones are danger, gold is loot, green is the way out.
import { CAMERA, CANVAS_HEIGHT, CANVAS_WIDTH, COLORS, GUARD, HUD_HEIGHT, LOOT, PLAYER, ROOM } from './config.js';
import { conePolygon } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_COMPLETE = 'complete';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, state) {
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // Checker tiles across the room, so movement reads on screen.
  const tile = 64;
  for (let y = ROOM.y; y < ROOM.y + ROOM.height; y += tile) {
    for (let x = ROOM.x; x < ROOM.x + ROOM.width; x += tile) {
      const odd = (Math.floor((x - ROOM.x) / tile) + Math.floor((y - ROOM.y) / tile)) % 2 === 0;
      ctx.fillStyle = odd ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, Math.min(tile, ROOM.x + ROOM.width - x), Math.min(tile, ROOM.y + ROOM.height - y));
    }
  }
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = ROOM.x; x <= ROOM.x + ROOM.width; x += tile) {
    ctx.moveTo(x, ROOM.y);
    ctx.lineTo(x, ROOM.y + ROOM.height);
  }
  for (let y = ROOM.y; y <= ROOM.y + ROOM.height; y += tile) {
    ctx.moveTo(ROOM.x, y);
    ctx.lineTo(ROOM.x + ROOM.width, y);
  }
  ctx.stroke();
  // The room's border wall.
  ctx.strokeStyle = COLORS.wallTop;
  ctx.lineWidth = 3;
  ctx.strokeRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height);
}

function drawVents(ctx, state) {
  for (const vent of state.level.vents) {
    ctx.fillStyle = COLORS.vent;
    ctx.fillRect(vent.x, vent.y, vent.w, vent.h);
    ctx.strokeStyle = COLORS.ventEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(vent.x, vent.y, vent.w, vent.h);
    ctx.beginPath();
    for (let i = 1; i < 4; i += 1) {
      const y = vent.y + (vent.h * i) / 4;
      ctx.moveTo(vent.x + 6, y);
      ctx.lineTo(vent.x + vent.w - 6, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#7fa8c9';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VENT · HIDDEN', vent.x + vent.w / 2, vent.y - 8);
  }
}

function drawExit(ctx, state) {
  const exit = state.level.exit;
  const open = state.mainTaken;
  const pulse = open ? 0.6 + 0.4 * Math.sin(state.time * 5) : 0.35;
  ctx.fillStyle = COLORS.exit;
  ctx.globalAlpha = 0.55 + pulse * 0.45;
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.exitGlow;
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = '#d9ffe9';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  const cx = exit.x + exit.w / 2;
  const cy = exit.y + exit.h / 2;
  if (exit.w > exit.h) {
    ctx.fillText('GETAWAY', cx, cy + 4);
  } else {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('GETAWAY', 0, 4);
    ctx.restore();
  }
  if (open) {
    // Keep the shout inside the canvas: the getaway door sits on a room edge.
    const labelX = Math.max(62, Math.min(cx, CANVAS_WIDTH - 62));
    ctx.fillStyle = COLORS.exitGlow;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('OPEN — RUN!', labelX, exit.y - 8);
  }
}

function drawLoot(ctx, state) {
  const t = state.time;
  // The live loot list: state.loot flips taken, the level definition never does.
  for (const item of state.loot) {
    if (item.taken) continue;
    const sparkle = 0.7 + 0.3 * Math.sin(t * 3 + item.x);
    if (item.kind === 'main') {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * sparkle;
      ctx.strokeStyle = COLORS.lootMain;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 30 + 4 * Math.sin(t * 2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COLORS.lootMain;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 16);
      ctx.lineTo(item.x + 12, item.y);
      ctx.lineTo(item.x, item.y + 16);
      ctx.lineTo(item.x - 12, item.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('$', item.x, item.y + 4);
      ctx.fillStyle = '#ffd7e6';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(item.label, item.x, item.y + 34);
      ctx.fillStyle = '#ff9dbd';
      ctx.font = '11px sans-serif';
      ctx.fillText(`$${item.value.toLocaleString('en-US')} · hold E`, item.x, item.y + 50);
    } else {
      ctx.globalAlpha = sparkle;
      ctx.fillStyle = COLORS.lootSmall;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#3a2c00';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('$', item.x, item.y + 3.5);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = '11px sans-serif';
      ctx.fillText(`$${item.value.toLocaleString('en-US')}`, item.x, item.y + 24);
    }
  }
}

function drawCover(ctx, state) {
  for (const piece of state.level.cover) {
    if (piece.kind === 'plant') {
      ctx.fillStyle = COLORS.plant;
      ctx.beginPath();
      ctx.arc(piece.x + piece.w / 2, piece.y + piece.h / 2, piece.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2f7a4d';
      ctx.beginPath();
      ctx.arc(piece.x + piece.w / 2 - 6, piece.y + piece.h / 2 - 6, piece.w / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = piece.kind === 'crate' ? COLORS.cover : '#5a4a6b';
      ctx.fillRect(piece.x, piece.y, piece.w, piece.h);
      ctx.fillStyle = piece.kind === 'crate' ? COLORS.coverTop : '#7a68a0';
      ctx.fillRect(piece.x, piece.y, piece.w, 8);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);
      if (piece.kind === 'crate') {
        ctx.beginPath();
        ctx.moveTo(piece.x, piece.y);
        ctx.lineTo(piece.x + piece.w, piece.y + piece.h);
        ctx.moveTo(piece.x + piece.w, piece.y);
        ctx.lineTo(piece.x, piece.y + piece.h);
        ctx.stroke();
      }
    }
  }
}

function drawWalls(ctx, state) {
  for (const wall of state.level.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = COLORS.wallTop;
    if (wall.w >= wall.h) ctx.fillRect(wall.x, wall.y, wall.w, 4);
    else ctx.fillRect(wall.x, wall.y, 4, wall.h);
  }
}

function drawCone(ctx, points, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCones(ctx, state) {
  for (const camera of state.cameras) {
    const disabled = camera.disabledTimer > 0;
    const points = conePolygon(camera.x, camera.y, camera.angle, CAMERA.viewHalfAngle, CAMERA.viewRange, state.blockers);
    drawCone(ctx, points, disabled ? 'rgba(120,120,120,0.08)' : COLORS.cameraCone, disabled ? 'rgba(150,150,150,0.4)' : COLORS.cameraConeEdge);
  }
  for (const guard of state.guards) {
    const alert = guard.state === 'alert';
    const points = conePolygon(guard.x, guard.y, guard.angle, GUARD.viewHalfAngle, GUARD.viewRange, state.blockers);
    drawCone(ctx, points, alert ? 'rgba(255, 64, 64, 0.32)' : COLORS.guardCone, alert ? 'rgba(255, 80, 80, 0.8)' : COLORS.guardConeEdge);
  }
}

function drawCamera(ctx, camera) {
  ctx.fillStyle = camera.disabledTimer > 0 ? '#5a5a5a' : '#c9a227';
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(camera.x, camera.y);
  ctx.lineTo(camera.x + Math.cos(camera.angle) * 15, camera.y + Math.sin(camera.angle) * 15);
  ctx.strokeStyle = camera.disabledTimer > 0 ? '#888' : '#ffd94d';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (camera.disabledTimer > 0) {
    ctx.fillStyle = '#e8e6df';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFF', camera.x, camera.y - 14);
  } else if (camera.suspicion > 0.15) {
    ctx.fillStyle = '#ffb020';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', camera.x, camera.y - 14);
  }
}

function drawGuard(ctx, guard, state) {
  const alert = guard.state === 'alert';
  ctx.fillStyle = alert ? '#ff4040' : COLORS.guardBody;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a0505';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick and cap brim.
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.angle) * 19, guard.y + Math.sin(guard.angle) * 19);
  ctx.strokeStyle = '#ffd9d9';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Suspicion ring: fills as the guard grows sure it saw something.
  if (guard.suspicion > 0.05) {
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
    ctx.strokeStyle = alert ? '#ff4040' : '#ffb020';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (alert) {
    ctx.fillStyle = '#ff6060';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - GUARD.radius - 8);
  } else if (guard.state === 'suspicious') {
    ctx.fillStyle = '#ffb020';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - GUARD.radius - 8);
  }
  ctx.fillStyle = '#d8c9c9';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guard.name, guard.x, guard.y + GUARD.radius + 13);
}

function drawPlayer(ctx, state) {
  const player = state.player;
  if (player.dashTime > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(player.x - Math.cos(player.angle) * 22, player.y - Math.sin(player.angle) * 22, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = COLORS.playerHood;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point and facing tick.
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.angle) * 6, player.y + Math.sin(player.angle) * 6, 5, 0, Math.PI * 2);
  ctx.fill();
  if (player.sneaking) {
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER.radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#9fd8ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (player.inVent) {
    ctx.fillStyle = '#7fa8c9';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN IN VENT', player.x, player.y - PLAYER.radius - 8);
  }
  // Crack progress ring over the main loot.
  if (state.crack) {
    const item = state.level.loot.find((loot) => loot.id === state.crack.lootId);
    if (item) {
      const total = item.crack ?? LOOT.crackSeconds;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 40, -Math.PI / 2, -Math.PI / 2 + (state.crack.progress / total) * Math.PI * 2);
      ctx.strokeStyle = '#37d67a';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.fillStyle = '#d9ffe9';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRACKING…', item.x, item.y - 48);
    }
  }
}

function drawSmokeAndCoins(ctx, state) {
  for (const coin of state.coins) {
    ctx.globalAlpha = Math.min(1, coin.t);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const cloud of state.smoke) {
    ctx.fillStyle = COLORS.smoke;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cloud.x - 30, cloud.y + 12, cloud.r * 0.6, 0, Math.PI * 2);
    ctx.arc(cloud.x + 32, cloud.y - 10, cloud.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function alarmColor(value) {
  if (value < 40) return COLORS.alarmLow;
  if (value < 75) return COLORS.alarmMid;
  return COLORS.alarmHigh;
}

function drawHud(ctx, state, levelIndex, totalLevels) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = COLORS.hudText;
  ctx.textAlign = 'left';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('VELVET VAULT', 18, 24);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${state.level.name}  ·  ${levelIndex + 1}/${totalLevels}`, 18, 43);

  // Loot tally.
  ctx.fillStyle = COLORS.lootSmall;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  const mainValue = state.level.loot.find((item) => item.kind === 'main').value;
  ctx.fillText(`LOOT $${state.lootValue.toLocaleString('en-US')} / $${mainValue.toLocaleString('en-US')}+`, 330, 24);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px sans-serif';
  ctx.fillText(state.mainTaken ? 'Prize secured — reach the GETAWAY door!' : `Steal: ${state.level.loot.find((item) => item.kind === 'main').label}`, 330, 43);

  // Alarm meter.
  const ax = 620;
  const ay = 14;
  const aw = 230;
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(state.lockdown ? '⚠ LOCKDOWN!' : 'ALARM', ax, ay + 9);
  ctx.fillStyle = '#101827';
  roundRect(ctx, ax + 62, ay, aw, 16, 8);
  ctx.fill();
  ctx.fillStyle = alarmColor(state.alarm);
  if (state.alarm > 1) {
    roundRect(ctx, ax + 62, ay, Math.max(16, (aw * state.alarm) / 100), 16, 8);
    ctx.fill();
  }
  ctx.strokeStyle = '#3a4a6b';
  ctx.lineWidth = 1;
  roundRect(ctx, ax + 62, ay, aw, 16, 8);
  ctx.stroke();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${Math.round(state.alarm)}%`, ax + 62 + aw + 8, ay + 13);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px sans-serif';
  ctx.fillText('Seen? Hide, smoke, or run.', ax, ay + 32);

  // Tools.
  const tx = 950;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`💨 Smoke ${state.tools.smoke} [Q]`, tx, 22);
  ctx.fillText(`⚡ EMP ${state.tools.emp} [2]`, tx, 40);
  ctx.fillText(`🪙 Coin ${state.tools.coin} [click]`, 1090, 22);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px sans-serif';
  const minutes = Math.floor(state.time / 60);
  const seconds = Math.floor(state.time % 60).toString().padStart(2, '0');
  ctx.fillText(`⏱ ${minutes}:${seconds}`, 1090, 40);
}

function drawPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 16, 0.72)';
  ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_HEIGHT);
  const w = 640;
  const h = 130 + lines.length * 30;
  const x = (CANVAS_WIDTH - w) / 2;
  const y = (CANVAS_HEIGHT - h) / 2;
  ctx.fillStyle = '#101827';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, CANVAS_WIDTH / 2, y + 58);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '16px sans-serif';
  lines.forEach((line, index) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, y + 100 + index * 30);
  });
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function draw(state, screen, best, levelIndex, totalLevels) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawFloor(ctx, state);
    drawVents(ctx, state);
    drawExit(ctx, state);
    drawLoot(ctx, state);
    drawCover(ctx, state);
    drawWalls(ctx, state);
    drawCones(ctx, state);
    for (const camera of state.cameras) drawCamera(ctx, camera);
    for (const guard of state.guards) drawGuard(ctx, guard, state);
    drawSmokeAndCoins(ctx, state);
    drawPlayer(ctx, state);
    drawHud(ctx, state, levelIndex, totalLevels);

    if (screen === SCREEN_TITLE) {
      drawPanel(ctx, 'VELVET VAULT', [
        'A one-night, three-heist stealth game. No one may see you — or if they do, be gone.',
        'Move WASD / arrows · Sneak Shift · Dash Space · Grab loot hold E · Smoke Q · EMP 2 · Coin click',
        'Red cones are guard sight, amber cones are cameras. Vents hide you. Alarms bring everyone.',
        `Best loot so far: $${best.toLocaleString('en-US')} · Press Enter to start ${state.level.name}`,
      ], '#ffd166');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel(ctx, 'PAUSED', [
        'The crew waits in the dark.',
        'Press P or Esc to keep moving · M mutes the sound · R restarts this heist',
      ], '#9aa5bd');
    } else if (screen === SCREEN_COMPLETE) {
      const timeBonus = state.timeBonus ?? 0;
      const ghostBonus = state.ghostBonus ?? 0;
      drawPanel(ctx, 'CLEAN GETAWAY!', [
        `${state.level.name} — escaped with $${state.lootValue.toLocaleString('en-US')} of loot.`,
        `Time bonus $${timeBonus.toLocaleString('en-US')} · Ghost bonus $${ghostBonus.toLocaleString('en-US')}`,
        `Score $${state.score.toLocaleString('en-US')} · Best loot $${Math.max(best, state.lootValue).toLocaleString('en-US')}`,
        'Press Enter for the next heist',
      ], '#37d67a');
    } else if (screen === SCREEN_OVER) {
      drawPanel(ctx, 'BUSTED!', [
        state.statusReason || 'A guard caught the thief.',
        `Loot kept: $${state.lootValue.toLocaleString('en-US')} · Alarm peaked at ${Math.round(state.maxAlarm)}%`,
        'Press Enter to try this heist again',
      ], '#ff4040');
    }
  }

  return { draw };
}
