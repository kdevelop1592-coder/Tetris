import { auth, db } from './firebase.js';
import {
    onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
    collection, getDocs, doc, setDoc, deleteDoc,
    getDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ─── 관리자 UID 목록 (여기에 관리자 Google 계정 UID를 추가하세요) ───
export const ADMIN_UIDS = [
    'z7jidL4kZ4hEcFF4e3FngdDyBAr1'
];

// ─── 상태 ──────────────────────────────────────────────────────
let currentUser = null;
let allUsers = [];
let bannedSet = new Set();
let pendingBanUid = null;

// ─── 인증 체크 ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { location.href = 'login.html'; return; }

    // 관리자 UID가 아직 비어있으면 콘솔에 현재 UID 출력 (설정 도움)
    if (ADMIN_UIDS.length === 0) {
        console.warn('⚠️ 관리자 UID가 설정되지 않았습니다.');
        console.info('현재 로그인한 계정의 UID:', user.uid);
        console.info('js/admin.js의 ADMIN_UIDS 배열에 위 UID를 추가하세요.');
    }

    currentUser = user;
    updateHeaderUI(user);

    if (ADMIN_UIDS.length > 0 && !ADMIN_UIDS.includes(user.uid)) {
        document.getElementById('access-denied').style.display = 'flex';
        return;
    }

    document.getElementById('admin-content').style.display = 'block';
    await loadAll();
});

// ─── 데이터 로드 ───────────────────────────────────────────────
async function loadAll() {
    await Promise.all([loadUsers(), loadBanned(), loadStats()]);
}

async function loadUsers() {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="tbl-loading">LOADING...</td></tr>`;
    try {
        const [usersSnap, scoresSnap] = await Promise.all([
            getDocs(query(collection(db, 'users'), orderBy('joinedAt', 'desc'))),
            getDocs(collection(db, 'scores'))
        ]);

        // 유저별 최고점 계산
        const bestScores = {};
        scoresSnap.forEach(d => {
            const { uid, score } = d.data();
            if (!bestScores[uid] || score > bestScores[uid]) bestScores[uid] = score;
        });

        allUsers = [];
        usersSnap.forEach(d => allUsers.push({ id: d.id, ...d.data() }));

        renderUsersTable(allUsers, bestScores);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="6" class="tbl-empty">데이터를 불러오지 못했습니다.</td></tr>`;
    }
}

async function loadBanned() {
    const tbody = document.getElementById('banned-tbody');
    tbody.innerHTML = `<tr><td colspan="4" class="tbl-loading">LOADING...</td></tr>`;
    try {
        const snap = await getDocs(collection(db, 'bannedUsers'));
        bannedSet = new Set();
        const rows = [];
        snap.forEach(d => {
            bannedSet.add(d.id);
            rows.push({ id: d.id, ...d.data() });
        });
        renderBannedTable(rows);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="4" class="tbl-empty">데이터를 불러오지 못했습니다.</td></tr>`;
    }
}

async function loadStats() {
    try {
        const [usersSnap, bannedSnap, scoresSnap] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'bannedUsers')),
            getDocs(collection(db, 'scores'))
        ]);
        document.getElementById('stat-users').textContent = usersSnap.size;
        document.getElementById('stat-banned').textContent = bannedSnap.size;
        document.getElementById('stat-games').textContent = scoresSnap.size;
    } catch { /**/ }
}

// ─── 렌더링 ────────────────────────────────────────────────────
function renderUsersTable(users, bestScores) {
    const tbody = document.getElementById('users-tbody');
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="tbl-empty">등록된 유저가 없습니다.</td></tr>`;
        return;
    }
    tbody.innerHTML = users.map(u => {
        const isBanned = bannedSet.has(u.id);
        const avatar = u.photoURL
            ? `<img src="${u.photoURL}" alt="" onerror="this.outerHTML='<span class=avatar-ph></span>'">`
            : `<span class="avatar-ph"></span>`;
        const joined = u.joinedAt?.toDate
            ? u.joinedAt.toDate().toLocaleDateString('ko-KR')
            : '-';
        const best = bestScores[u.id] ? Number(bestScores[u.id]).toLocaleString() : '0';
        const badge = isBanned ? `<span class="badge-banned">BANNED</span>` : `<span style="color:rgba(255,255,255,.2);font-size:4px;">정상</span>`;
        const action = isBanned
            ? `<button class="btn-unban" onclick="window.unbanUser('${u.id}')">해제</button>`
            : `<button class="btn-ban" onclick="window.openBanModal('${u.id}','${escapeHtml(u.name || '익명')}')">차단</button>`;
        return `
        <tr>
            <td><div class="user-row">${avatar}<span>${escapeHtml(u.name || '익명')}</span></div></td>
            <td style="color:rgba(255,255,255,.4)">${escapeHtml(u.email || '-')}</td>
            <td style="color:rgba(255,255,255,.4)">${joined}</td>
            <td style="color:var(--glow-yellow)">${best}</td>
            <td>${badge}</td>
            <td>${action}</td>
        </tr>`;
    }).join('');
}

