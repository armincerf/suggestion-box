import { useParams, A } from "@solidjs/router";
import { useZero } from "../context/ZeroContext";
import { useUser } from "../hooks/useUser";

export function SessionPageSkeleton() {
  return (
    <div class="container mx-auto p-8 animate-pulse">
      <div class="h-8 bg-base-300 rounded w-1/3 mb-4" />
      <div class="h-4 bg-base-300 rounded w-1/2 mb-8" />
      <div class="h-32 bg-base-300 rounded mb-4" />
    </div>
  );
}

export function SessionPage() {
  const params = useParams();
  const z = useZero();
  const { userIdentifier } = useUser();
  
  if (!z || !userIdentifier) return <SessionPageSkeleton />;

  return (
    <div class="container mx-auto p-4 md:p-8">
      <header class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Retrospective Session</h1>
        <p class="text-base-content/70">Session ID: {params.sessionId}</p>
      </header>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Session Details</h2>
          <p>This is a placeholder for the session page. In the future, this will display session-specific content.</p>
          
          <div class="mt-6">
            <A href="/" class="btn btn-primary">Back to Home</A>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionPage; 