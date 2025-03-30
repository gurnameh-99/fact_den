import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Text "mo:base/Text";
import Int "mo:base/Int";

actor FactDenBackend {

  // ----------------------------------------
  // Data Type Definitions
  // ----------------------------------------

  // Vote types: upvote (1), downvote (-1), or no vote (0)
  public type VoteType = Int;

  public type Comment = {
    id: Nat;
    content: Text;
    author: Principal;
  };

  // AI verdict structure
  public type AIVerdict = {
    verdict: Text; // True, False, or Misleading
    confidence: Text; // Percentage as text
    evidence: [Text]; // List of evidence points
    sources: [Text]; // List of source URLs
  };

  public type Post = {
    id: Nat;
    title: Text;
    content: Text;
    author: Principal;
    votes: Int;
    comments: [Comment];
    timestamp: Time.Time;
    aiVerdict: ?AIVerdict; // Optional AI verdict
  };

  public type User = {
    principal: Principal;
    alias: Text;
    avatar: Text;
  };

  // New type for storing user vote information
  public type UserVote = {
    postId: Nat;
    userId: Principal;
    voteType: VoteType; // 1 for upvote, -1 for downvote
  };

  // ----------------------------------------
  // Stable Storage (persisted across upgrades)
  // ----------------------------------------

  stable var posts: [Post] = [];
  stable var users: [(Principal, User)] = [];
  
  // We'll use this to convert stable storage to HashMap on init
  stable var userVotesEntries: [(Text, VoteType)] = [];
  
  // HashMap to track user votes (key: "postId:userId", value: vote type)
  private var userVotes = HashMap.HashMap<Text, VoteType>(
    0, Text.equal, Text.hash
  );
  
  // System initialization/upgrade logic
  system func preupgrade() {
    // Convert HashMap to stable array before upgrade
    userVotesEntries := Iter.toArray(userVotes.entries());
  };
  
  system func postupgrade() {
    // Rebuild HashMap after upgrade
    for ((key, value) in userVotesEntries.vals()) {
      userVotes.put(key, value);
    };
  };
  
  // Helper function to create a composite key for the userVotes HashMap
  private func makeVoteKey(postId: Nat, userId: Principal) : Text {
    Nat.toText(postId) # ":" # Principal.toText(userId)
  };

  // ----------------------------------------
  // Post Functions (caller must provide their Principal)
  // ----------------------------------------

  /// Adds a new post using the provided author.
  public shared(msg) func addPost(title: Text, content: Text) : async Nat {
    let author = msg.caller;
    let newId = Array.size(posts);
    let newPost : Post = {
      id = newId;
      title = title;
      content = content;
      author = author;
      votes = 0;
      comments = [];
      timestamp = Time.now();
      aiVerdict = null; // No verdict initially
    };
    posts := Array.append(posts, [newPost]);
    Debug.print("Added new post with ID: " # Nat.toText(newId));
    return newId;
  };

  /// Returns the list of all posts.
  public query func getPosts() : async [Post] {
    return posts;
  };

  /// Adds a comment to the specified post using the provided author.
  public shared(msg) func addComment(postId: Nat, content: Text) : async Bool {
    let author = msg.caller;
    var found = false;
    posts := Array.map(posts, func(post: Post): Post {
      if (post.id == postId) {
        found := true;
        let commentId = Array.size(post.comments);
        let newComment: Comment = {
          id = commentId;
          content = content;
          author = author;
        };
        return { post with comments = Array.append(post.comments, [newComment]) };
      } else {
        return post;
      }
    });
    if (found) {
      Debug.print("Added comment to post " # Nat.toText(postId));
    } else {
      Debug.print("Post " # Nat.toText(postId) # " not found.");
    };
    return found;
  };

  /// Gets the current user's vote on a post
  public query(msg) func getUserVote(postId: Nat) : async Int {
    let userId = msg.caller;
    let voteKey = makeVoteKey(postId, userId);
    
    switch (userVotes.get(voteKey)) {
      case (null) { 0 }; // No vote
      case (?voteType) { voteType };
    };
  };
  
  /// Updates the vote count for a post (voteDelta may be 1, -1, or 0 to clear vote)
  public shared(msg) func updateVote(postId: Nat, voteDelta: Int) : async Bool {
    let userId = msg.caller;
    let voteKey = makeVoteKey(postId, userId);
    
    // Validate vote value (must be -1, 0, or 1)
    if (voteDelta != -1 and voteDelta != 0 and voteDelta != 1) {
      Debug.print("Invalid vote value: " # Int.toText(voteDelta));
      return false;
    };
    
    // Get current vote by this user on this post (if any)
    let currentVote = switch (userVotes.get(voteKey)) {
      case (null) { 0 }; // No previous vote
      case (?voteType) { voteType };
    };
    
    // If the vote is the same as current, do nothing
    if (currentVote == voteDelta) {
      return true;
    };
    
    var found = false;
    posts := Array.map(posts, func(post: Post): Post {
      if (post.id == postId) {
        found := true;
        
        // Calculate vote adjustment based on previous and new votes
        var voteAdjustment = voteDelta;
        
        // If there was a previous vote, we need to remove it first
        if (currentVote != 0) {
          voteAdjustment -= currentVote;
        };
        
        // Update vote record
        if (voteDelta == 0) {
          // Remove vote if clearing
          userVotes.delete(voteKey);
        } else {
          // Set new vote
          userVotes.put(voteKey, voteDelta);
        };
        
        return { post with votes = post.votes + voteAdjustment };
      } else {
        return post;
      }
    });
    
    if (found) {
      let voteTypeText = if (voteDelta == 1) "upvote" else if (voteDelta == -1) "downvote" else "removed vote";
      Debug.print("User " # Principal.toText(userId) # " " # voteTypeText # " on post " # Nat.toText(postId));
    } else {
      Debug.print("Post " # Nat.toText(postId) # " not found for voting.");
    };
    
    return found;
  };

  // ----------------------------------------
  // AI Verdict Functions
  // ----------------------------------------

  // Store an AI verdict for a post
  public shared(msg) func storeAIVerdict(postId: Nat, verdict: AIVerdict) : async Bool {
    // For security, we could limit which principals can update AI verdicts
    var found = false;
    posts := Array.map(posts, func(post: Post): Post {
      if (post.id == postId) {
        found := true;
        return { post with aiVerdict = ?verdict };
      } else {
        return post;
      }
    });
    
    if (found) {
      Debug.print("AI verdict updated for post " # Nat.toText(postId));
    } else {
      Debug.print("Post " # Nat.toText(postId) # " not found for verdict update.");
    };
    
    return found;
  };

  // Get AI verdict for a post (if available)
  public query func getAIVerdict(postId: Nat) : async ?AIVerdict {
    for (post in posts.vals()) {
      if (post.id == postId) {
        return post.aiVerdict;
      };
    };
    return null;
  };

  // ----------------------------------------
  // User Posts Functions
  // ----------------------------------------

  // Get posts authored by the specified user
  public query func getUserPosts(userPrincipal: Principal) : async [Post] {
    var userPosts : [Post] = [];
    for (post in posts.vals()) {
      if (Principal.equal(post.author, userPrincipal)) {
        userPosts := Array.append(userPosts, [post]);
      };
    };
    return userPosts;
  };

  // Get posts authored by the caller
  public query(msg) func getMyPosts() : async [Post] {
    var userPosts : [Post] = [];
    let userPrincipal = msg.caller;
    for (post in posts.vals()) {
      if (Principal.equal(post.author, userPrincipal)) {
        userPosts := Array.append(userPosts, [post]);
      };
    };
    return userPosts;
  };

  // ----------------------------------------
  // User Functions (caller must supply their Principal)
  // ----------------------------------------

  /// Creates or updates the user profile for the given user.
  public shared(msg) func updateUserInfo(alias: Text, avatar: Text) : async () {
    let user = msg.caller;
    var found = false;
    users := Array.map<(Principal, User), (Principal, User)>(users, func(pair: (Principal, User)) : (Principal, User) {
      let (p, _u) = pair;
      if (p == user) {
        found := true;
        return (p, { principal = p; alias = alias; avatar = avatar });
      } else {
        return pair;
      }
    });
    if (not found) {
      users := Array.append(users, [(user, { principal = user; alias = alias; avatar = avatar })]);
      Debug.print("New user registered: " # alias);
    } else {
      Debug.print("User info updated: " # alias);
    };
  };

  /// Retrieves user profile information for the given Principal.
  public query func getUserInfo(user: Principal) : async ?User {
    for ((p, u) in Iter.fromArray(users)) {
      if (p == user) {
        return ?u;
      }
    };
    return null;
  };
} 