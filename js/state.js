export let state = {
  deck: JSON.parse(localStorage.getItem("deckData") || "[]"),
  highScore: Number(localStorage.getItem("highScore") || 0),
  combo: 0,
  itemChain: 0,
  typeChain: 0,
  lastItem: null,
  lastType: null,
  floats: [],
  paused: true
};

export function saveDeck() {
  localStorage.setItem("deckData", JSON.stringify(state.deck));
}

export function saveHighScore() {
  localStorage.setItem("highScore", state.highScore);
}

export function resetSession() {
  state.combo = 0;
  state.itemChain = 0;
  state.typeChain = 0;
  state.lastItem = null;
  state.lastType = null;
}
