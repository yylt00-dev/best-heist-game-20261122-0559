// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between five screens: title, play, paused, busted and getaway.
// ?seed=N fixes the heist. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { LEVELS } from './levels.js';
import { createRandom } from './random.js';
import { createWorld, readBest, saveBest, stepWorld } from './world.js';
import { consumeEdges, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_COMPLETE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

let levelIndex = 0;
let world = createWorld(LEVELS[levelIndex], createRandom(seed));
let screen = SCREEN_TITLE;
let best = readBest();
let campaignDone = false;

function announce(text) {
  status.textContent = text;
}

function playEventSounds(events) {
  for (const event of events) {
    if (event === 'loot') audio.pickup();
    else if (event === 'main-loot') audio.mainLoot();
    else if (event === 'alarm') audio.alarm();
    else if (event === 'caught') audio.caught();
    else if (event === 'complete') audio.complete();
    else if (event === 'coin') audio.coin();
    else if (event === 'smoke') audio.smoke();
    else if (event === 'dash') audio.dash();
  }
}

function runShot(name) {
  const scene = stageShot(name, LEVELS[0], seed, 0);
  world = scene.world;
  screen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world, screen, best, 0, LEVELS.length);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (input.mute) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off' : 'Sound on');
    }
    if (input.pause && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      announce(screen === SCREEN_PAUSED ? 'Paused' : 'Playing');
    }
    if (input.confirm) {
      audio.unlock();
      if (screen === SCREEN_TITLE) {
        levelIndex = 0;
        campaignDone = false;
        world = createWorld(LEVELS[levelIndex], createRandom(seed));
        screen = SCREEN_PLAY;
        announce(`${LEVELS[levelIndex].name}: steal the prize, reach the getaway door.`);
      } else if (screen === SCREEN_COMPLETE) {
        if (campaignDone || levelIndex >= LEVELS.length - 1) {
          levelIndex = 0;
          campaignDone = false;
          screen = SCREEN_TITLE;
          world = createWorld(LEVELS[levelIndex], createRandom(seed));
        } else {
          levelIndex += 1;
          world = createWorld(LEVELS[levelIndex], createRandom(seed));
          screen = SCREEN_PLAY;
          announce(`${LEVELS[levelIndex].name}: steal the prize, reach the getaway door.`);
        }
      } else if (screen === SCREEN_OVER) {
        world = createWorld(LEVELS[levelIndex], createRandom(seed));
        screen = SCREEN_PLAY;
        announce(`${LEVELS[levelIndex].name}: try again.`);
      }
    }
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = stepWorld(world, input, STEP);
        playEventSounds(events);
        if (world.status === 'complete') {
          screen = SCREEN_COMPLETE;
          if (world.lootValue > best) {
            best = world.lootValue;
            saveBest(best);
          }
          if (levelIndex >= LEVELS.length - 1) campaignDone = true;
          announce(`Clean getaway! $${world.lootValue.toLocaleString('en-US')} of loot.`);
        } else if (world.status === 'busted') {
          screen = SCREEN_OVER;
          announce(`Busted: ${world.statusReason}.`);
        }
      }
    }
    consumeEdges(input);
    renderer.draw(world, screen, best, levelIndex, LEVELS.length);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
