export let state = {
  deck: JSON.parse(localStorage.getItem("deckData") || "[]"),
  highScore: Number(localStorage.getItem("highScore") || 0),
  score: {
    total: 0,
    lastGain: 0
  },
  combo: {
    current: 0,
    multiplier: 1,
    lastFamily: null
  },
  itemChain: 0,
  typeChain: 0,
  lastItem: null,
  lastType: null,
  floats: [],
  paused: true,
  gameMode: "classic",
  survivalTime: 0,
  gameOver: false,
  // Game flow state
  flow: {
    state: "menu",
    runStartTime: 0,
    gameOver: false
  },
  // Run-based modifiers
  difficultyMultiplier: 1,
  spawnRateMultiplier: 1,
  speedMultiplier: 1,
  // Difficulty scaling values
  difficultySpawnRate: 1.0,
  difficultyRareChance: 0.05,
  difficultyBoardDensity: 27,
  difficultyMovementSpeed: 1.0,
  difficultyScoreThreshold: 1000,
  // Input state
  input: {
    pointerDown: false,
    pointerPosition: { x: 0, y: 0 },
    chainSelection: [],
    activeFamily: null
  },
  // Spawn configuration
  spawnConfig: {
    spawnInterval: 2000,
    maxFloaties: 40,
    spawnWeights: {
      jelly: 25,
      coral: 25,
      pearl: 25,
      star: 20,
      rainbow: 3,
      bomb: 2
    }
  },
  // Card system
  cards: {
    popCounter: 0,
    deck: [],
    activeCards: [],
    hand: []
  },
  // Render system
  render: {
    particles: [],
    floatingText: [],
    animations: []
  },
  // Game flow
  flow: {
    state: 'menu',
    runStartTime: 0,
    gameOver: false
  },
  // Mobile UX
  mobile: {
    isMobile: false,
    touchRadius: 48,
    vibrationEnabled: true
  },
  // Board stability
  board: {
    minSpacing: 60,
    driftStrength: 0.1,
    boundaryPadding: 20
  },
  // Run management
  run: {
    active: false,
    seed: 0,
    level: 1,
    difficulty: 1,
    startTime: 0,
    popsThisLevel: 0
  },
  // Card synergy
  synergy: {
    active: [],
    modifiers: {}
  },
  // Board pressure
  pressure: {
    level: 0,
    spawnMultiplier: 1,
    densityLimit: 50,
    pressureTimer: 0
  },
  // Telemetry
  telemetry: {
    runStartTime: 0,
    popCount: 0,
    maxCombo: 0,
    cardsGenerated: 0,
    cardsUsed: 0,
    pressurePeak: 0,
    runDuration: 0,
    failureReason: null
  }
};

export function saveDeck() {
  localStorage.setItem("deckData", JSON.stringify(state.deck));
}

export function saveHighScore() {
  localStorage.setItem("highScore", state.highScore);
}

export function resetSession() {
  state.score = {
    total: 0,
    lastGain: 0
  };
  state.combo = {
    current: 0,
    multiplier: 1,
    lastFamily: null
  };
  state.itemChain = 0;
  state.typeChain = 0;
  state.lastItem = null;
  state.lastType = null;
  state.survivalTime = 0;
  state.gameOver = false;
  state.cards = {
    popCounter: 0,
    deck: [],
    activeCards: [],
    hand: []
  };
  state.render = {
    particles: [],
    floatingText: [],
    animations: []
  };
  // Don't reset run-based modifiers during session reset
}

export function updateHighScore() {
  if (state.score.total > state.highScore) {
    state.highScore = state.score.total;
    saveHighScore();
  }
}
