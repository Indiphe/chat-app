// src/firebaseConfig.js
import { initializeApp } from "firebase/app";  // Import the initializeApp function from firebase
import { getAuth } from "firebase/auth";        // Import Firebase Authentication
import { getFirestore } from "firebase/firestore"; // Import Firestore
import { getStorage } from "firebase/storage";  // Import Firebase Storage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDu7uJv6__CWg4ZFCJz_VwbzxRtqtiUjcQ",
  authDomain: "nesthub-2f9eb.firebaseapp.com",
  projectId: "nesthub-2f9eb",
  storageBucket: "nesthub-2f9eb.appspot.com",
  messagingSenderId: "739654112104",
  appId: "1:739654112104:web:53f1b1665a83dfbb543cdd",
  measurementId: "G-QW7CHBSK1T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth, Firestore, and Storage
const auth = getAuth(app); // Firebase Authentication
const db = getFirestore(app); // Firestore
const storage = getStorage(app); // ✅ this is what you're missing

// Export services for use in other parts of the app
export { app, auth, db, storage };
