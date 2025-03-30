// src/fact_den_frontend/src/Dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import './Dashboard.scss';
// Import backend services
import { getPosts, addPost, addComment, updateVote, getUserAliasFromPrincipal, getUserPrincipal, getUserVote, requestAIVerdict, getAIVerdict } from './services/backend';
// Import icons for rendering avatars
import { 
  FaUserAstronaut, FaUserNinja, FaUserSecret, FaUserTie, FaUserGraduate,
  FaUserMd, FaUserCheck, FaCat, FaDog, FaHorse, FaKiwiBird, FaDragon,
  FaSpider, FaHippo, FaFish, FaOtter, FaUser, FaCheck, FaTimes, FaQuestionCircle, FaSync, FaSearch
} from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

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

// Default for any unknown icon ID
const DEFAULT_ICON = FaUser;

// Verdict icons
const VERDICT_ICONS = {
  'True': { icon: FaCheck, color: '#2e7d32' }, // Green
  'False': { icon: FaTimes, color: '#d32f2f' }, // Red
  'Misleading': { icon: FaQuestionCircle, color: '#ed6c02' }, // Orange
  'Partly True': { icon: FaQuestionCircle, color: '#ed6c02' }, // Orange
  'Unknown': { icon: FaQuestionCircle, color: '#757575' } // Gray
};

