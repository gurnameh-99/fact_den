// src/fact_den_frontend/src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import './Dashboard.scss';
// Import backend services
import { getPosts, addPost, addComment, updateVote } from './services/backend';

function Dashboard({ searchQuery, showNewPost, onCloseNewPost }) {
  const [posts, setPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch posts from backend
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const backendPosts = await getPosts();
        if (backendPosts && backendPosts.length > 0) {
          setPosts(backendPosts);
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
    setLoading(true);
    
    try {
      const newPostId = await addPost(newPostTitle, newPostContent);
      
      // Optimistically add the new post to the UI
      const newPost = {
        id: newPostId,
        title: newPostTitle,
        content: newPostContent,
        votes: 0,
        comments: [],
        timestamp: Date.now()
      };
      
      setPosts([newPost, ...posts]);
      setNewPostTitle('');
      setNewPostContent('');
      onCloseNewPost();
    } catch (err) {
      console.error("Error creating post:", err);
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter posts based on the search query
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard">
      {error && <div className="error-message">{error}</div>}
      
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
            {filteredPosts.length > 0 ? (
              filteredPosts.map(post => (
                <Post key={post.id} post={post} />
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
  const [expanded, setExpanded] = useState(false);
  const [votes, setVotes] = useState(post.votes);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.comments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleExpand = () => setExpanded(!expanded);

  const handleUpvote = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const success = await updateVote(post.id, 1);
      if (success) {
        setVotes(votes + 1);
      }
    } catch (err) {
      console.error("Error upvoting post:", err);
      setError('Failed to upvote');
    } finally {
      setLoading(false);
    }
  };

  const handleDownvote = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const success = await updateVote(post.id, -1);
      if (success) {
        setVotes(votes - 1);
      }
    } catch (err) {
      console.error("Error downvoting post:", err);
      setError('Failed to downvote');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setLoading(true);
    try {
      const success = await addComment(post.id, commentText);
      if (success) {
        // Add comment locally for immediate UI update
        const newComment = {
          id: comments.length + 1,
          content: commentText,
          author: "Me"  // This would be replaced by actual user info
        };
        setComments([...comments, newComment]);
        setCommentText('');
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      setError('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post">
      <div className="post-header" onClick={toggleExpand}>
        <h3>{post.title}</h3>
        <div className="vote-controls" onClick={(e) => e.stopPropagation()}>
          <button className="upvote-btn" onClick={handleUpvote}>▲</button>
          <span>{votes}</span>
          <button className="downvote-btn" onClick={handleDownvote}>▼</button>
        </div>
      </div>
      <div className="post-content">
        <p>{post.content}</p>
      </div>
      {expanded && (
        <div className="post-details">
          <div className="ai-verdict">
            <strong>AI Verdict:</strong>
            <p>{post.aiVerdict}</p>
          </div>
          <div className="comments-section">
            <h4>Comments</h4>
            {comments.map(comment => (
              <p key={comment.id} className="comment">{comment.content}</p>
            ))}
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
    </div>
  );
}

export default Dashboard;
