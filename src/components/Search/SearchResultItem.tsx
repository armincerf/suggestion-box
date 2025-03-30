// src/components/Search/SearchResultItem.tsx (new file)

import type { SearchResultHit } from '../../typesense/useSearch';
import { Show, splitProps } from 'solid-js';
import { UserAvatar } from '../UserAvatar';
import { useRelativeTime } from '../../hooks/ui/useRelativeTime';
import MessageSquareIcon from 'lucide-solid/icons/message-square';
import LightbulbIcon from 'lucide-solid/icons/lightbulb';
import { cn } from '../../utils/cn';

interface SearchResultItemProps {
    hit: SearchResultHit;
    isSelected: boolean;
    onClick: () => void;
}

// Helper to safely render highlighted HTML
function HighlightedText(props: { text?: string }) {
    // Use innerHTML carefully. Assume Typesense <mark> tags are safe.
    // For production, consider a more robust sanitizer if 'body' content can contain malicious HTML.
    return <span innerHTML={props.text || ''} />;
}

export function SearchResultItem(props: SearchResultItemProps) {
    const [local, rest] = splitProps(props, ["hit", "isSelected", "onClick"]);

    const relativeTime = useRelativeTime(() => local.hit.timestamp);
    const bodyHighlight = () => local.hit._highlight?.body?.snippet || local.hit.body;
    const nameHighlight = () => local.hit._highlight?.displayName?.snippet || local.hit.displayName;

    return (
        <li
            role="option"
            aria-selected={local.isSelected}
            class={cn(
                "p-3 flex items-start gap-3 cursor-pointer rounded-md",
                local.isSelected ? "bg-indigo-600 text-white" : "hover:bg-base-200 dark:hover:bg-gray-700"
            )}
            onClick={local.onClick}
        >
            {/* Icon based on type */}
            <div class={cn("flex-shrink-0 mt-1", local.isSelected ? "text-indigo-200" : "text-gray-500")}>
                {local.hit.type === 'suggestion'
                    ? <LightbulbIcon class="w-4 h-4" />
                    : <MessageSquareIcon class="w-4 h-4" />
                }
            </div>

            {/* Main Content */}
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">
                    <HighlightedText text={bodyHighlight()} />
                </div>
                <div class={cn(
                    "text-xs flex items-center gap-2 mt-1",
                    local.isSelected ? "text-indigo-200" : "text-gray-500 dark:text-gray-400"
                 )}>
                    <Show when={local.hit.userId && local.hit.displayName}>
                        <span class="flex items-center gap-1">
                             <UserAvatar userId={local.hit.userId!} displayName={local.hit.displayName!} size="xs" />
                             <HighlightedText text={nameHighlight()} />
                        </span>
                        <span>·</span>
                    </Show>
                    <span>{relativeTime()}</span>
                     {/* Add category/suggestion link info if needed */}
                </div>
            </div>
        </li>
    );
}