const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

canvas.width = canvasWidth;
canvas.height = canvasHeight;

const gravity = 0.1;
const jumpSpeed = 8;
const groundHeight = 100;

let score = 0;
let level = 1;
let gameOver = false;
let lives = 2;

const cow = new Image();
cow.src = './graphics/cow.png';

const milk1 = new Image();
milk1.src = './graphics/milk1.png';

const milk2 = new Image();
milk2.src = './graphics/milk2.png';

const milk3 = new Image();
milk3.src = './graphics/milk3.png';

const box = new Image();
box.src = './graphics/box.png';

const heart = new Image();
heart.src = './graphics/heart.png';

const startImage = new Image();
startImage.src = './graphics/start.png';

const endImage = new Image();
endImage.src = './graphics/end.png';

const cloud1 = new Image();
cloud1.src = './graphics/1.png';
const cloud2 = new Image();
cloud2.src = './graphics/2.png';
const cloud3 = new Image();
cloud3.src = './graphics/3.png';

const BOX_SIZE = 100;

const player = {
  x: 50,
  y: canvasHeight - groundHeight - 100,
  width: 80,
  height: 80,
  vy: 0,
  onGround: true,
  invincible: false,
  invincibleTimer: 0
};

let obstacles = [];
let milkObjects = [];

const keys = {};
let started = false;
let waitingAfterGameOver = false;
let showLeaderboard = false;

let showLevelText = false;

let playerName = '';
let playerRank = 0;

// Mobil cihaz mı? Kaba tespit
const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Mobilde hız çarpanı, masaüstünde 1
const mobileSpeedMultiplier = isMobile ? 3 : 1;

const clouds = [
  { img: cloud1, x: 50, y: 50, w: 75, h: 24, speed: 0.3 },
  { img: cloud2, x: 200, y: 100, w: 136, h: 36, speed: 0.2 },
  { img: cloud3, x: 400, y: 70, w: 143, h: 40, speed: 0.25 }
];

// İsim girişi input kutusu
const input = document.createElement('input');
input.type = 'text';
input.placeholder = 'Enter your name';
input.style.position = 'fixed';
input.style.fontSize = '24px';
input.style.fontFamily = "'Starseed Pro', monospace";
input.style.textAlign = 'center';
input.style.zIndex = 10;
input.style.display = 'none';
input.style.borderRadius = '8px';
input.style.border = '2px solid white';
input.style.padding = '8px';
input.style.color = '#000';
input.style.backgroundColor = '#fff';

document.body.appendChild(input);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (input.value.trim().length > 0) {
      playerName = input.value.trim();
      saveScore(playerName, score);
      calculatePlayerRank();
      showLeaderboard = true;
      input.style.display = 'none';
    }
  }
});

function calculatePlayerRank() {
  const allScores = getAllScores();
  playerRank = allScores.findIndex(s => s.name === playerName && s.points === score) + 1;
  if (playerRank === 0) playerRank = allScores.length;
}

function getStartEndSize() {
  if (canvasWidth < 600) {
    return { w: 300, h: 300 };
  }
  return { w: 700, h: 700 };
}

function getScores() {
  return JSON.parse(localStorage.getItem('leaderboard')) || [];
}

function getAllScores() {
  return JSON.parse(localStorage.getItem('leaderboard_all')) || [];
}

function saveScore(name, points) {
  let scores = getScores();
  scores.push({ name, points });
  scores.sort((a,b) => b.points - a.points);
  scores = scores.slice(0, 10);
  localStorage.setItem('leaderboard', JSON.stringify(scores));

  let allScores = getAllScores();
  allScores.push({ name, points });
  allScores.sort((a,b) => b.points - a.points);
  localStorage.setItem('leaderboard_all', JSON.stringify(allScores));

  return scores;
}

