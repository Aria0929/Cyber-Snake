// 💡 本地 config.js 載入的配置資訊將作為全域變數 firebaseConfig 傳入此處。
// 💡 config.js 已被設定為 git 忽略，防止私密金鑰流出至 GitHub。


// 帳號與排行榜的 LocalStorage Key (備用/本地降級模式使用)
const USERS_KEY = 'cyber_snake_users';
const LEADERBOARD_KEY = 'cyber_snake_leaderboard';

// 系統狀態變數
let currentUser = null;
let database = null;
let isFirebaseEnabled = false;

// 初始化帳號系統與資料庫連線
async function initAuth() {
    const authOverlay = document.getElementById('auth-overlay');
    const authForm = document.getElementById('auth-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const submitBtn = document.getElementById('submit-btn');
    const guestBtn = document.getElementById('guest-btn');
    const authMessage = document.getElementById('auth-message');
    const logoutBtn = document.getElementById('logout-btn');

    let currentTab = 'login'; // 'login' 或 'register'

    // 1. 初始化 Firebase 雲端資料庫
    checkAndInitFirebase();

    // 2. 切換 Tab
    tabLogin.addEventListener('click', () => {
        currentTab = 'login';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        submitBtn.textContent = '進入深淵';
        submitBtn.className = 'neon-btn neon-btn-pink';
        authMessage.textContent = '';
    });

    tabRegister.addEventListener('click', () => {
        currentTab = 'register';
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        submitBtn.textContent = '註冊帳號';
        submitBtn.className = 'neon-btn neon-btn-blue';
        authMessage.textContent = '';
    });

    // 3. 提交登入/註冊表單
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            authMessage.style.color = '#ff2e93';
            authMessage.textContent = '請填寫完整資訊';
            return;
        }

        // 帳號名稱安全性檢查
        if (username.includes('.') || username.includes('#') || username.includes('$') || username.includes('[') || username.includes(']')) {
            authMessage.style.color = '#ff2e93';
            authMessage.textContent = '用戶名不得包含 . # $ [ ] 字元';
            return;
        }

        // 🛡️ 新增長度限制，防範惡意註冊大數據攻擊
        if (username.length < 3 || username.length > 12) {
            authMessage.style.color = '#ff2e93';
            authMessage.textContent = '用戶名長度需介於 3 到 12 個字元';
            return;
        }
        if (password.length < 6 || password.length > 20) {
            authMessage.style.color = '#ff2e93';
            authMessage.textContent = '密碼長度需介於 6 到 20 個字元';
            return;
        }

        submitBtn.disabled = true;
        authMessage.style.color = '#94a3b8';
        authMessage.textContent = '驗證中...';

        try {
            if (currentTab === 'register') {
                const success = await registerUser(username, password);
                if (success) {
                    authMessage.style.color = '#00ffcc';
                    authMessage.textContent = '註冊成功！已為您自動登入...';
                    setTimeout(() => {
                        login(username);
                    }, 1000);
                } else {
                    authMessage.style.color = '#ff2e93';
                    authMessage.textContent = '該用戶名稱已被註冊！';
                }
            } else {
                const success = await verifyUser(username, password);
                if (success) {
                    login(username);
                } else {
                    authMessage.style.color = '#ff2e93';
                    authMessage.textContent = '帳號或密碼錯誤！';
                }
            }
        } catch (err) {
            authMessage.style.color = '#ff2e93';
            authMessage.textContent = '連線失敗，請重試！';
            console.error(err);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // 4. 遊客登入
    guestBtn.addEventListener('click', () => {
        login(null);
    });

    // 5. 登出按鈕
    logoutBtn.addEventListener('click', () => {
        logout();
    });

    // 6. 檢查現有 Session
    const savedUser = sessionStorage.getItem('cyber_snake_current_user');
    if (savedUser) {
        if (savedUser === 'Guest') {
            login(null);
        } else {
            login(savedUser);
        }
    } else {
        authOverlay.classList.remove('hidden');
    }

    // 7. 載入並渲染排行榜
    renderLeaderboard();
}

// 檢查並初始化 Firebase 連線
function checkAndInitFirebase() {
    const subtitle = document.querySelector('.auth-card .subtitle');
    // 安全地取得全域變數中的 firebaseConfig
    const config = typeof firebaseConfig !== 'undefined' ? firebaseConfig : null;

    if (config && config.apiKey && config.apiKey !== "YOUR_API_KEY") {
        try {
            firebase.initializeApp(config);
            database = firebase.database();
            isFirebaseEnabled = true;
            console.log("⚡ Firebase 雲端資料庫已成功載入！啟用「跨電腦全域排行榜」模式。");
            if (subtitle) {
                subtitle.innerHTML = '免費版貪食蛇 ‧ <span style="color: #00ffcc;">雲端全域排行榜模式</span>';
            }
        } catch (e) {
            console.error("Firebase 初始化失敗，自動降級為本地 LocalStorage 模式:", e);
            isFirebaseEnabled = false;
        }
    } else {
        console.log("ℹ️ 未設定 Firebase API Key，目前正自動運行於「本機 LocalStorage 儲存」模式。");
        if (subtitle) {
            subtitle.innerHTML = '免費版貪食蛇 ‧ <span style="color: #ff2e93;">本機遊玩存儲模式</span>';
        }
    }
}

// ==========================================
// 帳號資料讀寫函數 (相容雲端 / 本地雙模式)
// ==========================================

// 🛡️ 單向密碼加密 (SHA-256) - 防止任何人在資料庫查閱玩家明文密碼
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 註冊帳號
async function registerUser(username, password) {
    const hashedPassword = await hashPassword(password);
    if (isFirebaseEnabled) {
        // [雲端模式]
        const snapshot = await database.ref('users/' + username).once('value');
        if (snapshot.exists()) {
            return false; // 使用者已存在
        }
        // 建立新用戶，預設最高分為 0，儲存加密後的雜湊值
        await database.ref('users/' + username).set({
            password: hashedPassword,
            highScore: 0
        });
        return true;
    } else {
        // [本地模式]
        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || {};
        if (users[username]) {
            return false; // 已存在
        }
        users[username] = {
            password: hashedPassword,
            highScore: 0
        };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return true;
    }
}

// 驗證帳密
async function verifyUser(username, password) {
    const hashedPassword = await hashPassword(password);
    if (isFirebaseEnabled) {
        // [雲端模式]
        const snapshot = await database.ref('users/' + username).once('value');
        if (!snapshot.exists()) return false;
        const userData = snapshot.val();
        return userData.password === hashedPassword;
    } else {
        // [本地模式]
        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || {};
        if (!users[username]) return false;
        return users[username].password === hashedPassword;
    }
}

// 獲取當前用戶歷史最高紀錄
async function getPersonalHighScore() {
    if (!currentUser || currentUser === 'Guest') return 0;
    
    if (isFirebaseEnabled) {
        // [雲端模式]
        try {
            const snapshot = await database.ref('users/' + currentUser + '/highScore').once('value');
            return snapshot.exists() ? snapshot.val() : 0;
        } catch (e) {
            console.error(e);
            return 0;
        }
    } else {
        // [本地模式]
        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || {};
        return (users[currentUser] && users[currentUser].highScore) ? users[currentUser].highScore : 0;
    }
}

// ==========================================
// 排行榜更新與渲染 (相容雲端 / 本地雙模式)
// ==========================================

// 更新當前登入者分數，若有更新則同步雲端與排行榜
async function saveUserScore(score) {
    if (!currentUser || currentUser === 'Guest') return false;

    let isNewRecord = false;

    if (isFirebaseEnabled) {
        // [雲端模式]
        try {
            const currentRecord = await getPersonalHighScore();
            if (score > currentRecord) {
                // 1. 更新個人最高分數
                await database.ref('users/' + currentUser + '/highScore').set(score);
                isNewRecord = true;
                
                // 2. 即時更新介面上的個人高分顯示
                document.getElementById('personal-high').textContent = String(score).padStart(3, '0');
            }
            
            // 3. 同步更新全域排行榜（不管是新紀錄還是高分，都會進入排行榜權重計算）
            await updateCloudLeaderboard(currentUser, score);
        } catch (e) {
            console.error("更新雲端分數失敗:", e);
        }
    } else {
        // [本地模式]
        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || {};
        if (users[currentUser]) {
            if (score > users[currentUser].highScore) {
                users[currentUser].highScore = score;
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                isNewRecord = true;
                
                // 更新介面
                document.getElementById('personal-high').textContent = String(score).padStart(3, '0');
            }
        }
        updateLocalLeaderboard(currentUser, score);
    }

    return isNewRecord;
}

// 雲端排行榜更新
async function updateCloudLeaderboard(username, score) {
    try {
        const leaderboardRef = database.ref('leaderboard');
        const snapshot = await leaderboardRef.once('value');
        let leaderboard = snapshot.exists() ? snapshot.val() : [];

        // 尋找此用戶是否已在榜中
        const userIndex = leaderboard.findIndex(entry => entry.username === username);
        
        if (userIndex !== -1) {
            if (score > leaderboard[userIndex].score) {
                leaderboard[userIndex].score = score;
            }
        } else {
            leaderboard.push({ username, score });
        }

        // 排序前 5 名
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 5);

        // 寫回雲端
        await leaderboardRef.set(leaderboard);
    } catch (e) {
        console.error("雲端排行榜寫入出錯:", e);
    }
}

