import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
// Import the correct idlFactory from your backend's generated declarations
import { idlFactory } from "../../../declarations/fact_den_backend/fact_den_backend.did.js";
import { Principal } from "@dfinity/principal";

// Configuration constants
const isProduction = process.env.DFX_NETWORK === 'ic';
const canisterId = process.env.FACT_DEN_BACKEND_CANISTER_ID || 'bkyz2-fmaaa-aaaaa-qaaaq-cai';
const host = process.env.IC_HOST || 'http://localhost:4943';
const identityProviderUrl = process.env.INTERNET_IDENTITY_URL;

// Cache variables
let authClientInstance = null;
let actorInstance = null;

// Cache for AI verdicts - stores by postId
const aiVerdictCache = new Map();

// Try to load cached verdicts from localStorage on initialization
const loadCachedVerdicts = async () => {
  try {
    // Try to get the current user's principal to scope the cache
    const principal = await getUserPrincipal();
    const cacheKey = principal ? `aiVerdictCache_${principal.toString()}` : 'aiVerdictCache_anonymous';
    
    const cachedVerdicts = localStorage.getItem(cacheKey);
    if (cachedVerdicts) {
      const verdicts = JSON.parse(cachedVerdicts);
      
      // Clear existing cache before loading
      aiVerdictCache.clear();
      
      // Populate the cache with saved verdicts
      Object.entries(verdicts).forEach(([postId, verdict]) => {
        aiVerdictCache.set(Number(postId), verdict);
      });
      console.log(`Loaded ${aiVerdictCache.size} cached AI verdicts for ${cacheKey} from localStorage`);
    }
  } catch (error) {
    console.warn('Error loading cached AI verdicts:', error);
  }
};

// Load cached verdicts immediately and also when authentication changes
window.addEventListener('authStateChanged', () => {
  console.log('Auth state changed, reloading verdict cache');
  loadCachedVerdicts();
});

// Try to load the cache right away
loadCachedVerdicts();

// Function to save the verdict cache to localStorage
const saveVerdictCache = async () => {
  try {
    // Get the current user's principal to scope the cache
    const principal = await getUserPrincipal();
    const cacheKey = principal ? `aiVerdictCache_${principal.toString()}` : 'aiVerdictCache_anonymous';
    
    const cacheObj = {};
    aiVerdictCache.forEach((verdict, postId) => {
      cacheObj[postId] = verdict;
    });
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
    console.log(`Saved ${aiVerdictCache.size} verdicts to ${cacheKey}`);
  } catch (error) {
    console.warn('Error saving cached AI verdicts:', error);
  }
};

console.log('Backend configuration:');
console.log(`Production mode: ${isProduction}`);
console.log(`Canister ID: ${canisterId}`);
console.log(`Host: ${host}`);
console.log(`Identity Provider: ${identityProviderUrl}`);

/**
 * Initialize and get the auth client (singleton)
 */
export const getAuthClient = async () => {
  if (!authClientInstance) {
    console.log('Creating new AuthClient instance');
    try {
      authClientInstance = await AuthClient.create({
        idleOptions: {
          idleTimeout: 1000 * 60 * 30, // 30 minutes is safer
          disableDefaultIdleCallback: true,
        }
      });
      console.log('AuthClient created successfully');
    } catch (error) {
      console.error('Error creating AuthClient:', error);
      throw error;
    }
  }
  return authClientInstance;
};

/**
 * Create an HTTP agent with the user's identity
 */
