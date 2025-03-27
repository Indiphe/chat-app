import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { app } from "./firebaseConfig"; // Ensure correct path
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa"; // Import icons

const auth = getAuth(app);

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/chat");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>REGISTER</h2>
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <FaEnvelope className="icon" />
            <input type="email" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <FaLock className="icon" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit">REGISTER</button>
        </form>
        <p>
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>Login</span>
        </p>
      </div>
    </div>
  );
}

