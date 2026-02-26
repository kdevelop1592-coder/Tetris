import { auth } from './firebase.js';
import {
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

import {
    state, createBoard, randomPiece, collides, rotate,
    getGhostY, getDropSpeed, actualClearLines, COLS, ROWS, PIECES
} from './game.js';
import { draw, drawNext, clearCanvas } from './render.js';
import { updateUI, showLoginRequiredOverlay, showReadyOverlay, showGameOverOverlay, hideOverlay, updateAuthUI } from './ui.js';
import { saveScore, loadRanking } from './ranking.js';

// ─── Auth ────────────────────────────────────────────────────
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthUI(user);
    loadRanking();
    // 게임 중이 아닼 경우에만 오버레이 전환
    if (!state.running) {
        if (user) {
            showReadyOverlay();
        } else {
            showLoginRequiredOverlay();
        }
    }
});

document.getElementById('auth-btn').addEventListener('click', async () => {
    if (currentUser) {
        await signOut(auth);
    } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            console.error('로그인 실패:', e);
        }
    }
});

// ─── Game Start / End ────────────────────────────────────────
export function startGame() {
    // 로그인 필수 체크
    if (!currentUser) {
        showLoginRequiredOverlay();
        return;
    }
    state.board = createBoard();
    state.score = 0;
    state.level = 1;
    state.lines = 0;
    state.combo = 0;
    state.gameOver = false;
    state.paused = false;
    state.nextType = randomPiece();
    spawnPiece();
    updateUI();
    hideOverlay();
    state.running = true;
    state.lastDrop = performance.now();
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    gameLoop(performance.now());
}

async function endGame() {
    state.gameOver = true;
    state.running = false;
    if (state.score > state.highScore) state.highScore = state.score;

    if (currentUser && state.score > 0) {
        await saveScore(state.score, state.level, state.lines);
        await loadRanking();
    }

    showGameOverOverlay(state.score, state.level, state.lines);
}

// ─── Piece Management ────────────────────────────────────────
function spawnPiece() {
    state.pieceType = state.nextType;
    state.nextType = randomPiece();
    state.piece = PIECES[state.pieceType].map(r => [...r]);
    state.pieceX = Math.floor((COLS - state.piece[0].length) / 2);
    state.pieceY = 0;
    if (collides(state.piece, state.pieceX, state.pieceY)) endGame();
}

function lockPiece() {
    for (let r = 0; r < state.piece.length; r++)
        for (let c = 0; c < state.piece[r].length; c++)
            if (state.piece[r][c] && state.pieceY + r >= 0)
                state.board[state.pieceY + r][state.pieceX + c] = state.pieceType;
    clearLines();
    spawnPiece();
    drawNext();
}

// ─── Line Clearing ───────────────────────────────────────────
function clearLines() {
    let cleared = 0;
    const toRemove = [];
    for (let r = ROWS - 1; r >= 0; r--) {
        if (state.board[r].every(c => c !== 0)) { toRemove.push(r); cleared++; }
    }
    if (cleared > 0) {
        state.flashRows = toRemove;
        state.flashTimer = 8;
        state.combo++;
        const pts = [0, 100, 300, 500, 800][cleared] * state.level;
        const comboBonus = state.combo > 1 ? (state.combo - 1) * 50 * state.level : 0;
        state.score += pts + comboBonus;
        state.lines += cleared;
        state.level = Math.floor(state.lines / 10) + 1;
        if (state.score > state.highScore) state.highScore = state.score;
    } else {
        state.combo = 0;
    }
    updateUI();
}

// ─── Game Loop ───────────────────────────────────────────────
function gameLoop(ts) {
    if (!state.running) return;
    if (!state.paused && !state.gameOver) {
        if (state.flashTimer > 0) {
            state.flashTimer--;
            if (state.flashTimer === 0) actualClearLines();
        } else {
            if (ts - state.lastDrop > getDropSpeed()) {
                if (!collides(state.piece, state.pieceX, state.pieceY + 1)) {
                    state.pieceY++;
                } else {
                    lockPiece();
                }
                state.lastDrop = ts;
            }
        }
        draw();
    }
    state.animFrame = requestAnimationFrame(gameLoop);
}

// ─── Keyboard Controls ───────────────────────────────────────
document.addEventListener('keydown', e => {
    if (!state.running || state.gameOver) return;
    if (e.key === 'p' || e.key === 'P') {
        state.paused = !state.paused;
        if (!state.paused) { state.lastDrop = performance.now(); gameLoop(state.lastDrop); }
        return;
    }
    if (state.paused) return;
    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            if (!collides(state.piece, state.pieceX - 1, state.pieceY)) state.pieceX--;
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (!collides(state.piece, state.pieceX + 1, state.pieceY)) state.pieceX++;
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (!collides(state.piece, state.pieceX, state.pieceY + 1)) { state.pieceY++; state.score += 1; }
            else lockPiece();
            state.lastDrop = performance.now();
            break;
        case 'ArrowUp':
            e.preventDefault();
            const rot = rotate(state.piece);
            if (!collides(rot, state.pieceX, state.pieceY)) state.piece = rot;
            else if (!collides(rot, state.pieceX + 1, state.pieceY)) { state.piece = rot; state.pieceX++; }
            else if (!collides(rot, state.pieceX - 1, state.pieceY)) { state.piece = rot; state.pieceX--; }
            break;
        case ' ':
            e.preventDefault();
            const gy = getGhostY();
            state.score += (gy - state.pieceY) * 2;
            state.pieceY = gy;
            lockPiece();
            state.lastDrop = performance.now();
            break;
    }
    draw();
    updateUI();
});

// ─── Init ────────────────────────────────────────────
clearCanvas();
// 첫 로드 시는 인증 상태를 모르드로 로그인 요구 화면 먼저 표시
// onAuthStateChanged가 한번 발화하면 자동으로 올바른 화면으로 대체됨
showLoginRequiredOverlay();
loadRanking();
