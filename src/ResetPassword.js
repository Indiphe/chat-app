import { useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { app } from "./firebaseConfig";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEnvelope } from "react-icons/fa";

const auth = getAuth(app);

export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract email from URL query params if available
  const queryParams = new URLSearchParams(location.search);
  const emailFromQuery = queryParams.get("email") || "";
  
  const [email, setEmail] = useState(emailFromQuery);
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setIsSubmitted(true);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (error) {
      setMessage("Error sending password reset email: " + error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>RESET PASSWORD</h2>
        {message && <p className="message">{message}</p>}
        
        {!isSubmitted ? (
          <form onSubmit={handleResetPassword}>
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
            <p className="info-text">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <button type="submit">SEND RESET LINK</button>
          </form>
        ) : (
          <div className="success-message">
            <p>Reset instructions have been sent to your email.</p>
            <button onClick={() => navigate("/login")}>BACK TO LOGIN</button>
          </div>
        )}
        
        <p>
          Remember your password?{" "}
          <span onClick={() => navigate("/login")}>Login</span>
        </p>
      </div>
    </div>
  );
}
