import { createSignal, For } from "solid-js";
import type { JSX, Component } from "solid-js";

// Define mood types
export interface Mood {
  name: string;
  value: string | null;
  icon: Component<JSX.SvgSVGAttributes<SVGSVGElement>>;
  iconColor: string;
  bgColor: string;
}

// Helper function to combine class names
export function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// Icons (simplified versions of heroicons)
export function FaceSmileIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.536-4.464a.75.75 0 1 0-1.061-1.061 3.5 3.5 0 0 1-4.95 0 .75.75 0 0 0-1.06 1.06 5 5 0 0 0 7.07 0ZM9 8.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S7.448 7 8 7s1 .672 1 1.5Zm3 1.5c.552 0 1-.672 1-1.5S12.552 7 12 7s-1 .672-1 1.5.448 1.5 1 1.5Z" clip-rule="evenodd" />
    </svg>
  );
}

export function FaceFrownIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-3.536-3.475a.75.75 0 0 0 1.061 0 3.5 3.5 0 0 1 4.95 0 .75.75 0 1 0 1.06-1.06 5 5 0 0 0-7.07 0 .75.75 0 0 0 0 1.06ZM9 8.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S7.448 7 8 7s1 .672 1 1.5Zm3 1.5c.552 0 1-.672 1-1.5S12.552 7 12 7s-1 .672-1 1.5.448 1.5 1 1.5Z" clip-rule="evenodd" />
    </svg>
  );
}

export function FireIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fill-rule="evenodd" d="M13.5 4.938a7 7 0 0 1-1.5 4.62 7 7 0 0 0-1.5 4.62.75.75 0 0 1-.75.75 7 7 0 0 1-1.5-4.62 7 7 0 0 0-1.5-4.62.75.75 0 0 1 .75-.75 7 7 0 0 1 1.5 4.62 7 7 0 0 0 1.5 4.62A7 7 0 0 1 12 9.938a7 7 0 0 0 1.5-4.62.75.75 0 0 1 .75-.75 7 7 0 0 1-1.5 4.62 7 7 0 0 0-1.5 4.62.75.75 0 1 1-1.5 0 7 7 0 0 1 1.5-4.62 7 7 0 0 0 1.5-4.62.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
    </svg>
  );
}

export function HeartIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z" />
    </svg>
  );
}

export function HandThumbUpIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 1 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-1.341 5.974C17.153 16.323 16.072 17 14.9 17h-3.192a3 3 0 0 1-1.341-.317l-2.734-1.366A3 3 0 0 0 6.292 15H5V8h.963c.685 0 1.258-.483 1.612-1.068a4.011 4.011 0 0 1 2.166-1.73c.432-.143.853-.386 1.011-.814.16-.432.248-.9.248-1.388Z" />
    </svg>
  );
}

export function XMarkIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

export function PaperClipIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fill-rule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clip-rule="evenodd" />
    </svg>
  );
}

// Define moods
export const moods: Mood[] = [
  { name: 'Excited', value: 'excited', icon: FireIcon, iconColor: 'text-white', bgColor: 'bg-red-500' },
  { name: 'Loved', value: 'loved', icon: HeartIcon, iconColor: 'text-white', bgColor: 'bg-pink-400' },
  { name: 'Happy', value: 'happy', icon: FaceSmileIcon, iconColor: 'text-white', bgColor: 'bg-green-400' },
  { name: 'Sad', value: 'sad', icon: FaceFrownIcon, iconColor: 'text-white', bgColor: 'bg-yellow-400' },
  { name: 'Thumbsy', value: 'thumbsy', icon: HandThumbUpIcon, iconColor: 'text-white', bgColor: 'bg-blue-500' },
  { name: 'I feel nothing', value: null, icon: XMarkIcon, iconColor: 'text-gray-400', bgColor: 'bg-transparent' },
];

interface MoodSelectorProps {
  onSelect?: (mood: Mood) => void;
}

export function MoodSelector(props: MoodSelectorProps) {
  const [selected, setSelected] = createSignal<Mood>(moods[5]);

  const handleSelect = (mood: Mood) => {
    setSelected(mood);
    if (props.onSelect) {
      props.onSelect(mood);
    }
  };

  // Simple dropdown implementation
  const [isOpen, setIsOpen] = createSignal(false);

  const toggleDropdown = () => setIsOpen(!isOpen());

  // Helper to render the current icon
  const renderIcon = (mood: Mood) => {
    const IconComponent = mood.icon;
    return <IconComponent class="size-5 shrink-0" />;
  };

  return (
    <div class="flex items-center">
      <div class="relative">
        <button
          type="button"
          onClick={toggleDropdown}
          class="relative -m-2.5 flex size-10 items-center justify-center rounded-full text-gray-400 hover:text-gray-500"
          aria-expanded={isOpen()}
          aria-haspopup="true"
          aria-label="Select your mood"
        >
          <span class="flex items-center justify-center">
            {selected().value === null ? (
              <span>
                <FaceSmileIcon class="size-5 shrink-0" />
                <span class="sr-only">Add your mood</span>
              </span>
            ) : (
              <span>
                <span
                  class={classNames(
                    selected().bgColor,
                    'flex size-8 items-center justify-center rounded-full'
                  )}
                >
                  {renderIcon(selected())}
                </span>
                <span class="sr-only">{selected().name}</span>
              </span>
            )}
          </span>
        </button>

        {isOpen() && (
          <div class="absolute z-10 mt-1 -ml-6 w-60 rounded-lg bg-white py-3 text-base shadow-sm outline-1 outline-black/5 sm:ml-auto sm:w-64 sm:text-sm">
            <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="mood-selector">
              <For each={moods}>
                {(mood) => (
                  <button
                    type="button"
                    class="w-full text-left cursor-default bg-white px-3 py-2 select-none hover:bg-gray-100 focus:outline-none"
                    role="menuitem"
                    onClick={() => {
                      handleSelect(mood);
                      setIsOpen(false);
                    }}
                  >
                    <div class="flex items-center">
                      <div
                        class={classNames(
                          mood.bgColor,
                          'flex size-8 items-center justify-center rounded-full'
                        )}
                      >
                        {renderIcon(mood)}
                      </div>
                      <span class="ml-3 block truncate font-medium">{mood.name}</span>
                    </div>
                  </button>
                )}
              </For>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 