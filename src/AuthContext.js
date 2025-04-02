// src/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import firebase from 'firebase/app';
import 'firebase/auth'; // Make sure to import Firebase Authentication

// Create the AuthContext with a default value of an empty object
const authContext = createContext();

// The AuthProvider will be used to wrap components that need access to the user state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        setUser(user); // User is logged in
      } else {
        setUser(null); // No user logged in
      }
    });

    // Clean up the subscription when the component is unmounted
    return () => unsubscribe();
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

