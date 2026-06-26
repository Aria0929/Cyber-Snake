// 遊戲常數
const GRID_SIZE = 20; // 每個格子的大小 (px)
const CANVAS_SIZE = 400; // Canvas 的長寬 (px)
const GRID_COUNT = CANVAS_SIZE / GRID_SIZE; // 橫豎格子數量 (20)

// 速度難度對照表 (ms)
const DIFFICULTIES = {
    easy: 150,
    normal: 100,
    hard: 60
};

// 遊戲變數
let canvas, ctx;
let snake = [];
let direction = { x: 0, y: -1 }; // 預設向上
let nextDirection = { x: 0, y: -1 };
let food = { x: 0, y: 0, type: 'normal' }; // normal 或 gold
let score = 0;
let gameIntervalId = null;
let isPlaying = false;
let isPaused = false;
let isGameOver = false;
let soundEnabled = true;

// 死亡延遲與爆炸狀態（防堵雙重死亡 Bug）
let gameOverTimeoutId = null;
let isExploding = false;

// Web Audio API 內容
let audioCtx = null;

// 粒子特效陣列
let particles = [];

// 初始化遊戲
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // 監聽鍵盤
    window.addEventListener('keydown', handleKeyDown);

    // 監聽行動端虛擬按鍵
    document.getElementById('ctrl-up').addEventListener('click', () => changeDirection(0, -1));
    document.getElementById('ctrl-down').addEventListener('click', () => changeDirection(0, 1));
    document.getElementById('ctrl-left').addEventListener('click', () => changeDirection(-1, 0));
    document.getElementById('ctrl-right').addEventListener('click', () => changeDirection(1, 0));

    // 監聽按鈕
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    
    // 音效開關
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            soundToggle.classList.add('active');
            soundToggle.textContent = '🔊 音效開啟';
            playTone(440, 'sine', 0.08); // 輕微嗶聲提示
        } else {
            soundToggle.classList.remove('active');
            soundToggle.textContent = '🔇 音效關閉';
        }
    });

    // 難度切換
    document.getElementById('difficulty').addEventListener('change', () => {
        if (isPlaying && !isPaused) {
            // 如果正在遊戲，即時變更速度
            clearInterval(gameIntervalId);
            const speed = DIFFICULTIES[document.getElementById('difficulty').value];
            gameIntervalId = setInterval(gameStep, speed);
        }
    });

    // 初始渲染
    resetGameData();
    draw();
}

// 登入狀態變更時由 auth.js 呼叫的重設
function resetGameOnLogin() {
    stopGameLoop();
    resetGameData();
    hideOverlays();
    document.getElementById('ready-overlay').classList.remove('hidden');
    draw();
}

// 重設遊戲狀態
function resetGameData() {
    // 清除舊的 Game Over 延遲定時器，防堵雙重彈窗 Bug
    if (gameOverTimeoutId) {
        clearTimeout(gameOverTimeoutId);
        gameOverTimeoutId = null;
    }
    isExploding = false;

    // 蛇的初始位置：中間，長度為 3
    const startX = Math.floor(GRID_COUNT / 2);
    const startY = Math.floor(GRID_COUNT / 2) + 2;
    
    snake = [
        { x: startX, y: startY },
        { x: startX, y: startY + 1 },
        { x: startX, y: startY + 2 }
    ];
    
    direction = { x: 0, y: -1 };
    nextDirection = { x: 0, y: -1 };
    score = 0;
    document.getElementById('current-score').textContent = '000';
    
    isPaused = false;
    isGameOver = false;
    particles = [];

    spawnFood();
}

// 開始遊戲
function startGame() {
    if (isPlaying && !isPaused) return;

    // 釋放按鈕焦點，防止空白鍵重覆點擊
    if (document.activeElement) {
        document.activeElement.blur();
    }

    // 初始化 Audio Context (瀏覽器安全限制，需由用戶手勢觸發)
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("AudioContext not supported:", e);
        }
    }

    if (isGameOver) {
        resetGameData();
    }

    if (isPaused) {
        isPaused = false;
        document.getElementById('paused-overlay').classList.add('hidden');
        playTone(523, 'sine', 0.1); // C5
    } else {
        resetGameData();
        isPlaying = true;
        document.getElementById('ready-overlay').classList.add('hidden');
        playTone(659, 'sine', 0.15); // E5
    }

    hideOverlays();
    
    // 按鈕狀態
    document.getElementById('start-btn').disabled = true;
    document.getElementById('pause-btn').disabled = false;

    // 啟動迴圈
    clearInterval(gameIntervalId);
    const speed = DIFFICULTIES[document.getElementById('difficulty').value];
    gameIntervalId = setInterval(gameStep, speed);
}

