import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';  // Import AuthContext to access user state
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';  // For routing
import Login from './Login';  // Login component
import Register from './Register';  // Register component
import Chat from './Chat';  // Chat component
import Navbar from './Navbar';  // Optional Navbar component

function App() {
  const { user } = useAuth();  // Access the user state from AuthContext

  return (
    <AuthProvider>
      <Router>
        <Navbar />  {/* This will be your navigation bar (optional) */}
        <Routes>
          {/* If not logged in, show Login and Register */}
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              {/* Redirect to login if accessing the home route */}
              <Route path="/" element={<Navigate to="/login" />} />
            </>
          ) : (
            <>
              {/* If logged in, show Chat */}
              <Route path="/chat" element={<Chat />} />
              {/* Redirect to chat if accessing the home route */}
              <Route path="/" element={<Navigate to="/chat" />} />
            </>
          )}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;


