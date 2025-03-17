import { createSignal, createMemo, For, Show } from "solid-js";
import type { JSX } from "solid-js";

interface PaginatedListProps<T> {
  items: T[];
  defaultLimit: number;
  loadIncrement?: number;
  renderItem: (item: T) => JSX.Element;
  loadMoreText?: string;
  className?: string;
}

/**
 * A reusable component for displaying a paginated list of items
 * with a "load more" button if there are more items than the limit
 */
export function PaginatedList<T>(props: PaginatedListProps<T>) {
  const [limit, setLimit] = createSignal(props.defaultLimit);

  const visibleItems = createMemo(() => props.items.slice(0, limit()));
  const hasMore = createMemo(() => props.items.length > limit());
  
  const loadMore = () => {
    setLimit(limit() + (props.loadIncrement || props.defaultLimit));
  };

  return (
    <div class={props.className || "paginated-list"}>
      <For each={visibleItems()}>{props.renderItem}</For>
      <Show when={hasMore()}>
        <button 
          type="button" 
          class="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          onClick={loadMore}
        >
          {props.loadMoreText || `Load more (${props.items.length - limit()} remaining)`}
        </button>
      </Show>
    </div>
  );
} 