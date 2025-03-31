import { Modal } from "../Modal"; // Reuse your existing Modal component
import { CreatePollForm } from "./CreatePollForm";
import { createLogger } from "../../hyperdx-logger"; // Import logger

const logger = createLogger("suggestion-box:CreatePollModal"); // Setup logger

interface CreatePollModalProps {
	isOpen: boolean;
	onClose: () => void;
	sessionId: string;
	isPollActive: boolean; // Add prop
}

export function CreatePollModal(props: CreatePollModalProps) {
	const handlePollCreated = (pollId: string) => {
		logger.info("Poll created callback received", { pollId });
		// No need to call onClose here, CreatePollForm now calls props.onCancel passed to it
	};

	return (
		<Modal
			isOpen={props.isOpen}
			onClose={props.onClose}
			title="Create New Poll"
		>
			<CreatePollForm
				sessionId={props.sessionId}
				onPollCreated={handlePollCreated}
				onCancel={props.onClose}
				isPollActive={props.isPollActive}
			/>
		</Modal>
	);
} 