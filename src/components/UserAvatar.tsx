import { createSignal, Show } from "solid-js";
import { useZero } from "../context/ZeroContext";
import { useQuery } from "@rocicorp/zero/solid";
import { AvatarEditorModal } from "./AvatarEditor";

interface UserAvatarProps {
  userIdentifier: string;
  displayName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  editable?: boolean;
}

export function UserAvatar(props: UserAvatarProps) {
  const z = useZero();
  const [isHovered, setIsHovered] = createSignal(false);
  const [showEditor, setShowEditor] = createSignal(false);
  const isCurrentUser = () => props.userIdentifier === z.userID;
  const editable = () => props.editable !== false && isCurrentUser();
  
  const [user] = useQuery(() => 
    z.query.user.where("id", props.userIdentifier).one()
  );
  
  const avatarUrl = () => {
    // Use the user's avatar if available, otherwise use a default
    return user()?.avatarUrl || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(props.displayName)}&background=random`;
  };
  
  const sizeClass = () => {
    switch (props.size) {
      case "sm": return "size-8";
      case "lg": return "size-12";
      default: return "size-10";
    }
  };
  
  const handleAvatarClick = () => {
    if (editable()) {
      setShowEditor(true);
    }
  };
  
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      handleAvatarClick();
    }
  };
  
  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    try {
      // Update the user's avatar in the database
      await z.mutate.user.update({
        id: z.userID,
        avatarUrl: newAvatarUrl
      });
      
      setShowEditor(false);
    } catch (error) {
      console.error("Failed to update avatar:", error);
      // You could add error handling UI here
    }
  };
  
  return (
    <>
      <div 
        class={`shrink-0 relative ${props.className || ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleAvatarClick}
        onKeyPress={handleKeyPress}
        role={editable() ? "button" : undefined}
        tabIndex={editable() ? 0 : undefined}
        aria-label={editable() ? `Edit ${props.displayName}'s avatar` : undefined}
      >
        <img
          alt={`${props.displayName}'s avatar`}
          src={avatarUrl()}
          class={`inline-block rounded-full ${sizeClass()} ${editable() ? 'cursor-pointer' : ''}`}
        />
        
        {editable() && isHovered() && (
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </div>
        )}
      </div>
      
      <Show when={showEditor()}>
        <AvatarEditorModal 
          isOpen={showEditor()} 
          onClose={() => setShowEditor(false)}
          onSave={handleAvatarUpdate}
          currentAvatarUrl={avatarUrl()}
          displayName={props.displayName}
        />
      </Show>
    </>
  );
} 