// 暫停遊戲
function togglePause() {
    if (!isPlaying || isGameOver) return;

    if (isPaused) {
        // 繼續
        isPaused = false;
        document.getElementById('paused-overlay').classList.add('hidden');
        document.getElementById('pause-btn').textContent = '暫停';
        playTone(523, 'sine', 0.1);
        
        const speed = DIFFICULTIES[document.getElementById('difficulty').value];
        gameIntervalId = setInterval(gameStep, speed);
    } else {
        // 暫停
        isPaused = true;
        document.getElementById('paused-overlay').classList.remove('hidden');
        document.getElementById('pause-btn').textContent = '繼續';
        playTone(392, 'sine', 0.15); // G4
        
        clearInterval(gameIntervalId);
    }
}

// 停止遊戲迴圈
function stopGameLoop() {
    clearInterval(gameIntervalId);
    gameIntervalId = null;
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    document.getElementById('pause-btn').textContent = '暫停';
}

// 重新開始
function restartGame() {
    hideOverlays();
    resetGameData();
    startGame();
}

// 隱藏畫布所有覆蓋層
function hideOverlays() {
    document.getElementById('ready-overlay').classList.add('hidden');
    document.getElementById('paused-overlay').classList.add('hidden');
    document.getElementById('gameover-overlay').classList.add('hidden');
}

// 生成食物
function spawnFood() {
    let newFoodX, newFoodY;
    let onSnake = true;

    // 確保食物不會出現在蛇的身體上
    while (onSnake) {
        newFoodX = Math.floor(Math.random() * GRID_COUNT);
        newFoodY = Math.floor(Math.random() * GRID_COUNT);
        
        onSnake = snake.some(segment => segment.x === newFoodX && segment.y === newFoodY);
    }

    // 15% 機率生成金色食物
    const isGold = Math.random() < 0.15;

    food = {
        x: newFoodX,
        y: newFoodY,
        type: isGold ? 'gold' : 'normal'
    };
}

// 遊戲每一格的物理/邏輯運算
function gameStep() {
    try {
        if (isPaused || isGameOver) return;

        // 更新前進方向
        direction = nextDirection;

        // 計算新頭部位置
        const head = snake[0];
        const newHead = {
            x: head.x + direction.x,
            y: head.y + direction.y
        };

        // 碰撞邊界檢測 (死亡判定)
        if (newHead.x < 0 || newHead.x >= GRID_COUNT || newHead.y < 0 || newHead.y >= GRID_COUNT) {
            gameOver();
            return;
        }

        // 碰撞身體檢測 (死亡判定)
        const isCollidedSelf = snake.some(segment => segment.x === newHead.x && segment.y === newHead.y);
        if (isCollidedSelf) {
            gameOver();
            return;
        }

        // 將新頭部插入蛇身最前方
        snake.unshift(newHead);

        // 檢查是否吃到食物
        if (newHead.x === food.x && newHead.y === food.y) {
            // 加分
            let points = 1;
            if (food.type === 'gold') {
                points = 3;
                playEatSound(true); // 金色食物音效
            } else {
                playEatSound(false); // 普通食物音效
            }

            score += points;
            document.getElementById('current-score').textContent = String(score).padStart(3, '0');
            
            // 生成新食物
            spawnFood();
        } else {
            // 若沒吃到食物，移除蛇尾，保持長度
            snake.pop();
        }

        // 重新繪製畫面
        draw();
    } catch (e) {
        console.error("Game loop error:", e);
    }
}

// 處理鍵盤按鍵
function handleKeyDown(e) {
    // 如果正在播放死亡爆炸動畫，忽略所有按鍵（防止雙重開始 Bug）
    if (isExploding) return;

    // 只有當登入遮罩顯示時，才忽略鍵盤事件（避免干擾密碼/帳號輸入）
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay && !authOverlay.classList.contains('hidden')) {
        return;
    }

    const key = e.code;

    // 定義控制按鍵
    const controlKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];

    // 如果是控制鍵，防止瀏覽器預設滾動行為
    if (controlKeys.includes(key)) {
        e.preventDefault();
    }

    // 如果尚未開始
    if (!isPlaying) {
        if (controlKeys.includes(key)) {
            if (isGameOver) {
                restartGame();
            } else {
                startGame();
                // 開始後，如果按的是左右方向鍵，立即改變初始方向
                if (key === 'ArrowLeft' || key === 'KeyA') changeDirection(-1, 0);
                if (key === 'ArrowRight' || key === 'KeyD') changeDirection(1, 0);
            }
            return;
        }
    }

    switch (key) {
        case 'ArrowUp':
        case 'KeyW':
            changeDirection(0, -1);
            break;
        case 'ArrowDown':
        case 'KeyS':
            changeDirection(0, 1);
            break;
        case 'ArrowLeft':
        case 'KeyA':
            changeDirection(-1, 0);
            break;
        case 'ArrowRight':
        case 'KeyD':
            changeDirection(1, 0);
            break;
        case 'Space':
            togglePause();
            break;
        case 'KeyP':
            togglePause();
            break;
    }
}

