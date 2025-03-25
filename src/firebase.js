// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCnf3lKxQQ8A4SuVUm4E0alBTkoWbRmGGs",
  authDomain: "chatapp-5765f.firebaseapp.com",
  projectId: "chatapp-5765f",
  storageBucket: "chatapp-5765f.firebasestorage.app",
  messagingSenderId: "134088766331",
  appId: "1:134088766331:web:f749254ac3cef567e203de",
  measurementId: "G-WLHBS68P7M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);