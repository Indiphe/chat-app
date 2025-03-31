import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore"; //Import Firestore functions
import { app } from "./firebaseConfig"; // Ensure correct path
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaUser } from "react-icons/fa"; // Import icons

const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

export function Register() {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); // Store messages
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store additional user details in Firestore
      await setDoc(doc(db, "users", user.uid), {
        firstName,
        surname,
        email,
        createdAt: new Date(),
      });

      // Send verification email
      await sendEmailVerification(user);

      // Set success message
      setMessage("A verification email has been sent. Please check your inbox.");

      // Optionally, redirect after registration
      setTimeout(() => {
        navigate("/login");
      }, 5000);
      
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>REGISTER</h2>
        {message && <p className="message">{message}</p>}
        <form onSubmit={handleRegister}>
        <div className="input-group">
            <FaUser className="icon" />
            <input 
              type="text" 
              placeholder="First Name" 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <FaUser className="icon" />
            <input 
              type="text" 
              placeholder="Surname" 
              value={surname} 
              onChange={(e) => setSurname(e.target.value)} 
              required 
            />
          </div>
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