// 本地排行榜更新
function updateLocalLeaderboard(username, score) {
    let leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
    const userIndex = leaderboard.findIndex(entry => entry.username === username);
    
    if (userIndex !== -1) {
        if (score > leaderboard[userIndex].score) {
            leaderboard[userIndex].score = score;
        }
    } else {
        leaderboard.push({ username, score });
    }

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    renderLeaderboard();
}

// 渲染排行榜 UI (雲端模式將使用 Realtime Listeners 實時推送更新)
function renderLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    if (isFirebaseEnabled) {
        // [雲端模式] 監聽雲端資料庫的變化，實現實時同步更新
        database.ref('leaderboard').on('value', (snapshot) => {
            const leaderboard = snapshot.exists() ? snapshot.val() : [];
            updateLeaderboardUI(listEl, leaderboard);
        });
    } else {
        // [本地模式] 直接渲染 LocalStorage 資料
        const leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
        updateLeaderboardUI(listEl, leaderboard);
    }
}

// 渲染 DOM 的輔助函數
function updateLeaderboardUI(listEl, leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
        listEl.innerHTML = '<li class="empty-list">尚無挑戰紀錄</li>';
        return;
    }

    // 🛡️ 安全防禦：在前端渲染前，強制將分數轉為數字並進行「由大到小」排序。
    // 這能防範：(1) Firebase 儲存順序錯亂；(2) 外部手動輸入字串比較產生的排序 Bug。
    const sortedLeaderboard = [...leaderboard].sort((a, b) => Number(b.score) - Number(a.score));

    listEl.innerHTML = sortedLeaderboard.map((entry, index) => {
        const rank = index + 1;
        let rankClass = '';
        if (rank <= 3) {
            rankClass = `top-rank-${rank}`;
        }
        return `
            <li class="${rankClass}">
                <span class="rank">#${rank}</span>
                <span class="username">${escapeHTML(entry.username)}</span>
                <span class="score">${entry.score} 分</span>
            </li>
        `;
    }).join('');
}

