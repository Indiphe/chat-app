import { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, query, orderBy, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
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
          profilePic: doc.data().profilePic || "https://via.placeholder.com/50",
        };
      });
      setUsers(usersData);
    };

    const fetchUserProfile = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setCurrentUser(userSnap.data());
        }
      }
    };

    const fetchMessages = async () => {
      const q = query(collection(db, "messages"), orderBy("timestamp"));
      const querySnapshot = await getDocs(q);
      const msgs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    };

    fetchUsers();
    fetchUserProfile();
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
        reactions: [],
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

  const handleReply = () => {
    setIsReplying(true);
    setSelectedMessage(null); // Optional: Close the context menu after selecting reply
    setContextMenu(null); // Close context menu
  };

  const handleReact = () => {
    setShowEmojiPicker(true);
    setContextMenu(null); // Close context menu after selecting react
  };

  const handleEmojiSelect = async (emoji) => {
    // Ensure reactions is initialized as an empty array if it doesn't exist
    const updatedMessage = {
      ...selectedMessage,
      reactions: selectedMessage.reactions ? [...selectedMessage.reactions, { emoji, userId: auth.currentUser.uid }] : [{ emoji, userId: auth.currentUser.uid }],
    };
     // Update the Firestore message
  const messageRef = doc(db, "messages", selectedMessage.id);
  await updateDoc(messageRef, {
    reactions: updatedMessage.reactions,
  });
   // Update the local state to reflect the new reactions
   setMessages((prevMessages) =>
    prevMessages.map((msg) =>
      msg.id === selectedMessage.id ? { ...msg, reactions: updatedMessage.reactions } : msg
    )
  );
  // Close the emoji picker
  setShowEmojiPicker(false);
};
  return (
    <div style={{ padding: "20px", width: "100vw", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", color: "green", position: "relative" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url("https://www.reachcambridge.com/wp-content/uploads/2019/11/coding.jpg")',
        backgroundSize: "cover", backgroundPosition: "center", filter: "blur(8px)", zIndex: -1,
      }}></div>

      {/* Clickable Floating Avatar */}
      {currentUser && (
        <img
          src={currentUser.profilePic || "https://via.placeholder.com/50"}
          alt="Profile"
          onClick={() => navigate("/profile")}
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            cursor: "pointer",
            border: "2px solid #4CAF50",
            boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
            position: "absolute",
            top: "10px",
            right: "90px",
          }}
        />
      )}

      <h2>Chat Room</h2>
      <button onClick={() => signOut(auth).then(() => navigate("/login"))} style={{
        padding: "10px 20px", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer",
      }}>Logout</button>

      <div style={{ width: "90%", height: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", padding: "10px" }}>
        {messages.map((msg, index) => {
          const isOwnMessage = msg.uid === auth.currentUser?.uid;
          const user = users[msg.uid] || {};
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                flexDirection: isOwnMessage ? "row-reverse" : "row",
                marginBottom: "10px",
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  top: e.clientY,
                  left: e.clientX,
                });
                setSelectedMessage(msg);
              }}
            >
              <img
                src={user.profilePic}
                alt="Profile"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  marginRight: isOwnMessage ? "0" : "10px",
                  marginLeft: isOwnMessage ? "10px" : "0",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", maxWidth: "60%" }}>
                <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "5px", textAlign: isOwnMessage ? "right" : "left" }}>
                  {user.firstName ? `${user.firstName} ${user.surname}` : msg.username}
                </div>
                <div style={{ padding: "10px", backgroundColor: isOwnMessage ? "#d1f7c4" : "#f1f1f1", borderRadius: "10px", wordWrap: "break-word", color: "black" }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Display Reactions (Emojis) below the message */}
      {selectedMessage && (
        <div style={{ marginTop: "5px", fontSize: "16px", color: "#666" }}>
          {selectedMessage.reactions?.map((reaction, idx) => (
            <span key={idx} style={{ marginRight: "5px" }}>
              {reaction.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Display the context menu */}
      {contextMenu && selectedMessage && (
        <div
          style={{
            position: "absolute",
            top: contextMenu.top,
            left: contextMenu.left,
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            padding: "5px",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          <div onClick={handleReply}>Reply</div>
          <div onClick={handleReact}>React</div>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div style={{
          position: "absolute", bottom: "100px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "5px", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", flexDirection: "row"
        }}>
          <div onClick={() => handleEmojiSelect("😊")} style={{ fontSize: "24px", cursor: "pointer", marginBottom: "5px" }}>😊</div>
          <div onClick={() => handleEmojiSelect("😂")} style={{ fontSize: "24px", cursor: "pointer", marginBottom: "5px" }}>😂</div>
          <div onClick={() => handleEmojiSelect("❤️")} style={{ fontSize: "24px", cursor: "pointer", marginBottom: "5px" }}>❤️</div>
          <div onClick={() => handleEmojiSelect("😢")} style={{ fontSize: "24px", cursor: "pointer", marginBottom: "5px" }}>😢</div>
          <div onClick={() => handleEmojiSelect("👍")} style={{ fontSize: "24px", cursor: "pointer" }}>👍</div>
        </div>
      )}

      <form onSubmit={handleSendMessage} style={{ width: "90%", display: "flex", alignItems: "center", padding: "10px" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ flexGrow: 1, padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
        <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", marginLeft: "10px" }}>Send</button>
      </form>
    </div>
  );
}
