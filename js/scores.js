import { auth, db } from './firebase.js';
import {
    onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
    collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { ADMIN_UIDS } from './admin.js';

// ─── 상태 ──────────────────────────────────────────────────────
let allScores = [];
let bestByUser = [];
const PAGE_SIZE = 20;
let allPage = 1;
let bestPage = 1;
let allFiltered = [];
let bestFiltered = [];

// ─── 인증 체크 ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { location.href = 'login.html'; return; }
    updateHeaderUI(user);
    await loadScores();
});

// ─── 데이터 로드 ───────────────────────────────────────────────
async function loadScores() {
    try {
        const q = query(collection(db, 'scores'), orderBy('score', 'desc'));
        const snap = await getDocs(q);
        allScores = [];
        snap.forEach(d => allScores.push({ id: d.id, ...d.data() }));

        // 유저별 집계
        const userMap = {};
        allScores.forEach(s => {
            if (!userMap[s.uid]) {
                userMap[s.uid] = {
                    uid: s.uid,
                    name: s.name,
                    photoURL: s.photoURL,
                    bestScore: 0,
                    bestLevel: 0,
                    totalGames: 0,
                    totalLines: 0,
                };
            }
            const u = userMap[s.uid];
            u.totalGames++;
            u.totalLines += (s.lines || 0);
            if (s.score > u.bestScore) { u.bestScore = s.score; u.bestLevel = s.level || 1; }
        });
        bestByUser = Object.values(userMap).sort((a, b) => b.bestScore - a.bestScore);

        applyAllFilter();
        applyBestFilter();
    } catch (e) {
        console.error('점수 불러오기 실패:', e);
        document.getElementById('all-tbody').innerHTML = `<tr><td colspan="6" class="tbl-empty">데이터를 불러오지 못했습니다.</td></tr>`;
        document.getElementById('best-tbody').innerHTML = `<tr><td colspan="6" class="tbl-empty">데이터를 불러오지 못했습니다.</td></tr>`;
    }
}

// ─── 필터 / 정렬 ───────────────────────────────────────────────
function applyAllFilter() {
    const search = document.getElementById('search-all').value.toLowerCase();
    const sort = document.getElementById('sort-all').value;
    let data = allScores.filter(s => (s.name || '').toLowerCase().includes(search));

    if (sort === 'score') data.sort((a, b) => b.score - a.score);
    else if (sort === 'level') data.sort((a, b) => (b.level || 0) - (a.level || 0));
    else if (sort === 'lines') data.sort((a, b) => (b.lines || 0) - (a.lines || 0));
    else if (sort === 'date') data.sort((a, b) => {
        const ta = a.timestamp?.seconds || 0;
        const tb = b.timestamp?.seconds || 0;
        return tb - ta;
    });

    allFiltered = data;
    allPage = 1;
    renderAllTable();
}

function applyBestFilter() {
    const search = document.getElementById('search-best').value.toLowerCase();
    bestFiltered = bestByUser.filter(u => (u.name || '').toLowerCase().includes(search));
    bestPage = 1;
    renderBestTable();
}

// ─── 렌더링 ────────────────────────────────────────────────────
function renderAllTable() {
    const tbody = document.getElementById('all-tbody');
    const medals = ['🥇', '🥈', '🥉'];
    const start = (allPage - 1) * PAGE_SIZE;
    const page = allFiltered.slice(start, start + PAGE_SIZE);

    if (allFiltered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="tbl-empty">데이터가 없습니다.</td></tr>`;
        document.getElementById('all-pagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = page.map((s, i) => {
        const rank = start + i + 1;
        const medal = medals[rank - 1] ? `<span class="rank-medal">${medals[rank - 1]}</span>` : `<span style="color:rgba(255,255,255,.3)">${rank}</span>`;
        const avatar = s.photoURL
            ? `<img src="${s.photoURL}" alt="" onerror="this.outerHTML='<span class=avatar-ph></span>'">`
            : `<span class="avatar-ph"></span>`;
        const date = s.timestamp?.toDate
            ? s.timestamp.toDate().toLocaleDateString('ko-KR')
            : '-';
        return `
        <tr>
            <td>${medal}</td>
            <td><div class="user-cell">${avatar}<span>${esc(s.name || '익명')}</span></div></td>
            <td style="color:var(--glow-yellow);text-shadow:0 0 8px var(--glow-yellow)">${Number(s.score).toLocaleString()}</td>
            <td style="color:var(--glow-cyan)">${s.level || 1}</td>
            <td style="color:rgba(255,255,255,.5)">${s.lines || 0}</td>
            <td style="color:rgba(255,255,255,.3)">${date}</td>
        </tr>`;
    }).join('');

    renderPagination('all-pagination', allFiltered.length, allPage, (p) => { allPage = p; renderAllTable(); });
}

function renderBestTable() {
    const tbody = document.getElementById('best-tbody');
    const medals = ['🥇', '🥈', '🥉'];
    const start = (bestPage - 1) * PAGE_SIZE;
    const page = bestFiltered.slice(start, start + PAGE_SIZE);

    if (bestFiltered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="tbl-empty">데이터가 없습니다.</td></tr>`;
        document.getElementById('best-pagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = page.map((u, i) => {
        const rank = start + i + 1;
        const medal = medals[rank - 1] ? `<span class="rank-medal">${medals[rank - 1]}</span>` : `<span style="color:rgba(255,255,255,.3)">${rank}</span>`;
        const avatar = u.photoURL
            ? `<img src="${u.photoURL}" alt="" onerror="this.outerHTML='<span class=avatar-ph></span>'">`
            : `<span class="avatar-ph"></span>`;
        return `
        <tr>
            <td>${medal}</td>
            <td><div class="user-cell">${avatar}<span>${esc(u.name || '익명')}</span></div></td>
            <td style="color:var(--glow-yellow);text-shadow:0 0 8px var(--glow-yellow)">${Number(u.bestScore).toLocaleString()}</td>
            <td style="color:var(--glow-cyan)">${u.bestLevel}</td>
            <td style="color:rgba(255,255,255,.5)">${u.totalGames}</td>
            <td style="color:rgba(255,255,255,.3)">${u.totalLines}</td>
        </tr>`;
    }).join('');

    renderPagination('best-pagination', bestFiltered.length, bestPage, (p) => { bestPage = p; renderBestTable(); });
}

function renderPagination(containerId, total, current, onPageChange) {
    const container = document.getElementById(containerId);
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => onPageChange(Number(btn.dataset.page)));
    });
}

// ─── 이벤트 ────────────────────────────────────────────────────
document.getElementById('search-all').addEventListener('input', applyAllFilter);
document.getElementById('sort-all').addEventListener('change', applyAllFilter);
document.getElementById('search-best').addEventListener('input', applyBestFilter);

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ─── 헤더 ──────────────────────────────────────────────────────
function updateHeaderUI(user) {
    const avatar = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    if (user.photoURL) { avatar.src = user.photoURL; avatar.style.display = 'block'; }
    nameEl.textContent = user.displayName || '';
    nameEl.style.display = 'block';
    // 관리자 링크
    if (ADMIN_UIDS.includes(user.uid) || ADMIN_UIDS.length === 0) {
        document.getElementById('admin-link').style.display = 'inline';
    }
}

document.getElementById('auth-btn').addEventListener('click', async () => {
    await signOut(auth);
    location.href = 'login.html';
});

function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
