import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
// Import the correct idlFactory from your backend's generated declarations
import { idlFactory } from "../../../declarations/fact_den_backend/fact_den_backend.did.js";
import { Principal } from "@dfinity/principal";

// Configuration constants
const isProduction = process.env.DFX_NETWORK === 'ic';
const canisterId = process.env.CANISTER_ID || 'bnz7o-iuaaa-aaaaa-qaaaa-cai';
const host = process.env.HOST || 'http://localhost:4943';
const identityProviderUrl = process.env.INTERNET_IDENTITY_URL;

// Cache variables
let authClientInstance = null;
let actorInstance = null;

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
    return actor.getPosts();
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
    return actor.updateVote(postId, voteDelta);
  } catch (error) {
    console.error('Error in updateVote:', error);
    throw error;
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