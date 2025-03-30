import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignUp.scss';
// Import icons from React Icons
import { 
  FaUserAstronaut, FaUserNinja, FaUserSecret, FaUserTie, FaUserGraduate,
  FaUserMd, FaUserCheck, FaCat, FaDog, FaHorse, FaKiwiBird, FaDragon,
  FaSpider, FaHippo, FaFish, FaOtter, FaArrowRight
} from 'react-icons/fa';
// Import backend service function
import { updateUserInfo } from './services/backend';

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

function SignUp({ updateAccountInfo, principal }) {
  const [alias, setAlias] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(AVATAR_ICONS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Add console log to verify principal on component mount
  useEffect(() => {
    console.log("SignUp component mounted with principal:", principal);
  }, [principal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!alias.trim()) {
      setError('Alias name is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log("Creating new account with alias:", alias, "and icon:", selectedIcon);
      // Update user info in the backend
      await updateUserInfo(alias, selectedIcon);
      
      // Update local state in parent component
      updateAccountInfo({ alias, avatar: selectedIcon });
      console.log("Account created successfully, redirecting to dashboard");
      
      // Redirect to dashboard after successful signup
      navigate('/dashboard');
    } catch (err) {
      console.error("Error creating account:", err);
      setError(`Failed to create account: ${err.message || 'Unknown error'}`);
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

  return (
    <div className="signup-container">
      <div className="signup-form">
        <h2>Welcome to Fact Den!</h2>
        <p className="intro-text">
          Before you start, let's set up your profile so others can recognize you.
        </p>
        
        <div className="icp-id">
          <strong>Your ICP ID:</strong> {principal}
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        <form onSubmit={handleSubmit} className="account-form">
          <div className="form-group">
            <label htmlFor="alias">Choose a display name <span className="required">*</span></label>
            <input
              type="text"
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your display name"
              autoFocus
            />
            <p className="help-text">This is how others will see you in posts and comments</p>
          </div>
          
          <div className="form-group">
            <label>Select an avatar <span className="required">*</span></label>
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
          
          <button type="submit" disabled={loading} className="signup-button">
            {loading ? 'Creating Account...' : (
              <>
                Get Started <FaArrowRight style={{ marginLeft: '8px' }} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignUp; 