import "./LoadingSpinner.css";

/**
 * A loading spinner component for full-page loading states
 */
export function LoadingSpinner() {
  return (
    <div class="app-loading-container">
      <div class="app-loading-spinner" aria-busy="true" aria-label="Application is loading">
        <div class="spinner-circle" />
      </div>
      <p class="app-loading-text">Initializing application...</p>
    </div>
  );
} 