// 變更方向 (防止反向折返碰撞，並防範同週期內雙鍵快速輸入導致自殺)
function changeDirection(x, y) {
    if (!isPlaying || isPaused || isGameOver) return;

    // 1. 不能與當前物理移動方向 (direction) 相反
    const isOppositeToCurrent = (x !== 0 && x + direction.x === 0) || (y !== 0 && y + direction.y === 0);
    
    // 2. 不能與即將發生的下一個方向 (nextDirection) 相反
    const isOppositeToNext = (x !== 0 && x + nextDirection.x === 0) || (y !== 0 && y + nextDirection.y === 0);

    // 只有在既不違反物理移動方向，也不違反即將踏出的方向時，才更新意圖
    if (!isOppositeToCurrent && !isOppositeToNext) {
        nextDirection = { x, y };
    }
}

// 遊戲結束
function gameOver() {
    isGameOver = true;
    isPlaying = false;
    isExploding = true; // 進入爆炸動畫狀態
    stopGameLoop();

    // 觸發死亡音效與特效
    playDeathSound();
    triggerScreenShake();
    createExplosionParticles();

    // 儲存分數並判斷是否創紀錄
    const isNewRecord = saveUserScore(score);

    // 啟動死亡粒子動畫迴圈
    requestAnimationFrame(updateParticlesLoop);

    // 延遲顯示 Game Over Overlay，並保存定時器 ID
    gameOverTimeoutId = setTimeout(() => {
        isExploding = false; // 結束爆炸動畫狀態
        document.getElementById('final-score').textContent = score;
        const recordMsg = document.getElementById('new-record-msg');
        if (isNewRecord) {
            recordMsg.classList.remove('hidden');
        } else {
            recordMsg.classList.add('hidden');
        }
        document.getElementById('gameover-overlay').classList.remove('hidden');
    }, 800);
}

// 畫面震動特效
function triggerScreenShake() {
    const canvasContainer = document.querySelector('.canvas-container');
    canvasContainer.classList.add('shake');
    setTimeout(() => {
        canvasContainer.classList.remove('shake');
    }, 400);
}

// 建立死亡粒子爆炸陣列
function createExplosionParticles() {
    particles = [];
    
    // 對蛇的每一節生成粒子
    snake.forEach((segment) => {
        const segX = segment.x * GRID_SIZE + GRID_SIZE / 2;
        const segY = segment.y * GRID_SIZE + GRID_SIZE / 2;
        
        // 每一節生成 6 個散開的粒子
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            
            particles.push({
                x: segX,
                y: segY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 3,
                color: '#00ffcc', // 霓虹綠
                alpha: 1,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    });
}

// 粒子更新迴圈
function updateParticlesLoop() {
    if (particles.length === 0) return;

    // 清空 Canvas 並重繪網格與食物（讓食物還留著，但蛇碎掉了）
    ctx.fillStyle = '#04060d';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawGrid();
    drawFood();

    // 更新並繪製粒子
    particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
            particles.splice(idx, 1);
        } else {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });

    if (particles.length > 0) {
        requestAnimationFrame(updateParticlesLoop);
    }
}

// 繪製遊戲所有元素
function draw() {
    // 清空畫布
    ctx.fillStyle = '#04060d';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 繪製背景網格
    drawGrid();

    // 如果遊戲已經結束且粒子在跑，就交給粒子 loop 畫
    if (isGameOver && particles.length > 0) return;

    // 繪製蛇
    drawSnake();

    // 繪製食物
    drawFood();
}

// 繪製背景微弱網格
function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= GRID_COUNT; i++) {
        // 直線
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
        ctx.stroke();

        // 橫線
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
        ctx.stroke();
    }
}

