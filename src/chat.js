import { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, query, orderBy, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null); // Store which message is being replied to
  const [contextMenu, setContextMenu] = useState(null); // For context menu
  const navigate = useNavigate();

  // Fetch messages manually when the page loads
  useEffect(() => {
    const fetchMessages = async () => {
      const q = query(collection(db, "messages"), orderBy("timestamp"));
      const querySnapshot = await getDocs(q);
      const msgs = querySnapshot.docs.map((doc) => doc.data());
      setMessages(msgs);
    };

    fetchMessages();
  }, []);

  // Send a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === "") return;

    try {
      const newMessage = {
        text: message,
        uid: auth.currentUser.uid,
        timestamp: new Date(),
        username: auth.currentUser.email,
        replyTo: replyTo ? replyTo.id : null, // Save the message being replied to
      };

      await addDoc(collection(db, "messages"), newMessage);

      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage(""); // Clear input after sending
      setReplyTo(null); // Clear the reply state after sending
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  // Log out user
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // Handle reply action
  const handleReply = (message) => {
    setReplyTo(message);
    setMessage(`@${message.username}: ${message.text} `); // Pre-fill the message input
    setContextMenu(null); // Close the context menu after reply
  };

  // Handle right-click to show the context menu
  const handleContextMenu = (e, message) => {
    e.preventDefault(); // Prevent default context menu
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message: message,
    });
  };

  // Close the context menu when clicking outside
  const handleClickOutside = () => {
    setContextMenu(null);
  };

  // Add event listener for clicking outside
  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Styling
  const chatStyle = {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#f9f9f9',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  };

  const messagesStyle = {
    marginBottom: '20px',
    maxHeight: '400px',
    overflowY: 'scroll',
    marginBottom: '10px',
  };

  const messageContainerStyle = {
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const messageStyle = (isOwnMessage) => ({
    padding: '10px',
    backgroundColor: isOwnMessage ? '#d1f7c4' : '#e1f7d5', // Light green for own messages, light gray for others
    borderRadius: '5px',
    fontSize: '14px',
    maxWidth: '70%',
    wordWrap: 'break-word',
    marginBottom: '5px',
  });

  const replyContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#e5e5e5',
    borderRadius: '8px',
    padding: '8px',
    marginBottom: '8px',
  };

  const replyTextStyle = {
    fontSize: '12px',
    color: '#888', // Light gray for the replied message preview
    marginLeft: '8px',
    maxWidth: '80%',
    wordWrap: 'break-word',
  };

  const formStyle = {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginTop: '20px',
  };

  const inputStyle = {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    width: '80%',
  };

  const buttonStyle = {
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  };

  const logoutButtonStyle = {
    padding: '10px 20px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '20px',
  };

  // Context menu styling
  const contextMenuStyle = {
    position: 'absolute',
    top: `${contextMenu?.y}px`,
    left: `${contextMenu?.x}px`,
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    borderRadius: '5px',
    zIndex: 1000,
    padding: '5px 10px',
  };

  return (
    <div style={chatStyle}>
      <h2>Chat Room</h2>
      <button onClick={handleLogout} style={logoutButtonStyle}>Logout</button>

      <div className="messages" style={messagesStyle}>
        {messages.map((msg, index) => {
          const isOwnMessage = msg.uid === auth.currentUser?.uid;
          return (
            <div
              key={index}
              className="message"
              onContextMenu={(e) => handleContextMenu(e, msg)} // Handle right-click event
            >
              <div
                style={{
                  ...messageContainerStyle,
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start', // Align based on the sender
                }}
              >
                {msg.replyTo && (
                  <div style={replyContainerStyle}>
                    <div style={replyTextStyle}>
                      <strong>Replying to:</strong> {msg.replyTo}
                    </div>
                  </div>
                )}
                <div
                  className="message-text"
                  style={messageStyle(isOwnMessage)}
                >
                  <strong>{msg.username}</strong>: {msg.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply message */}
      {replyTo && (
        <div style={replyContainerStyle}>
          <div style={replyTextStyle}>
            <strong>Replying to:</strong> {replyTo.text}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div style={contextMenuStyle}>
          <div onClick={() => handleReply(contextMenu.message)}>Reply</div>
          <div onClick={() => alert(`React to message: ${contextMenu.message.text}`)}>React</div>
        </div>
      )}

      <form onSubmit={handleSendMessage} style={formStyle}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>Send</button>
      </form>
    </div>
  );
}


