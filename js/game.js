// ─── Constants ───────────────────────────────────────────────
export const COLS = 10, ROWS = 20, BLOCK = 30;

export const COLORS = [
    null,
    ['#00ffff', '#00cccc'], // I
    ['#ffff00', '#cccc00'], // O
    ['#aa00ff', '#8800cc'], // T
    ['#00ff44', '#00cc33'], // S
    ['#ff2244', '#cc1133'], // Z
    ['#0088ff', '#0066cc'], // J
    ['#ff8800', '#cc6600'], // L
];

export const PIECES = [
    null,
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 2], [2, 2]],                               // O
    [[0, 3, 0], [3, 3, 3], [0, 0, 0]],                   // T
    [[0, 4, 4], [4, 4, 0], [0, 0, 0]],                   // S
    [[5, 5, 0], [0, 5, 5], [0, 0, 0]],                   // Z
    [[6, 0, 0], [6, 6, 6], [0, 0, 0]],                   // J
    [[0, 0, 7], [7, 7, 7], [0, 0, 0]],                   // L
];

// ─── Game State ──────────────────────────────────────────────
export const state = {
    board: null,
    piece: null,
    pieceX: 0,
    pieceY: 0,
    pieceType: 0,
    nextType: 0,
    score: 0,
    level: 1,
    lines: 0,
    combo: 0,
    highScore: 0,
    gameOver: false,
    paused: false,
    running: false,
    lastDrop: 0,
    animFrame: null,
    flashRows: [],
    flashTimer: 0,
};

// ─── Core Logic ──────────────────────────────────────────────
export function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function randomPiece() {
    return Math.floor(Math.random() * 7) + 1;
}

export function collides(p, px, py) {
    for (let r = 0; r < p.length; r++)
        for (let c = 0; c < p[r].length; c++)
            if (p[r][c]) {
                let nx = px + c, ny = py + r;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                if (ny >= 0 && state.board[ny][nx]) return true;
            }
    return false;
}

export function rotate(p) {
    const rows = p.length, cols = p[0].length;
    const rot = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            rot[c][rows - 1 - r] = p[r][c];
    return rot;
}

export function getGhostY() {
    let gy = state.pieceY;
    while (!collides(state.piece, state.pieceX, gy + 1)) gy++;
    return gy;
}

export function getDropSpeed() {
    return Math.max(50, 800 - (state.level - 1) * 70);
}

export function actualClearLines() {
    if (state.flashRows.length === 0) return;
    const rows = [...state.flashRows].sort((a, b) => a - b);
    for (let i = rows.length - 1; i >= 0; i--) {
        state.board.splice(rows[i], 1);
        state.board.unshift(Array(COLS).fill(0));
    }
    state.flashRows = [];
}
