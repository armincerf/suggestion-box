import { lazy, ErrorBoundary } from "solid-js";
import { ErrorFallback } from "./components/ErrorFallback";
import { type RouteDefinition, Router } from "@solidjs/router";

function preloadOtherPages() {
	import("./pages/FeedbackPage").then((module) => ({
		default: module.FeedbackPage,
	}));
	import("./pages/SessionPage").then((module) => ({
		default: module.SessionPage,
	}));
}

const routes = [
	{
		path: "/",
		component: lazy(() =>
			import("./pages/HomePage").then((module) => ({
				default: module.HomePage,
			})),
		),
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
			<Router rootPreload={preloadOtherPages}>{routes}</Router>
		</ErrorBoundary>
	);
}

export default App;