// Add this ErrorBoundary component at the top of the file after the imports
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>Something went wrong</h3>
          <p>{this.state.error && this.state.error.toString()}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Dashboard({ searchQuery, showNewPost, onCloseNewPost }) {
  const [posts, setPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const location = useLocation();

  // Converts a post's BigInt values to regular numbers for React
  // and properly extracts AI verdict data from the Option type
  const convertPostBigIntToNumber = (post) => {
    // First, handle the aiVerdict Option type from Motoko
    let aiVerdict = null;
    if (post.aiVerdict && Array.isArray(post.aiVerdict) && post.aiVerdict.length > 0) {
      aiVerdict = post.aiVerdict[0];
      console.log(`Post ${post.id} has verdict from backend: ${aiVerdict.verdict}`);
    }
    
    return {
      ...post,
      votes: typeof post.votes === 'bigint' ? Number(post.votes) : post.votes,
      // Keep any other BigInt fields that might exist
      timestamp: typeof post.timestamp === 'bigint' ? Number(post.timestamp) : post.timestamp,
      // Replace the Option type verdict with the extracted value
      aiVerdict: aiVerdict
    };
  };

  // Listen for post verdict updates from child components
  useEffect(() => {
    const handlePostVerdictUpdate = (event) => {
      const { postId, verdict } = event.detail;
      console.log(`Dashboard received verdict update for post ${postId}`);
      
      // Update the posts state with the new verdict
      setPosts(currentPosts => 
        currentPosts.map(post => 
          post.id === postId ? { ...post, aiVerdict: verdict } : post
        )
      );
    };
    
    // Add event listener
    window.addEventListener('updatePostVerdict', handlePostVerdictUpdate);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('updatePostVerdict', handlePostVerdictUpdate);
    };
  }, []);

  // Listen for auth state changes to refresh data
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('Auth state changed, refreshing posts');
      // Reload posts when auth state changes
      setPosts([]);
      setLoading(true);
      fetchPosts();
    };
    
    window.addEventListener('authStateChanged', handleAuthChange);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  // Fetch posts from backend
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const backendPosts = await getPosts();
      if (backendPosts && backendPosts.length > 0) {
        // Convert any BigInt values to regular numbers and process the verdict data
        const processedPosts = backendPosts.map(convertPostBigIntToNumber);
        console.log('Processed posts with verdicts:', processedPosts);
        setPosts(processedPosts);
        
        // Once posts are loaded, prefetch AI verdicts in the background
        prefetchAIVerdicts(processedPosts);
      } else {
        // Fallback to dummy data if the backend returns no posts
        setPosts(getDummyPosts());
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError('Failed to load posts. Using sample data instead.');
      // Fallback to dummy data on error
      setPosts(getDummyPosts());
    } finally {
      setLoading(false);
    }
  };

  // Prefetch AI verdicts for posts in the background
  const prefetchAIVerdicts = async (posts) => {
    if (!posts || posts.length === 0) return;
    
    console.log(`Starting background prefetch of AI verdicts for ${posts.length} posts`);
    
    // Process in batches to avoid too many simultaneous requests
    const batchSize = 3;
    
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      
      // Create an array of promises for each post in the batch
      const promises = batch.map(async (post) => {
        try {
          // Only fetch if the post doesn't already have a verdict
          if (!post.aiVerdict) {
            const verdict = await getAIVerdict(post.id);
            if (verdict) {
              console.log(`Prefetched verdict for post ${post.id}`);
              // Update the post in state with the verdict
              setPosts(currentPosts => 
                currentPosts.map(p => 
                  p.id === post.id ? { ...p, aiVerdict: verdict } : p
                )
              );
            }
          }
        } catch (error) {
          // Silently fail - this is just prefetching
          console.warn(`Failed to prefetch verdict for post ${post.id}:`, error);
        }
      });
      
      // Wait for all promises in this batch to complete before moving to next batch
      await Promise.all(promises);
      
      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < posts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('Finished prefetching AI verdicts');
  };

  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Function to create dummy posts for demonstration
  const getDummyPosts = () => {
    return [
      {
        id: 1,
        title: "Is climate change real?",
        content: "Climate change is a serious concern backed by numerous scientific studies.",
        votes: 10,
        author: "Default",
        comments: [
          { id: 1, content: "Absolutely, we need to act now.", author: "Default" },
          { id: 2, content: "The evidence is overwhelming.", author: "Default" }
        ],
        timestamp: Date.now()
      },
      // ... other dummy posts ...
    ];
  };

  // Handle post submission to backend
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      setError('Please provide both title and content for your post.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newPost = await addPost(newPostTitle, newPostContent);
      console.log('New post created:', newPost);
      
      // Add the new post to the posts list (optimistic update)
      const formattedPost = {
        id: Number(newPost.id),
        title: newPost.title,
        content: newPost.content,
        authorPrincipal: newPost.authorPrincipal,
        upvotes: Number(newPost.upvotes),
        downvotes: Number(newPost.downvotes),
        createdAt: Number(newPost.createdAt),
        commentCount: Number(newPost.commentCount),
        aiVerdict: null
      };
      
      setPosts(prevPosts => [formattedPost, ...prevPosts]);
      setNewPostTitle('');
      setNewPostContent('');
      onCloseNewPost();
      
      // Automatically request AI verdict for the new post
      try {
        console.log('Automatically requesting AI verdict for new post:', formattedPost.id);
        const verdict = await requestAIVerdict(formattedPost.id);
        console.log('AI verdict received:', verdict);
        
        // Update the post with the verdict
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === formattedPost.id 
              ? { ...post, aiVerdict: verdict } 
              : post
          )
        );
      } catch (verdictError) {
        console.error('Error fetching AI verdict for new post:', verdictError);
        // We don't set an error message here as the post was still created successfully
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter posts based on the search query
  const filteredPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    if (!searchQuery || searchQuery.trim() === '') return posts;
    
    const query = searchQuery.toLowerCase().trim();
    return posts.filter(post =>
      (post.title && post.title.toLowerCase().includes(query)) ||
      (post.content && post.content.toLowerCase().includes(query))
    );
  }, [posts, searchQuery]);

  // Extract postId from query parameters and set highlighted post
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const postId = query.get('postId');
    
    if (postId) {
      const numericPostId = Number(postId);
      setHighlightedPostId(numericPostId);
      
      // If posts are already loaded, scroll to the highlighted post
      if (posts.length > 0) {
        scrollToPost(numericPostId);
      }
    } else {
      setHighlightedPostId(null);
    }
  }, [location.search, posts]);
  
  // Function to scroll to a specific post
  const scrollToPost = (postId) => {
    setTimeout(() => {
      const postElement = document.getElementById(`post-${postId}`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a highlight animation class
        postElement.classList.add('highlighted-post');
        // Remove the highlight class after animation completes
        setTimeout(() => {
          postElement.classList.remove('highlighted-post');
        }, 3000);
      }
    }, 100);
  };

  return (
    <div className="dashboard">
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => {
              setError(''); 
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {showNewPost && (
        <div className="new-post-form">
          <div className="new-post-header">
            <h2>Create New Post</h2>
            <button className="close-btn" onClick={onCloseNewPost}>
              X
            </button>
          </div>
          <form onSubmit={handlePostSubmit}>
            <input
              type="text"
              placeholder="Post Title"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              required
              disabled={loading}
            />
            <textarea
              placeholder="Post Content"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              required
              disabled={loading}
            ></textarea>
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Post'}
            </button>
          </form>
        </div>
      )}

      <div className="feed-container">
        {loading && !posts.length ? (
          <div className="loading">Loading posts...</div>
        ) : (
          <div className="posts-feed">
            {filteredPosts && filteredPosts.length > 0 ? (
              filteredPosts.map(post => (
                <ErrorBoundary key={post.id || `post-${Math.random()}`}>
                  <Post post={post} />
                </ErrorBoundary>
              ))
            ) : (
              <div className="no-posts">No posts found matching your search.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Post({ post }) {
  // Add null check for the post prop
  if (!post) {
    return <div className="post">Post data is missing</div>;
  }
  
  // Debug log to verify we're receiving the verdict data
  console.log(`Rendering post ${post.id}`, {
    hasVerdict: !!post.aiVerdict,
    verdict: post.aiVerdict ? post.aiVerdict.verdict : 'none',
    postData: post
  });
  
  const [expanded, setExpanded] = useState(false);
  // Add extra safeguards for post properties
  const [votes, setVotes] = useState(typeof post.votes === 'bigint' ? Number(post.votes) : (post.votes || 0));
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authorInfo, setAuthorInfo] = useState(null);
  const [commentAuthors, setCommentAuthors] = useState({});
  const [userVote, setUserVote] = useState(0);
  const [aiVerdict, setAiVerdict] = useState(post.aiVerdict || null);
  const [isRequestingVerdict, setIsRequestingVerdict] = useState(false);
  const [aiVerdictLoading, setAiVerdictLoading] = useState(false);

  useEffect(() => {
    // Wrap everything in a try-catch to catch any unexpected errors
    try {
      // Fetch author info when post is mounted or expanded
      const fetchAuthorInfo = async () => {
        try {
          const info = await getUserAliasFromPrincipal(post.author.toString());
          setAuthorInfo(info);
        } catch (err) {
          console.error("Error fetching author info:", err);
          // Don't set error here - non-critical
        }
      };

      // Fetch user's vote for this post
      const fetchUserVote = async () => {
        try {
          const voteValue = await getUserVote(post.id);
          setUserVote(voteValue);
        } catch (err) {
          console.error("Error fetching user vote:", err);
          // Don't set error here - non-critical
        }
      };

      // Fetch AI verdict for this post if expanded
      const fetchAIVerdict = async () => {
        if (!expanded) return;
        
        if (aiVerdictLoading) {
          // Don't fetch verdict while still loading post details
          return;
        }

        // If the post already has a verdict in its data or we already have it in state, use that
        if (post.aiVerdict) {
          console.log(`Using existing verdict for post ${post.id}`);
          setAiVerdict(post.aiVerdict);
          return;
        }

        // If we don't have a verdict yet, fetch it
        const fetchVerdict = async () => {
          try {
            setAiVerdictLoading(true);
            const verdict = await getAIVerdict(post.id);
            if (verdict) {
              console.log(`Fetched verdict for post ${post.id}`);
              setAiVerdict(verdict);
            }
          } catch (error) {
            console.error(`Error getting AI verdict for post ${post.id}:`, error);
          } finally {
            setAiVerdictLoading(false);
          }
        };

        fetchVerdict();
      };

      // Fetch comment author info when expanded
      const fetchCommentAuthors = async () => {
        if (!expanded) return;
        
        const authors = {};
        for (const comment of comments) {
          try {
            if (!authors[comment.author.toString()]) {
              authors[comment.author.toString()] = await getUserAliasFromPrincipal(comment.author.toString());
            }
          } catch (err) {
            console.error(`Error fetching comment author info for ${comment.id}:`, err);
            // Don't set error here - non-critical
          }
        }
        setCommentAuthors(authors);
      };

      // Execute the fetch functions
      fetchAuthorInfo();
      fetchUserVote();
      
      if (expanded) {
        fetchCommentAuthors();
        fetchAIVerdict();
      }
    } catch (mainError) {
      // This catches any error in the overall effect - very unlikely but just in case
      console.error("Critical error in useEffect:", mainError);
      setError("Error loading post data");
    }
  }, [post.author, post.id, comments, expanded, aiVerdict, aiVerdictLoading]);

  // Update local state when post prop changes (e.g., when verdict is prefetched)
  useEffect(() => {
    if (post.aiVerdict !== aiVerdict) {
      console.log(`Post ${post.id} verdict updated from props:`, post.aiVerdict);
      setAiVerdict(post.aiVerdict);
    }
  }, [post.aiVerdict, post.id]);

  // Helper to render avatar icon
  const renderAvatarIcon = (iconId, size = 24) => {
    const IconComponent = AVATAR_ICONS[iconId] || DEFAULT_ICON;
    return <IconComponent size={size} />;
  };

  // Helper to render verdict icon
  const renderVerdictIcon = (verdict, size = 24) => {
    if (!verdict) verdict = 'Unknown';
    const verdictInfo = VERDICT_ICONS[verdict] || VERDICT_ICONS['Unknown'];
    const IconComponent = verdictInfo.icon;
    return <IconComponent size={size} color={verdictInfo.color} />;
  };

  // Add a try-catch to the toggle function to catch any errors
  const toggleExpand = () => {
    try {
      setExpanded(!expanded);
    } catch (err) {
      console.error("Error toggling expansion:", err);
      setError("Failed to expand post details");
    }
  };

  // Add this error display outside of expanded for visibility
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="post-error">
        <p>{error}</p>
        <button 
          className="error-dismiss"
          onClick={(e) => {
            e.stopPropagation();
            setError('');
          }}
        >
          Dismiss
        </button>
      </div>
    );
  };

  const handleRequestAIVerdict = async () => {
    try {
      setIsRequestingVerdict(true);
      setAiVerdictLoading(true);
      setError('');
      
      // Get the user principal for the call
      const principal = await getUserPrincipal();
      
      // Request a new AI verdict from the backend or API
      const verdict = await requestAIVerdict(post.id, post.content, principal);
      
      if (verdict) {
        console.log(`Received new verdict for post ${post.id}:`, verdict);
        
        // Update local state with the new verdict
        setAiVerdict(verdict);
        
        // Update the parent component's posts state to include this verdict
        // This ensures the verdict persists in the UI between renders
        const updatePostEvent = new CustomEvent('updatePostVerdict', {
          detail: { postId: post.id, verdict }
        });
        window.dispatchEvent(updatePostEvent);
      }
    } catch (error) {
      console.error(`Error requesting AI verdict for post ${post.id}:`, error);
      setError(`Failed to get AI verdict: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRequestingVerdict(false);
      setAiVerdictLoading(false);
    }
  };

  const handleUpvote = async (e) => {
    e.stopPropagation();
    setLoading(true);
    setError(''); // Clear previous errors
    try {
      // If already upvoted, remove vote. Otherwise, set to upvote
      const newVoteValue = userVote === 1 ? 0 : 1;
      const success = await updateVote(post.id, newVoteValue);
      
      if (success) {
        // Calculate vote change based on previous vote
        const voteChange = newVoteValue - userVote;
        
        // Update local state
        setVotes(prevVotes => prevVotes + voteChange);
        setUserVote(newVoteValue);
      } else {
        setError('Failed to update vote - post not found');
      }
    } catch (err) {
      console.error("Error updating vote:", err);
      setError(`Failed to vote: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownvote = async (e) => {
    e.stopPropagation();
    setLoading(true);
    setError(''); // Clear previous errors
    try {
      // If already downvoted, remove vote. Otherwise, set to downvote
      const newVoteValue = userVote === -1 ? 0 : -1;
      const success = await updateVote(post.id, newVoteValue);
      
      if (success) {
        // Calculate vote change based on previous vote
        const voteChange = newVoteValue - userVote;
        
        // Update local state
        setVotes(prevVotes => prevVotes + voteChange);
        setUserVote(newVoteValue);
      } else {
        setError('Failed to update vote - post not found');
      }
    } catch (err) {
      console.error("Error updating vote:", err);
      setError(`Failed to vote: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const success = await addComment(post.id, commentText);
      if (success) {
        // Get current user's info for the comment display
        const myInfo = await getUserAliasFromPrincipal((await getUserPrincipal()).toString());
        
        // Add comment locally for immediate UI update
        const newComment = {
          id: comments.length + 1,
          content: commentText,
          author: await getUserPrincipal() // Use actual principal
        };
        
        // Add new comment to commentAuthors map
        setCommentAuthors(prev => ({
          ...prev,
          [newComment.author.toString()]: myInfo
        }));
        
        setComments([...comments, newComment]);
        setCommentText('');
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      setError(`Failed to add comment: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post">
      <div className="post-header" onClick={toggleExpand}>
        <div className="post-title">
          <h3>{post.title}</h3>
          <div className="post-meta">
            {authorInfo && (
              <div className="post-author">
                <span className="author-icon">
                  {renderAvatarIcon(authorInfo.avatar)}
                </span>
                <span className="author-name">{authorInfo.alias}</span>
              </div>
            )}
            {!expanded && aiVerdict && (
              <div className="post-verdict-indicator" title={`Verdict: ${aiVerdict.verdict}`}>
                <span className="verdict-icon">
                  {renderVerdictIcon(aiVerdict.verdict, 16)}
                </span>
                <span className="verdict-text">{aiVerdict.verdict}</span>
              </div>
            )}
          </div>
        </div>
        <div className="vote-controls" onClick={(e) => e.stopPropagation()}>
          <button 
            className={`upvote-btn ${userVote === 1 ? 'active' : ''}`} 
            onClick={handleUpvote} 
            disabled={loading}
            aria-label={userVote === 1 ? "Remove upvote" : "Upvote"}
            title={userVote === 1 ? "Remove upvote" : "Upvote"}
          >
            ▲
          </button>
          <span>{votes}</span>
          <button 
            className={`downvote-btn ${userVote === -1 ? 'active' : ''}`} 
            onClick={handleDownvote} 
            disabled={loading}
            aria-label={userVote === -1 ? "Remove downvote" : "Downvote"}
            title={userVote === -1 ? "Remove downvote" : "Downvote"}
          >
            ▼
          </button>
        </div>
      </div>
      <div className="post-content">
        <p>{post.content}</p>
        <div className="post-actions">
          {!expanded && (
            <>
              <button 
                className="expand-btn" 
                onClick={toggleExpand}
                aria-label="View details"
              >
                View details
              </button>
              
              <button 
                className="fact-check-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand();
                  // Request verdict after expanding if there isn't one already
                  if (!aiVerdict && !isRequestingVerdict) {
                    setTimeout(() => handleRequestAIVerdict(), 100);
                  }
                }}
                aria-label="Request fact check"
              >
                Fact Check
              </button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <div className="post-details">
          {error && (
            <div className="post-error">
              <p>{error}</p>
              <button onClick={() => setError('')}>Dismiss</button>
            </div>
          )}
          
          <div className="ai-verdict-section">
            <div className="section-header">
              <h4>Fact Check</h4>
              <div className="verdict-buttons">
                {!isRequestingVerdict && (
                  <>
                    {!aiVerdict && (
                      <button 
                        className="request-verdict-btn" 
                        onClick={handleRequestAIVerdict}
                        disabled={isRequestingVerdict || aiVerdictLoading}
                      >
                        <FaSearch /> Request Fact Check
                      </button>
                    )}
                    {aiVerdict && (
                      <button 
                        className="refresh-verdict-btn" 
                        onClick={handleRequestAIVerdict}
                        disabled={isRequestingVerdict || aiVerdictLoading}
                        title="Get an updated fact check"
                      >
                        <FaSync className={isRequestingVerdict || aiVerdictLoading ? 'spinning' : ''} /> Refresh
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {(isRequestingVerdict || aiVerdictLoading) && (
              <div className="loading-verdict">
                <div className="loading-spinner"></div>
                <p>Analyzing claim and checking facts...</p>
              </div>
            )}
            
            {aiVerdict && !(isRequestingVerdict || aiVerdictLoading) && (
              <div className="verdict-content">
                <div className="verdict-header">
                  <span className="verdict-icon">
                    {renderVerdictIcon(aiVerdict.verdict)}
                  </span>
                  <span className="verdict-rating">{aiVerdict.verdict}</span>
                  <span className="verdict-confidence">
                    Confidence: {aiVerdict.confidence}
                  </span>
                </div>
                
                <div className="verdict-evidence">
                  <h5>Evidence:</h5>
                  <ul>
                    {(Array.isArray(aiVerdict.evidence) ? aiVerdict.evidence : []).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                
                {aiVerdict.sources && Array.isArray(aiVerdict.sources) && aiVerdict.sources.length > 0 && (
                  <div className="verdict-sources">
                    <h5>Sources:</h5>
                    <ul>
                      {aiVerdict.sources.map((source, index) => (
                        <li key={index}>
                          <a href={source} target="_blank" rel="noopener noreferrer">
                            {source}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {!aiVerdict && !isRequestingVerdict && !aiVerdictLoading && (
              <div className="no-verdict">
                <p>No fact check available yet. Request one to verify this claim.</p>
              </div>
            )}
          </div>
          
          <div className="comments-section">
            <h4>Comments</h4>
            {Array.isArray(comments) && comments.map(comment => {
              const commentAuthor = comment && comment.author && commentAuthors[comment.author.toString()];
              return (
                <div key={comment.id || `comment-${Math.random()}`} className="comment">
                  <div className="comment-content">{comment.content}</div>
                  {commentAuthor && (
                    <div className="comment-author">
                      <span className="author-icon">
                        {renderAvatarIcon(commentAuthor.avatar, 20)}
                      </span>
                      <span className="author-name">{commentAuthor.alias}</span>
                    </div>
                  )}
                </div>
              );
            })}
            <form onSubmit={handleCommentSubmit} className="comment-form">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
              />
              <button type="submit">Comment</button>
            </form>
          </div>
        </div>
      )}
      {renderError()}
    </div>
  );
}

export default Dashboard;
