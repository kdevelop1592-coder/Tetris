import { db, auth } from './firebase.js';
import {
    collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ─── Save Score to Firestore ─────────────────────────────────
export async function saveScore(score, level, lines) {
    const user = auth.currentUser;
    if (!user || score <= 0) return;
    try {
        await addDoc(collection(db, 'scores'), {
            uid: user.uid,
            name: user.displayName || '익명',
            photoURL: user.photoURL || '',
            score,
            level,
            lines,
            timestamp: serverTimestamp(),
        });
    } catch (e) {
        console.error('점수 저장 실패:', e);
    }
}

// ─── Load Top 10 Ranking ─────────────────────────────────────
export async function loadRanking() {
    renderRankingLoading();
    try {
        const q = query(
            collection(db, 'scores'),
            orderBy('score', 'desc'),
            limit(10)
        );
        const snapshot = await getDocs(q);
        const ranks = [];
        snapshot.forEach(doc => ranks.push(doc.data()));
        renderRanking(ranks);
    } catch (e) {
        console.error('랭킹 불러오기 실패:', e);
        renderRankingEmpty();
    }
}

// ─── Render Ranking DOM ──────────────────────────────────────
function renderRankingLoading() {
    const list = document.getElementById('ranking-list');
    if (list) list.innerHTML = '<div class="rank-loading">LOADING...</div>';
}

function renderRankingEmpty() {
    const list = document.getElementById('ranking-list');
    if (list) list.innerHTML = '<div class="rank-empty">NO DATA</div>';
}

export function renderRanking(ranks) {
    const list = document.getElementById('ranking-list');
    if (!list) return;
    if (ranks.length === 0) { renderRankingEmpty(); return; }

    const medalClass = ['rank-gold', 'rank-silver', 'rank-bronze'];
    list.innerHTML = ranks.map((r, i) => {
        const cls = medalClass[i] || '';
        const avatarEl = r.photoURL
            ? `<img class="rank-avatar" src="${r.photoURL}" alt="" onerror="this.outerHTML='<span class=rank-avatar-placeholder></span>'">`
            : `<span class="rank-avatar-placeholder"></span>`;
        const safeName = (r.name || '?').substring(0, 8);
        return `
        <div class="rank-item ${cls}">
            <span class="rank-no">${i + 1}</span>
            ${avatarEl}
            <span class="rank-name">${safeName}</span>
            <span class="rank-score">${Number(r.score).toLocaleString()}</span>
        </div>`;
    }).join('');
}
