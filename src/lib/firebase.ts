import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCoOTPMuFwHfjImBNm_5oeDUc19L95QrT8",
  authDomain: "joongang-homepage.firebaseapp.com",
  projectId: "joongang-homepage",
  storageBucket: "joongang-homepage.firebasestorage.app",
  messagingSenderId: "900862217013",
  appId: "1:900862217013:web:1447083d7547ad18739a7c",
  measurementId: "G-7YS05VJCBY"
};

// Initialize Firebase App & Cloud Firestore DB
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
