import { auth, db } from './firebase.js';
import {
    GoogleAuthProvider, signInWithPopup, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
    doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const ADMIN_UIDS = []; // js/admin.js에서도 동일하게 관리

// ─── 이미 로그인된 경우 게임으로 리다이렉트 ─────────────────
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 차단 여부 확인
        const banned = await checkBanned(user.uid);
        if (banned) {
            showError('이 계정은 차단되었습니다. 관리자에게 문의하세요.');
            await auth.signOut();
            return;
        }
        // 유저 정보 저장 (upsert)
        await upsertUser(user);
        window.location.href = 'index.html';
    }
});

// ─── Google 로그인 ────────────────────────────────────────────
document.getElementById('google-login-btn').addEventListener('click', async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged가 리다이렉트 처리함
    } catch (e) {
        console.error('로그인 실패:', e);
        if (e.code !== 'auth/popup-closed-by-user') {
            showError('로그인에 실패했습니다. 다시 시도해주세요.');
        }
        setLoading(false);
    }
});

// ─── Helpers ──────────────────────────────────────────────────
async function checkBanned(uid) {
    try {
        const snap = await getDoc(doc(db, 'bannedUsers', uid));
        return snap.exists();
    } catch {
        return false;
    }
}

async function upsertUser(user) {
    try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
        } else {
            await setDoc(ref, {
                uid: user.uid,
                name: user.displayName || '익명',
                email: user.email || '',
                photoURL: user.photoURL || '',
                joinedAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
            });
        }
    } catch (e) {
        console.error('유저 정보 저장 실패:', e);
    }
}

function setLoading(on) {
    document.getElementById('login-loading').style.display = on ? 'block' : 'none';
    document.getElementById('google-login-btn').style.opacity = on ? '0.5' : '1';
    document.getElementById('google-login-btn').style.pointerEvents = on ? 'none' : 'auto';
}

function showError(msg) {
    const el = document.getElementById('login-error');
    el.textContent = msg;
    el.style.display = 'block';
}
