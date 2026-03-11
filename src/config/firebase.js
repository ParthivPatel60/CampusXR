import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCrFTw2VWrqjh6sPtVPd9IOCTi7e8CAh9o",
  authDomain: "campusxr-9444e.firebaseapp.com",
  projectId: "campusxr-9444e",
  storageBucket: "campusxr-9444e.firebasestorage.app",
  messagingSenderId: "534478972254",
  appId: "1:534478972254:web:dbdd75636ad267cfa2dbcf",
  measurementId: "G-3D19RKF2J4"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
