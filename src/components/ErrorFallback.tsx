/**
 * A reusable error fallback component to show when errors occur
 */
export function ErrorFallback(props: { 
  error: Error; 
  reset: () => void;
  message?: string;
}) {
  return (
    <div class="p-4 border rounded-md m-4 bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-700">
      <h3 class="text-red-800 dark:text-red-400 font-semibold text-lg mt-0 mb-2">Something went wrong</h3>
      <p class="font-medium mb-4 text-gray-900 dark:text-gray-200">{props.message || props.error.message}</p>
      <pre class="bg-black/5 dark:bg-white/5 p-3 rounded text-sm whitespace-pre-wrap break-words overflow-x-auto max-h-[200px] text-gray-800 dark:text-gray-300">
        {props.error.stack}
      </pre>
      <button 
        type="button"
        class="mt-4 bg-blue-600 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        onClick={props.reset}
      >
        Try Again
      </button>
    </div>
  );
} 