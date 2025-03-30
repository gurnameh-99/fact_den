// src/fact_den_frontend/src/MyAccount.jsx
import React, { useState, useEffect } from 'react';
import './MyAccount.scss';
// Import icons from React Icons
import { 
  FaUserAstronaut, FaUserNinja, FaUserSecret, FaUserTie, FaUserGraduate,
  FaUserMd, FaUserCheck, FaCat, FaDog, FaHorse, FaKiwiBird, FaDragon,
  FaSpider, FaHippo, FaFish, FaOtter, FaUser, FaCheck, FaTimes, FaQuestionCircle
} from 'react-icons/fa';
// Import backend service function
import { updateUserInfo, getMyPosts, getUserAliasFromPrincipal } from './services/backend';
import { useNavigate } from 'react-router-dom';

// Define available avatar icons
const AVATAR_ICONS = [
  { id: 'astronaut', icon: FaUserAstronaut, label: 'Astronaut' },
  { id: 'ninja', icon: FaUserNinja, label: 'Ninja' },
  { id: 'secret', icon: FaUserSecret, label: 'Secret Agent' },
  { id: 'tie', icon: FaUserTie, label: 'Business' },
  { id: 'graduate', icon: FaUserGraduate, label: 'Graduate' },
  { id: 'doctor', icon: FaUserMd, label: 'Doctor' },
  { id: 'verified', icon: FaUserCheck, label: 'Verified' },
  { id: 'cat', icon: FaCat, label: 'Cat' },
  { id: 'dog', icon: FaDog, label: 'Dog' },
  { id: 'horse', icon: FaHorse, label: 'Horse' },
  { id: 'bird', icon: FaKiwiBird, label: 'Bird' },
  { id: 'dragon', icon: FaDragon, label: 'Dragon' },
  { id: 'spider', icon: FaSpider, label: 'Spider' },
  { id: 'hippo', icon: FaHippo, label: 'Hippo' },
  { id: 'fish', icon: FaFish, label: 'Fish' },
  { id: 'otter', icon: FaOtter, label: 'Otter' },
];

// Verdict icons
const VERDICT_ICONS = {
  'True': { icon: FaCheck, color: '#2e7d32' }, // Green
  'False': { icon: FaTimes, color: '#d32f2f' }, // Red
  'Misleading': { icon: FaQuestionCircle, color: '#ed6c02' }, // Orange
  'Partly True': { icon: FaQuestionCircle, color: '#ed6c02' }, // Orange
  'Unknown': { icon: FaQuestionCircle, color: '#757575' } // Gray
};

// Max size for avatar (in bytes) - Keep it very small for testing
const MAX_AVATAR_SIZE = 1000; // 1KB - small for testing

function MyAccount({ accountInfo, updateAccountInfo, principal }) {
  const [alias, setAlias] = useState(accountInfo.alias || '');
  const [selectedIcon, setSelectedIcon] = useState(accountInfo.avatar || AVATAR_ICONS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Update component state when accountInfo changes
    setAlias(accountInfo.alias || '');
    setSelectedIcon(accountInfo.avatar || AVATAR_ICONS[0].id);
  }, [accountInfo]);

  useEffect(() => {
    // Only fetch posts when the "My Posts" tab is active
    if (activeTab === 'posts') {
      fetchUserPosts();
    }
  }, [activeTab]);

  const fetchUserPosts = async () => {
    setLoadingPosts(true);
    setPostsError('');
    
    try {
      const posts = await getMyPosts();
      setUserPosts(posts);
    } catch (err) {
      console.error("Error fetching user posts:", err);
      setPostsError(`Failed to load your posts: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingPosts(false);
    }
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
      console.log("Submitting account update with alias:", alias, "and icon:", selectedIcon);
      // Update user info in the backend
      await updateUserInfo(alias, selectedIcon);
      
      // Update local state
      updateAccountInfo({ alias, avatar: selectedIcon });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating account:", err);
      setError(`Failed to update account: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Render the selected icon component
  const renderSelectedIcon = () => {
    const iconData = AVATAR_ICONS.find(icon => icon.id === selectedIcon) || AVATAR_ICONS[0];
    const IconComponent = iconData.icon;
    return <IconComponent size={80} />;
  };

  // Render the avatar icon for a given iconId
  const renderAvatarIcon = (iconId, size = 24) => {
    const iconData = AVATAR_ICONS.find(icon => icon.id === iconId);
    const IconComponent = iconData ? iconData.icon : FaUser;
    return <IconComponent size={size} />;
  };

  // Helper to render verdict icon
  const renderVerdictIcon = (verdict, size = 24) => {
    if (!verdict) verdict = 'Unknown';
    const verdictInfo = VERDICT_ICONS[verdict] || VERDICT_ICONS['Unknown'];
    const IconComponent = verdictInfo.icon;
    return <IconComponent size={size} color={verdictInfo.color} />;
  };

  // Format timestamp as a readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(Number(timestamp) / 1000000); // Convert nano to milli
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Function to handle clicking on a post
  const handlePostClick = (postId) => {
    // Navigate to the dashboard with the postId as a query parameter
    navigate(`/dashboard?postId=${postId}`);
  };

  // Update the My Posts tab content to make posts clickable
  const renderMyPostsTab = () => {
    if (loadingPosts) {
      return <div className="loading">Loading posts...</div>;
    }
    
    if (postsError) {
      return <div className="error">{postsError}</div>;
    }
    
    if (userPosts.length === 0) {
      return <div className="no-posts">You haven't created any posts yet.</div>;
    }
    
    return (
      <div className="my-posts-list">
        {userPosts.map(post => (
          <div 
            key={post.id} 
            className="post-item" 
            onClick={() => handlePostClick(post.id)}
          >
            <h3 className="post-title">{post.title}</h3>
            <p className="post-content">{post.content.length > 150 
              ? `${post.content.substring(0, 150)}...` 
              : post.content}
            </p>
            <div className="post-metadata">
              <span className="post-stats">
                Votes: {Number(post.upvotes) - Number(post.downvotes)} | 
                Comments: {Number(post.commentCount)} | 
                Published: {formatDate(Number(post.createdAt))}
              </span>
              {post.aiVerdict && (
                <span className="post-verdict" style={{ 
                  color: VERDICT_ICONS[post.aiVerdict.verdict]?.color || '#757575'
                }}>
                  {renderVerdictIcon(post.aiVerdict.verdict)}
                  {post.aiVerdict.verdict}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="my-account">
      <h2>My Account</h2>
      
      <div className="icp-id">
        <strong>ICP ID:</strong> {principal}
      </div>
      
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile Settings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          My Posts
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="tab-content profile-tab">
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
              <label>Select Your Avatar Icon <span className="required">*</span></label>
              <div className="avatar-preview">
                {renderSelectedIcon()}
              </div>
              <div className="icon-selector">
                {AVATAR_ICONS.map(icon => {
                  const IconComponent = icon.icon;
                  return (
                    <div 
                      key={icon.id}
                      className={`icon-option ${selectedIcon === icon.id ? 'selected' : ''}`}
                      onClick={() => setSelectedIcon(icon.id)}
                      title={icon.label}
                    >
                      <IconComponent size={30} />
                    </div>
                  );
                })}
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="update-button">
              {loading ? 'Updating...' : 'Update Account'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="tab-content posts-tab">
          <h3>My Posts</h3>
          
          {renderMyPostsTab()}
        </div>
      )}
    </div>
  );
}

export default MyAccount;