function renderBannedTable(rows) {
    const tbody = document.getElementById('banned-tbody');
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="tbl-empty">차단된 유저가 없습니다.</td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => {
        const bannedAt = r.bannedAt?.toDate
            ? r.bannedAt.toDate().toLocaleDateString('ko-KR')
            : '-';
        const user = allUsers.find(u => u.id === r.id);
        const name = user ? escapeHtml(user.name || '익명') : r.id;
        return `
        <tr>
            <td>${name}</td>
            <td style="color:rgba(255,255,255,.4)">${escapeHtml(r.reason || '-')}</td>
            <td style="color:rgba(255,255,255,.4)">${bannedAt}</td>
            <td><button class="btn-unban" onclick="window.unbanUser('${r.id}')">차단 해제</button></td>
        </tr>`;
    }).join('');
}

// ─── 차단 / 해제 ───────────────────────────────────────────────
window.openBanModal = (uid, name) => {
    pendingBanUid = uid;
    document.getElementById('ban-modal-name').innerHTML =
        `<strong style="color:var(--glow-pink)">${name}</strong> 을(를) 차단하시겠습니까?<br>차단된 유저는 로그인할 수 없습니다.`;
    document.getElementById('ban-reason').value = '';
    document.getElementById('ban-modal').classList.add('open');
};

document.addEventListener('DOMContentLoaded', () => {
    const cancelBtn = document.getElementById('ban-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('ban-modal').classList.remove('open');
            pendingBanUid = null;
        });
    }

    const confirmBtn = document.getElementById('ban-confirm-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!pendingBanUid) return;
            const reason = document.getElementById('ban-reason').value.trim();
            await banUser(pendingBanUid, reason);
            document.getElementById('ban-modal').classList.remove('open');
            pendingBanUid = null;
        });
    }
});

async function banUser(uid, reason) {
    try {
        await setDoc(doc(db, 'bannedUsers', uid), {
            uid,
            reason: reason || '',
            bannedAt: serverTimestamp(),
            bannedBy: currentUser.uid,
        });
        await loadAll();
    } catch (e) {
        console.error('차단 실패:', e);
        alert('차단에 실패했습니다.');
    }
}

window.unbanUser = async (uid) => {
    if (!confirm('차단을 해제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'bannedUsers', uid));
        await loadAll();
    } catch (e) {
        console.error('차단 해제 실패:', e);
        alert('차단 해제에 실패했습니다.');
    }
};

// ─── 탭 전환 ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = document.getElementById(`tab-${btn.dataset.tab}`);
            if (panel) panel.classList.add('active');
        });
    });
});

// ─── 헤더 ──────────────────────────────────────────────────────
function updateHeaderUI(user) {
    const avatar = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    if (user.photoURL) { avatar.src = user.photoURL; avatar.style.display = 'block'; }
    nameEl.textContent = user.displayName || '';
    nameEl.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            await signOut(auth);
            location.href = 'login.html';
        });
    }
});

// ─── 유틸 ──────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