canvas.addEventListener('click', () => {
  if (gameOver && waitingAfterGameOver) {
    if (showLeaderboard) {
      resetGame();
      started = true;
      showLeaderboard = false;
      input.style.display = 'none';
    }
  } else if (!started && !gameOver) {
    started = true;
  }
});

window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ') {
    if (!started && !gameOver) {
      started = true;
    }
    if (gameOver && waitingAfterGameOver) {
      if (showLeaderboard) {
        resetGame();
        started = true;
        showLeaderboard = false;
        input.style.display = 'none';
      }
    }
  }
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

window.addEventListener('touchstart', e => {
  e.preventDefault();
  if (!started && !gameOver) {
    started = true;
  } else if (gameOver && waitingAfterGameOver) {
    if (showLeaderboard) {
      resetGame();
      started = true;
      showLeaderboard = false;
      input.style.display = 'none';
    }
  } else if (started && player.onGround) {
    player.vy = -jumpSpeed;
    player.onGround = false;
  }
}, { passive: false });

window.addEventListener('resize', () => {
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  player.y = canvasHeight - groundHeight - player.height;

  updateInputPosition();
});

function updateInputPosition() {
  if (canvasWidth < 600) {
    // Mobilde input'u biraz daha aşağı
    input.style.left = `${canvasWidth / 2 - 100}px`;
    input.style.top = `${(canvasHeight - getStartEndSize().h) / 2 - 20}px`;
    input.style.width = '200px';
  } else {
    // Bilgisayar
    const { w, h } = getStartEndSize();
    const endX = (canvasWidth + w) / 2 - w;
    const boardX = endX - 320;

    input.style.left = `${boardX}px`;
    input.style.top = `${(canvasHeight - h) / 2 + 110}px`;
    input.style.width = '200px';
  }
}

function rectsOverlap(r1, r2) {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}

