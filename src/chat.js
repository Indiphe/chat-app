import { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, query, orderBy, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isReplying, setIsReplying] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
      const msgs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
        replyTo: isReplying ? selectedMessage.text : null,
        reactions: [], // Empty initial reactions
      };

      const docRef = await addDoc(collection(db, "messages"), newMessage);
      setMessages((prevMessages) => [...prevMessages, { id: docRef.id, ...newMessage }]);
      setMessage("");
      setSelectedMessage(null);
      setIsReplying(false);
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  const handleRightClick = (e, message) => {
    e.preventDefault();
    setSelectedMessage(message);
    setContextMenu({ x: e.pageX, y: e.pageY });
  };

  const handleReply = () => {
    setContextMenu(null);
    setIsReplying(true);
  };

  const handleReact = () => {
    setContextMenu(null);
    setShowEmojiPicker(!showEmojiPicker); // Toggle emoji picker
  };

  const handleEmojiSelect = (emoji) => {
    if (selectedMessage) {
      const updatedMessage = { ...selectedMessage };
  
      // Ensure reactions is always an array, even if undefined
      updatedMessage.reactions = updatedMessage.reactions || [];
  
      updatedMessage.reactions = [
        ...updatedMessage.reactions.filter((reaction) => reaction.emoji !== emoji),
        { emoji, userId: auth.currentUser.uid }
      ];
  
      // Update message in the database
      updateDoc(doc(db, "messages", selectedMessage.id), { reactions: updatedMessage.reactions });
  
      // Close the emoji picker
      setShowEmojiPicker(false);
  
      // Update local state to reflect changes in the message
      setMessages((prevMessages) => prevMessages.map((msg) =>
        msg.id === selectedMessage.id ? updatedMessage : msg
      ));
    }
  };
  

  const getReactionsForMessage = (message) => {
    return message.reactions || [];
  };

  return (
    <div style={{ padding: '20px', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'green', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url("https://www.reachcambridge.com/wp-content/uploads/2019/11/coding.jpg")',
        backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(8px)', zIndex: -1,
      }}></div>

      <h2>Chat Room</h2>
      <button onClick={() => signOut(auth).then(() => navigate("/login"))} style={{
        padding: '10px 20px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer',
      }}>Logout</button>

      <div style={{ width: '90%', height: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '10px' }}>
        {messages.map((msg, index) => {
          const isOwnMessage = msg.uid === auth.currentUser?.uid;
          const displayName = users[msg.uid] ? `${users[msg.uid].firstName} ${users[msg.uid].surname}` : msg.username;

          return (
            <div key={index} onContextMenu={(e) => handleRightClick(e, msg)} style={{
              display: 'flex', flexDirection: 'column', alignItems: isOwnMessage ? 'flex-end' : 'flex-start', marginBottom: '10px', position: 'relative'
            }}>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px', textAlign: 'left', fontWeight: 'lighter' }}>{displayName}</div>
              {msg.replyTo && (
                <div style={{
                  fontSize: '12px', color: '#888', marginBottom: '5px', padding: '5px', backgroundColor: '#f0f0f0', borderRadius: '5px', maxWidth: '60%',
                }}>
                  Replying to: {msg.replyTo}
                </div>
              )}
              <div style={{
                padding: '10px', backgroundColor: isOwnMessage ? '#d1f7c4' : '#f1f1f1', borderRadius: '10px', maxWidth: '60%', wordWrap: 'break-word', color: 'black', position: 'relative', display: 'inline-block',
              }}>{msg.text}</div>

              {/* Display Reactions (Emojis) below the message */}
              <div style={{ marginTop: '5px', fontSize: '16px', color: '#666' }}>
                {getReactionsForMessage(msg).map((reaction, idx) => (
                  <span key={idx} style={{ marginRight: '5px' }}>
                    {reaction.emoji}
                  </span>
                ))}
              </div>

              {contextMenu && selectedMessage === msg && (
                <div style={{ position: 'absolute', top: '20px', left: '0', backgroundColor: '#fff', border: '1px solid #ccc', padding: '5px', borderRadius: '5px', cursor: 'pointer' }}>
                  <div onClick={handleReply}>Reply</div>
                  <div onClick={handleReact}>React</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showEmojiPicker && (
        <div style={{
          position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '5px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center',flexDirection: 'row'
        }}>
          <div onClick={() => handleEmojiSelect('😊')} style={{ fontSize: '24px', cursor: 'pointer', marginBottom: '5px' }}>😊</div>
          <div onClick={() => handleEmojiSelect('😂')} style={{ fontSize: '24px', cursor: 'pointer', marginBottom: '5px' }}>😂</div>
          <div onClick={() => handleEmojiSelect('❤️')} style={{ fontSize: '24px', cursor: 'pointer', marginBottom: '5px' }}>❤️</div>
          <div onClick={() => handleEmojiSelect('😢')} style={{ fontSize: '24px', cursor: 'pointer', marginBottom: '5px' }}>😢</div>
          <div onClick={() => handleEmojiSelect('👍')} style={{ fontSize: '24px', cursor: 'pointer' }}>👍</div>
        </div>
      )}

      <form onSubmit={handleSendMessage} style={{ width: '90%', display: 'flex', alignItems: 'center', padding: '10px' }}>
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." style={{
          flexGrow: 1, padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ddd',
        }} />
        <button type="submit" style={{
          padding: '10px 20px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px',
        }}>Send</button>
      </form>
    </div>
  );
}
