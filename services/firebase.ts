import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Firestore remains ONLY for legacy billing reads in subscriptionService.ts;
// it is removed entirely in W2/W4. No Firebase Auth is used anywhere anymore.
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
