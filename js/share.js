import { state } from './state.js';
import { ALL } from './constants.js';
import { formatTime } from './survival.js';
import { runManager } from './runManager.js';

export function generateShareCard() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size
  canvas.width = 600;
  canvas.height = 800;
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#14080d');
  gradient.addColorStop(0.5, '#2b0f1a');
  gradient.addColorStop(1, '#0b0b10');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add decorative border
  ctx.strokeStyle = '#ff7aa2';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Velvet Pop', canvas.width / 2, 100);
  
  // Mode indicator
  ctx.fillStyle = '#ff7aa2';
  ctx.font = 'bold 24px Arial';
  let modeText = state.gameMode === 'survival' ? 'SURVIVAL MODE' : 'CLASSIC MODE';
  
  // Add run information if active
  if (runManager.isRunActive()) {
    const runState = runManager.getCurrentRun();
    modeText = `RUN ${runState.runSeed} • LEVEL ${runState.level}`;
  }
  
  ctx.fillText(modeText, canvas.width / 2, 140);
  
  // Score section
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 64px Arial';
  ctx.fillText(state.score.toLocaleString(), canvas.width / 2, 220);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.fillText('FINAL SCORE', canvas.width / 2, 250);
  
  // Combo record
  ctx.fillStyle = '#ffaa00';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(state.combo.toString(), canvas.width / 2, 320);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Arial';
  ctx.fillText('COMBO RECORD', canvas.width / 2, 345);
  
  // Survival time (if survival mode) or run info
  if (state.gameMode === 'survival') {
    ctx.fillStyle = '#ff7aa2';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(formatTime(state.survivalTime), canvas.width / 2, 400);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText('SURVIVAL TIME', canvas.width / 2, 420);
  } else if (runManager.isRunActive()) {
    const runState = runManager.getCurrentRun();
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${runState.cardsOwned.length} Cards`, canvas.width / 2, 400);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.fillText(`DIFFICULTY ${runState.difficulty.toFixed(1)}X`, canvas.width / 2, 420);
  }
  
  // Draw cute floaties
  drawFloaties(ctx, canvas);
  
  // Footer
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.fillText('Share your score!', canvas.width / 2, canvas.height - 40);
  
  return canvas;
}

function drawFloaties(ctx, canvas) {
  const floaties = getRandomFloaties(8);
  const startY = (state.gameMode === 'survival' || runManager.isRunActive()) ? 460 : 380;
  
  // Set font for emojis
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  
  // Draw floaties in a decorative pattern
  floaties.forEach((floatie, index) => {
    const angle = (index / floaties.length) * Math.PI * 2;
    const radius = 120;
    const centerX = canvas.width / 2;
    const centerY = startY + 120;
    
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    // Add glow effect
    ctx.shadowColor = '#ff7aa2';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(floatie, x, y);
    
    // Reset shadow
    ctx.shadowBlur = 0;
  });
  
  // Add some scattered floaties
  const scatteredFloaties = getRandomFloaties(6);
  scatteredFloaties.forEach((floatie, index) => {
    const x = 80 + (index % 3) * 220;
    const y = startY + 280 + Math.floor(index / 3) * 80;
    
    ctx.font = '32px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(floatie, x, y);
  });
}

function getRandomFloaties(count) {
  const selected = [];
  for (let i = 0; i < count; i++) {
    const randomFloatie = ALL[Math.floor(Math.random() * ALL.length)];
    selected.push(randomFloatie);
  }
  return selected;
}

export function downloadShareCard() {
  const canvas = generateShareCard();
  const link = document.createElement('a');
  link.download = `velvet-pop-score-${state.score}.png`;
  link.href = canvas.toDataURL();
  link.click();
}

export function shareToClipboard() {
  const canvas = generateShareCard();
  canvas.toBlob(blob => {
    const item = new ClipboardItem({ 'image/png': blob });
    navigator.clipboard.write([item]).then(() => {
      showShareNotification('Image copied to clipboard!');
    }).catch(() => {
      // Fallback to download if clipboard fails
      downloadShareCard();
      showShareNotification('Downloaded share image!');
    });
  });
}

export function shareToSocial() {
  const canvas = generateShareCard();
  const dataUrl = canvas.toDataURL();
  
  // Create a temporary link for sharing
  const shareText = `Just scored ${state.score.toLocaleString()} points in Velvet Pop! 🎮✨`;
  
  if (navigator.share) {
    // Use native sharing if available
    canvas.toBlob(blob => {
      const file = new File([blob], 'velvet-pop-score.png', { type: 'image/png' });
      navigator.share({
        title: 'Velvet Pop Score',
        text: shareText,
        files: [file]
      }).catch(() => {
        // Fallback to download
        downloadShareCard();
      });
    });
  } else {
    // Fallback: copy text and download image
    navigator.clipboard.writeText(shareText).catch(() => {});
    downloadShareCard();
    showShareNotification('Share text copied and image downloaded!');
  }
}

function showShareNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'share-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}