// 繪製蛇
function drawSnake() {
    snake.forEach((segment, index) => {
        const isHead = index === 0;
        
        ctx.save();
        
        // 蛇身發光效果
        ctx.shadowBlur = isHead ? 15 : 8;
        ctx.shadowColor = '#00ffcc';
        
        // 蛇身漸層（頭部亮青色，尾部偏綠色）
        const gradient = ctx.createLinearGradient(
            segment.x * GRID_SIZE, segment.y * GRID_SIZE,
            (segment.x + 1) * GRID_SIZE, (segment.y + 1) * GRID_SIZE
        );
        
        if (isHead) {
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#00ffcc');
        } else {
            const ratio = index / snake.length;
            // 隨長度從霓虹綠漸變到藍綠色
            gradient.addColorStop(0, '#00ffcc');
            gradient.addColorStop(1, '#00bfff');
        }

        ctx.fillStyle = gradient;

        // 圓角矩形蛇身
        const padding = 1.5;
        const x = segment.x * GRID_SIZE + padding;
        const y = segment.y * GRID_SIZE + padding;
        const size = GRID_SIZE - padding * 2;
        const radius = isHead ? 6 : 4; // 蛇頭圓角較大

        drawRoundedRect(ctx, x, y, size, size, radius);
        ctx.fill();

        // 繪製蛇的眼睛 (讓蛇頭有方向感)
        if (isHead) {
            ctx.shadowBlur = 0; // 眼睛不發光
            ctx.fillStyle = '#070b19'; // 眼睛深色
            
            const eyeSize = 3.5;
            let leftEye = { x: 0, y: 0 };
            let rightEye = { x: 0, y: 0 };

            // 依據前進方向決定眼睛位置
            if (direction.x === 0 && direction.y === -1) { // 向上
                leftEye = { x: x + 4, y: y + 5 };
                rightEye = { x: x + size - 7, y: y + 5 };
            } else if (direction.x === 0 && direction.y === 1) { // 向下
                leftEye = { x: x + 4, y: y + size - 8 };
                rightEye = { x: x + size - 7, y: y + size - 8 };
            } else if (direction.x === -1 && direction.y === 0) { // 向左
                leftEye = { x: x + 5, y: y + 4 };
                rightEye = { x: x + 5, y: y + size - 7 };
            } else if (direction.x === 1 && direction.y === 0) { // 向右
                leftEye = { x: x + size - 8, y: y + 4 };
                rightEye = { x: x + size - 8, y: y + size - 7 };
            }

            ctx.beginPath();
            ctx.arc(leftEye.x, leftEye.y, eyeSize/2, 0, Math.PI * 2);
            ctx.arc(rightEye.x, rightEye.y, eyeSize/2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
}

// 繪製食物
function drawFood() {
    ctx.save();

    const x = food.x * GRID_SIZE + GRID_SIZE / 2;
    const y = food.y * GRID_SIZE + GRID_SIZE / 2;
    const radius = GRID_SIZE / 2 - 2;

    if (food.type === 'gold') {
        // 金色食物
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ffd700';
        ctx.fillStyle = '#ffd700';

        // 畫發光星形或圓形，這裡用呼吸縮放的圓形代表高級能量球
        const time = Date.now() * 0.006;
        const pulseRadius = radius + Math.sin(time) * 1.5;

        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();

        // 加個內白色亮點
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - 1.5, y - 1.5, pulseRadius * 0.35, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // 普通霓虹粉紅食物
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff2e93';
        ctx.fillStyle = '#ff2e93';

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 內亮點
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - 1.2, y - 1.2, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// 圓角矩形輔助函式
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height - radius);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Web Audio API 播單音
function playTone(freq, type = 'sine', duration = 0.1, stopDelay = 0) {
    if (!soundEnabled || !audioCtx) return;
    
    // 如果 AudioContext 被瀏覽器掛起，嘗試重啟
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // 控制音量，防刺耳
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start(audioCtx.currentTime + stopDelay);
        osc.stop(audioCtx.currentTime + duration + stopDelay);
    } catch (e) {
        console.warn("Audio error:", e);
    }
}

// 吃到食物音效 (向上滑音)
function playEatSound(isGold) {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'triangle'; // 三角波較柔和，有 8-bit 質感
        const startFreq = isGold ? 587.33 : 523.25; // D5 或 C5
        const endFreq = isGold ? 1174.66 : 1046.50; // D6 或 C6
        
        osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } catch(e) {}
}

// 死亡音效 (向下滑音 + 鋸齒噪聲)
function playDeathSound() {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    try {
        // 第一個低音下滑
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc1.frequency.linearRampToValueAtTime(60, audioCtx.currentTime + 0.4);
        gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
        
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.5);

        // 第二個雜訊模擬撞擊
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc2.frequency.setValueAtTime(40, audioCtx.currentTime + 0.1);
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);

        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.22);
    } catch(e) {}
}

// 網頁載入後初始化
window.addEventListener('DOMContentLoaded', () => {
    initGame();
});
