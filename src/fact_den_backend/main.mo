import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Iter "mo:base/Iter";

actor FactDenBackend {

  // ----------------------------------------
  // Data Type Definitions
  // ----------------------------------------

  public type Comment = {
    id: Nat;
    content: Text;
    author: Principal;
  };

  public type Post = {
    id: Nat;
    title: Text;
    content: Text;
    author: Principal;
    votes: Int;
    comments: [Comment];
    timestamp: Time.Time;
  };

  public type User = {
    principal: Principal;
    alias: Text;
    avatar: Text;
  };

  // ----------------------------------------
  // Stable Storage (persisted across upgrades)
  // ----------------------------------------

  stable var posts: [Post] = [];
  stable var users: [(Principal, User)] = [];

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

  /// Updates the vote count for a post (voteDelta may be positive or negative).
  public shared(msg) func updateVote(postId: Nat, voteDelta: Int) : async Bool {
    // Using msg.caller for authentication consistency
    let _voter = msg.caller; // We don't use this yet but might want to track votes per user later
    
    var found = false;
    posts := Array.map(posts, func(post: Post): Post {
      if (post.id == postId) {
        found := true;
        return { post with votes = post.votes + voteDelta };
      } else {
        return post;
      }
    });
    if (found) {
      Debug.print("Updated vote for post " # Nat.toText(postId));
    } else {
      Debug.print("Post " # Nat.toText(postId) # " not found for voting.");
    };
    return found;
  };

  // ----------------------------------------
  // User Functions (caller must supply their Principal)
  // ----------------------------------------

  /// Creates or updates the user profile for the given user.
  public shared(msg) func updateUserInfo(alias: Text, avatar: Text) : async () {
    let user = msg.caller;
    var found = false;
    users := Array.map<(Principal, User), (Principal, User)>(users, func(pair: (Principal, User)) : (Principal, User) {
      let (p, u) = pair;
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
