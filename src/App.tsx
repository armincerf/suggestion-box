import { lazy, ErrorBoundary, Suspense } from "solid-js";
import { ErrorFallback } from "./components/ErrorFallback";
import { type RouteDefinition, Router } from "@solidjs/router";
import { Toaster, Toast } from "@ark-ui/solid/toast";
import { toaster } from "./toast";
import { Portal } from "solid-js/web";
import XIcon from 'lucide-solid/icons/x'

const routes = [
	{
		path: "/",
		component: lazy(() => import("./pages/HomePage")),
	},
	{
		path: "/feedback",
		component: lazy(() =>
			import("./pages/FeedbackPage").then((module) => ({
				default: module.FeedbackPage,
			})),
		),
	},
	{
		path: "/sessions/:sessionId",
		component: lazy(() =>
			import("./pages/SessionPage").then((module) => ({
				default: module.SessionPage,
			})),
		),
	},
	{
		path: "*",
		component: () => (
			<div class="not-found container mx-auto p-8 text-center" role="alert">
				<h1 class="text-3xl font-bold mb-4">Page Not Found</h1>
				<p class="mb-4">The page you're looking for does not exist.</p>
				<a href="/" class="btn btn-primary">
					Go to Home
				</a>
			</div>
		),
	},
] satisfies RouteDefinition[];

function App() {
	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorFallback
					error={error}
					reset={reset}
					message="There was a problem loading the application."
				/>
			)}
		>
			<Router>{routes}</Router>

			<Portal>
				<Toaster toaster={toaster}>
					{(toast) => (
						<Toast.Root class="alert shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-full">
							<div>
								<Toast.Title class="font-bold">{toast().title}</Toast.Title>
								<Toast.Description class="text-sm">
									{typeof toast().description === 'string'
										? toast().description
										: toast().description}
								</Toast.Description>
							</div>
							{toast().action && (
								<Toast.ActionTrigger class="btn btn-sm">
									{toast().action?.label}
								</Toast.ActionTrigger>
							)}
							<Toast.CloseTrigger class="btn btn-sm btn-ghost btn-square absolute top-2 right-2">
								<XIcon class="w-4 h-4"/>
							</Toast.CloseTrigger>
						</Toast.Root>
					)}
				</Toaster>
			</Portal>
		</ErrorBoundary>
	);
}

export default App;
