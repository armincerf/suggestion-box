import { createSignal, createEffect } from "solid-js";
import { useSession } from "./useSession";
import { useUser } from "./useUser";
import { useCreateSession, useUpdateSessionUsers } from "../mutations/sessionMutations";
import { logger } from "../../hyperdx-logger"; // Adjust path if needed
import { DUMMY_QUERY_ID } from "../../utils/constants";

/**
 * Session membership status
 * - checking: Initial state or when rechecking status
 * - member: User is already a member of the session
 * - joining: User is being added to an existing session
 * - creating: Session doesn't exist, creating a new one
 * - error: An error occurred during the process
 * - ready: Membership is established and ready
 */
export type SessionStatus = 'checking' | 'member' | 'joining' | 'creating' | 'error' | 'ready';

/**
 * Hook to handle session membership logic
 * 
 * This hook encapsulates the logic for:
 * 1. Checking if a session exists
 * 2. Creating the session if it doesn't exist
 * 3. Adding the current user to the session if they're not already a member
 * 
 * @param sessionId The ID of the session to ensure membership for
 * @returns Object containing session status and data
 */
export function useEnsureSessionMembership(sessionId: string | undefined) {
  const [status, setStatus] = createSignal<SessionStatus>('checking');
  const [sessionData] = useSession(sessionId ?? ''); // Handle undefined sessionId
  const { userId } = useUser();
  const createSession = useCreateSession();
  const updateSessionUsers = useUpdateSessionUsers();
  const [attemptedCreate, setAttemptedCreate] = createSignal(false);
  const [attemptedJoin, setAttemptedJoin] = createSignal(false);

  // Effect to manage session state and user membership
  createEffect(async () => {
    if (!sessionId || !userId) {
      setStatus('checking'); // Waiting for IDs
      return;
    }

    const session = sessionData(); // Get current session data

    if (session === undefined && status() === 'checking') {
      // Still loading session data
      return;
    }

    try {
      // Handle session not existing
      if (!session) {
        // Only attempt creation once to avoid loops
        if (!attemptedCreate()) {
          setStatus('creating');
          logger.info("Session not found, attempting creation...", { sessionId, userId });
          
          // Create with current user
          await createSession(userId, []);
          setAttemptedCreate(true);
          
          // Exit effect - let Zero's reactivity update sessionData
          logger.info("Session creation requested", { sessionId, userId });
          return;
        }
        
        if (status() === 'creating') {
          // Still waiting for Zero to update sessionData after create attempt
          return;
        }
        
        // We've attempted to create but still no session - handle as error
        throw new Error("Session not found even after creation attempt");
      }
      
      // Handle user not being a member
      if (session.users && !session.users.includes(userId)) {
        if (!attemptedJoin()) {
          setStatus('joining');
          logger.info("Adding user to existing session...", { sessionId, userId });
          
          const updatedUsers = [...session.users, userId];
          await updateSessionUsers(sessionId, updatedUsers);
          setAttemptedJoin(true);
          
          // Exit effect - let Zero's reactivity update sessionData
          logger.info("User join requested", { sessionId, userId });
          return;
        }
        
        if (status() === 'joining') {
          // Still waiting for Zero to update sessionData after join attempt
          return;
        }
      }
      
      // Check if user is now a member
      if (session.users?.includes(userId)) {
        setStatus('member'); // User is a member
        setStatus('ready'); // Indicate checks are complete
        logger.info("User confirmed as session member", { sessionId, userId });
      } else {
        // Session exists but user array is missing or other edge case
        throw new Error("Session exists but user membership is unclear");
      }
    } catch (err) {
      logger.error("Error ensuring session membership", 
        err instanceof Error ? err : new Error(String(err)), 
        { sessionId, userId }
      );
      setStatus('error');
    }
  });

  return { 
    status, 
    sessionData,
    isLoading: () => status() === 'checking' || status() === 'joining' || status() === 'creating',
    isError: () => status() === 'error',
    isReady: () => status() === 'ready' || status() === 'member'
  };
} 