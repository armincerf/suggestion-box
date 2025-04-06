import type { JSX } from "solid-js";

export function AppLoading(): JSX.Element {
  return (
    <div class="fixed inset-0 bg-[var(--bg-color)] flex items-center justify-center z-50">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-gray-200 border-t-[var(--primary-color)] rounded-full animate-spin" />
        <p class="mt-4 text-[var(--text-color)]">Initializing application...</p>
      </div>
    </div>
  );
} 