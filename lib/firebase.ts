import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
    console.log("Llamando a signInWithPopup...");
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log("signInWithPopup exitoso", result);
        return result;
    } catch (error) {
        console.error("signInWithPopup falló", error);
        throw error;
    }
};
export const logout = () => signOut(auth);
