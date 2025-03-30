// src/components/Search/SearchPalette.tsx (new file)

import { createSignal, Show, For, createEffect} from 'solid-js';
import { Modal } from '../Modal';
import { useSearch, type SearchResultHit } from '../../typesense/useSearch';
import { SearchResultItem } from './SearchResultItem';
import Loader2Icon from 'lucide-solid/icons/loader-2';
import SearchIcon from 'lucide-solid/icons/search';

interface SearchPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SearchPalette(props: SearchPaletteProps) {
    const {
        query, setQuery,
        searchSuggestions, setSearchSuggestions,
        searchComments, setSearchComments,
        useSemantic, setUseSemantic,
        isLoading,
        results,
        error,
    } = useSearch();

    const [selectedIndex, setSelectedIndex] = createSignal(0);
    let inputRef: HTMLInputElement | undefined;

    // Reset selection when results change
    createEffect(() => {
        results(); // Depend on results
        setSelectedIndex(0);
    });

     // Focus input when opening
    createEffect(() => {
        if (props.isOpen) {
             // Delay focus slightly to ensure modal transition completes
            setTimeout(() => inputRef?.focus(), 100);
            // Optionally clear query on open: setQuery('');
        }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
        const maxIndex = results().length - 1;
        if (maxIndex < 0) return; // No results

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => (i >= maxIndex ? 0 : i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => (i <= 0 ? maxIndex : i - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedHit = results()[selectedIndex()];
            if (selectedHit) {
                handleResultClick(selectedHit);
            }
        }
    };

    const handleResultClick = (hit: SearchResultHit) => {
        console.log("Selected hit:", hit);
        // TODO: Implement navigation or action based on the hit type/ID
        // e.g., navigate to the suggestion page, scroll to the comment
        // Example:
        // if (hit.type === 'suggestion') {
        //     navigate(`/session/${sessionId}/suggestion/${hit.id}`); // Adjust path
        // } else if (hit.type === 'comment') {
        //     // Might need suggestionId to navigate first, then scroll/highlight
        // }
        props.onClose(); // Close palette after selection
    };

    return (
        <Modal isOpen={props.isOpen} onClose={props.onClose} title="Search">
            {/* Use div inside modal for keydown handling */}
            <div onKeyDown={handleKeyDown} class="flex flex-col h-full">
                {/* Search Input */}
                <div class="p-4 border-b dark:border-gray-700 flex items-center gap-2">
                     <SearchIcon class="w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search suggestions and comments..."
                        class="input input-ghost w-full focus:outline-none focus:border-none focus:ring-0 text-lg dark:text-white"
                        value={query()}
                        onInput={(e) => setQuery(e.currentTarget.value)}
                    />
                </div>

                 {/* Configuration Options */}
                 <div class="p-2 px-4 border-b dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                     <label class="label cursor-pointer gap-1 p-0">
                         <input
                             type="checkbox"
                             class="checkbox checkbox-xs checkbox-primary"
                             checked={searchSuggestions()}
                             onChange={(e) => setSearchSuggestions(e.currentTarget.checked)}
                         />
                         <span class="label-text dark:text-gray-300">Suggestions</span>
                     </label>
                     <label class="label cursor-pointer gap-1 p-0">
                         <input
                             type="checkbox"
                             class="checkbox checkbox-xs checkbox-primary"
                             checked={searchComments()}
                             onChange={(e) => setSearchComments(e.currentTarget.checked)}
                         />
                         <span class="label-text dark:text-gray-300">Comments</span>
                     </label>
                      <label class="label cursor-pointer gap-1 p-0">
                         <input
                             type="checkbox"
                             class="checkbox checkbox-xs checkbox-accent"
                             checked={useSemantic()}
                             onChange={(e) => setUseSemantic(e.currentTarget.checked)}
                         />
                         <span class="label-text dark:text-gray-300">Semantic</span>
                     </label>
                 </div>


                {/* Results Area */}
                <div class="flex-1 overflow-y-auto p-2">
                    <Show when={isLoading()}>
                        <div class="flex justify-center items-center h-20">
                            <Loader2Icon class="w-6 h-6 animate-spin text-gray-500" />
                        </div>
                    </Show>
                    <Show when={!isLoading() && error()}>
                        <p class="text-center text-error p-4">{error()}</p>
                    </Show>
                    <Show when={!isLoading() && !error() && results().length === 0 && query() !== ''}>
                        <p class="text-center text-gray-500 p-4">No results found for "{query()}".</p>
                    </Show>
                    <Show when={!isLoading() && !error() && results().length > 0}>
                        <ul role="listbox">
                            <For each={results()}>
                                {(hit, index) => (
                                    <SearchResultItem
                                        hit={hit}
                                        isSelected={index() === selectedIndex()}
                                        onClick={() => handleResultClick(hit)}
                                    />
                                )}
                            </For>
                        </ul>
                    </Show>
                 </div>
            </div>
        </Modal>
    );
}