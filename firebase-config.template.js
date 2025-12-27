// Importeer Firebase functies via CDN (voor gebruik zonder bundler)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, getDoc, getDocs, writeBatch, arrayUnion, query, where, orderBy, limit, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// ⚠️ SECURITY NOTICE ⚠️
// This is a TEMPLATE file. To set up Firebase:
// 1. Copy this file to 'firebase-config.js' (which is gitignored)
// 2. Replace the placeholder values below with your actual Firebase configuration
// 3. NEVER commit firebase-config.js to version control
// 4. Get your config from: https://console.firebase.google.com/project/stadlandrivier/settings/general

// Configuratie van de gebruiker
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "stadlandrivier.firebaseapp.com",
    projectId: "stadlandrivier",
    storageBucket: "stadlandrivier.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// --- User Profile Service ---
/**
 * UserService handles user profile and preferences in Firestore
 * Falls back to localStorage if Firestore fails (offline mode)
 */
const UserService = {
    /**
     * Load user profile and preferences from Firestore
     * @param {string} uid - User ID
     * @returns {Promise<Object>} User data object with profile and preferences
     */
    async loadUserData(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                return userDoc.data();
            }
            return null;
        } catch (error) {
            console.warn('Failed to load user data from Firestore:', error);
            return null;
        }
    },

    /**
     * Save user profile (name, etc.)
     * @param {string} uid - User ID
     * @param {Object} profileData - Profile data to save
     */
    async saveProfile(uid, profileData) {
        try {
            await setDoc(doc(db, 'users', uid), {
                profile: {
                    ...profileData,
                    lastSeen: new Date()
                }
            }, { merge: true });
        } catch (error) {
            console.warn('Failed to save profile to Firestore:', error);
        }
    },

    /**
     * Save user preferences (language, theme)
     * @param {string} uid - User ID
     * @param {Object} preferences - Preferences object
     */
    async savePreferences(uid, preferences) {
        try {
            await setDoc(doc(db, 'users', uid), {
                preferences: preferences
            }, { merge: true });
        } catch (error) {
            console.warn('Failed to save preferences to Firestore:', error);
        }
    },

    /**
     * Save a single preference
     * @param {string} uid - User ID
     * @param {string} key - Preference key (e.g., 'language', 'theme')
     * @param {any} value - Preference value
     */
    async savePreference(uid, key, value) {
        try {
            await setDoc(doc(db, 'users', uid), {
                preferences: {
                    [key]: value
                }
            }, { merge: true });
        } catch (error) {
            console.warn(`Failed to save ${key} preference to Firestore:`, error);
        }
    }
};

export { db, auth, collection, doc, setDoc, onSnapshot, updateDoc, getDoc, getDocs, writeBatch, arrayUnion, query, where, orderBy, limit, runTransaction, signInAnonymously, onAuthStateChanged, UserService };
