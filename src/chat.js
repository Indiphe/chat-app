import { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const navigate = useNavigate();

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

    fetchUsers();
    fetchMessages();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === "") return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      let senderName = auth.currentUser.email;
      if (userSnap.exists()) {
        senderName = `${userSnap.data().firstName} ${userSnap.data().surname}`;
      }

      const newMessage = {
        text: message,
        uid: auth.currentUser.uid,
        timestamp: new Date(),
        username: senderName,
      };

      await addDoc(collection(db, "messages"), newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  return (
    <div style={{
      padding: '20px',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      color: 'green',
      position: 'relative',  // Make the parent container relative
    }}>
      {/* Background image container */}
      <div style={{
        position: 'absolute', // Position it behind the content
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url("https://www.reachcambridge.com/wp-content/uploads/2019/11/coding.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(8px)',  // Apply blur effect to the background
        zIndex: -1,           // Ensure the background is behind everything else
      }}></div>

      
      <h2>Chat Room</h2>
      <button onClick={() => signOut(auth).then(() => navigate("/login"))} style={{
        padding: '10px 20px',
        backgroundColor: '#4CAF50',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
      }}>Logout</button>

      <div style={{
        width: '90%',
        height: '80vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
      }}>
        {messages.map((msg, index) => {
          const isOwnMessage = msg.uid === auth.currentUser?.uid;
          const displayName = users[msg.uid] ? `${users[msg.uid].firstName} ${users[msg.uid].surname}` : msg.username;

          return (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
              marginBottom: '10px',
            }}>
              <div style={{
                fontSize: '12px',
                color: '#aaa',
                marginBottom: '5px',
                textAlign: 'left',
                fontWeight: 'lighter',
              }}>{displayName}</div>
              <div style={{
                padding: '10px',
                backgroundColor: isOwnMessage ? '#d1f7c4' : '#f1f1f1',
                borderRadius: '10px',
                maxWidth: '60%',
                wordWrap: 'break-word',
                color: 'black',
                position: 'relative',
                display: 'inline-block',
              }}>{msg.text}</div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSendMessage} style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        padding: '10px',
      }}>
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." style={{
          flexGrow: 1,
          padding: '10px',
          fontSize: '16px',
          borderRadius: '5px',
          border: '1px solid #ddd',
        }}/>
        <button type="submit" style={{
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}>Send</button>
      </form>
    </div>
  );
}
