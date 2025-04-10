import React, { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import { getDoc, setDoc, doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import "./Profile.css";

const Profile = () => {
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewPic, setPreviewPic] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  const cloudName = "drpqytgbz";
  const uploadPreset = "profile_uploads";

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfilePicUrl(data.profilePicUrl || "https://via.placeholder.com/150");
        setDisplayName(data.displayName || "");
        setNewEmail(user.email);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserProfile();
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const uploadToCloudinary = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "profile_pictures");

    try {
      setIsUploading(true);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreviewPic(URL.createObjectURL(file));
    const uploadedUrl = await uploadToCloudinary(file);

    if (uploadedUrl) {
      setProfilePicUrl(uploadedUrl);
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        profilePicUrl: uploadedUrl,
      }, { merge: true });
      alert("Profile picture updated!");
    } else {
      alert("Image upload failed. Try again.");
    }
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      alert("Please enter your current password to continue.");
      return;
    }

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      if (newEmail && newEmail !== user.email) {
        await updateEmail(user, newEmail);
        alert("Email updated! Please verify your new email.");
        await sendEmailVerification(user);
      }

      if (newPassword) {
        await updatePassword(user, newPassword);
        alert("Password updated!");
      }

      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      console.error("Update failed:", error.message);
      alert("Update failed: " + error.message);
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userData = { displayName };
      if (profilePicUrl) userData.profilePicUrl = profilePicUrl;

      await setDoc(userRef, userData, { merge: true });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to update profile.");
    }
  };

  const handleDeleteAccount = async () => {
    const password = prompt("Enter your password to confirm deletion:");
    if (!password) return;

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        firstName: "Deleted",
        surname: "User",
        deactivated: true,
      });

      await deleteUser(auth.currentUser);
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Error deleting account. Try again.");
    }
  };

  const handleDeactivateAccount = async () => {
    if (!window.confirm("Are you sure you want to deactivate your account?")) return;

    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        deactivated: true,
      });

      alert("Your account has been deactivated.");
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error deactivating account:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="profile-container">
      <h2 style={{textAlign:'center'}}>Profile</h2>
  
      <div className="profile-pic">
        <img
          src={previewPic || profilePicUrl}
          alt="Profile"
          style={{ width: "150px", height: "150px", borderRadius: "50%" }}
        />
        <input className="file-input"
          type="file"
          accept="image/*"
          onChange={handleProfilePicChange}
          disabled={isUploading}
        />
        {isUploading && <p>Uploading image...</p>}
      </div>
      <div className="profile-details">
  <label>Display Name:</label>
  <div className="display-name-row">
    <input
      type="text"
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
      placeholder="Enter your display name"
    />
    <button className="btnsaveprfl" onClick={handleSaveProfile} disabled={isUploading}>
      Save Profile
    </button>
  </div>
</div>
    
          <div className="navbar">
  <div className="burger-menu" onClick={() => setMenuOpen(!menuOpen)}>
    &#9776;
  </div>
  
  {menuOpen && (
    <div className="menu-content">
      <button onClick={handleLogout} style={{ background: "orange" }}>Logout</button>
      <button onClick={handleDeactivateAccount} style={{ background: "rgb(0,123,255)" }}>
        Deactivate Account
      </button>
      <button onClick={handleDeleteAccount} style={{ background: "red" }}>
        Delete Account
      </button>
    </div>
  )}
</div>

     
      <div className="profile-content">
        {/* Left Side */}
        <div className="profile-left">
        <form onSubmit={handleUpdateCredentials}>
            <h3>Update Email / Password</h3>
          
            <label>New Email:</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter your new email"
            />
            <label>Current Password (for verification):</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
            />
            <label>New Password (optional):</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (optional)"
            />
       
            <button type="submit">Update Email / Password</button>
          </form>
        </div>
  
     
      </div>
  
      {/* Back to Chat stays below everything */}
      <button className="btnbtc" onClick={() => navigate("/chat")}>Back to Chat</button>
    </div>
  );
};  

export default Profile;


