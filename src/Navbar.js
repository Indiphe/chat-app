// src/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav>
      <Link to="/login">Login</Link> | <Link to="/register">Register</Link> | <Link to="/chat">Chat</Link>
    </nav>
  );
}

export default Navbar;
