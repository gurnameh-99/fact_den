// src/fact_den_frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppBar from './AppBar';
import Dashboard from './Dashboard';
import MyAccount from './MyAccount';
import './App.scss';
// Import backend services
import { getUserInfo, getAuthClient } from './services/backend';

function App() {
  const [authClient, setAuthClient] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [principal, setPrincipal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  // Determine if we're in a local development environment
  const isLocalNetwork = process.env.DFX_NETWORK !== "ic";
  // accountInfo now holds alias and avatar; alias is empty by default
  const [accountInfo, setAccountInfo] = useState({
    alias: '',
    avatar: ''
  });

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsAuthenticating(true);
        const client = await getAuthClient();
        setAuthClient(client);
        
        const isAuth = await client.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          const identity = client.getIdentity();
          const userPrincipal = identity.getPrincipal().toString();
          setPrincipal(userPrincipal);
          
          try {
            // Fetch user info from backend if authenticated
            const userInfo = await getUserInfo();
            if (userInfo) {
              setAccountInfo({
                alias: userInfo.alias,
                avatar: userInfo.avatar
              });
            }
          } catch (error) {
            console.error("Error fetching user info:", error);
          }
        }
      } catch (error) {
        console.error("Authentication initialization error:", error);
      } finally {
        setIsAuthenticating(false);
      }
    };
    
    initAuth();
  }, []);

  const handleLogin = async () => {
    if (!authClient) return;
    
    try {
      // Get the identity provider URL from the environment
      const identityProviderUrl = process.env.INTERNET_IDENTITY_URL;
      
      console.log("Starting login process with identity provider:", identityProviderUrl);
      
      // Perform the login with appropriate options
      await authClient.login({
        identityProvider: identityProviderUrl,
        // Use a shorter TTL for development to avoid delegation verification issues
        maxTimeToLive: BigInt(1000 * 60 * 30 * 1000 * 1000), // 30 minutes in nanoseconds
        onSuccess: async () => {
          console.log("Login successful!");
          setIsAuthenticated(true);
          
          // Get the authenticated identity
          const identity = authClient.getIdentity();
          const userPrincipal = identity.getPrincipal().toString();
          console.log("Authenticated with principal:", userPrincipal);
          setPrincipal(userPrincipal);
          
          try {
            // Delay fetching user info slightly
            setTimeout(async () => {
              try {
                // Fetch user info after successful login
                console.log("Fetching user info after login");
                const userInfo = await getUserInfo();
                if (userInfo) {
                  console.log("User info retrieved:", userInfo);
                  setAccountInfo({
                    alias: userInfo.alias || '',
                    avatar: userInfo.avatar || ''
                  });
                } else {
                  console.log("No existing user info found - new user");
                }
              } catch (infoError) {
                console.error("Error fetching user info after delay:", infoError);
              }
            }, 500);
          } catch (error) {
            console.error("Error setting up delayed user info fetch:", error);
          }
        },
        onError: (error) => {
          console.error("Login failed:", error);
          alert("Login failed. Please try again. Error: " + (error.message || "Unknown error"));
        }
      });
    } catch (error) {
      console.error("Login process error:", error);
      alert("Something went wrong during login. Please try again later.");
    }
  };

  const handleLogout = async () => {
    if (!authClient) return;
    try {
      await authClient.logout();
      setIsAuthenticated(false);
      setPrincipal(null);
      setAccountInfo({
        alias: '',
        avatar: ''
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleNewPostClick = () => {
    setShowNewPost(true);
  };

  const handleCloseNewPost = () => {
    setShowNewPost(false);
  };

  const updateAccountInfo = (newInfo) => {
    setAccountInfo(newInfo);
  };

  // Show loading indicator while authentication is in progress
  if (isAuthenticating) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing application...</p>
      </div>
    );
  }

  // If the user is not authenticated, render the login view.
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <img src="/logo192.png" alt="Logo" className="login-logo" />
          <h1>Welcome to Fact Den</h1>
          <p>Your decentralized fact-checking platform.</p>
          <button className="login-btn" onClick={handleLogin}>
            Login with Internet Identity
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppBar
        principal={accountInfo.alias || "No Alias"}
        onLogout={handleLogout}
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        onNewPostClick={handleNewPostClick}
      />
      <div className="app-content">
        <Routes>
          <Route
            path="/dashboard"
            element={
              // If alias is empty, force user to update account info first.
              accountInfo.alias ? (
                <Dashboard
                  searchQuery={searchQuery}
                  showNewPost={showNewPost}
                  onCloseNewPost={handleCloseNewPost}
                />
              ) : (
                <Navigate to="/account" replace />
              )
            }
          />
          <Route
            path="/account"
            element={
              <MyAccount
                accountInfo={accountInfo}
                updateAccountInfo={updateAccountInfo}
                principal={principal}
              />
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
