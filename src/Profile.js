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
} from "firebase/auth";
import "./Profile.css";

const Profile = () => {
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewPic, setPreviewPic] = useState(null);
  const navigate = useNavigate();

  // Cloudinary config
  const cloudName = "drpqytgbz"; // 🔁 Replace with your actual cloud name
  const uploadPreset = "profile_uploads"; // Make sure it's unsigned

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser) return;

      const userRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfilePicUrl(data.profilePicUrl || "https://via.placeholder.com/150");
        setDisplayName(data.displayName || "");
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

  // Upload image to Cloudinary
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

  // Handle profile image change
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreviewPic(URL.createObjectURL(file));

    const uploadedUrl = await uploadToCloudinary(file);

    if (uploadedUrl) {
      setProfilePicUrl(uploadedUrl);

      // Save to Firestore
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        { profilePicUrl: uploadedUrl },
        { merge: true }
      );
      alert("Profile picture updated!");
    } else {
      alert("Image upload failed. Try again.");
    }
  };

  // Save display name and (optionally) profile pic URL
  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userData = { displayName };

      if (profilePicUrl) {
        userData.profilePicUrl = profilePicUrl;
      }

      await setDoc(userRef, userData, { merge: true });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to update profile.");
    }
  };

  // Account actions
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
      <h2>Profile</h2>

      <div className="profile-pic">
        <img
          src={previewPic || profilePicUrl}
          alt="Profile"
          style={{ width: "150px", height: "150px", borderRadius: "50%" }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleProfilePicChange}
          disabled={isUploading}
        />
        {isUploading && <p>Uploading image...</p>}
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

      <button onClick={handleSaveProfile} disabled={isUploading}>
        Save Profile
      </button>
      <button onClick={handleLogout}>Logout</button>
      <button onClick={handleDeactivateAccount} style={{ background: "orange" }}>
        Deactivate Account
      </button>
      <button onClick={handleDeleteAccount} style={{ background: "red" }}>
        Delete Account
      </button>
    </div>
  );
};

export default Profile;
