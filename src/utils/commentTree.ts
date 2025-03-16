import type { Comment } from "../schema";

/**
 * Builds a tree structure from a flat list of comments
 * @param comments The flat list of comments
 * @returns An object containing root comments and a map of comments by parent ID
 */
export function buildCommentTree(comments: Comment[]) {
  // Handle empty or undefined comments
  if (!comments || comments.length === 0) {
    return {
      rootComments: [],
      commentsByParentId: {}
    };
  }
  
  // Root comments have no parentCommentID (undefined, null, or empty string)
  const rootComments = comments.filter(c => 
    !c.parentCommentID || 
    c.parentCommentID === "" || 
    c.parentCommentID === "null" || 
    c.parentCommentID === "undefined"
  );
  
  // Group child comments by their parent ID
  const commentsByParentId = comments.reduce((acc, comment) => {
    if (comment.parentCommentID) {
      if (!acc[comment.parentCommentID]) {
        acc[comment.parentCommentID] = [];
      }
      acc[comment.parentCommentID].push(comment);
    }
    return acc;
  }, {} as Record<string, Comment[]>);
  
  // Sort comments by timestamp (oldest first)
  if (rootComments.length > 0) {
    rootComments.sort((a, b) => a.timestamp - b.timestamp);
  } else {
    // If no root comments are found, treat all comments as root level
    // This is a fallback to ensure something is always displayed
    
    // Return all comments sorted by timestamp as root comments
    return {
      rootComments: [...comments].sort((a, b) => a.timestamp - b.timestamp),
      commentsByParentId
    };
  }
  
  // Sort child comments by timestamp
  for (const parentId of Object.keys(commentsByParentId)) {
    commentsByParentId[parentId].sort((a, b) => a.timestamp - b.timestamp);
  }
  
  return {
    rootComments,
    commentsByParentId
  };
} 