import { ALL } from './constants.js';
import { state } from './state.js';
import { cat, rv, showPop } from './utils.js';

export function spawn(playArea, handler) {
  const t = ALL[Math.floor(Math.random() * ALL.length)];
  const el = document.createElement("div");
  el.className = "float";
  el.textContent = t;
  playArea.appendChild(el);
  
  const active = cat(t) === state.lastType;
  const o = {
    el,
    type: t,
    x: Math.random() * (playArea.clientWidth - 40),
    y: Math.random() * (playArea.clientHeight - 40),
    vx: rv(active),
    vy: rv(active)
  };
  
  el.onclick = () => !state.paused && handler(o);
  state.floats.push(o);
}

export function removeFloat(o) {
  o.el.remove();
  state.floats = state.floats.filter(f => f !== o);
}

export function softBurst(t, removeFn) {
  state.floats.filter(f => f.type === t).slice(0, 2).forEach(f => {
    showPop(f.x, f.y, f.el.parentElement);
    removeFn(f);
  });
}

export function typeBurst(c, removeFn) {
  state.floats.filter(f => cat(f.type) === c).forEach(f => {
    showPop(f.x, f.y, f.el.parentElement);
    removeFn(f);
  });
}