export const createAgent = async () => {
  try {
    const authClient = await getAuthClient();
    
    // Check if the user is authenticated
    const isAuthenticated = await authClient.isAuthenticated();
    
    if (!isAuthenticated) {
      console.warn('Creating anonymous agent - user not authenticated');
      const agent = new HttpAgent({ host });
      
      if (!isProduction) {
        await agent.fetchRootKey();
      }
      
      return agent;
    }
    
    // Get the authenticated identity
    const identity = authClient.getIdentity();
    console.log('Creating authenticated agent with principal:', identity.getPrincipal().toString());
    
    // Create agent with identity
    const agent = new HttpAgent({ host, identity });
    
    // For local development, fetch the root key
    if (!isProduction) {
      await agent.fetchRootKey();
    }
    
    return agent;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
};

/**
 * Get the backend actor for making canister calls
 */
export const getBackendActor = async () => {
  try {
    // Create a fresh agent each time to ensure the identity is current
    const agent = await createAgent();
    
    if (!canisterId) {
      throw new Error('Canister ID is not defined');
    }
    
    console.log(`Creating actor with canister ID: ${canisterId}`);
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId,
    });
    
    return actor;
  } catch (error) {
    console.error('Error creating backend actor:', error);
    throw new Error(`Failed to create backend actor: ${error.message}`);
  }
};

/**
 * Get the current user's principal
 */
