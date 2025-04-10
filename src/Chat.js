
import { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "./firebaseConfig"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Send } from "lucide-react";
import { Cloudinary } from '@cloudinary/url-gen';
import { collection, addDoc, query, orderBy, getDocs, updateDoc, doc, getDoc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";

 
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
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [mediaFile, setMediaFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  // Using useRef to store audio chunks that persist between renders
  const audioChunksRef = useRef([]);
  const typingTimeout = useRef(null);
  const cld = new Cloudinary({ cloud: { cloudName: 'drpqytgbz' } });
  const navigate = useNavigate();
  const [typingUsers, setTypingUsers] = useState({});
 
  // Handle typing indicator and update in Firestore
  const handleTyping = (e) => {
    const value = e.target.value;
    setMessage(value);
    if (auth.currentUser) {
      const typingRef = doc(db, "typingStatus", auth.currentUser.uid);
      setDoc(typingRef, { typing: true })
        .catch(error => {
          console.error("Error updating typing status:", error);
          toast({
            title: "Error",
            description: "Failed to update typing status",
            variant: "destructive"
          });
        });
      
      // Reset typing status after 2 seconds of inactivity
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        setDoc(typingRef, { typing: false })
          .catch(error => {
            console.error("Error updating typing status:", error);
          });
      }, 2000);
    }
  };
 
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("Selected file:", file);
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add the missing audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      audioChunksRef.current = [];
  
      recorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
  
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
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
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access your microphone",
        variant: "destructive"
      });
    }
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
    // Just a placeholder for now
    toast({
      title: "Coming Soon",
      description: "Reaction feature will be available soon!",
    });
    setContextMenu(null);
  };

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }
    
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = {};
        usersSnapshot.forEach((doc) => {
          usersData[doc.id] = {
            firstName: doc.data().firstName,
            surname: doc.data().surname,
            profilePic: doc.data().profilePic || doc.data().profilePicUrl || "https://via.placeholder.com/50"
          };
        });
        console.log("Users fetched:", usersData);
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error loading users",
          description: "Check your database permissions",
          variant: "destructive"
        });
      }
    };
 
    const fetchUserProfile = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setProfilePicUrl(userData.profilePicUrl || "https://via.placeholder.com/150");
            setCurrentUser(userData);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          toast({
            title: "Error loading profile",
            description: "Check your database permissions",
            variant: "destructive"
          });
        }
      }
    };
 
    const fetchMessages = async () => {
      try {
        const q = query(collection(db, "messages"), orderBy("timestamp"));
        const querySnapshot = await getDocs(q);
        const msgs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error loading messages",
          description: "Check your database permissions",
          variant: "destructive"
        });
      }
    };
    
    const fetchCurrentUser = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserName(`${userSnap.data().firstName} ${userSnap.data().surname}`);
          }
        } catch (error) {
          console.error("Error fetching current user:", error);
          toast({
            title: "Error",
            description: "Failed to fetch user data",
            variant: "destructive"
          });
        }
      }
    };
    
    // Set up a listener for typing status
    let unsubscribeTypingStatus = () => {};
    
    try {
      if (auth.currentUser) {
        unsubscribeTypingStatus = onSnapshot(collection(db, "typingStatus"), (snapshot) => {
          const typingData = {};
          snapshot.forEach((doc) => {
            typingData[doc.id] = doc.data().typing;
          });
          console.log("Typing data received:", typingData);
          setTypingUsers(typingData);
        }, (error) => {
          console.error("Error in typing status listener:", error);
          // Don't show toast for this as it's not critical
        });
        
        fetchUsers();
        fetchUserProfile();
        fetchMessages();
        fetchCurrentUser();
      }
    } catch (error) {
      console.error("Error setting up typing listener:", error);
    }
 
    return () => {
      if (unsubscribeTypingStatus) {
        unsubscribeTypingStatus();
      }
      // Remove user's typing status when they leave
      if (auth.currentUser) {
        try {
          const typingRef = doc(db, "typingStatus", auth.currentUser.uid);
          deleteDoc(typingRef).catch(err => console.error("Error deleting typing status:", err));
        } catch (error) {
          console.error("Error in cleanup:", error);
        }
      }
    };
  }, [navigate]);
 
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === "" && !mediaFile && !audioBlob) {
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
        toast({
          title: "Upload Failed",
          description: "Failed to upload image",
          variant: "destructive"
        });
        return;
      } finally {
        setIsUploading(false);
      }
    }
 
    // Upload audio if recorded
    if (audioBlob) {
      setIsUploading(true);
      try {
        console.log("Uploading audio blob:", audioBlob);
        const formData = new FormData();
        formData.append("file", audioBlob);
        formData.append("upload_preset", "videos"); // Replace with your Cloudinary preset for audio
        formData.append("resource_type", "video"); // Important: Cloudinary treats audio/video together
        const res = await fetch("https://api.cloudinary.com/v1_1/drpqytgbz/video/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        console.log("Audio upload response:", data);
        mediaUrl = data.secure_url;
      } catch (err) {
        console.error("Audio upload to Cloudinary failed:", err);
        toast({
          title: "Upload Failed",
          description: "Failed to upload voice note",
          variant: "destructive"
        });
        return;
      } finally {
        setIsUploading(false);
      }
    }
 
    try {
      if (!auth.currentUser) {
        console.error("No authenticated user found");
        return;
      }
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
        replyTo: isReplying ? selectedMessage?.text : null,
        reactions: [],
        mediaUrl: mediaUrl,
      };
 
      console.log("Sending message:", newMessage);
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
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };
  
  // Get the name of the typing user (if any)
  const typingUser = Object.entries(typingUsers).find(([userId, isTyping]) => {
    return isTyping && userId !== auth.currentUser?.uid;
  });
  
  // Define typingUserName based on typing user data
  let typingUserName = "";
  if (typingUser) {
    const typingUserId = typingUser[0];
    
    // Check if the users data is available and if it contains the typing user
    if (users[typingUserId]) {
      typingUserName = `${users[typingUserId].firstName || ''} ${users[typingUserId].surname || ''} is typing...`;
    } else {
      typingUserName = "Someone is typing...";
    }
  }
  
  // Audio recording visualization
  const renderWaveform = () => {
    if (!isRecording || waveformData.length === 0) return null;
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        height: "40px", 
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: "20px",
        padding: "0 10px",
        marginBottom: "10px"
      }}>
        {waveformData.map((value, index) => {
          const height = ((value - 128) / 128) * 20 + 20; // normalize to 0-40px
          return (
            <div
              key={index}
              style={{
                width: "3px",
                height: `${height}px`,
                backgroundColor: "#4CAF50",
                margin: "0 1px",
                borderRadius: "1px",
              }}
            />
          );
        })}
        <div style={{ marginLeft: "10px", color: "white" }}>
          {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
        </div>
      </div>
    );
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
          backgroundImage: 'url("https://wallpaperaccess.com/full/4230797.jpg")',
          backgroundSize: "cover",
          backgroundPosition: "center",
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
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', marginTop: '-25px', fontSize: '16px', fontWeight: 'lighter', color: '#fff' }}>
          {typingUserName}
        </div>
 
        <div>
          <span style={{ position: 'absolute', right: '20px', marginTop: '-25px', color: '#fff'}}>
            Welcome, {userName || "User"}
          </span>
        </div>
      </div> 
      
      <div style={{ width: "90%", height: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", padding: "10px" }}>
        {messages.map((msg) => {
          const isOwnMessage = msg.uid === auth.currentUser?.uid;
          const user = users[msg.uid] || { firstName: "", surname: "", profilePic: "https://via.placeholder.com/50" };
 
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

      <form onSubmit={handleSendMessage} style={{ width: "90%", position: "relative" }}>
        {/* Recording visualization */}
        {renderWaveform()}
        {/* Media Upload + Preview */}
        <div style={{ marginBottom: "10px" }}>
          <input
            type="file"
            accept="image/*,audio/*"
            onChange={handleFileSelect}
            style={{ marginBottom: "10px" }}
          />
          {mediaPreview && !isRecording && (
            <div>
              {mediaFile?.type?.startsWith("audio/") || audioBlob ? (
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
            disabled={isRecording}
            style={{
              flexGrow: 1,
              padding: "10px",
              fontSize: "16px",
              borderRadius: "5px",
              border: "1px solid #ddd",
              opacity: isRecording ? 0.5 : 1,
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
              padding: "8px",
              borderRadius: "50%",
              backgroundColor: isRecording ? "rgba(255,0,0,0.1)" : "transparent",
            }}
          >
            {isRecording ? (
              <MicOff color="red" size={28} />
            ) : (
              <Mic color="#4CAF50" size={28} />
            )}
          </button>
 
          <button
            type="submit"
            disabled={isUploading || (message.trim() === "" && !mediaFile && !audioBlob)}
            style={{
              padding: "10px",
              backgroundColor: isUploading || (message.trim() === "" && !mediaFile && !audioBlob) ? "#cccccc" : "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              cursor: isUploading || (message.trim() === "" && !mediaFile && !audioBlob) ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "46px",
              height: "46px",
            }}
          >
            {isUploading ? "..." : <Send size={20} />}
          </button>
        </div>
      </form>
    </div>
  );
}