function update() {
  if (!started || gameOver) return;

  if (player.invincible) {
    player.invincibleTimer -= 1;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
    }
  }

  if (keys[' '] && player.onGround) {
    player.vy = -jumpSpeed;
    player.onGround = false;
  }

  player.vy += gravity;
  player.y += player.vy;

  if (player.y + player.height > canvasHeight - groundHeight) {
    player.y = canvasHeight - groundHeight - player.height;
    player.vy = 0;
    player.onGround = true;
  }

  clouds.forEach(cloud => {
    cloud.x -= cloud.speed;
    if (cloud.x + cloud.w < 0) {
      cloud.x = canvasWidth + Math.random() * 200;
      cloud.y = 20 + Math.random() * 100;
    }
  });

  // Hız hesaplaması (mobilde çarpan, masaüstünde 1)
  const baseSpeed = 1;
  const speed = (baseSpeed + level) * mobileSpeedMultiplier;

  obstacles.forEach(obs => {
    obs.x -= speed;
  });
  milkObjects.forEach(milkObj => {
    milkObj.x -= speed;
  });

  obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
  milkObjects = milkObjects.filter(milkObj => milkObj.x + milkObj.width > 0);

  while (obstacles.length < 5) {
    let type = Math.floor(Math.random() * 3) + 1;
    let boxY = canvasHeight - groundHeight - BOX_SIZE - (type - 1) * 100;
    let lastX = obstacles.length ? obstacles[obstacles.length - 1].x : canvasWidth;
    obstacles.push({
      x: lastX + 400 + Math.random() * 300,
      y: boxY,
      width: BOX_SIZE,
      height: BOX_SIZE,
      type: type
    });
  }

  while (milkObjects.length < 10) {
    let milkYPositions = [
      canvasHeight - groundHeight - 50,
      canvasHeight - groundHeight - 150,
      canvasHeight - groundHeight - 250
    ];
    let milkY = milkYPositions[Math.floor(Math.random() * milkYPositions.length)];
    let milkTypeRoll = Math.random();
    let type = milkTypeRoll < 0.6 ? 1 : milkTypeRoll < 0.9 ? 2 : 3;
    let lastX = milkObjects.length ? milkObjects[milkObjects.length - 1].x : canvasWidth;
    milkObjects.push({
      x: lastX + 300 + Math.random() * 200,
      y: milkY,
      width: 30,
      height: 30,
      type: type,
      collected: false
    });
  }

  obstacles.forEach(obs => {
    const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };
    const obsRect = { x: obs.x, y: obs.y, width: obs.width, height: obs.height };

    if (rectsOverlap(playerRect, obsRect)) {
      let playerRight = player.x + player.width;
      let obsLeft = obs.x;
      let playerBottom = player.y + player.height;
      let obsTop = obs.y;

      if (playerBottom > obsTop && playerBottom < obsTop + 20 && player.vy >= 0) {
        player.y = obsTop - player.height;
        player.vy = 0;
        player.onGround = true;
      } else {
        if (playerRight > obsLeft && player.x < obsLeft && !player.invincible) {
          lives--;
          player.invincible = true;
          player.invincibleTimer = 60;

          if (lives <= 0) {
            gameOver = true;
            waitingAfterGameOver = true;
            input.style.display = 'block';
            input.value = '';
            input.focus();
            updateInputPosition();
          } else {
            player.y = canvasHeight - groundHeight - player.height;
            player.vy = 0;
            player.onGround = true;
          }
        }
      }
    }
  });

  milkObjects.forEach(milkObj => {
    if (
      !milkObj.collected &&
      player.x < milkObj.x + milkObj.width &&
      player.x + player.width > milkObj.x &&
      player.y < milkObj.y + milkObj.height &&
      player.y + player.height > milkObj.y
    ) {
      milkObj.collected = true;
      if (milkObj.type === 1) score += 1;
      else if (milkObj.type === 2) score += 2;
      else if (milkObj.type === 3) score += 5;

      if (score >= 70 && level === 1) {
        level = 2;
        showLevelText = true;
        setTimeout(() => (showLevelText = false), 2000);
      } else if (score >= 140 && level === 2) {
        level = 3;
        showLevelText = true;
        setTimeout(() => (showLevelText = false), 2000);
      }
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Gökyüzü
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Bulutlar
  clouds.forEach(cloud => {
    ctx.drawImage(cloud.img, cloud.x, cloud.y, cloud.w, cloud.h);
  });

  // Zemin
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);

  // Süt objeleri
  milkObjects.forEach(milkObj => {
    if (!milkObj.collected) {
      if (milkObj.type === 1) ctx.drawImage(milk1, milkObj.x, milkObj.y, milkObj.width, milkObj.height);
      else if (milkObj.type === 2) ctx.drawImage(milk2, milkObj.x, milkObj.y, milkObj.width, milkObj.height);
      else if (milkObj.type === 3) ctx.drawImage(milk3, milkObj.x, milkObj.y, milkObj.width, milkObj.height);
    }
  });

  // Engel kutuları
  obstacles.forEach(obs => {
    ctx.drawImage(box, obs.x, obs.y, BOX_SIZE, BOX_SIZE);
  });

  // Oyuncu (inek)
  ctx.drawImage(cow, player.x, player.y, player.width, player.height);

  drawUI();

  if (showLevelText) {
    ctx.font = 'bold 60px "Starseed Pro", monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 8;
    ctx.fillText('LEVEL ' + level, canvasWidth / 2, canvasHeight / 2);
  }
}

function drawUI() {
  ctx.font = 'bold 28px "Starseed Pro", monospace';
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;

  const scoreX = 20;
  const levelX = 20;
  const scoreY = 20;
  const levelY = 60;

  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, scoreX, scoreY);
  ctx.fillText('Level: ' + level, levelX, levelY);

  const heartSize = 40;
  const heartSpacing = 10;
  for (let i = 0; i < lives; i++) {
    ctx.drawImage(heart, canvasWidth - (heartSize + heartSpacing) * (i + 1), 20, heartSize, heartSize);
  }
}

