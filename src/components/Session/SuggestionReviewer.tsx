import { createSignal, Show, Index } from "solid-js";
import type { Suggestion } from "../../schema";
import { SuggestionItem } from "../SuggestionItem";
import { useUser } from "../../hooks/useUser";
import { ChevronLeft, ChevronRight } from "lucide-solid";

interface SuggestionReviewerProps {
  suggestions: Suggestion[];
  onComplete: () => void;
  isSessionLeader: boolean;
  isSessionEnded: boolean;
}

export function SuggestionReviewer(props: SuggestionReviewerProps) {
  const { userIdentifier, displayName } = useUser();
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [actionItems, setActionItems] = createSignal<Record<string, string[]>>({});

  // Safely access suggestions with null checks
  const safeSuggestions = () => props.suggestions || [];
  
  // Current suggestion being reviewed (with null check)
  const currentSuggestion = () => {
    const suggestions = safeSuggestions();
    return suggestions.length > currentIndex() ? suggestions[currentIndex()] : null;
  };
  
  // Add action item to the current suggestion
  const addActionItem = (suggestionId: string, text: string) => {
    if (!text.trim()) return;
    
    setActionItems((prev) => {
      const items = prev[suggestionId] || [];
      return {
        ...prev,
        [suggestionId]: [...items, text.trim()],
      };
    });
  };
  
  // Remove action item from the current suggestion
  const removeActionItem = (suggestionId: string, index: number) => {
    setActionItems((prev) => {
      const items = [...(prev[suggestionId] || [])];
      items.splice(index, 1);
      return {
        ...prev,
        [suggestionId]: items,
      };
    });
  };
  
  // Navigate to the next suggestion
  const nextSuggestion = () => {
    if (currentIndex() < safeSuggestions().length - 1) {
      setCurrentIndex(currentIndex() + 1);
    } else {
      // If this is the last suggestion, complete the review
      props.onComplete();
    }
  };
  
  // Navigate to the previous suggestion
  const previousSuggestion = () => {
    if (currentIndex() > 0) {
      setCurrentIndex(currentIndex() - 1);
    }
  };
  
  // Check if there are more suggestions to review
  const hasMoreSuggestions = () => currentIndex() < safeSuggestions().length - 1;
  
  // Check if this is the first suggestion
  const isFirstSuggestion = () => currentIndex() === 0;
  
  // Check if there are any action items for a suggestion
  const hasSuggestionActionItems = (suggestionId: string | undefined) => {
    if (!suggestionId) return false;
    return (actionItems()[suggestionId] || []).length > 0;
  };
  
  // Get action items for a suggestion
  const getSuggestionActionItems = (suggestionId: string | undefined) => {
    if (!suggestionId) return [];
    return actionItems()[suggestionId] || [];
  };
  
  return (
    <div class="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div class="bg-indigo-600 dark:bg-indigo-800 p-6 text-white">
        <h1 class="text-3xl font-bold mb-2">Review Suggestions</h1>
        <p class="opacity-90">
          Review suggestions submitted since the last session
          ({currentIndex() + 1} of {safeSuggestions().length})
        </p>
      </div>
      
      <div class="p-6 dark:text-white">
        <div class="mb-8">
          <Show when={currentSuggestion()} fallback={
            <div class="p-4 text-center dark:text-gray-300">
              <p>No suggestions to review.</p>
            </div>
          }>
            <SuggestionItem 
              suggestion={currentSuggestion() as Suggestion}
              userIdentifier={userIdentifier}
              displayName={displayName()}
              readOnly={props.isSessionEnded}
            />
          </Show>
        </div>
        
        {/* Action Items Section */}
        <Show when={currentSuggestion()}>
          <div class="border-t dark:border-gray-700 pt-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">Action Items</h2>
            
            <div class="space-y-4">
              {/* Action item list */}
              <Show 
                when={hasSuggestionActionItems(currentSuggestion()?.id)} 
                fallback={<p class="text-gray-500 dark:text-gray-400">No action items yet. Add some below.</p>}
              >
                <ul class="space-y-2">
                  <Index each={getSuggestionActionItems(currentSuggestion()?.id)}>
                    {(item, index) => (
                      <li class="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span class="flex-grow dark:text-gray-200">{item()}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const id = currentSuggestion()?.id;
                            if (id) removeActionItem(id, index);
                          }}
                          class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          disabled={props.isSessionEnded}
                        >
                          Remove
                        </button>
                      </li>
                    )}
                  </Index>
                </ul>
              </Show>
              
              {/* Add action item form */}
              <Show when={!props.isSessionEnded}>
                <div class="flex gap-2">
                  <input 
                    type="text" 
                    id="new-action-item"
                    class="flex-grow input input-bordered dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Add a new action item..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const id = currentSuggestion()?.id;
                        if (id) {
                          addActionItem(id, (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick={() => {
                      const input = document.getElementById('new-action-item') as HTMLInputElement;
                      const id = currentSuggestion()?.id;
                      if (input && id) {
                        addActionItem(id, input.value);
                        input.value = '';
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </Show>
        
        {/* Navigation buttons */}
        <div class="flex justify-between border-t dark:border-gray-700 pt-6">
          <button
            type="button"
            onClick={previousSuggestion}
            class="btn btn-outline dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            disabled={isFirstSuggestion()}
          >
            <ChevronLeft class="w-5 h-5 mr-1" /> Previous
          </button>
          
          <button
            type="button"
            onClick={nextSuggestion}
            class="btn btn-primary"
          >
            {hasMoreSuggestions() ? (
              <>
                Next <ChevronRight class="w-5 h-5 ml-1" />
              </>
            ) : (
              "Complete Review"
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 