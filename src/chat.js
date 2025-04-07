import { useState, useEffect } from "react";
import { auth, db, storage } from "./firebaseConfig";
import { collection, addDoc, query, orderBy, getDocs, doc, getDoc, updateDoc, onSnapshot, setDoc} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff } from "lucide-react";

export function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isReplying, setIsReplying] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [recorder, setRecorder] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const navigate = useNavigate();
  let typingTimeout = null;

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
    console.log("Send clicked, mediaFile:", mediaFile);
    if (message.trim() === "" && !mediaFile) {
      console.log("Nothing to send");
      return;
    }

    let mediaUrl = null;

    if (mediaFile) {
      console.log("Attempting to upload file:", mediaFile.name, "Size:", mediaFile.size, "Type:", mediaFile.type);
      setIsUploading(true);
      try {
        const storageRef = ref(storage, `chat-media/${Date.now()}-${mediaFile.name}`);
        console.log("Storage reference created", storageRef);
        // Add upload progress monitoring
        const uploadTask = uploadBytes(storageRef, mediaFile);
        console.log("Upload task created");
    
        // Wait for upload to complete
        await uploadTask;
        console.log("File uploaded successfully");
    
        mediaUrl = await getDownloadURL(storageRef);
        console.log("Got download URL:", mediaUrl);
      } catch (error) {
        console.error("Error uploading file:", error.code, error.message, error);
        alert("Failed to upload media: " + error.message);
        return;
      } finally {
      setIsUploading(false);
      }
    }
    //code for sending audio
    if (audioBlob) {
      const audioRef = ref(storage, `voice-notes/${Date.now()}.webm`);
      setIsUploading(true);
      try {
        await uploadBytes(audioRef, audioBlob);
        mediaUrl = await getDownloadURL(audioRef);
      } catch (err) {
        console.error("Audio upload failed", err);
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
        mediaUrl: mediaUrl || null,
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
    }
  };

  //Code for recording audio
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
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url("https://www.reachcambridge.com/wp-content/uploads/2019/11/coding.jpg")',
        backgroundSize: "cover", backgroundPosition: "center", filter: "blur(8px)", zIndex: -1,
      }}></div>

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
                  {msg.mediaUrl && (
                    <div style={{ marginTop: "10px" }}>
                      {msg.mediaUrl.endsWith(".webm") ? (
                        <audio controls src={msg.mediaUrl} />
                      ) : (
                        <img src={msg.mediaUrl} alt="Shared Media" style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "cover" }} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMessage && (
        <div style={{ marginTop: "5px", fontSize: "16px", color: "#666" }}>
          {selectedMessage.reactions?.map((reaction, idx) => (
            <span key={idx} style={{ marginRight: "5px" }}>
              {reaction.emoji}
            </span>
          ))}
        </div>
      )}

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

      <form onSubmit={handleSendMessage} style={{ width: "90%", padding: "10px" }}>
  {/* File input + media preview section */}
  <div style={{ marginBottom: "10px" }}>
    <input
      type="file"
      accept="image/*"
      onChange={handleFileSelect}
      style={{ marginBottom: "10px" }}
    />
    {mediaPreview && (
      <div>
        {mediaFile?.type.startsWith("audio/") ? (
          <audio controls src={mediaPreview} style={{ width: "100%" }} />
        ) : (
          <img
            src={mediaPreview}
            alt="Preview"
            style={{ width: "100px", height: "100px", objectFit: "cover" }}
          />
        )}
      </div>
    )}
  </div>

  {/* Message input + mic + send section */}
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <input
      type="text"
      value={message}
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