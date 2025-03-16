/**
 * A reusable error fallback component to show when errors occur
 */
export function ErrorFallback(props: { 
  error: Error; 
  reset: () => void;
  message?: string;
}) {
  return (
    <div class="error-boundary-fallback">
      <h3>Something went wrong</h3>
      <p class="error-message">{props.message || props.error.message}</p>
      <pre class="error-stack">{props.error.stack}</pre>
      <button type="button" class="retry-button" onClick={props.reset}>
        Try Again
      </button>
    </div>
  );
} 