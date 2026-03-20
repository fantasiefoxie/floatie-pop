/**
 * FLOATIE POP - SYSTEM MANAGER ARCHITECTURE
 * 
 * This is the primary entry point for the game.
 * It initializes the system-based architecture and manages the core game loop.
 */

// Core Imports
import { state } from './state.js';
import { systemManager } from './systemManager.js';

// Phase 1: CONTENT
import { ContentSystem } from './systems/ContentSystem.js';

// Phase 2: INPUT
import { InputSystem } from './systems/InputSystem.js';
import { MobileUXSystem } from './systems/MobileUXSystem.js';

// Phase 3: FLOW
import { GameFlowSystem } from './systems/GameFlowSystem.js';

// Phase 4: GAMEPLAY
import { RunManagerSystem } from './systems/RunManagerSystem.js';
import { FloatieSpawnSystem } from './systems/FloatieSpawnSystem.js';
import { PopDetectionSystem } from './systems/PopDetectionSystem.js';
import { ComboSystem } from './systems/ComboSystem.js';
import { DeterministicCardSystem } from './systems/DeterministicCardSystem.js';
import { CardExecutionSystem } from './systems/CardExecutionSystem.js';
import { CardSynergySystem } from './systems/CardSynergySystem.js';
import { BoardPressureSystem } from './systems/BoardPressureSystem.js';
import { TelemetrySystem } from './systems/TelemetrySystem.js';

// Phase 5: PHYSICS
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { BoardStabilitySystem } from './systems/BoardStabilitySystem.js';

// Phase 6: SCORING
import { ScoreSystem } from './systems/ScoreSystem.js';

// Phase 7: RENDERING
import { RenderSystem } from './systems/RenderSystem.js';

// Phase 8: AUDIO
import { SoundSystem } from './systems/SoundSystem.js';

// ============================================================================
// ENGINE INITIALIZATION
// ============================================================================

window.addEventListener('load', () => {
    console.log('%c🎮 Floatie Pop - System Manager Architecture', 'color: #ff4d88; font-size: 16px; font-weight: bold;');
    
    // 1. Create System Instances
    const systems = [
        // Content
        { phase: 'content', name: 'ContentSystem', instance: new ContentSystem(systemManager) },
        
        // Input
        { phase: 'input', name: 'InputSystem', instance: new InputSystem(systemManager) },
        { phase: 'input', name: 'MobileUXSystem', instance: new MobileUXSystem(systemManager) },
        
        // Flow
        { phase: 'flow', name: 'GameFlowSystem', instance: new GameFlowSystem(systemManager) },
        
        // Gameplay
        { phase: 'gameplay', name: 'RunManagerSystem', instance: new RunManagerSystem(systemManager) },
        { phase: 'gameplay', name: 'FloatieSpawnSystem', instance: new FloatieSpawnSystem(systemManager) },
        { phase: 'gameplay', name: 'PopDetectionSystem', instance: new PopDetectionSystem(systemManager) },
        { phase: 'gameplay', name: 'ComboSystem', instance: new ComboSystem(systemManager) },
        { phase: 'gameplay', name: 'DeterministicCardSystem', instance: new DeterministicCardSystem(systemManager) },
        { phase: 'gameplay', name: 'CardExecutionSystem', instance: new CardExecutionSystem(systemManager) },
        { phase: 'gameplay', name: 'CardSynergySystem', instance: new CardSynergySystem(systemManager) },
        { phase: 'gameplay', name: 'BoardPressureSystem', instance: new BoardPressureSystem(systemManager) },
        { phase: 'gameplay', name: 'TelemetrySystem', instance: new TelemetrySystem(systemManager) },
        
        // Physics
        { phase: 'physics', name: 'PhysicsSystem', instance: new PhysicsSystem(systemManager) },
        { phase: 'physics', name: 'BoardStabilitySystem', instance: new BoardStabilitySystem(systemManager) },
        
        // Scoring
        { phase: 'scoring', name: 'ScoreSystem', instance: new ScoreSystem(systemManager) },

        // Rendering
        { phase: 'rendering', name: 'RenderSystem', instance: new RenderSystem(systemManager) },

        // Audio
        { phase: 'rendering', name: 'SoundSystem', instance: new SoundSystem(systemManager) }
    ];

    // 2. Register Systems
    console.log('📋 Registering systems...');
    systems.forEach(({ phase, name, instance }) => {
        systemManager.register(phase, name, instance);
    });

    // 3. Initialize Systems
    systemManager.initializeSystems(state);
    
    // 4. Global References (for debugging)
    window.gameState = state;
    window.systemManager = systemManager;
    
    // 5. Print Registry & Execution Order
    systemManager.printRegistry();
    systemManager.printExecutionOrder();
    
    // 6. Set up UI button listeners
    // Auto-start game immediately
    setTimeout(() => {
        systemManager.emit('game:start', {});
    }, 100);

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            console.log('🔄 Restarting game...');
            systemManager.emit('game:reset', {});
        });
    }

    const modeBtn = document.getElementById('mode-toggle');
    if (modeBtn) {
        modeBtn.addEventListener('click', () => {
            state.gameMode = state.gameMode === 'classic' ? 'survival' : 'classic';
            console.log('🛠 Mode changed:', state.gameMode);
            systemManager.emit('game:reset', {});
        });
    }

    console.log('%c✅ Engine initialized', 'color: #00ff88; font-weight: bold;');
    console.log('📊 Core Loop: Input → Flow → Gameplay → Physics → Scoring → Rendering');

    // 6. Start Game Loop
    startGameLoop();
});

// ============================================================================
// CORE GAME LOOP
// ============================================================================

let lastTime = performance.now();

function startGameLoop() {
    console.log('🎮 Game loop started');
    requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    // Calculate delta time (capped for stability)
    let deltaTime = currentTime - lastTime;
    deltaTime = Math.min(deltaTime, 16.67); // Cap at ~60fps floor
    lastTime = currentTime;

    try {
        // 1. Update systems
        systemManager.updateSystems(deltaTime, state);
        
        // 2. Render systems
        systemManager.renderSystems(state);
    } catch (e) {
        console.error('❌ Error in game loop:', e);
    }

    // Schedule next frame
    requestAnimationFrame(gameLoop);
}

// Global error handling
window.addEventListener('error', (event) => {
    console.error('🚨 Global Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
});

console.log('📱 Floatie Pop - System Manager Architecture Loaded');
