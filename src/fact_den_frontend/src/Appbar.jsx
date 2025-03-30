// src/fact_den_frontend/src/AppBar.jsx
import React, { useRef, useEffect } from 'react';
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
  // Create a ref for the search input element
  const searchInputRef = useRef(null);
  
  // Effect to handle focus preservation during updates
  useEffect(() => {
    // Only manage focus when document is ready and the element exists
    if (!document || !searchInputRef.current) return;
    
    // If the input was already focused before the update, restore focus
    if (document.activeElement === searchInputRef.current) {
      // Store cursor position
      const cursorPosition = searchInputRef.current.selectionStart;
      
      // Restore focus with a slight delay to ensure DOM updates are complete
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          // Restore cursor position
          searchInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
      }, 0);
    }
  }, [searchValue]); // Run this effect when search value changes
  
  // Handle search change with additional safety checks
  const handleSearchChange = (e) => {
    // Ensure onSearchChange is a function before calling it
    if (typeof onSearchChange === 'function') {
      onSearchChange(e);
    }
  };
  
  // Handle logout with confirmation
  const handleLogout = () => {
    // Confirm logout to prevent accidental clicks
    if (window.confirm("Are you sure you want to log out?")) {
      if (typeof onLogout === 'function') {
        onLogout();
      }
    }
  };
  
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
          ref={searchInputRef}
          type="text"
          placeholder="Search Fact Den..."
          value={searchValue || ''}
          onChange={handleSearchChange}
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
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <FaSignOutAlt size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppBar;