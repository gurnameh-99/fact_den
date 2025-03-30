// src/fact_den_frontend/src/AppBar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaSignOutAlt, FaUser, FaUserAstronaut, FaUserNinja, FaUserSecret, FaUserTie, FaUserGraduate,
  FaUserMd, FaUserCheck, FaCat, FaDog, FaHorse, FaKiwiBird, FaDragon,
  FaSpider, FaHippo, FaFish, FaOtter } from 'react-icons/fa';
import './AppBar.scss';

// Avatar icon mapping
const AVATAR_ICONS = {
  'astronaut': FaUserAstronaut,
  'ninja': FaUserNinja,
  'secret': FaUserSecret,
  'tie': FaUserTie,
  'graduate': FaUserGraduate,
  'doctor': FaUserMd,
  'verified': FaUserCheck,
  'cat': FaCat,
  'dog': FaDog,
  'horse': FaHorse,
  'bird': FaKiwiBird,
  'dragon': FaDragon,
  'spider': FaSpider,
  'hippo': FaHippo,
  'fish': FaFish,
  'otter': FaOtter,
};

function AppBar({ principal, onLogout, searchValue, onSearchChange, onNewPostClick, accountInfo }) {
  // Render the avatar icon based on user's selection
  const renderAvatarIcon = () => {
    if (!accountInfo || !accountInfo.avatar) {
      return <FaUser size={20} />;
    }
    
    const IconComponent = AVATAR_ICONS[accountInfo.avatar] || FaUser;
    return <IconComponent size={20} />;
  };

  return (
    <header className="custom-app-bar">
      {/* Left Section: Brand */}
      <div className="left-section">
        <Link to="/dashboard" className="brand">
          Fact Den
        </Link>
      </div>

      {/* Middle Section: Search */}
      <div className="middle-section">
        <input
          type="text"
          placeholder="Search Fact Den..."
          value={searchValue}
          onChange={onSearchChange}
          className="search-bar"
        />
      </div>

      {/* Right Section: Actions */}
      <div className="right-section">
        <button className="new-post-btn" onClick={onNewPostClick}>
          New Post
        </button>
        <Link to="/account" className="account-link">
          My Account
        </Link>
        <div className="user-info">
          <span className="avatar-icon">{renderAvatarIcon()}</span>
          <span>{principal}</span>
          <button className="logout-btn" onClick={onLogout}>
            <FaSignOutAlt size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppBar;
