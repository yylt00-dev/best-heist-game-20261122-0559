// Keyboard and mouse, read fresh every frame. Held keys live on the object;
// edge-triggered actions (dash, smoke, EMP, coin, pause, confirm) are set for
// one frame by the caller reading them, then cleared by `consumeEdges`.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

const KEYMAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
  KeyE: 'interact',
  Space: 'dash',
  KeyQ: 'smoke',
  Digit2: 'emp',
  Digit3: 'coin',
  KeyP: 'pause',
  Escape: 'pause',
  Enter: 'confirm',
  KeyM: 'mute',
};

export function createInput(canvas) {
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
    pause: false,
    confirm: false,
    mute: false,
    coinTarget: null,
    mouse: { x: 0, y: 0 },
  };

  function onKeyDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (['up', 'down', 'left', 'right', 'dash'].includes(action)) event.preventDefault();
    if (['dash', 'smoke', 'emp', 'coin', 'pause', 'confirm', 'mute'].includes(action)) {
      if (!event.repeat) input[action] = true;
    } else {
      input[action] = true;
    }
  }

  function onKeyUp(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (['dash', 'smoke', 'emp', 'coin', 'pause', 'confirm', 'mute'].includes(action)) return;
    input[action] = false;
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  }

  function onMouseDown(event) {
    onMouseMove(event);
    input.coinTarget = { x: input.mouse.x, y: input.mouse.y };
    input.coin = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  return input;
}

// Clear the one-frame actions after the world consumed them.
export function consumeEdges(input) {
  input.dash = false;
  input.smoke = false;
  input.emp = false;
  input.coin = false;
  input.pause = false;
  input.confirm = false;
  input.mute = false;
  input.coinTarget = null;
}
