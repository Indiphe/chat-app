import { useState, useEffect } from "react";
import { auth, db, storage } from "./firebaseConfig"; // Ensure storage is imported
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff } from "lucide-react";
import { Cloudinary } from '@cloudinary/url-gen';
import { collection, addDoc, query, orderBy, getDocs,updateDoc, doc, getDoc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { useRef } from "react";


export function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [userName, setUserName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isReplying, setIsReplying] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [mediaFile, setMediaFile] = useState(null); // Define mediaFile state
  const cld = new Cloudinary({ cloud: { cloudName: 'drpqytgbz' } }); // Initialize Cloudinary with your cloud name
  const navigate = useNavigate();
  const [typingUsers, setTypingUsers] = useState({});  // To store the typing status of all users
  // Declare typingTimeout using useRef
 
  const typingTimeout = useRef(null);

  // Handle typing indicator and update in Firestore
    const handleTyping = (e) => {
      const value = e.target.value;
      setMessage(value);
    const typingRef = doc(db, "typingStatus", auth.currentUser.uid);
    setDoc(typingRef, { typing: true });
 
    // Reset typing status after 2 seconds of inactivity
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
 
    typingTimeout.current = setTimeout(() => {
      setDoc(typingRef, { typing: false });
    }, 2000);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = {};
      usersSnapshot.forEach((doc) => {
        usersData[doc.id] = {
          firstName: doc.data().firstName,
          surname: doc.data().surname,
          profilePic: doc.data().profilePic || doc.data().profilePicUrl || "https://via.placeholder.com/50"
        };
      });
      console.log("Users fetched:", usersData); // Debugging
      setUsers(usersData);
    };

    const fetchUserProfile = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setProfilePicUrl(userData.profilePicUrl || "https://via.placeholder.com/150");
          setCurrentUser(userData);
        }
      }
    };

    const fetchMessages = async () => {
      const q = query(collection(db, "messages"), orderBy("timestamp"));
      const querySnapshot = await getDocs(q);
      const msgs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    };
    const fetchCurrentUser = async () => {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserName(`${userSnap.data().firstName} ${userSnap.data().surname}`);
      }
    };
     // Set up a listener for typing status
     const unsubscribeTypingStatus = onSnapshot(collection(db, "typingStatus"), (snapshot) => {
      const typingData = {};
      snapshot.forEach((doc) => {
        typingData[doc.id] = doc.data().typing;
      });
      console.log("Typing data received:", typingData); // Debugging
      setTypingUsers(typingData);
    });
    fetchUsers();
    fetchUserProfile();
    fetchMessages();
    fetchCurrentUser();

    return () => {
      unsubscribeTypingStatus();  // Clean up the listener when component unmounts
      // Optionally remove user's typing status when they leave
      const typingRef = doc(db, "typingStatus", auth.currentUser.uid);
      deleteDoc(typingRef);
    };
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === "" && !mediaFile) {
      console.log("Nothing to send");
      return;
    }

    let mediaUrl = null;

    // Upload media if available
    if (mediaFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", mediaFile);
        formData.append("upload_preset", "images"); // replace with your preset
    
        const res = await fetch(`https://api.cloudinary.com/v1_1/drpqytgbz/image/upload`, {
          method: "POST",
          body: formData,
        });
    
        const data = await res.json();
        mediaUrl = data.secure_url;
      } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        alert("Failed to upload image: " + error.message);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // Upload audio if recorded
    if (audioBlob) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", audioBlob);
        formData.append("upload_preset", "videos"); // Replace with your Cloudinary preset for audio
        formData.append("resource_type", "video"); // Important: Cloudinary treats audio/video together
    
        const res = await fetch("https://api.cloudinary.com/v1_1/drpqytgbz/video/upload", {
          method: "POST",
          body: formData,
        });
    
        const data = await res.json();
        mediaUrl = data.secure_url;
      } catch (err) {
        console.error("Audio upload to Cloudinary failed:", err);
        alert("Failed to upload voice note: " + err.message);
        return;
      } finally {
        setIsUploading(false);
      }
    }

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
        mediaUrl: mediaUrl,
      };

      const docRef = await addDoc(collection(db, "messages"), newMessage);
      setMessages((prevMessages) => [...prevMessages, { id: docRef.id, ...newMessage }]);
      setMessage("");
      setMediaFile(null);
      setMediaPreview(null);
      setSelectedMessage(null);
      setIsReplying(false);
      setAudioBlob(null);
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };
   // Get the name of the typing user (if any), excluding the current user
const typingUserEntry = Object.entries(typingUsers).find(
  ([userId, isTyping]) => isTyping && userId !== auth.currentUser?.uid
);
 
let typingUserName = "";
 
if (typingUserEntry) {
  const [typingUserId] = typingUserEntry;
  console.log("Typing user ID:", typingUserId); // Debugging
 
  const typingUserData = users?.[typingUserId];
 
  if (typingUserData?.firstName && typingUserData?.surname) {
    typingUserName = `${typingUserData.firstName} ${typingUserData.surname} is typing...`;
  }
}

        {/* Typing indicator for any user typing */}
<div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '16px', fontWeight: 'lighter', color: '#fff' }}>
          {typingUserName}