export const getUserPrincipal = async () => {
  try {
    const authClient = await getAuthClient();
    
    if (await authClient.isAuthenticated()) {
      const identity = authClient.getIdentity();
      const principal = identity.getPrincipal();
      return principal;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user principal:', error);
    return null;
  }
};

/**
 * Post-related functions
 */
export const addPost = async (title, content) => {
  try {
    const actor = await getBackendActor();
    const principal = await getUserPrincipal();
    
    if (!principal) throw new Error('User not authenticated');
    
    // Note we no longer pass the principal since the backend uses msg.caller
    return actor.addPost(title, content);
  } catch (error) {
    console.error('Error in addPost:', error);
    throw error;
  }
};

export const getPosts = async () => {
  try {
    const actor = await getBackendActor();
    const posts = await actor.getPosts();
    
    // Update local cache with any verdicts that come from the backend
    if (posts && posts.length > 0) {
      posts.forEach(post => {
        // If post has a verdict in the backend data (which is an Option type)
        if (post.aiVerdict && Array.isArray(post.aiVerdict) && post.aiVerdict.length > 0) {
          const postId = post.id;
          const verdict = post.aiVerdict[0];
          
          // Check if we need to update our local cache
          const numericPostId = typeof postId === 'bigint' ? Number(postId) : Number(postId);
          
          console.log(`Found verdict for post ${numericPostId} in backend data, updating local cache`);
          aiVerdictCache.set(numericPostId, verdict);
        }
      });
      
      // Save the updated cache
      saveVerdictCache();
    }
    
    return posts;
  } catch (error) {
    console.error('Error in getPosts:', error);
    throw error;
  }
};

export const addComment = async (postId, content) => {
  try {
    const actor = await getBackendActor();
    const principal = await getUserPrincipal();
    
    if (!principal) throw new Error('User not authenticated');
    
    return actor.addComment(postId, content);
  } catch (error) {
    console.error('Error in addComment:', error);
    throw error;
  }
};

export const updateVote = async (postId, voteDelta) => {
  try {
    const actor = await getBackendActor();
    const principal = await getUserPrincipal();
    
    if (!principal) {
      throw new Error('User not authenticated');
    }
    
    // Convert postId to number if it's a string and voteDelta to BigInt
    const numericPostId = typeof postId === 'string' ? parseInt(postId, 10) : postId;
    const bigIntVoteDelta = BigInt(voteDelta);
    
    console.log(`Updating vote for post ${numericPostId} with delta ${bigIntVoteDelta}`);
    const result = await actor.updateVote(numericPostId, bigIntVoteDelta);
    console.log('Vote update result:', result);
    return result;
  } catch (error) {
    console.error('Error in updateVote:', error);
    throw error;
  }
};

/**
 * Get the current user's vote for a specific post
 * Returns: 1 for upvote, -1 for downvote, 0 for no vote
 */
export const getUserVote = async (postId) => {
  try {
    const actor = await getBackendActor();
    const principal = await getUserPrincipal();
    
    if (!principal) {
      throw new Error('User not authenticated');
    }
    
    // Convert postId to number if it's a string
    const numericPostId = typeof postId === 'string' ? parseInt(postId, 10) : postId;
    
    const result = await actor.getUserVote(numericPostId);
    
    // Convert BigInt to Number
    return typeof result === 'bigint' ? Number(result) : result;
  } catch (error) {
    console.error('Error in getUserVote:', error);
    // Default to no vote on error
    return 0;
  }
};

/**
 * User-related functions
 */
export const updateUserInfo = async (alias, avatar) => {
  try {
    // Always use a fresh actor
    const actor = await getBackendActor();
    const principal = await getUserPrincipal();
    
    if (!principal) {
      throw new Error('User not authenticated');
    }
    
    // Process avatar (limit size)
    const safeAvatar = avatar || '';
    const maxSize = 1000; // 1KB limit
    const finalAvatar = safeAvatar.length > maxSize ? safeAvatar.substring(0, maxSize) : safeAvatar;
    
    console.log(`Updating user info for principal: ${principal.toString()}, alias: "${alias}"`);
    await actor.updateUserInfo(alias, finalAvatar);
    console.log('User info updated successfully');
    return true;
  } catch (error) {
    console.error('Error in updateUserInfo:', error);
    throw error;
  }
};

export const getUserInfo = async () => {
  try {
    const actor = await getBackendActor();
    const principal = await getUserPrincipal();
    
    if (!principal) {
      throw new Error('User not authenticated');
    }
    
    const result = await actor.getUserInfo(principal);
    
    // Handle the Motoko Option type
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error in getUserInfo:', error);
    throw error;
  }
};

// Cache for user principal -> user info mapping
const userInfoCache = new Map();

/**
 * Get user alias and avatar information for a specific principal
 */
export const getUserAliasFromPrincipal = async (principalId) => {
  try {
    // Check cache first
    if (userInfoCache.has(principalId)) {
      return userInfoCache.get(principalId);
    }
    
    const actor = await getBackendActor();
    const result = await actor.getUserInfo(Principal.fromText(principalId));
    
    // Handle the Motoko Option type
    if (Array.isArray(result) && result.length > 0) {
      const userInfo = result[0];
      // Cache the result
      userInfoCache.set(principalId, userInfo);
      return userInfo;
    }
    
    // Return a default if no user info was found
    const defaultInfo = { 
      alias: 'Anonymous',
      avatar: 'user'
    };
    userInfoCache.set(principalId, defaultInfo);
    return defaultInfo;
  } catch (error) {
    console.error(`Error fetching user info for principal ${principalId}:`, error);
    // Return a default on error
    return { 
      alias: 'Anonymous',
      avatar: 'user'
    };
  }
};

/**
 * Get an existing AI verdict for a post if available
 */
export const getAIVerdict = async (postId) => {
  try {
    // Convert postId to number if it's a string
    const numericPostId = typeof postId === 'string' ? parseInt(postId, 10) : postId;
    
    // Check local cache first
    if (aiVerdictCache.has(numericPostId)) {
      console.log(`Using cached verdict for post ${numericPostId}`);
      return aiVerdictCache.get(numericPostId);
    }
    
    console.log(`Fetching verdict from backend for post ${numericPostId}`);
    const actor = await getBackendActor();
    const result = await actor.getAIVerdict(numericPostId);
    
    // Handle the Option type from Motoko
    if (Array.isArray(result) && result.length > 0) {
      // Store in cache for future use
      const verdict = result[0];
      aiVerdictCache.set(numericPostId, verdict);
      saveVerdictCache();
      
      return verdict;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getAIVerdict:', error);
    return null;
  }
};

/**
 * Request an AI verdict from Perplexity API and store it in the backend
 */
export const requestAIVerdict = async (postId, postContent, userPrincipal) => {
  try {
    const actor = await getBackendActor();
    const principal = userPrincipal || await getUserPrincipal();
    
    if (!principal) {
      throw new Error('User not authenticated');
    }
    
    // Convert postId to number if it's a string
    const numericPostId = typeof postId === 'string' ? parseInt(postId, 10) : postId;
    
    // First, check if we already have a cached verdict
    // We'll allow refreshing the verdict even if cached
    console.log(`Requesting new AI verdict for post ${numericPostId}`);
    
    // If post content is provided, use it directly
    let statement = postContent;
    
    // If no content provided, fetch the post content to verify
    if (!statement) {
      const posts = await getPosts();
      const post = posts.find(p => Number(p.id) === numericPostId);
      
      if (!post) {
        throw new Error(`Post with ID ${numericPostId} not found`);
      }
      
      statement = `${post.title}: ${post.content}`;
    }
    
    // Get the API key from environment
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      throw new Error('Perplexity API key is not configured');
    }
    
    console.log(`Using API key: ${apiKey.substring(0, 5)}...`);
    
    // Updated models to try in order of preference - using current valid models
    const models = [
      "sonar",
      "sonar-pro",
      "r1-1776"
    ];
    
    let lastError = null;
    
    // Try each model until one works
    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        
        // Call Perplexity API directly from frontend
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{
              role: "user",
              content: `Verify this claim factually: "${statement}". 
              
              Respond with only these four sections in this exact format:
              Truth rating: [True/False/Misleading]
              Confidence: [percentage]
              Evidence:
              - [first evidence point]
              - [second evidence point]
              - [third evidence point]
              Sources:
              - [first source URL]
              - [second source URL]`
            }]
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error with model ${model}:`, errorText);
          lastError = new Error(`Perplexity API error with model ${model}: ${response.status}`);
          // Continue to the next model
          continue;
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parse the response
        const verdict = parseVerdictResponse(content);
        
        // Store the verdict in the backend
        const storeResult = await actor.storeAIVerdict(numericPostId, verdict);
        
        if (!storeResult) {
          console.warn(`Failed to store verdict in backend for post ${numericPostId}`);
        }
        
        // Also cache the verdict in our frontend cache
        aiVerdictCache.set(numericPostId, verdict);
        saveVerdictCache();
        
        console.log(`Successfully got verdict using model: ${model}`);
        return verdict;
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError);
        lastError = modelError;
        // Continue to the next model
      }
    }
    
    // If we get here, all models failed
    throw lastError || new Error('All models failed to provide a verdict');
  } catch (error) {
    console.error('Error in requestAIVerdict:', error);
    throw error;
  }
};

/**
 * Parse Perplexity API response to extract verdict information
 */
function parseVerdictResponse(content) {
  // Extract verdict (default to Unknown)
  const verdictMatch = content.match(/Truth rating:\s*(.+?)(?:\n|$)/i);
  const verdict = verdictMatch ? verdictMatch[1].trim() : "Unknown";
  
  // Extract confidence (default to N/A)
  const confidenceMatch = content.match(/Confidence(?:\s*percentage)?:\s*(.+?)(?:\n|$)/i);
  const confidence = confidenceMatch ? confidenceMatch[1].trim() : "N/A";
  
  // Extract evidence (bullet points)
  const evidenceRegex = /[•\-*]\s+(.+?)(?:\n|$)/g;
  const evidence = [];
  let match;
  while ((match = evidenceRegex.exec(content)) !== null && evidence.length < 3) {
    evidence.push(match[1].trim());
  }
  
  // If we didn't find bullet points, try to extract paragraphs
  if (evidence.length === 0) {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    for (let i = 0; i < paragraphs.length && evidence.length < 3; i++) {
      if (!paragraphs[i].includes('Truth rating') && !paragraphs[i].includes('Confidence')) {
        evidence.push(paragraphs[i].trim());
      }
    }
  }
  
  // Extract URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const sources = [];
  while ((match = urlRegex.exec(content)) !== null && sources.length < 2) {
    sources.push(match[1].replace(/[.,;:]$/, '')); // Remove trailing punctuation
  }
  
  return {
    verdict,
    confidence,
    evidence,
    sources
  };
}

/**
 * Get posts created by the current authenticated user
 */
export const getMyPosts = async () => {
  try {
    const actor = await getBackendActor();
    const principal = await getUserPrincipal();
    
    if (!principal) {
      throw new Error('User not authenticated');
    }
    
    const posts = await actor.getMyPosts();
    
    // Convert BigInt values if needed
    return posts.map(post => ({
      ...post,
      votes: typeof post.votes === 'bigint' ? Number(post.votes) : post.votes,
      timestamp: typeof post.timestamp === 'bigint' ? Number(post.timestamp) : post.timestamp
    }));
  } catch (error) {
    console.error('Error in getMyPosts:', error);
    throw error;
  }
};

/**
 * Get posts by a specific user principal
 */
export const getUserPosts = async (userPrincipal) => {
  try {
    const actor = await getBackendActor();
    const principal = Principal.fromText(userPrincipal.toString());
    
    const posts = await actor.getUserPosts(principal);
    
    // Convert BigInt values if needed
    return posts.map(post => ({
      ...post,
      votes: typeof post.votes === 'bigint' ? Number(post.votes) : post.votes,
      timestamp: typeof post.timestamp === 'bigint' ? Number(post.timestamp) : post.timestamp
    }));
  } catch (error) {
    console.error('Error in getUserPosts:', error);
    throw error;
  }
};

/**
 * Utility function to get currently available Perplexity API models
 * You can call this from the browser console for debugging
 */
export const getPerplexityModels = async () => {
  try {
    // Get the API key from environment
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      throw new Error('Perplexity API key is not configured');
    }
    
    console.log('Fetching available Perplexity models...');
    console.log('Note: The Perplexity API may not have a /models endpoint.');
    console.log('Current available models include: sonar, sonar-pro, r1-1776');
    
    // Call Perplexity API to get available models - this might not work
    try {
      const response = await fetch('https://api.perplexity.ai/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perplexity API response:', errorText);
        return {
          error: `Perplexity API error: ${response.status}`,
          recommendedModels: ['sonar', 'sonar-pro', 'r1-1776']
        };
      }
      
      const data = await response.json();
      console.log('Available models:', data);
      return data;
    } catch (error) {
      console.error('Error accessing models API:', error);
      return {
        error: 'Models endpoint not available',
        recommendedModels: ['sonar', 'sonar-pro', 'r1-1776']
      };
    }
  } catch (error) {
    console.error('Error in getPerplexityModels:', error);
    throw error;
  }
};

/**
 * Test function to verify Perplexity API connectivity
 * You can call this from the browser console for debugging
 */
export const testPerplexityAPI = async () => {
  try {
    // Get the API key from environment
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      throw new Error('Perplexity API key is not configured');
    }
    
    console.log('Testing Perplexity API connection...');
    console.log(`Using API key: ${apiKey.substring(0, 5)}...`);
    
    // Call Perplexity API with a simple test
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "sonar",  // Using current valid model
        messages: [{
          role: "user",
          content: "What's the current date and time? Keep it brief."
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API response:', errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Test Response:', data);
    return data;
  } catch (error) {
    console.error('Error testing Perplexity API:', error);
    throw error;
  }
};

/**
 * Helper to emit an auth state change event
 */
const notifyAuthStateChanged = () => {
  console.log('Dispatching authStateChanged event');
  window.dispatchEvent(new Event('authStateChanged'));
};

/**
 * Login with Internet Identity
 */
export const login = async () => {
  try {
    const authClient = await getAuthClient();
    
    if (await authClient.isAuthenticated()) {
      console.log('Already logged in');
      return true;
    }
    
    const identityProvider = identityProviderUrl ? identityProviderUrl : undefined;
    console.log(`Using identity provider: ${identityProvider || 'default'}`);
    
    return new Promise((resolve) => {
      authClient.login({
        identityProvider,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        onSuccess: () => {
          console.log('Login successful');
          notifyAuthStateChanged();
          resolve(true);
        },
        onError: (error) => {
          console.error('Login failed:', error);
          resolve(false);
        },
      });
    });
  } catch (error) {
    console.error('Error in login:', error);
    return false;
  }
};

/**
 * Logout from Internet Identity
 */
export const logout = async () => {
  try {
    const authClient = await getAuthClient();
    
    if (!await authClient.isAuthenticated()) {
      console.log('Already logged out');
      return;
    }
    
    await authClient.logout();
    // Clear the actor instance to force recreation on next use
    actorInstance = null;
    console.log('Logout successful');
    notifyAuthStateChanged();
  } catch (error) {
    console.error('Error in logout:', error);
  }
}; 