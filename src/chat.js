import { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({}); // Store First Name & Surname
  const navigate = useNavigate();

  // Fetch users and store in state
  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = {};
      usersSnapshot.forEach((doc) => {
        usersData[doc.id] = {
          firstName: doc.data().firstName,
          surname: doc.data().surname,
        };
      });
      setUsers(usersData);
    };

    const fetchMessages = async () => {
      const q = query(collection(db, "messages"), orderBy("timestamp"));
      const querySnapshot = await getDocs(q);
      const msgs = querySnapshot.docs.map((doc) => doc.data());
      setMessages(msgs);
    };

    fetchUsers(); // Fetch users first
    fetchMessages(); // Then fetch messages
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === "") return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      let senderName = auth.currentUser.email; // Default to email if user data is missing
      if (userSnap.exists()) {
        senderName = `${userSnap.data().firstName} ${userSnap.data().surname}`;
      }

      const newMessage = {
        text: message,
        uid: auth.currentUser.uid,
        timestamp: new Date(),
        username: senderName, // Store First Name & Surname
      };

      await addDoc(collection(db, "messages"), newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'black' }}>
      <h2>Chat Room</h2>
      <button onClick={() => signOut(auth).then(() => navigate("/login"))}>Logout</button>

      <div style={{ maxHeight: "400px", overflowY: "scroll" }}>
        {messages.map((msg, index) => {
          const isOwnMessage = msg.uid === auth.currentUser?.uid;
          const displayName = users[msg.uid] ? `${users[msg.uid].firstName} ${users[msg.uid].surname}` : msg.username;


          return (
            <div key={index} style={{ marginBottom: '10px', textAlign: isOwnMessage ? 'right' : 'left' }}>
              <strong>{displayName}</strong>: {msg.text}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSendMessage} style={{ display: "flex", marginTop: "10px" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ flexGrow: 1, padding: "10px" }}
        />
        <button type="submit" style={{ padding: "10px", backgroundColor: "#4CAF50", color: "white" }}>
          Send
        </button>
      </form>
    </div>
  );
}
