export let state = {
  deck: JSON.parse(localStorage.getItem("deckData") || "[]"),
  highScore: Number(localStorage.getItem("highScore") || 0),
  score: 0,
  combo: 0,
  itemChain: 0,
  typeChain: 0,
  lastItem: null,
  lastType: null,
  floats: [],
  paused: true,
  gameMode: "classic",
  survivalTime: 0,
  gameOver: false,
  // Run-based modifiers
  difficultyMultiplier: 1,
  spawnRateMultiplier: 1,
  speedMultiplier: 1,
  // Difficulty scaling values
  difficultySpawnRate: 1.0,
  difficultyRareChance: 0.05,
  difficultyBoardDensity: 27,
  difficultyMovementSpeed: 1.0,
  difficultyScoreThreshold: 1000
};

export function saveDeck() {
  localStorage.setItem("deckData", JSON.stringify(state.deck));
}

export function saveHighScore() {
  localStorage.setItem("highScore", state.highScore);
}

export function resetSession() {
  state.score = 0;
  state.combo = 0;
  state.itemChain = 0;
  state.typeChain = 0;
  state.lastItem = null;
  state.lastType = null;
  state.survivalTime = 0;
  state.gameOver = false;
  // Don't reset run-based modifiers during session reset
}
