import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCRYnSDfnoFrhNRjeDRfHcQoWFOObv44Kc",
    authDomain: "tetris-25784.firebaseapp.com",
    projectId: "tetris-25784",
    storageBucket: "tetris-25784.firebasestorage.app",
    messagingSenderId: "484880802039",
    appId: "1:484880802039:web:b77c2b8d0f57d9ea2733f2",
    measurementId: "G-0RCG0WY714"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
