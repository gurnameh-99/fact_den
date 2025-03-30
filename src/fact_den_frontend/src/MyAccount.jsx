// src/fact_den_frontend/src/MyAccount.jsx
import React, { useState, useEffect } from 'react';
import './MyAccount.scss';
// Import backend service function
import { updateUserInfo } from './services/backend';

// Max size for avatar (in bytes) - Keep it very small for testing
const MAX_AVATAR_SIZE = 1000; // 1KB - small for testing

function MyAccount({ accountInfo, updateAccountInfo, principal }) {
  const [alias, setAlias] = useState(accountInfo.alias || '');
  const [avatar, setAvatar] = useState(accountInfo.avatar || '');
  const [preview, setPreview] = useState(accountInfo.avatar || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Update component state when accountInfo changes
    setAlias(accountInfo.alias || '');
    setAvatar(accountInfo.avatar || '');
    setPreview(accountInfo.avatar || '');
  }, [accountInfo]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size before processing
    if (file.size > MAX_AVATAR_SIZE) {
      setError(`Image is too large. Maximum size is ${MAX_AVATAR_SIZE / 1000}KB. For testing, please use a very small image.`);
      return;
    }
    
    // Reset error when selecting a new file
    setError('');
    
    // Create a preview of the avatar image
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setPreview(result);
      // For testing, don't use data URLs at all - just use a placeholder
      setAvatar("https://via.placeholder.com/150");
    };
    reader.onerror = () => {
      setError('Error reading the image file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!alias.trim()) {
      setError('Alias name is required');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      console.log("Submitting account update with alias:", alias);
      // Update user info in the backend - use a placeholder avatar for testing
      const placeholderAvatar = "https://via.placeholder.com/150";
      await updateUserInfo(alias, placeholderAvatar);
      
      // Update local state
      updateAccountInfo({ alias, avatar: placeholderAvatar });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating account:", err);
      setError(`Failed to update account: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-account">
      <h2>My Account</h2>
      
      <div className="icp-id">
        <strong>ICP ID:</strong> {principal}
      </div>
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      {success && (
        <div className="success-message">Account updated successfully!</div>
      )}
      
      <form onSubmit={handleSubmit} className="account-form">
        <div className="form-group">
          <label htmlFor="alias">Alias Name <span className="required">*</span></label>
          <input
            type="text"
            id="alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            required
            disabled={loading}
            placeholder="Enter your display name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="avatar">Avatar (For testing, don't upload actual images)</label>
          <input 
            type="file" 
            id="avatar" 
            accept="image/*" 
            onChange={handleAvatarChange} 
            disabled={loading}
          />
          <p className="help-text">
            For testing, we'll use a placeholder image instead of uploading your actual image.
          </p>
        </div>
        
        {preview && (
          <div className="avatar-preview">
            <img src={preview} alt="Avatar Preview" />
          </div>
        )}
        
        <button type="submit" disabled={loading} className="update-button">
          {loading ? 'Updating...' : 'Update Account'}
        </button>
      </form>
    </div>
  );
}

export default MyAccount;
