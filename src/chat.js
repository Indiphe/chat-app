import { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig"; // Import db here
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore"; // Firestore functions
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";


export function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const navigate = useNavigate();

  // Fetch messages from Firestore
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push(doc.data());
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  // Send a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === "") return;

    try {
      await addDoc(collection(db, "messages"), { // Correctly passing db here
        text: message,
        uid: auth.currentUser.uid,
        timestamp: new Date(),
        username: auth.currentUser.email,
      });
      setMessage(""); // Clear input after sending
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  // Log out user
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div>
      <h2>Chat Room</h2>
      <button onClick={handleLogout}>Logout</button>
      
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className="message">
            <strong>{msg.username}</strong>: {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}


