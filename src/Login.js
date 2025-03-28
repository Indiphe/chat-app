import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "./firebaseConfig"; 
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa";

const auth = getAuth(app);

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setMessage("Please verify your email before logging in.");
        return;
      }

      navigate("/chat"); // Allow access only if email is verified
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>LOGIN</h2>
        {message && <p className="message">{message}</p>}
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <FaEnvelope className="icon" />
            <input 
              type="email" 
              placeholder="Email ID" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <FaLock className="icon" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit">LOGIN</button>
        </form>
        <p>
          Don't have an account?{" "}
          <span onClick={() => navigate("/register")}>Register</span>
        </p>
      </div>
    </div>
  );
}
