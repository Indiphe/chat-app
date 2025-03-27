import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 

// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDu7uJv6__CWg4ZFCJz_VwbzxRtqtiUjcQ",
  authDomain: "nesthub-2f9eb.firebaseapp.com",
  projectId: "nesthub-2f9eb",
  storageBucket: "nesthub-2f9eb.firebasestorage.app",
  messagingSenderId: "739654112104",
  appId: "1:739654112104:web:53f1b1665a83dfbb543cdd",
  measurementId: "G-QW7CHBSK1T"
};

// Initialize Firebase

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

export { app, auth, db }; // Make sure db is exported along with app and auth
