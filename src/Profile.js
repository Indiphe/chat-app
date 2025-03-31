import React, { useState, useEffect } from "react";
import { auth, db, storage } from "./firebaseConfig";
import { getDoc, setDoc, doc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewPic, setPreviewPic] = useState(null);
  const navigate = useNavigate();

  // Fetch the current user's profile data from Firestore
  useEffect(() => {
    const fetchUserProfile = async () => {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfilePicUrl(data.profilePicUrl || "https://via.placeholder.com/150");
        setDisplayName(data.displayName || "");
      }
    };

    if (auth.currentUser) {
      fetchUserProfile();
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Handle the file upload and preview
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewPic(URL.createObjectURL(file));  // Preview the selected image
      setIsUploading(true);

      // Create a reference to the profile picture path in Firebase Storage
      const storageRef = ref(storage, `profile-pics/${auth.currentUser.uid}`);
      uploadBytes(storageRef, file).then((snapshot) => {
        getDownloadURL(snapshot.ref).then((url) => {
          setProfilePicUrl(url);
          setIsUploading(false);
        });
      });
    }
  };

  // Handle saving the user profile to Firestore
  const handleSaveProfile = async () => {
    const userRef = doc(db, "users", auth.currentUser.uid);
    await setDoc(userRef, {
      profilePicUrl: profilePicUrl,
      displayName: displayName,
    }, { merge: true });
    alert("Profile updated successfully!");
  };

  const handleLogout = () => {
    auth.signOut();
    navigate("/login");
  };

  return (
    <div className="profile-container">
      <h2>Profile</h2>
      <div className="profile-pic">
        <img
          src={previewPic || profilePicUrl}  // Use previewPic if available
          alt="Profile"
          style={{ width: "150px", height: "150px", borderRadius: "50%" }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleProfilePicChange}
          disabled={isUploading}
        />
        {isUploading && <p>Uploading...</p>}
      </div>
      <div className="profile-details">
        <label>Display Name:</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
        />
      </div>
      <button onClick={handleSaveProfile} disabled={isUploading}>Save Profile</button>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Profile;

