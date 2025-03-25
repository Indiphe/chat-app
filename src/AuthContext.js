// src/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the AuthContext with a default value of an empty object
const authContext = createContext();

// The AuthProvider will be used to wrap components that need access to the user state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Simulate an auth check or fetch user data on component mount (you can replace this with actual logic)
  useEffect(() => {
    const fetchUser = async () => {
      // Simulate getting the current logged-in user (you can replace this with Firebase or any other logic)
      const loggedInUser = localStorage.getItem('user'); // Example: user data stored in localStorage
      setUser(loggedInUser ? JSON.parse(loggedInUser) : null);
    };

    fetchUser();
  }, []);

  return (
    <authContext.Provider value={{ user, setUser }}>
      {children}
    </authContext.Provider>
  );
};

// Create a custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(authContext);
};
