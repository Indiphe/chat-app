import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 
import { getStorage } from "firebase/storage";  // Add this to enable Firebase Storage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDu7uJv6__CWg4ZFCJz_VwbzxRtqtiUjcQ",
  authDomain: "nesthub-2f9eb.firebaseapp.com",
  projectId: "nesthub-2f9eb",
  storageBucket: "nesthub-2f9eb.appspot.com",  // Fixed this line
  messagingSenderId: "739654112104",
  appId: "1:739654112104:web:53f1b1665a83dfbb543cdd",
  measurementId: "G-QW7CHBSK1T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth, Firestore, and Storage
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore
const storage = getStorage(app);  // Initialize Firebase Storage

export { app, auth, db, storage }; // Export storage along with app, auth, and db