</div>

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);
    setAudioChunks([]);

    recorder.ondataavailable = (e) => {
      setAudioChunks((prev) => [...prev, e.data]);
    };

    recorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      setAudioBlob(blob);
      setMediaPreview(URL.createObjectURL(blob));
    };

    recorder.start();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const drawWaveform = () => {
      analyser.getByteTimeDomainData(dataArray);
      setWaveformData([...dataArray]);
      if (isRecording) {
        requestAnimationFrame(drawWaveform);
      }
    };

    drawWaveform();
    setIsRecording(true);

    setRecordingTime(0);
    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    setRecordingInterval(interval);
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
    clearInterval(recordingInterval);
    setRecordingInterval(null);
  };

  const handleReply = () => {
    setIsReplying(true);
    setSelectedMessage(null);
    setContextMenu(null);
  };

  const handleReact = () => {
    setShowEmojiPicker(true);
    setContextMenu(null);
  };

  const handleEmojiSelect = async (emoji) => {
    const updatedMessage = {
      ...selectedMessage,
      reactions: selectedMessage.reactions ? [...selectedMessage.reactions, { emoji, userId: auth.currentUser.uid }] : [{ emoji, userId: auth.currentUser.uid }],
    };

    const messageRef = doc(db, "messages", selectedMessage.id);
    await updateDoc(messageRef, {
      reactions: updatedMessage.reactions,
    });

    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === selectedMessage.id ? { ...msg, reactions: updatedMessage.reactions } : msg
      )
    );
    setShowEmojiPicker(false);
  };

  return (
    <div style={{ padding: "20px", width: "100vw", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", color: "green", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url("https://www.reachcambridge.com/wp-content/uploads/2019/11/coding.jpg")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(8px)",
          zIndex: -1,
        }}
      ></div>

      {profilePicUrl && (
        <img
          src={profilePicUrl}
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
 {/* Header Section */}
 <div>
      <h2>Chat Room</h2>
       {/* Typing indicator for any user typing */}
<div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)',marginTop: '50px',marginTop: '-25px', fontSize: '16px', fontWeight: 'lighter', color: '#fff' }}>
          {typingUserName}
</div>

 <div>
<span style={{  position: 'absolute', right: '20px', marginTop: '-25px'}}>Welcome, {userName}</span>
</div>
</div> 
      <div style={{ width: "90%", height: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", padding: "10px" }}>
        {messages.map((msg) => {
          const isOwnMessage = msg.uid === auth.currentUser?.uid;
          const user = users[msg.uid] || { userName, profilePic: "https://via.placeholder.com/50" };

          return (
            <div
              key={msg.id}
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
                  objectFit: "cover",
                  backgroundColor: "#ccc",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", maxWidth: "60%" }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    marginBottom: "5px",
                    textAlign: isOwnMessage ? "right" : "left",
                  }}
                >
                  {user.firstName ? `${user.firstName} ${user.surname}` : msg.username}
                </div>
                <div
  style={{
    padding: "10px",
    backgroundColor: isOwnMessage ? "#d1f7c4" : "#f1f1f1",
    borderRadius: "10px",
    wordWrap: "break-word",
    color: "black",
  }}
>
  {/* Text Message */}
  {msg.text && <div>{msg.text}</div>}

  {/* Media Message */}
  {msg.mediaUrl && (
    <div style={{ marginTop: "10px" }}>
      {msg.mediaUrl.includes("image") ? (
        <img
          src={msg.mediaUrl}
          alt="media"
          style={{
            maxWidth: "200px",
            maxHeight: "200px",
            borderRadius: "8px",
            objectFit: "cover",
          }}
        />
      ) : (
        <audio controls src={msg.mediaUrl} style={{ width: "100%" }} />
      )}
    </div>
  )}
</div>
                {msg.reactions?.length > 0 && (
                  <div style={{ marginTop: "5px", fontSize: "16px", color: "#666" }}>
                    {msg.reactions.map((reaction, idx) => (
                      <span key={idx} style={{ marginRight: "5px" }}>
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
            boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
          }}
        >
          <div onClick={handleReply} style={{ cursor: "pointer", padding: "5px" }}>
            Reply
          </div>
          <div onClick={handleReact} style={{ cursor: "pointer", padding: "5px" }}>
            React
          </div>
        </div>
      )}

<form onSubmit={handleSendMessage} style={{ width: "100%" }}>
  {/* Media Upload + Preview */}
  <div style={{ marginBottom: "10px" }}>
    <input
      type="file"
      accept="image/*,audio/*"
      onChange={handleFileSelect}
      style={{ marginBottom: "10px" }}
    />
    {mediaPreview && (
      <div>
        {mediaFile?.type?.startsWith("audio/") ? (
          <audio controls src={mediaPreview} style={{ width: "100%" }} />
        ) : (
          <img
            src={mediaPreview}
            alt="Preview"
            style={{
              width: "100px",
              height: "100px",
              objectFit: "cover",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          />
        )}
      </div>
    )}
  </div>

  {/* Message input + mic + send */}
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <input
      type="text"
      value={message}
      onChange={handleTyping}
      placeholder="Type your message..."
      style={{
        flexGrow: 1,
        padding: "10px",
        fontSize: "16px",
        borderRadius: "5px",
        border: "1px solid #ddd",
      }}
    />

    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        padding: 0,
      }}
    >
      {isRecording ? (
        <MicOff color="red" size={28} />
      ) : (
        <Mic color="#4CAF50" size={28} />
      )}
      {isRecording && (
        <div style={{ fontSize: "12px", color: "red", marginLeft: "5px" }}>
          {Math.floor(recordingTime / 60)}:
          {String(recordingTime % 60).padStart(2, "0")}
        </div>
      )}
    </button>

    <button
      type="submit"
      disabled={isUploading}
      style={{
        padding: "10px 20px",
        backgroundColor: isUploading ? "#cccccc" : "#4CAF50",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        cursor: isUploading ? "not-allowed" : "pointer",
      }}
    >
      {isUploading ? "Uploading..." : "Send"}
    </button>
  </div>
</form>


    
    </div>
  );
}
