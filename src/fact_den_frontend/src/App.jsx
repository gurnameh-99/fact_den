// src/fact_den_frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppBar from './AppBar';
import Dashboard from './Dashboard';
import MyAccount from './MyAccount';
import SignUp from './SignUp';
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
  // Track if the user is new (no alias) or existing
  const [isNewUser, setIsNewUser] = useState(false);

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
            if (userInfo && userInfo.alias) { // Make sure alias exists and is not empty
              setAccountInfo({
                alias: userInfo.alias,
                avatar: userInfo.avatar
              });
              // User has an alias, so they're not new
              setIsNewUser(false);
              console.log("Init: User is recognized as existing user, will access dashboard");
            } else {
              // No user info or empty alias, they are a new user
              setAccountInfo({
                alias: '',
                avatar: ''
              });
              setIsNewUser(true);
              console.log("Init: User is recognized as new user, will be directed to signup");
            }
          } catch (error) {
            console.error("Error fetching user info:", error);
            // Assume new user if error fetching info
            setAccountInfo({
              alias: '',
              avatar: ''
            });
            setIsNewUser(true);
            console.log("Init: Error fetching user info - assuming new user, will be directed to signup");
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
            // Fetch user info immediately after login instead of using setTimeout
            console.log("Fetching user info after login");
            const userInfo = await getUserInfo();
            if (userInfo && userInfo.alias) { // Make sure alias exists and is not empty
              console.log("User info retrieved:", userInfo);
              setAccountInfo({
                alias: userInfo.alias || '',
                avatar: userInfo.avatar || ''
              });
              setIsNewUser(false);
              console.log("User is recognized as existing user, will redirect to dashboard");
            } else {
              console.log("No existing user info or empty alias - marking as new user");
              setIsNewUser(true);
              // Clear account info to ensure proper signup flow
              setAccountInfo({
                alias: '',
                avatar: ''
              });
              console.log("User is recognized as new user, will redirect to signup");
            }
          } catch (infoError) {
            console.error("Error fetching user info:", infoError);
            setIsNewUser(true);
            // Clear account info on error
            setAccountInfo({
              alias: '',
              avatar: ''
            });
            console.log("Error fetching user info - marking as new user, will redirect to signup");
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
      setIsNewUser(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSearchChange = (e) => {
    // Capture the current selection positions before the state update
    const input = e.target;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    
    // Use function form of setState to avoid issues with concurrent updates
    setSearchQuery(e.target.value);
    
    // The focus will be handled by the AppBar component's useEffect
  };

  const handleNewPostClick = () => {
    setShowNewPost(true);
  };

  const handleCloseNewPost = () => {
    setShowNewPost(false);
  };

  const updateAccountInfo = (newInfo) => {
    console.log("Updating account info:", newInfo);
    setAccountInfo(newInfo);
    // When a user updates their account info, they are explicitly no longer a new user
    setIsNewUser(false);
    
    // Dispatch an event to notify other components of the change
    const authChangeEvent = new Event('authStateChanged');
    window.dispatchEvent(authChangeEvent);
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

  // App wrapper component with route awareness
  function AppWithNav() {
    const location = useLocation();
    const isSignupPage = location.pathname === '/signup';
    
    return (
      <>
        {/* Only render AppBar if not on signup page */}
        {!isSignupPage && (
          <AppBar
            principal={accountInfo.alias || "No Alias"}
            onLogout={handleLogout}
            searchValue={searchQuery}
            onSearchChange={handleSearchChange}
            onNewPostClick={handleNewPostClick}
            accountInfo={accountInfo}
          />
        )}
        <div className={`app-content ${isSignupPage ? 'full-height' : ''}`}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                // If new user (no alias), redirect to signup
                isNewUser ? (
                  <Navigate to="/signup" replace />
                ) : (
                  <Dashboard
                    searchQuery={searchQuery}
                    showNewPost={showNewPost}
                    onCloseNewPost={handleCloseNewPost}
                  />
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
            <Route
              path="/signup"
              element={
                // If existing user tries to access /signup, redirect to dashboard
                !isNewUser ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <SignUp
                    updateAccountInfo={updateAccountInfo}
                    principal={principal}
                  />
                )
              }
            />
            {/* Default route - redirect to dashboard or signup based on user status */}
            <Route 
              path="*" 
              element={
                isNewUser ? 
                  <Navigate to="/signup" replace /> : 
                  <Navigate to="/dashboard" replace />
              } 
            />
          </Routes>
        </div>
      </>
    );
  }

  return (
    <Router>
      <AppWithNav />
    </Router>
  );
}

export default App;
