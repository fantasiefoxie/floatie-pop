export const gameState = {
  // Persistence-backed data
  cards: JSON.parse(localStorage.getItem("deckData") || "[]"),
  highScore: Number(localStorage.getItem("highScore") || 0),

  // Session data
  score: 0,
  combo: 0,
  multiplier: 1,
  lastFamily: null,
  popCount: 0,
  itemChain: 0,
  typeChain: 0,
  lastItem: null,
  lastType: null,
  
  // Engine state
  floaties: [],
  paused: true,
  gameMode: "default",
  spawnSeed: Math.random()
};

export function persistData() {
  localStorage.setItem("deckData", JSON.stringify(gameState.cards));
  localStorage.setItem("highScore", gameState.highScore);
}

export function resetSession() {
  gameState.score = 0;
  gameState.combo = 0;
  gameState.multiplier = 1;
  gameState.lastFamily = null;
  gameState.popCount = 0;
  gameState.itemChain = 0;
  gameState.typeChain = 0;
  gameState.lastItem = null;
  gameState.lastType = null;
}
