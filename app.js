/**
 * CyberSnake 2077 - 遊戲邏輯與帳號管理
 */

/* ==========================================================================
   1. 音效管理員 (SoundManager) - 使用 Web Audio API 即時合成
   ========================================================================== */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.isEnabled = localStorage.getItem('cybersnake_audio') !== 'false';
    this.updateButtonUI();
  }

  init() {
    if (!this.ctx) {
      // 延遲初始化 AudioContext 以符合瀏覽器安全原則
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    localStorage.setItem('cybersnake_audio', this.isEnabled);
    this.updateButtonUI();
  }

  updateButtonUI() {
    const btn = document.getElementById('audioToggleBtn');
    const icon = document.getElementById('audioIcon');
    if (!btn || !icon) return;

    if (this.isEnabled) {
      btn.classList.add('active');
      icon.setAttribute('data-lucide', 'volume-2');
    } else {
      btn.classList.remove('active');
      icon.setAttribute('data-lucide', 'volume-x');
    }
    // 重新建立 Lucide 圖示
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  playEatSound(isSpecial = false) {
    if (!this.isEnabled) return;
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    
    if (isSpecial) {
      // 特殊食物音效：滑音 (Arpeggio style)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // 普通食物音效：快速清脆的嗶聲
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }

  playDeadSound() {
    if (!this.isEnabled) return;
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    
    // 死亡音效：重低音滑落與噪音感
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.45);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playComboAlertSound() {
    if (!this.isEnabled) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const now = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(900, now + 0.05);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

/* ==========================================================================
   2. 帳密與會話管理員 (AuthManager) - 使用 LocalStorage
   ========================================================================== */
class AuthManager {
  constructor() {
    this.usersKey = 'cybersnake_users';
    this.sessionKey = 'cybersnake_session';
    
    // 初始化使用者資料庫，若無則建立預設帳號供排行榜展示
    if (!localStorage.getItem(this.usersKey)) {
      const defaultUsers = {
        'NeoCoder': { password: 'password123', highScore: 280, skin: 'cyber-cyan' },
        'PixelMaster': { password: 'password123', highScore: 180, skin: 'laser-pink' },
        'CyberSnake99': { password: 'password123', highScore: 90, skin: 'neon-green' }
      };
      localStorage.setItem(this.usersKey, JSON.stringify(defaultUsers));
    }
  }

  getUsers() {
    return JSON.parse(localStorage.getItem(this.usersKey)) || {};
  }

  saveUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  register(username, password) {
    const users = this.getUsers();
    
    if (users[username]) {
      return { success: false, message: '此帳號已存在！' };
    }
    
    users[username] = {
      password: password,
      highScore: 0,
      skin: 'neon-green'
    };
    
    this.saveUsers(users);
    return { success: true };
  }

  login(username, password) {
    const users = this.getUsers();
    
    if (!users[username]) {
      return { success: false, message: '帳號不存在！' };
    }
    if (users[username].password !== password) {
      return { success: false, message: '密碼錯誤！' };
    }
    
    // 設定 Session
    localStorage.setItem(this.sessionKey, username);
    return { success: true, user: users[username] };
  }

  logout() {
    localStorage.removeItem(this.sessionKey);
  }

  getCurrentUser() {
    const username = localStorage.getItem(this.sessionKey);
    if (!username) return null;
    
    const users = this.getUsers();
    return {
      username: username,
      highScore: users[username]?.highScore || 0,
      skin: users[username]?.skin || 'neon-green'
    };
  }

  updateHighScore(username, newScore) {
    if (!username) return false;
    
    const users = this.getUsers();
    if (users[username] && newScore > users[username].highScore) {
      users[username].highScore = newScore;
      this.saveUsers(users);
      return true; // 破紀錄
    }
    return false;
  }

  updateUserSkin(username, skinName) {
    if (!username) return;
    const users = this.getUsers();
    if (users[username]) {
      users[username].skin = skinName;
      this.saveUsers(users);
    }
  }

  getLeaderboard() {
    const users = this.getUsers();
    const list = Object.keys(users).map(username => ({
      username: username,
      highScore: users[username].highScore
    }));
    // 降冪排序
    return list.sort((a, b) => b.highScore - a.highScore);
  }
}

/* ==========================================================================
   3. 粒子系統 (ParticleSystem) - 增加吃食物時的霓虹粒子特效
   ========================================================================== */
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6; // 隨機水平初速
    this.vy = (Math.random() - 0.5) * 6; // 隨機垂直初速
    this.size = Math.random() * 3 + 2;
    this.alpha = 1;
    this.decay = Math.random() * 0.03 + 0.02; // 淡出速率
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
    if (this.size > 0.1) this.size -= 0.05;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawn(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }

  clear() {
    this.particles = [];
  }
}

/* ==========================================================================
   4. 貪食蛇實體類別 (Snake)
   ========================================================================== */
class Snake {
  constructor(gridSize, cols, rows) {
    this.gridSize = gridSize;
    this.cols = cols;
    this.rows = rows;
    this.reset();
  }

  reset() {
    // 初始位置在中央，長度 3
    const startX = Math.floor(this.cols / 2);
    const startY = Math.floor(this.rows / 2);
    this.segments = [
      { x: startX, y: startY },
      { x: startX, y: startY + 1 },
      { x: startX, y: startY + 2 }
    ];
    this.direction = 'UP';
    this.nextDirection = 'UP';
  }

  setDirection(newDirection) {
    const opp = {
      'UP': 'DOWN', 'DOWN': 'UP',
      'LEFT': 'RIGHT', 'RIGHT': 'LEFT'
    };
    // 防止直接反向自撞
    if (newDirection !== opp[this.direction]) {
      this.nextDirection = newDirection;
    }
  }

  move() {
    this.direction = this.nextDirection;
    
    // 計算蛇頭的新位置
    const head = { ...this.segments[0] };
    
    switch (this.direction) {
      case 'UP':    head.y -= 1; break;
      case 'DOWN':  head.y += 1; break;
      case 'LEFT':  head.x -= 1; break;
      case 'RIGHT': head.x += 1; break;
    }

    // 將新頭部插入陣列前端
    this.segments.unshift(head);
    // 預設將尾巴移除，若吃掉食物則由 Game 呼叫 grow() 加回來
    return this.segments.pop(); 
  }

  grow(tailSegment) {
    // 把剛移除的尾巴段插回身體
    if (tailSegment) {
      this.segments.push(tailSegment);
    }
  }

  checkCollision() {
    const head = this.segments[0];

    // 1. 撞牆判定
    if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
      return true;
    }

    // 2. 自撞身體判定 (避開頭部自己)
    for (let i = 1; i < this.segments.length; i++) {
      if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
        return true;
      }
    }

    return false;
  }

  // 繪製貪食蛇
  draw(ctx, skinName) {
    const skinColors = {
      'neon-green': { primary: '#39ff14', secondary: '#1db500' },
      'laser-pink': { primary: '#ff007f', secondary: '#a80053' },
      'cyber-cyan': { primary: '#00f0ff', secondary: '#009bb3' },
      'rainbow': { primary: null, secondary: null } // 動態彩虹漸變
    };

    const colors = skinColors[skinName] || skinColors['neon-green'];

    this.segments.forEach((segment, index) => {
      const isHead = index === 0;
      const x = segment.x * this.gridSize;
      const y = segment.y * this.gridSize;
      const radius = this.gridSize / 2;

      ctx.save();
      ctx.beginPath();

      // 決定顏色與發光效果
      let fillStyle;
      let shadowColor;

      if (skinName === 'rainbow') {
        const hue = (index * 15 + Date.now() / 20) % 360;
        fillStyle = `hsl(${hue}, 100%, 55%)`;
        shadowColor = `hsl(${hue}, 100%, 55%)`;
      } else {
        fillStyle = isHead ? colors.primary : colors.secondary;
        shadowColor = colors.primary;
      }

      ctx.fillStyle = fillStyle;
      ctx.shadowBlur = isHead ? 15 : 8;
      ctx.shadowColor = shadowColor;

      // 繪製圓角造型蛇身
      if (isHead) {
        // 頭部為圓形
        ctx.arc(x + radius, y + radius, radius - 1, 0, Math.PI * 2);
        ctx.fill();

        // 繪製科技感的眼睛
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        const eyeOffset = radius / 2;
        const eyeRadius = 2.5;

        // 根據方向決定眼睛的偏移
        let eye1 = { x: 0, y: 0 };
        let eye2 = { x: 0, y: 0 };

        if (this.direction === 'UP' || this.direction === 'DOWN') {
          eye1 = { x: x + radius - eyeOffset, y: y + radius };
          eye2 = { x: x + radius + eyeOffset, y: y + radius };
        } else {
          eye1 = { x: x + radius, y: y + radius - eyeOffset };
          eye2 = { x: x + radius, y: y + radius + eyeOffset };
        }
        
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 身體為圓角矩形 (附帶舊版瀏覽器 fallback)
        const padding = 2;
        const width = this.gridSize - padding * 2;
        const height = this.gridSize - padding * 2;
        if (ctx.roundRect) {
          ctx.roundRect(x + padding, y + padding, width, height, 6);
        } else {
          ctx.rect(x + padding, y + padding, width, height);
        }
        ctx.fill();
      }

      ctx.restore();
    });
  }
}

/* ==========================================================================
   5. 食物實體類別 (Food)
   ========================================================================== */
class Food {
  constructor(gridSize, cols, rows) {
    this.gridSize = gridSize;
    this.cols = cols;
    this.rows = rows;
    this.x = 0;
    this.y = 0;
    this.type = 'normal'; // 'normal' 或 'special'
  }

  respawn(snakeSegments) {
    let onSnake = true;
    while (onSnake) {
      this.x = Math.floor(Math.random() * this.cols);
      this.y = Math.floor(Math.random() * this.rows);
      
      // 確保食物不生成在蛇的身體上
      onSnake = snakeSegments.some(segment => segment.x === this.x && segment.y === this.y);
    }

    // 20% 機率生成特殊能量食物
    this.type = Math.random() < 0.20 ? 'special' : 'normal';
  }

  draw(ctx) {
    const x = this.x * this.gridSize;
    const y = this.y * this.gridSize;
    const radius = this.gridSize / 2;
    const time = Date.now();

    ctx.save();
    ctx.beginPath();

    if (this.type === 'special') {
      // 特殊能量食物：粉色/黃色呼吸閃爍發光
      const pulse = 2 * Math.sin(time / 100);
      const rad = radius - 1 + pulse;
      ctx.arc(x + radius, y + radius, Math.max(4, rad), 0, Math.PI * 2);
      ctx.fillStyle = '#ff007f';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff007f';
      ctx.fill();

      // 核心黃色小球
      ctx.beginPath();
      ctx.arc(x + radius, y + radius, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fffb00';
      ctx.shadowBlur = 0;
      ctx.fill();
    } else {
      // 普通食物：藍色靜態光暈
      ctx.arc(x + radius, y + radius, radius - 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
      ctx.fill();
    }

    ctx.restore();
  }
}

/* ==========================================================================
   6. 遊戲引擎核心 (Game Engine)
   ========================================================================== */
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // 設定網格大小
    this.gridSize = 20;
    this.cols = this.canvas.width / this.gridSize;
    this.rows = this.canvas.height / this.gridSize;

    // 模組實例化
    this.auth = new AuthManager();
    this.sound = new SoundManager();
    this.particles = new ParticleSystem();
    this.snake = new Snake(this.gridSize, this.cols, this.rows);
    this.food = new Food(this.gridSize, this.cols, this.rows);

    // 遊戲狀態與分數
    this.gameState = 'READY'; // READY, PLAYING, PAUSED, GAMEOVER
    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = null;
    this.comboDuration = 4000; // 4 秒內要吃下一顆
    this.comboTimeLeft = 0;
    
    // 使用者狀態與設定
    this.currentUser = null;
    this.personalHighScore = 0;
    this.speed = 80; // 毫秒
    this.skin = 'neon-green';

    this.loopId = null;
    this.isCheckingKeys = false;

    // 初始化與綁定 DOM
    this.initDOM();
    this.updateUserSession();
    this.renderLeaderboard();
  }

  initDOM() {
    // 綁定控制按鈕
    document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
    document.getElementById('loginOpenBtn').addEventListener('click', () => this.openAuthDialog());
    document.getElementById('dialogCloseBtn').addEventListener('click', () => this.closeAuthDialog());
    document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    
    // 綁定設定選單
    const speedSelect = document.getElementById('speedSelect');
    speedSelect.addEventListener('change', (e) => {
      this.speed = parseInt(e.target.value, 10);
      if (this.gameState === 'PLAYING') {
        this.restartGameLoop();
      }
    });

    const skinSelect = document.getElementById('skinSelect');
    skinSelect.addEventListener('change', (e) => {
      this.skin = e.target.value;
      if (this.currentUser) {
        this.auth.updateUserSkin(this.currentUser.username, this.skin);
      }
    });

    document.getElementById('audioToggleBtn').addEventListener('click', () => this.sound.toggle());

    // 帳號對話框與表單
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabLoginBtn.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      document.getElementById('loginError').classList.add('hidden');
      document.getElementById('regError').classList.add('hidden');
    });

    tabRegisterBtn.addEventListener('click', () => {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      document.getElementById('loginError').classList.add('hidden');
      document.getElementById('regError').classList.add('hidden');
    });

    // 註冊表單送出
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('regUser');
      const passInput = document.getElementById('regPass');
      const confirmInput = document.getElementById('regPassConfirm');
      const regError = document.getElementById('regError');

      regError.classList.add('hidden');

      if (passInput.value !== confirmInput.value) {
        regError.textContent = '兩次輸入的密碼不一致！';
        regError.classList.remove('hidden');
        return;
      }

      const res = this.auth.register(usernameInput.value.trim(), passInput.value);
      if (res.success) {
        // 自動登入
        const loginRes = this.auth.login(usernameInput.value.trim(), passInput.value);
        if (loginRes.success) {
          this.updateUserSession();
          this.closeAuthDialog();
          // 清空欄位
          registerForm.reset();
        }
      } else {
        regError.textContent = res.message;
        regError.classList.remove('hidden');
      }
    });

    // 登入表單送出
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('loginUser');
      const passInput = document.getElementById('loginPass');
      const loginError = document.getElementById('loginError');

      loginError.classList.add('hidden');

      const res = this.auth.login(usernameInput.value.trim(), passInput.value);
      if (res.success) {
        this.updateUserSession();
        this.closeAuthDialog();
        loginForm.reset();
      } else {
        loginError.textContent = res.message;
        loginError.classList.remove('hidden');
      }
    });

    // 鍵盤輸入事件綁定
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  // 登入狀態與 UI 更新
  updateUserSession() {
    this.currentUser = this.auth.getCurrentUser();
    
    const userWelcome = document.getElementById('userWelcome');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginOpenBtn = document.getElementById('loginOpenBtn');
    const skinSelect = document.getElementById('skinSelect');
    const speedSelect = document.getElementById('speedSelect');

    if (this.currentUser) {
      // 已登入
      userWelcome.classList.remove('hidden');
      usernameDisplay.textContent = this.currentUser.username;
      logoutBtn.classList.remove('hidden');
      loginOpenBtn.classList.add('hidden');
      
      this.personalHighScore = this.currentUser.highScore;
      this.skin = this.currentUser.skin;
      
      // 同步 UI 設定
      skinSelect.value = this.skin;
      
      document.getElementById('overlaySub').innerHTML = `戰士已就位: <span class="neon-text-green">${this.currentUser.username}</span><br>個人最高分: ${this.personalHighScore}分`;
    } else {
      // 訪客狀態
      userWelcome.classList.add('hidden');
      logoutBtn.classList.add('hidden');
      loginOpenBtn.classList.remove('hidden');
      
      this.personalHighScore = parseInt(localStorage.getItem('cybersnake_guest_highscore') || '0', 10);
      
      document.getElementById('overlaySub').innerHTML = `當前為訪客模式<br>（分數將無法上傳全球排行榜，請登入後挑戰）`;
    }

    this.updateScoreUI();
    this.renderLeaderboard();
  }

  logout() {
    this.auth.logout();
    this.updateUserSession();
    this.resetGame();
  }

  openAuthDialog() {
    const dialog = document.getElementById('authDialog');
    dialog.showModal();
    // 暫停遊戲以防登入時被撞死
    if (this.gameState === 'PLAYING') {
      this.pauseGame();
    }
  }

  closeAuthDialog() {
    const dialog = document.getElementById('authDialog');
    dialog.close();
  }

  // 排行榜渲染
  renderLeaderboard() {
    const list = this.auth.getLeaderboard();
    const listContainer = document.getElementById('leaderboardList');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    
    if (list.length === 0) {
      listContainer.innerHTML = '<div class="no-data">暫無排行數據</div>';
      return;
    }

    // 只渲染前 5 名
    list.slice(0, 5).forEach((item, index) => {
      const rank = index + 1;
      const li = document.createElement('li');
      li.className = `leaderboard-item rank-${rank}`;
      
      // 指出當前登入者
      const isSelf = this.currentUser && this.currentUser.username === item.username;
      const selfBadge = isSelf ? ' <span class="neon-text-green">(你)</span>' : '';

      li.innerHTML = `
        <div class="rank-user">
          <span class="rank-num">${rank}</span>
          <span class="rank-username">${item.username}${selfBadge}</span>
        </div>
        <span class="rank-score">${item.highScore}</span>
      `;
      listContainer.appendChild(li);
    });
  }

  // 更新分數與連擊 UI
  updateScoreUI() {
    const format = (num) => String(num).padStart(3, '0');
    
    document.getElementById('currentScore').textContent = format(this.score);
    document.getElementById('personalHighScore').textContent = format(this.personalHighScore);
    
    const mult = document.getElementById('comboMultiplier');
    mult.textContent = `x${this.combo.toFixed(1)}`;
    if (this.combo > 1.0) {
      mult.className = 'neon-text-green';
    } else {
      mult.className = 'neon-text-blue';
    }
  }

  // 鍵盤操控
  handleKeyDown(e) {
    if (this.gameState === 'GAMEOVER') return;

    const key = e.key;

    // 空白鍵暫停
    if (key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      if (this.gameState === 'PLAYING') {
        this.pauseGame();
      } else if (this.gameState === 'PAUSED') {
        this.resumeGame();
      }
      return;
    }

    // 貪食蛇方向控制
    if (this.gameState === 'PLAYING') {
      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          this.snake.setDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          this.snake.setDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          this.snake.setDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          this.snake.setDirection('RIGHT');
          break;
      }
    }
  }

  /* ==========================================================================
     7. 遊戲控制與迴圈
     ========================================================================== */
  resetGame() {
    this.score = 0;
    this.combo = 1.0;
    this.resetCombo();
    this.snake.reset();
    this.particles.clear();
    this.food.respawn(this.snake.segments);
    this.updateScoreUI();
  }

  startGame() {
    this.resetGame();
    this.gameState = 'PLAYING';
    
    // 隱藏覆蓋圖層
    document.getElementById('gameOverlay').classList.add('hidden');
    
    // 開啟音效系統
    this.sound.init();

    this.restartGameLoop();
  }

  pauseGame() {
    this.gameState = 'PAUSED';
    document.getElementById('overlayTitle').textContent = 'GAME PAUSED';
    document.getElementById('overlaySub').textContent = '按 [Space] 或點擊下方按鈕以繼續';
    document.getElementById('startGameBtn').innerHTML = '<i data-lucide="play"></i> 繼續遊戲';
    document.getElementById('gameOverlay').classList.remove('hidden');
    
    // 重新載入繼續遊戲按鈕的圖示
    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.stopGameLoop();
  }

  resumeGame() {
    this.gameState = 'PLAYING';
    document.getElementById('gameOverlay').classList.add('hidden');
    this.restartGameLoop();
  }

  stopGameLoop() {
    if (this.loopId) {
      clearTimeout(this.loopId);
      this.loopId = null;
    }
  }

  restartGameLoop() {
    this.stopGameLoop();
    this.gameStep();
  }

  // 單一步驟更新與重繪
  gameStep() {
    if (this.gameState !== 'PLAYING') return;

    this.updateGameLogic();
    this.drawGame();

    // 遞迴調用
    this.loopId = setTimeout(() => this.gameStep(), this.speed);
  }

  // 邏輯更新
  updateGameLogic() {
    // 1. 移動貪食蛇並獲取尾巴片段（用以被吃食物時加回來）
    const tailSegment = this.snake.move();

    // 2. 死亡碰撞偵測
    if (this.snake.checkCollision()) {
      this.gameOver();
      return;
    }

    // 3. 吃食物判定
    const head = this.snake.segments[0];
    if (head.x === this.food.x && head.y === this.food.y) {
      this.snake.grow(tailSegment);
      this.handleEatFood();
      this.food.respawn(this.snake.segments);
    }

    // 更新連擊倒數與粒子
    this.updateComboTimer();
    this.particles.update();
  }

  // 處理吃食物邏輯 (包含分數、連擊、音效、粒子)
  handleEatFood() {
    const isSpecial = this.food.type === 'special';
    
    // 播放音效
    this.sound.playEatSound(isSpecial);

    // 計算吃掉的得分基數
    const baseScore = isSpecial ? 30 : 10;
    const addedScore = Math.round(baseScore * this.combo);
    this.score += addedScore;

    // 觸發粒子特效
    const pX = (this.food.x * this.gridSize) + (this.gridSize / 2);
    const pY = (this.food.y * this.gridSize) + (this.gridSize / 2);
    const particleColor = isSpecial ? '#ff007f' : '#00f0ff';
    this.particles.spawn(pX, pY, particleColor, isSpecial ? 16 : 8);

    // 觸發或累加 Combo
    this.triggerCombo(isSpecial);
    
    // 更新最高分
    this.checkAndUpdateHighScore();
    
    this.updateScoreUI();
  }

  // 連擊系統 (Combo) 觸發
  triggerCombo(isSpecial) {
    if (this.comboTimer) {
      clearTimeout(this.comboTimer);
    }

    // 每次吃東西，Combo 疊加。普通 +0.2，特殊 +0.5。最大 3.0 倍。
    const increment = isSpecial ? 0.5 : 0.2;
    this.combo = Math.min(3.0, this.combo + increment);
    
    if (this.combo >= 2.0 && this.combo - increment < 2.0) {
      // 達成高倍數時的聲音特效
      this.sound.playComboAlertSound();
    }

    this.comboTimeLeft = this.comboDuration;
    this.startComboCountdown();
  }

  startComboCountdown() {
    const intervalTime = 100;
    
    const countdown = () => {
      if (this.gameState !== 'PLAYING') return;

      this.comboTimeLeft -= intervalTime;
      
      const progressFill = document.getElementById('comboProgress');
      if (progressFill) {
        const percentage = Math.max(0, (this.comboTimeLeft / this.comboDuration) * 100);
        progressFill.style.width = `${percentage}%`;
      }

      if (this.comboTimeLeft <= 0) {
        this.resetCombo();
      } else {
        this.comboTimer = setTimeout(countdown, intervalTime);
      }
    };

    this.comboTimer = setTimeout(countdown, intervalTime);
  }

  resetCombo() {
    this.combo = 1.0;
    const progressFill = document.getElementById('comboProgress');
    if (progressFill) {
      progressFill.style.width = '0%';
    }
    this.updateScoreUI();
  }

  updateComboTimer() {
    // 遊戲主迴圈中的備用更新，防止非同步 timer 停滯
    if (this.gameState === 'PLAYING' && this.comboTimeLeft > 0) {
      const progressFill = document.getElementById('comboProgress');
      if (progressFill) {
        const percentage = Math.max(0, (this.comboTimeLeft / this.comboDuration) * 100);
        progressFill.style.width = `${percentage}%`;
      }
    }
  }

  // 分數儲存
  checkAndUpdateHighScore() {
    if (this.score > this.personalHighScore) {
      this.personalHighScore = this.score;
      
      if (this.currentUser) {
        // 如果已登入，寫入資料庫
        this.auth.updateHighScore(this.currentUser.username, this.score);
      } else {
        // 訪客，存入 guest local
        localStorage.setItem('cybersnake_guest_highscore', this.score);
      }
    }
  }

  // 遊戲結束
  gameOver() {
    this.gameState = 'GAMEOVER';
    this.stopGameLoop();
    this.sound.playDeadSound();

    // 再次存檔與更新排行榜
    this.checkAndUpdateHighScore();
    if (this.currentUser) {
      this.auth.updateHighScore(this.currentUser.username, this.score);
      this.renderLeaderboard();
    }

    // 更新顯示與 UI 遮罩
    document.getElementById('overlayTitle').textContent = 'GAME OVER';
    document.getElementById('overlaySub').innerHTML = `
      您的分數: <span class="neon-text-pink">${this.score}分</span><br>
      ${this.currentUser ? '分數已上傳至排行榜！' : '登入後可將您的紀錄列入全球排行！'}
    `;
    document.getElementById('startGameBtn').innerHTML = '<i data-lucide="rotate-ccw"></i> 重新開始';
    
    // 重新載入按鈕的 icon
    if (window.lucide) {
      window.lucide.createIcons();
    }

    document.getElementById('gameOverlay').classList.remove('hidden');
    this.drawGame(); // 繪製死亡畫面 (停止的蛇)
  }

  /* ==========================================================================
     8. 繪圖渲染 (Draw Canvas)
     ========================================================================== */
  drawGame() {
    // 清除畫布
    this.ctx.fillStyle = '#030307';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 繪製科技感的背景格線
    this.drawGrid();

    // 2. 繪製食物
    this.food.draw(this.ctx);

    // 3. 繪製粒子
    this.particles.draw(this.ctx);

    // 4. 繪製蛇
    this.snake.draw(this.ctx, this.skin);

    // 5. 死亡時加上微紅的邊框濾鏡
    if (this.gameState === 'GAMEOVER') {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
      this.ctx.lineWidth = 6;
      this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
  }

  // 繪製背景格線
  drawGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
    
    // 額外繪製一個中心發光暈
    const grad = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 50,
      this.canvas.width / 2, this.canvas.height / 2, 240
    );
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.02)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.restore();
  }
}

// 頁面載入後初始化遊戲
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
  // 先繪製第一幀
  window.game.drawGame();
});
