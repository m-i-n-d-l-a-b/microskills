import type React from "react";
import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

// Mock the components that are imported
vi.mock("@/components/ui/toaster", () => ({
	Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

vi.mock("@/components/ui/sonner", () => ({
	Toaster: () => <div data-testid="sonner">Sonner</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
	TooltipProvider: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-provider">{children}</div>
	),
}));

vi.mock("@/components/ui/error-boundary", () => ({
	AppErrorBoundary: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="app-error-boundary">{children}</div>
	),
	ErrorBoundaryProvider: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="error-boundary-provider">{children}</div>
	),
}));

vi.mock("./pages/Index", () => ({
	default: () => <div data-testid="index-page">Index Page</div>,
}));

vi.mock("./pages/NotFound", () => ({
	default: () => <div data-testid="not-found-page">Not Found Page</div>,
}));

// Mock @tanstack/react-query
vi.mock("@tanstack/react-query", () => ({
	QueryClient: vi.fn(() => ({
		mount: vi.fn(),
		unmount: vi.fn(),
	})),
	QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="query-client-provider">{children}</div>
	),
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		BrowserRouter: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="browser-router">{children}</div>
		),
		Routes: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="routes">{children}</div>
		),
		Route: ({ element }: { element: React.ReactNode }) => (
			<div data-testid="route">{element}</div>
		),
	};
});

describe("App", () => {
	it("renders without crashing", () => {
		render(<App />);
		expect(screen.getByTestId("error-boundary-provider")).toBeInTheDocument();
	});

	it("renders error boundary provider", () => {
		render(<App />);
		expect(screen.getByTestId("error-boundary-provider")).toBeInTheDocument();
	});

	it("renders app error boundary", () => {
		render(<App />);
		expect(screen.getByTestId("app-error-boundary")).toBeInTheDocument();
	});

	it("renders query client provider", () => {
		render(<App />);
		expect(screen.getByTestId("query-client-provider")).toBeInTheDocument();
	});

	it("renders tooltip provider", () => {
		render(<App />);
		expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument();
	});

	it("renders browser router", () => {
		render(<App />);
		expect(screen.getByTestId("browser-router")).toBeInTheDocument();
	});

	it("renders routes", () => {
		render(<App />);
		expect(screen.getByTestId("routes")).toBeInTheDocument();
	});

	it("renders toaster components", () => {
		render(<App />);
		expect(screen.getByTestId("toaster")).toBeInTheDocument();
		expect(screen.getByTestId("sonner")).toBeInTheDocument();
	});

	it("renders route elements", () => {
		render(<App />);
		const routes = screen.getAllByTestId("route");
		expect(routes.length).toBeGreaterThan(0);
	});

	it("has proper component hierarchy", () => {
		render(<App />);

		// Check that components are nested in the correct order
		const errorBoundaryProvider = screen.getByTestId("error-boundary-provider");
		const appErrorBoundary = screen.getByTestId("app-error-boundary");
		const queryClientProvider = screen.getByTestId("query-client-provider");
		const tooltipProvider = screen.getByTestId("tooltip-provider");
		const browserRouter = screen.getByTestId("browser-router");

		expect(errorBoundaryProvider).toContainElement(appErrorBoundary);
		expect(appErrorBoundary).toContainElement(queryClientProvider);
		expect(queryClientProvider).toContainElement(tooltipProvider);
		expect(tooltipProvider).toContainElement(browserRouter);
	});

	it("handles error boundary provider onError callback", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		render(<App />);

		// The error boundary provider should be set up with an onError callback
		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it("configures query client with proper options", () => {
		render(<App />);

		expect(QueryClient).toHaveBeenCalledWith({
			defaultOptions: {
				queries: {
					retry: expect.any(Function),
					retryDelay: expect.any(Function),
				},
				mutations: {
					retry: false,
				},
			},
		});
	});

	it("configures retry logic correctly", () => {
		render(<App />);

		const queryClientConfig = QueryClient.mock.calls[0][0];
		const retryFunction = queryClientConfig.defaultOptions.queries.retry;
		const retryDelayFunction =
			queryClientConfig.defaultOptions.queries.retryDelay;

		// Test retry function
		expect(retryFunction(0, { status: 400 })).toBe(false); // 4xx errors should not retry
		expect(retryFunction(0, { status: 500 })).toBe(true); // 5xx errors should retry
		expect(retryFunction(3, { status: 500 })).toBe(false); // Max retries reached

		// Test retry delay function
		expect(retryDelayFunction(0)).toBe(1000);
		expect(retryDelayFunction(1)).toBe(2000);
		expect(retryDelayFunction(2)).toBe(4000);
		expect(retryDelayFunction(10)).toBe(30000); // Max delay
	});
});
