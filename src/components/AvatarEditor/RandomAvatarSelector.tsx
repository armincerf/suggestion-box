import { createSignal, createEffect, For } from "solid-js";
import { useUser } from "../../hooks/data/useUser";

interface RandomAvatarSelectorProps {
  displayName: string;
  onUpdate: (dataUrl: string) => void;
}

export function RandomAvatarSelector(props: RandomAvatarSelectorProps) {
  const { color: userColor } = useUser();
  const [avatars, setAvatars] = createSignal<string[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal<number>(-1);
  
  // Generate random avatars on mount
  createEffect(() => {
    generateRandomAvatars();
    
    // Select the first avatar by default
    if (avatars().length > 0) {
      selectAvatar(0);
    }
  });
  
  const generateRandomAvatars = () => {
    const newAvatars: string[] = [];
    
    // Generate 9 random avatars
    for (let i = 0; i < 9; i++) {
      // Use the user's color for the first avatar, random colors for others
      const colors = ['1abc9c', '2ecc71', '3498db', '9b59b6', 'e67e22', 'e74c3c', 'f1c40f', '34495e', '16a085'];
      let randomColor: string;
      
      if (i === 0) {
        // Use the user's consistent color for the first avatar
        randomColor = userColor().replace('#', '');
      } else {
        randomColor = colors[Math.floor(Math.random() * colors.length)];
      }
      
      const randomSeed = Math.floor(Math.random() * 1000);
      
      newAvatars.push(
        `https://ui-avatars.com/api/?name=${encodeURIComponent(props.displayName)}&background=${randomColor}&color=fff&size=400&seed=${randomSeed}`
      );
    }
    
    setAvatars(newAvatars);
  };
  
  const selectAvatar = (index: number) => {
    setSelectedIndex(index);
    props.onUpdate(avatars()[index]);
  };
  
  const generateMore = () => {
    generateRandomAvatars();
    selectAvatar(0);
  };
  
  return (
    <div class="flex flex-col items-center">
      <div class="grid grid-cols-3 gap-3 mb-4">
        <For each={avatars()}>
          {(avatar, index) => (
            <button
              type="button"
              class={`p-1 rounded-lg overflow-hidden ${
                selectedIndex() === index() ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-gray-300'
              }`}
              onClick={() => selectAvatar(index())}
            >
              <img 
                src={avatar} 
                alt={`Random avatar option ${index() + 1}`} 
                class="w-20 h-20 rounded-lg"
              />
            </button>
          )}
        </For>
      </div>
      
      <button
        type="button"
        onClick={generateMore}
        class="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        Generate More Options
      </button>
      
      <p class="mt-4 text-sm text-gray-500 text-center">
        Select a randomly generated avatar based on your name.
      </p>
    </div>
  );
} 