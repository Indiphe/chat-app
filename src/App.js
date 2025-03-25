import React from 'react';
import { AuthProvider, useAuth } from './authContext'; // Import AuthContext to access user state
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';  // For routing
import Login from './Login';  // Import Login component
import Register from './Register';  // Register component
import Chat from './chat';  // Chat component
import Navbar from './Navbar';  // Optional Navbar component

function App() {
  const { user } = useAuth();  // Access the user state from AuthContext

  return (
    <AuthProvider>
  <Router>
    <Navbar />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={user ? <Navigate to="/chat" /> : <Navigate to="/login" />} />
      <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />
    </Routes>
  </Router>
</AuthProvider>

  );
}
export default App;


