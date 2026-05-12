import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const getRequiredEnv = (key: keyof ImportMetaEnv): string => {
    const value = import.meta.env[key]?.trim();
    if (!value) {
        throw new Error(`Missing required Firebase env: ${key}`);
    }
    return value;
};

const firebaseConfig: FirebaseOptions = {
    apiKey: getRequiredEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getRequiredEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getRequiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getRequiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getRequiredEnv('VITE_FIREBASE_APP_ID'),
};

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim();
if (measurementId) {
    firebaseConfig.measurementId = measurementId;
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