// 執行登入程序
async function login(username) {
    const authOverlay = document.getElementById('auth-overlay');
    const displayUsername = document.getElementById('display-username');
    const personalHighVal = document.getElementById('personal-high');

    if (username) {
        currentUser = username;
        sessionStorage.setItem('cyber_snake_current_user', username);
        displayUsername.textContent = username;
        displayUsername.className = 'neon-text-blue';
        document.querySelector('.user-status').textContent = '傳奇冒險者';
        
        // 讀取個人最高紀錄 (雲端/本地自動適配)
        const score = await getPersonalHighScore();
        personalHighVal.textContent = String(score).padStart(3, '0');
    } else {
        currentUser = 'Guest';
        sessionStorage.setItem('cyber_snake_current_user', 'Guest');
        displayUsername.textContent = '遊客 (Guest)';
        displayUsername.className = 'neon-text-pink';
        document.querySelector('.user-status').textContent = '臨時冒險者';
        personalHighVal.textContent = '000';
    }

    // 隱藏登入層並釋放焦點
    authOverlay.classList.add('hidden');
    if (document.activeElement) {
        document.activeElement.blur();
    }
    
    // 重設輸入框
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('auth-message').textContent = '';

    // 重新渲染排行榜
    renderLeaderboard();

    // 重設遊戲狀態
    if (typeof resetGameOnLogin === 'function') {
        resetGameOnLogin();
    }
}

// 登出
function logout() {
    currentUser = null;
    sessionStorage.removeItem('cyber_snake_current_user');
    document.getElementById('auth-overlay').classList.remove('hidden');
    
    // 重設分數顯示
    document.getElementById('current-score').textContent = '000';
    document.getElementById('personal-high').textContent = '000';
}

// HTML 安全轉義
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// DOM 載入後啟動
window.addEventListener('DOMContentLoaded', () => {
    initAuth();
});
