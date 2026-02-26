import { COLS, ROWS, BLOCK, COLORS, PIECES, state, getGhostY } from './game.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');

// ─── Draw Board + Piece ──────────────────────────────────────
export function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, canvas.height); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(canvas.width, r * BLOCK); ctx.stroke();
    }

    // Board cells
    for (let r = 0; r < ROWS; r++) {
        const isFlash = state.flashRows.includes(r);
        for (let c = 0; c < COLS; c++) {
            if (state.board[r][c]) {
                if (isFlash) {
                    const t = state.flashTimer / 8;
                    ctx.fillStyle = t > 0.5 ? '#ffffff' : COLORS[state.board[r][c]][0];
                    ctx.fillRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.fillRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
                } else {
                    drawBlock(ctx, c * BLOCK, r * BLOCK, COLORS[state.board[r][c]][0], COLORS[state.board[r][c]][1]);
                }
            }
        }
    }

    // Ghost piece
    if (!state.gameOver && state.piece) {
        const gy = getGhostY();
        ctx.globalAlpha = 0.18;
        for (let r = 0; r < state.piece.length; r++)
            for (let c = 0; c < state.piece[r].length; c++)
                if (state.piece[r][c]) {
                    ctx.fillStyle = COLORS[state.pieceType][0];
                    ctx.fillRect((state.pieceX + c) * BLOCK + 1, (gy + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
                }
        ctx.globalAlpha = 1;
    }

    // Current piece
    if (!state.gameOver && state.piece) {
        for (let r = 0; r < state.piece.length; r++)
            for (let c = 0; c < state.piece[r].length; c++)
                if (state.piece[r][c])
                    drawBlock(ctx, (state.pieceX + c) * BLOCK, (state.pieceY + r) * BLOCK, COLORS[state.pieceType][0], COLORS[state.pieceType][1]);
    }
}

export function drawBlock(c, x, y, color, shadow) {
    c.fillStyle = color;
    c.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(x + 1, y + 1, BLOCK - 2, 4);
    c.fillRect(x + 1, y + 1, 4, BLOCK - 2);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x + BLOCK - 5, y + 1, 4, BLOCK - 2);
    c.fillRect(x + 1, y + BLOCK - 5, BLOCK - 2, 4);
    c.strokeStyle = color;
    c.globalAlpha = 0.4;
    c.lineWidth = 1;
    c.strokeRect(x, y, BLOCK, BLOCK);
    c.globalAlpha = 1;
}

export function drawNext() {
    nextCtx.fillStyle = '#11111a';
    nextCtx.fillRect(0, 0, 120, 120);
    const p = PIECES[state.nextType];
    const offX = Math.floor((4 - p[0].length) / 2);
    const offY = Math.floor((4 - p.length) / 2);
    const bs = 24;
    for (let r = 0; r < p.length; r++)
        for (let c = 0; c < p[r].length; c++)
            if (p[r][c])
                drawBlock(nextCtx, (offX + c) * bs + 12, (offY + r) * bs + 12, COLORS[state.nextType][0], COLORS[state.nextType][1]);
}

export function clearCanvas() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    nextCtx.fillStyle = '#11111a';
    nextCtx.fillRect(0, 0, 120, 120);
}
