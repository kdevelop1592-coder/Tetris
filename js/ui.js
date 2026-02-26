import { state } from './game.js';

// ─── Score / Level / Lines / Combo DOM ─────────────────────
export function updateUI() {
    document.getElementById('score-display').textContent = state.score.toLocaleString();
    document.getElementById('level-display').textContent = state.level;
    document.getElementById('lines-display').textContent = state.lines;
    document.getElementById('high-display').textContent = state.highScore.toLocaleString();
    document.getElementById('combo-display').textContent = state.combo + 'x';
    const progress = (state.lines % 10) / 10 * 100;
    document.getElementById('level-bar').style.width = progress + '%';
}

// ─── Overlay ────────────────────────────────────────────────
export function showStartOverlay() {
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <h2>TETRIS</h2>
        <p>← → 이동 &nbsp;|&nbsp; ↑ 회전<br>↓ 빠르게 &nbsp;|&nbsp; SPACE 즉시 낙하<br>P 일시정지</p>
        <button class="start-btn" id="start-btn">START GAME</button>
    `;
    document.getElementById('start-btn').addEventListener('click', () => {
        import('./main.js').then(m => m.startGame());
    });
}

export function showGameOverOverlay(score, level, lines, isLoggedIn) {
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'flex';
    const saveMsg = isLoggedIn
        ? '<span style="color:#00ffff;font-size:5px;">✔ 점수가 랭킹에 저장되었습니다</span>'
        : '<span style="color:rgba(255,255,255,0.3);font-size:5px;">로그인하면 점수가 저장됩니다</span>';
    overlay.innerHTML = `
        <h2>GAME OVER</h2>
        <p>SCORE: ${score.toLocaleString()}<br>LEVEL: ${level}<br>LINES: ${lines}</p>
        ${saveMsg}
        <button class="start-btn" id="start-btn">RETRY</button>
    `;
    document.getElementById('start-btn').addEventListener('click', () => {
        import('./main.js').then(m => m.startGame());
    });
}

export function hideOverlay() {
    document.getElementById('overlay').style.display = 'none';
}

// ─── Auth Header ─────────────────────────────────────────────
export function updateAuthUI(user) {
    const btn = document.getElementById('auth-btn');
    const avatar = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');

    if (user) {
        avatar.src = user.photoURL || '';
        avatar.style.display = user.photoURL ? 'block' : 'none';
        nameEl.textContent = user.displayName || user.email || '';
        nameEl.style.display = 'block';
        btn.textContent = 'LOGOUT';
    } else {
        avatar.style.display = 'none';
        nameEl.style.display = 'none';
        btn.textContent = 'GOOGLE LOGIN';
    }
}
