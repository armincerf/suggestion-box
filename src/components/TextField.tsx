interface TextFieldProps {
  id: string;
  name: string;
  value: string;
  onInput: (e: InputEvent & { currentTarget: HTMLTextAreaElement }) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  onKeyDown?: (e: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
  autoFocus?: boolean;
}

export function TextField(props: TextFieldProps) {
  return (
    <div class="rounded-lg bg-white dark:bg-base-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600">
      {props.label && (
        <label for={props.id} class="sr-only">
          {props.label}
        </label>
      )}
      <textarea
        id={props.id}
        name={props.name}
        rows={props.rows || 3}
        placeholder={props.placeholder}
        class="block w-full resize-none bg-transparent px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none sm:text-sm/6"
        value={props.value}
        onInput={props.onInput}
        onKeyDown={props.onKeyDown}
        disabled={props.disabled}
        required={props.required}
        autofocus={props.autoFocus}
      />

      {/* Spacer element to match the height of the toolbar */}
      <div aria-hidden="true" class="py-2">
        <div class="py-px">
          <div class="h-9" />
        </div>
      </div>
    </div>
  );
} 