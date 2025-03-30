import { createSignal, Show } from "solid-js";
import Pencil from "lucide-solid/icons/pencil";
import X from "lucide-solid/icons/x";
import Check from "lucide-solid/icons/check";
import { useZero } from "../zero/ZeroContext";
import { createLogger } from "../hyperdx-logger";

const logger = createLogger("suggestion-box:EditableDisplayName");

interface EditableDisplayNameProps {
  displayName: string;
  onSave?: (newName: string) => void;
}

export function EditableDisplayName(props: EditableDisplayNameProps) {
  const z = useZero();
  const [isEditing, setIsEditing] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  let nameInputRef: HTMLInputElement | undefined;

  // Save the user name
  const saveUserName = async () => {
    if (!z || !nameInputRef) return;
    const newName = nameInputRef.value.trim();
    if (newName && newName !== props.displayName) {
      setIsSubmitting(true);
      try {
        await z.mutate.users.update({
          displayName: newName,
        });
        localStorage.setItem("username", newName);
        logger.info("User name saved:", { newName });
        if (props.onSave) {
          props.onSave(newName);
        }
      } catch (error) {
        logger.error("Failed to save user name:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
    setIsEditing(false);
  };

  // Handle Enter key in name input
  const handleNameKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveUserName();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <div class="flex items-center text-gray-800 dark:text-gray-200">
      <span class="mr-2 hidden sm:block">Posting as:</span>
      <Show
        when={!isEditing()}
        fallback={
          <>
            <input
              type="text"
              ref={nameInputRef}
              placeholder="Enter your name"
              class="input input-sm input-bordered dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={isSubmitting()}
              onKeyDown={handleNameKeyDown}
              autofocus
            />
            <button
              type="button"
              onClick={saveUserName}
              class="btn btn-ghost btn-xs dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Save name"
              disabled={isSubmitting()}
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              class="btn btn-ghost btn-xs dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Cancel editing"
              disabled={isSubmitting()}
            >
              <X size={16} />
            </button>
          </>
        }
      >
        <strong class="mr-2 text-gray-900 dark:text-white">{props.displayName}</strong>
        <button
          type="button"
          onClick={() => {
            setIsEditing(true);
          }}
          class="btn btn-ghost btn-xs dark:text-gray-300 dark:hover:bg-gray-700"
          disabled={isSubmitting()}
          aria-label="Edit display name"
        >
          <Pencil size={16} />
        </button>
      </Show>
    </div>
  );
} 