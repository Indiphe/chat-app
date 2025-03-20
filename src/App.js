import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';  // Import AuthContext to access user state
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';  // For routing
import Login from './Login';  // Login component
import Register from './Register';  // Register component
import Chat from './Chat';  // Chat component
import Navbar from './Navbar';  // Optional Navbar component
import { Navigate } from 'react-router-dom';

function App() {
  const { user } = useAuth();  // Access the user state from AuthContext

  return (
    <AuthProvider>
      <Router>
        <Navbar />  {/* This will be your navigation bar (optional) */}
        <Routes>
          {/* Conditional rendering based on the user's authentication status */}
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />  {/* If not logged in, show Login */}
              <Route path="/register" element={<Register />} />  {/* Register if not logged in */}
            </>
          ) : (
            <Route path="/chat" element={<Chat />} />  {/* If logged in, show Chat */}
          )}
          {/* Redirect to the chat page once logged in */}
          <Route path="/" element={user ? <Chat /> : <Login />} />
        </Routes>
        <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />
      </Router>
    </AuthProvider>
  );
}

export default App;
