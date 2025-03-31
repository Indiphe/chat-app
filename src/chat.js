import { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, query, orderBy, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMessages = async () => {
      const q = query(collection(db, "messages"), orderBy("timestamp"));
      const querySnapshot = await getDocs(q);
      const msgs = querySnapshot.docs.map((doc) => doc.data());
      setMessages(msgs);
    };
    fetchMessages();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === "") return;

    try {
      const newMessage = {
        text: message,
        uid: auth.currentUser.uid,
        timestamp: new Date(),
        username: auth.currentUser.email,
        replyTo: replyTo ? { username: replyTo.username, text: replyTo.text } : null,
      };

      await addDoc(collection(db, "messages"), newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage("");
      setReplyTo(null); // Reset the reply after sending the message
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleReply = (message) => {
    setReplyTo(message); // Store the reply information
    setContextMenu(null); // Close the context menu
  };

  const handleReact = (message) => {
    alert(`Reacted to: ${message.text}`);
    setContextMenu(null);
  };

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message: message });
  };

  const handleClickOutside = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const chatStyle = {
    padding: '20px',
    width: '100vw',
    height: '100vh',
    margin: '0',
    backgroundImage: 'url("https://www.reachcambridge.com/wp-content/uploads/2019/11/coding.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'black',
  };

  const messagesContainerStyle = {
    width: '90%',
    height: '80vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
  };

  const messageContainerStyle = (isOwnMessage) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
    marginBottom: '10px',
  });

  const messageStyle = (isOwnMessage) => ({
    padding: '10px',
    backgroundColor: isOwnMessage ? '#d1f7c4' : '#f1f1f1',
    borderRadius: '10px',
    maxWidth: '60%',
    wordWrap: 'break-word',
    color: 'black',
    position: 'relative',
  });

  const replyTextStyle = {
    fontSize: '12px',
    color: '#888',
    marginBottom: '5px',
  };

  const replyMessageStyle = {
    padding: '10px',
    backgroundColor: '#f0f0f0', // light color for the reply message
    borderRadius: '5px',
    maxWidth: '60%',
    wordWrap: 'break-word',
    color: '#777', // lighter text color
    marginBottom: '10px',
    fontStyle: 'italic',
  };

  return (
    <div style={chatStyle}>
      <h2>Chat Room</h2>
      <button onClick={handleLogout}>Logout</button>

      {replyTo && (
        <div style={replyMessageStyle}>
          <strong>Replying to {replyTo.username}:</strong> {replyTo.text}
        </div>
      )}

      <div className="messages" style={messagesContainerStyle}>
        {messages.map((msg, index) => {
          const isOwnMessage = msg.uid === auth.currentUser?.uid;
          return (
            <div
              key={index}
              style={messageContainerStyle(isOwnMessage)}
              onContextMenu={(e) => handleContextMenu(e, msg)}
            >
              {msg.replyTo && (
                <div style={replyTextStyle}>
                  <strong>Replying to {msg.replyTo.username}:</strong> {msg.replyTo.text}
                </div>
              )}
              <div style={messageStyle(isOwnMessage)}>
                <strong>{msg.username}</strong>: {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <div
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'white',
            padding: '5px',
            border: '1px solid black',
            borderRadius: '5px',
          }}
        >
          <div onClick={() => handleReply(contextMenu.message)}>Reply</div>
          <div onClick={() => handleReact(contextMenu.message)}>React</div>
        </div>
      )}

      <form
        onSubmit={handleSendMessage}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '10px' }}
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={{
            flexGrow: 1,
            padding: '10px',
            fontSize: '16px',
            borderRadius: '5px',
            border: '1px solid #ddd',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}



