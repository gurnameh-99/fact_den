// src/fact_den_frontend/src/AppBar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import './AppBar.scss';

function AppBar({ principal, onLogout, searchValue, onSearchChange, onNewPostClick }) {
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
