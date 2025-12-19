import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
	ApolloClient,
	ApolloProvider,
	InMemoryCache,
	HttpLink,
} from "@apollo/client";
import {
	AppErrorBoundary,
	ErrorBoundaryProvider,
} from "@/components/ui/error-boundary";
import { ENV } from "@/lib/constants";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: (failureCount, error: unknown) => {
				const status =
					typeof error === "object" && error !== null && "status" in error
						? (error as { status?: number }).status
						: undefined;
				// Don't retry on 4xx errors
				if (typeof status === "number" && status >= 400 && status < 500) {
					return false;
				}
				return failureCount < 3;
			},
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		},
		mutations: {
			retry: false,
		},
	},
});

const apolloClient = new ApolloClient({
	link: new HttpLink({
		uri: ENV.GRAPHQL_ENDPOINT,
		fetchOptions: { mode: "cors" },
	}),
	cache: new InMemoryCache(),
	connectToDevTools: ENV.NODE_ENV === "development",
});

const App = () => (
	<ErrorBoundaryProvider
		onError={(error, errorInfo) => {
			console.error("App-level error:", error, errorInfo);
		}}
	>
		<AppErrorBoundary>
			<ApolloProvider client={apolloClient}>
				<QueryClientProvider client={queryClient}>
					<TooltipProvider>
						<Toaster />
						<Sonner />
						<BrowserRouter>
							<Routes>
								<Route path="/" element={<Index />} />
								{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
								<Route path="*" element={<NotFound />} />
							</Routes>
						</BrowserRouter>
					</TooltipProvider>
				</QueryClientProvider>
			</ApolloProvider>
		</AppErrorBoundary>
	</ErrorBoundaryProvider>
);

export default App;
