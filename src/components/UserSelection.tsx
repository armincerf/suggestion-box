import { createSignal, type JSX, For } from "solid-js";
import { createJWT } from "../utils/jwt";

interface User {
  id: string;
  color: string;
}

const AVAILABLE_USERS: User[] = [
  { id: "Alex", color: "#4C72B0" },
  { id: "Bob", color: "#DD8452" },
  { id: "Jill", color: "#55A868" },
  { id: "John", color: "#C44E52" },
  { id: "Jane", color: "#8172B3" },
  { id: "Frank", color: "#937860" },
  { id: "Sarah", color: "#DA8BC3" },
  { id: "Anonymous", color: "#000000" },
];

interface UserSelectionProps {
  onUserSelected: (userId: string, color: string, jwt: string) => void;
}

export function UserSelection(props: UserSelectionProps): JSX.Element {
  const [isSelecting, setIsSelecting] = createSignal(true);

  const selectUser = async (user: User) => {
    setIsSelecting(false);
    
    try {
      const jwt = await createJWT({ sub: user.id });
      
      localStorage.setItem("userId", user.id);
      localStorage.setItem("jwt", jwt);
      localStorage.setItem("color", user.color);
      
      props.onUserSelected(user.id, user.color, jwt);
    } catch (error) {
      console.error("User selection error:", error);
      setIsSelecting(true);
    }
  };

  return (
    <div class="fixed inset-0 bg-[var(--bg-color)] flex items-center justify-center p-4 z-50">
      <div class="bg-[var(--card-bg-color)] rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 class="text-xl font-bold text-center mb-6">Select User</h2>
        
        <div class="grid grid-cols-2 gap-3">
          <For each={AVAILABLE_USERS}>
            {(user) => (
              <button
                type="button"
                class="py-3 px-4 rounded-md text-white font-medium transition-colors"
                style={{ "background-color": user.color }}
                onClick={() => selectUser(user)}
                disabled={!isSelecting()}
              >
                {user.id}
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  );
} 