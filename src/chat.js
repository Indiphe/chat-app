import { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { signOut, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
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
    if (auth.currentUser) {
      fetchUserProfile(auth.currentUser.uid);
    }

    fetchUsers();
    fetchMessages();
  }, []);

  const fetchUsers = async () => {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersData = {};
    usersSnapshot.forEach((doc) => {
      usersData[doc.id] = {
        firstName: doc.data().firstName,
        surname: doc.data().surname,
        profilePic: doc.data().profilePic || "https://via.placeholder.com/50",
        deactivated: doc.data().deactivated || false,
      };
    });
    setUsers(usersData);
  };

  const fetchUserProfile = async (userId) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      setCurrentUser(userSnap.data());
    }
  };

  const fetchMessages = async () => {
    const q = query(collection(db, "messages"), orderBy("timestamp"));
    const querySnapshot = await getDocs(q);
    const msgs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setMessages(msgs);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!auth.currentUser || users[auth.currentUser.uid]?.deactivated) {
      alert("You cannot send messages. Your account is deactivated.");
      return;
    }

    if (message.trim() === "") return;

    try {
      const senderName = `${currentUser?.firstName || "Anonymous"} ${currentUser?.surname || ""}`;
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

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    const password = prompt("Please enter your password to confirm deletion:");
    if (!password) return;

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);

      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { firstName: "Deleted", surname: "User", deactivated: true });

      await deleteUser(auth.currentUser);
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error deleting account: ", error);
      alert("Error deleting account. Please try again.");
    }
  };

  const handleDeactivateAccount = async () => {
    if (!auth.currentUser) return;

    if (!window.confirm("Are you sure you want to deactivate your account?")) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { deactivated: true });

      alert("Your account has been deactivated.");
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error deactivating account: ", error);
    }
  };

  const handleReply = () => {
    setIsReplying(true);
    setContextMenu(null);
  };

  const handleReact = () => {
    setShowEmojiPicker(true);
    setContextMenu(null);
  };

  const handleEmojiSelect = async (emoji) => {
    if (!selectedMessage) return;

    const updatedReactions = [...(selectedMessage.reactions || []), { emoji, userId: auth.currentUser.uid }];
    const messageRef = doc(db, "messages", selectedMessage.id);
    await updateDoc(messageRef, { reactions: updatedReactions });

    setMessages((prevMessages) =>
      prevMessages.map((msg) => (msg.id === selectedMessage.id ? { ...msg, reactions: updatedReactions } : msg))
    );

    setShowEmojiPicker(false);
  };

  return (
    <div style={{ padding: "20px", color: "green", position: "relative" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url("https://www.reachcambridge.com/wp-content/uploads/2019/11/coding.jpg")',
        backgroundSize: "cover", filter: "blur(8px)", zIndex: -1,
      }}></div>

      {currentUser && (
        <img
          src={currentUser.profilePic}
          alt="Profile"
          onClick={() => navigate("/profile")}
          style={{ width: "50px", height: "50px", borderRadius: "50%", cursor: "pointer", position: "absolute", top: "10px", right: "90px" }}
        />
      )}

      <h2>Chat Room</h2>
      <button onClick={() => signOut(auth).then(() => navigate("/login"))}>Logout</button>
      <button onClick={handleDeactivateAccount}>Deactivate Account</button>
      <button onClick={handleDeleteAccount}>Delete Account</button>

      <div style={{ height: "70vh", overflowY: "auto", padding: "10px" }}>
        {messages.map((msg) => (
          <div key={msg.id} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ top: e.clientY, left: e.clientX }); setSelectedMessage(msg); }}>
            <img src={users[msg.uid]?.profilePic} alt="Profile" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
            <div>{users[msg.uid]?.firstName} {users[msg.uid]?.surname}</div>
            <div>{msg.text}</div>
            <div>{msg.reactions?.map((r, i) => <span key={i}>{r.emoji}</span>)}</div>
          </div>
        ))}
      </div>

      {contextMenu && selectedMessage && (
        <div style={{ position: "absolute", top: contextMenu.top, left: contextMenu.left, backgroundColor: "#fff", border: "1px solid #ccc", padding: "5px", borderRadius: "5px" }}>
          <div onClick={handleReply}>Reply</div>
          <div onClick={handleReact}>React</div>
        </div>
      )}

      {showEmojiPicker && ["😊", "😂", "❤️", "😢", "👍"].map((emoji) => (
        <span key={emoji} onClick={() => handleEmojiSelect(emoji)}>{emoji}</span>
      ))}

      <form onSubmit={handleSendMessage}>
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
