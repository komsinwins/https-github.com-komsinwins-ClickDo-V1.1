import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3xaBTDYhjwfVVN8J0stpGilJKoeE7fJ8",
  authDomain: "clickdo11.firebaseapp.com",
  projectId: "clickdo11",
  storageBucket: "clickdo11.firebasestorage.app",
  messagingSenderId: "254073799839",
  appId: "1:254073799839:web:b3829bec249eab51370eaa"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