function drawStartScreen() {
  draw();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const { w, h } = getStartEndSize();
  ctx.drawImage(startImage, (canvasWidth - w) / 2, (canvasHeight - h) / 2, w, h);
}

function drawEndScreen() {
  draw();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const { w, h } = getStartEndSize();

  const endX = (canvasWidth + w) / 2 - w;
  const endY = (canvasHeight - h) / 2;

  ctx.drawImage(endImage, endX, endY, w, h);

  if (canvasWidth < 600) {
    // Mobilde leaderboard ve metinler end.png'nin üstünde ortada
    const textX = canvasWidth / 2;
    let textY = endY - 110;

    ctx.font = 'bold 30px "Starseed Pro", monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 6;

    if (!showLeaderboard) {
      ctx.fillText('Your point: ', textX - 20, textY);
      ctx.fillStyle = 'red';
      ctx.fillText(`${score}`, textX + 90, textY);

      ctx.fillStyle = 'white';
      ctx.font = '22px "Starseed Pro", monospace';
      ctx.fillText(`Enter your name to see leaderboard`, textX, textY + 40);
      // input mobilde zaten alt alta, ekranda yer var, orada gösterilecek
    } else {
      drawLeaderboardMobile(textX, textY + 30);
    }
  } else {
    // Bilgisayarda end.png'nin solunda dikey şekilde
    const boardX = endX - 320;
    const boardYStart = endY + 40;

    ctx.font = 'bold 32px "Starseed Pro", monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 6;

    if (!showLeaderboard) {
      ctx.fillText('Enter your name to see leaderboard', boardX, boardYStart);
      ctx.font = '28px "Starseed Pro", monospace';
      ctx.fillStyle = 'white';
      ctx.fillText(`Your point: `, boardX, boardYStart + 40);
      ctx.fillStyle = 'red';
      ctx.fillText(`${score}`, boardX + ctx.measureText('Your point: ').width, boardYStart + 40);
    } else {
      drawLeaderboard(boardX, boardYStart);
    }
  }
}

function drawLeaderboard(x, y) {
  const scores = getScores();

  ctx.font = 'bold 26px "Starseed Pro", monospace';
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;

  ctx.textAlign = 'left';
  ctx.fillText('Leaderboard:', x, y);

  ctx.font = '22px "Starseed Pro", monospace';
  scores.forEach((s, i) => {
    ctx.fillText(`${i + 1}. ${s.name} - ${s.points}`, x, y + 30 + i * 30);
  });

  if (playerRank > 10) {
    ctx.fillText(`Your rank: ${playerRank}`, x, y + 370);
  }
}

function drawLeaderboardMobile(x, y) {
  const scores = getScores();

  ctx.font = 'bold 26px "Starseed Pro", monospace';
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;

  ctx.textAlign = 'center';
  ctx.fillText('Leaderboard:', x, y);

  ctx.font = '22px "Starseed Pro", monospace';
  scores.forEach((s, i) => {
    ctx.fillText(`${i + 1}. ${s.name} - ${s.points}`, x, y + 30 + i * 30);
  });

  if (playerRank > 10) {
    ctx.fillText(`Your rank: ${playerRank}`, x, y + 370);
  }
}

function resetGame() {
  score = 0;
  level = 1;
  lives = 2;
  gameOver = false;
  waitingAfterGameOver = false;
  player.x = 50;
  player.y = canvasHeight - groundHeight - player.height;
  player.vy = 0;
  player.onGround = true;
  player.invincible = false;
  player.invincibleTimer = 0;
  obstacles = [];
  milkObjects = [];
  playerName = '';
  playerRank = 0;
}

function gameLoop(timestamp) {
  update();
  draw();

  if (!started) {
    drawStartScreen();
  }

  if (gameOver) {
    drawEndScreen();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
