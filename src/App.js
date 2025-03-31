import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./Login";
import { Register } from "./Register";
import { Chat } from "./Chat";  // Import Chat component
import Profile from './Profile';
import { auth } from "./firebaseConfig";  // Make sure auth is correctly imported from Firebase
import { onAuthStateChanged } from "firebase/auth";
import "./App.css"; // Ensure this is included

function App() {
  const [user, setUser] = useState(null);

  // Use useEffect to monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={user ? <Profile /> : <Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={user ? <Chat /> : <Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
