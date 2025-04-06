import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";
import { formatDistanceToNow } from "date-fns";

// Helper function for formatting
function formatRelativeTimeShort(timestamp: number | Date, isSmallScreen: boolean): string {
    const timeSince = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    if (!isSmallScreen) {
        return timeSince;
    }

    // Use short formatting for small screens
    const replacements: Record<string, string> = {
        "about ": "",
        " hours": "h",
        " minutes": "m",
        " seconds": "s",
        " days": "d",
        " months": "mo",
        "less than a minute": "~1m",
    };

    // Basic replacement loop
    let shortTime = timeSince;
    for (const [key, value] of Object.entries(replacements)) {
        shortTime = shortTime.replace(key, value);
    }
    // Handle single minute/hour cases explicitly
    if (shortTime.endsWith(" 1 m ago")) shortTime = "1m ago";
    if (shortTime.endsWith(" 1 h ago")) shortTime = "1h ago";

    return shortTime;
}

// Hook using SolidJS primitives
export function useRelativeTime(timestamp: Accessor<number | Date | undefined | null>, isSmallScreen: Accessor<boolean> = () => false) {
    const [relativeTime, setRelativeTime] = createSignal<string>("");
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const update = () => {
        const ts = timestamp();
        if (ts === undefined || ts === null) {
            setRelativeTime("");
            return;
        }
        setRelativeTime(formatRelativeTimeShort(ts, isSmallScreen()));

        // Clear existing interval before setting a new one
        if (intervalId) clearInterval(intervalId);
        
        // Update frequently for recent times, less frequently for older times
        const diffSeconds = (Date.now() - new Date(ts).getTime()) / 1000;
        const updateInterval = diffSeconds < 3600 ? 60000 : 3600000; // Every minute or every hour
        intervalId = setInterval(update, updateInterval);
    };

    // Use createEffect to react to timestamp changes
    createEffect(() => {
        update(); // Update immediately when timestamp changes
    });

    // Cleanup interval on component unmount
    onCleanup(() => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    });

    return relativeTime; // Return the signal
} 