import { PollResults } from "./PollResults";

interface PollResultsToastProps {
	pollId: string;
	pollTitle: string;
	onClose: () => void;
}

export function PollResultsToast(props: PollResultsToastProps) {
	return (
		<div class="w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border dark:border-gray-700 animate-fade-in">
			<div class="flex justify-between items-start mb-2">
				<div>
					<h3 class="font-bold text-lg dark:text-white">Poll Results</h3>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						{props.pollTitle}
					</p>
				</div>
				<button
					type="button"
					onClick={props.onClose}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2"
					aria-label="Acknowledge and close poll results"
				>
					<svg 
						xmlns="http://www.w3.org/2000/svg" 
						class="h-5 w-5" 
						fill="none" 
						viewBox="0 0 24 24" 
						stroke="currentColor" 
						stroke-width="2"
						aria-hidden="true"
					>
						<title>Close</title>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-3 max-h-60 overflow-y-auto pr-2 -mr-2">
				<PollResults pollId={props.pollId} />
			</div>
		</div>
	);
}
