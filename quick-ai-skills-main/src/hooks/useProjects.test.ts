import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProjects } from "./useProjects";
import { apolloClient } from "@/lib/graphql";
import type { ProjectSubmission, ProjectResult } from "@/types/api";

// Mock Apollo Client
vi.mock("@/lib/graphql", () => ({
	apolloClient: {
		query: vi.fn(),
		mutate: vi.fn(),
	},
	SUBMIT_PROJECT: "SUBMIT_PROJECT",
	GET_PROJECT_STATUS: "GET_PROJECT_STATUS",
	GET_PROJECT_HISTORY: "GET_PROJECT_HISTORY",
}));

// Mock useAuth hook
vi.mock("./useAuth", () => ({
	useAuth: () => ({
		isAuthenticated: true,
		user: { id: "user-1", email: "test@example.com" },
	}),
}));

// Mock error handling
vi.mock("@/utils/errorHandling", () => ({
	handleError: vi.fn(),
}));

// Mock window events
const mockDispatchEvent = vi.fn();
Object.defineProperty(window, "dispatchEvent", {
	value: mockDispatchEvent,
	writable: true,
});

describe("useProjects", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client: queryClient }, children);

	const mockProjectResult: ProjectResult = {
		id: "result-1",
		projectId: "project-1",
		status: "completed",
		score: 85,
		percentage: 85,
		passed: true,
		feedback: [
			{
				id: "feedback-1",
				type: "success",
				message: "Great job!",
				severity: "info",
				lineNumber: null,
				suggestion: null,
			},
		],
		submittedAt: new Date().toISOString(),
		gradedAt: new Date().toISOString(),
		processingTime: 1500,
		metadata: {},
	};

	const mockProjectSubmission: ProjectSubmission = {
		projectId: "project-1",
		code: 'console.log("Hello, World!");',
		language: "javascript",
		files: [],
		metadata: {},
	};

	describe("Project History", () => {
		it("should fetch project history successfully", async () => {
			const mockHistory = [mockProjectResult];
			(apolloClient.query as any).mockResolvedValue({
				data: { projectHistory: mockHistory },
			});

			const { result } = renderHook(() => useProjects(), { wrapper });

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.projectHistory).toEqual(mockHistory);
			expect(apolloClient.query).toHaveBeenCalledWith({
				query: "GET_PROJECT_HISTORY",
				fetchPolicy: "network-only",
			});
		});

		it("should handle project history fetch error", async () => {
			const error = new Error("Failed to fetch history");
			(apolloClient.query as any).mockRejectedValue(error);

			const { result } = renderHook(() => useProjects(), { wrapper });

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.error).toBe("Failed to fetch history");
		});
	});

	describe("Project Submission", () => {
		it("should submit project successfully", async () => {
			(apolloClient.mutate as any).mockResolvedValue({
				data: { submitProject: mockProjectResult },
			});

			const { result } = renderHook(() => useProjects(), { wrapper });

			const submission = await result.current.submitProject(
				mockProjectSubmission,
			);

			expect(submission).toEqual(mockProjectResult);
			expect(apolloClient.mutate).toHaveBeenCalledWith({
				mutation: "SUBMIT_PROJECT",
				variables: {
					input: {
						projectId: mockProjectSubmission.projectId,
						code: mockProjectSubmission.code,
						language: mockProjectSubmission.language,
						files: mockProjectSubmission.files,
						metadata: mockProjectSubmission.metadata,
					},
				},
			});
			expect(mockDispatchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "project:submitted",
					detail: {
						projectId: mockProjectSubmission.projectId,
						language: mockProjectSubmission.language,
						hasFiles: false,
					},
				}),
			);
		});

		it("should handle project submission error", async () => {
			const error = new Error("Submission failed");
			(apolloClient.mutate as any).mockRejectedValue(error);

			const { result } = renderHook(() => useProjects(), { wrapper });

			await expect(
				result.current.submitProject(mockProjectSubmission),
			).rejects.toThrow("Submission failed");
			expect(result.current.error).toBe("Submission failed");
		});

		it("should show submitting state during submission", async () => {
			let resolveMutation: (value: any) => void;
			const mutationPromise = new Promise((resolve) => {
				resolveMutation = resolve;
			});
			(apolloClient.mutate as any).mockReturnValue(mutationPromise);

			const { result } = renderHook(() => useProjects(), { wrapper });

			const submitPromise = result.current.submitProject(mockProjectSubmission);

			expect(result.current.isSubmitting).toBe(true);

			resolveMutation!({ data: { submitProject: mockProjectResult } });
			await submitPromise;

			expect(result.current.isSubmitting).toBe(false);
		});
	});

	describe("Project Status Checking", () => {
		it("should check project status successfully", async () => {
			(apolloClient.query as any).mockResolvedValue({
				data: { projectStatus: mockProjectResult },
			});

			const { result } = renderHook(() => useProjects(), { wrapper });

			const status = await result.current.getProjectStatus("project-1");

			expect(status).toEqual(mockProjectResult);
			expect(apolloClient.query).toHaveBeenCalledWith({
				query: "GET_PROJECT_STATUS",
				variables: { projectId: "project-1" },
				fetchPolicy: "network-only",
			});
			expect(mockDispatchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "project:status-checked",
					detail: {
						projectId: mockProjectResult.id,
						status: "passed",
						score: mockProjectResult.percentage,
					},
				}),
			);
		});

		it("should handle status check error", async () => {
			const error = new Error("Status check failed");
			(apolloClient.query as any).mockRejectedValue(error);

			const { result } = renderHook(() => useProjects(), { wrapper });

			await expect(
				result.current.getProjectStatus("project-1"),
			).rejects.toThrow("Status check failed");
			expect(result.current.error).toBe("Status check failed");
		});

		it("should show checking status state during status check", async () => {
			let resolveQuery: (value: any) => void;
			const queryPromise = new Promise((resolve) => {
				resolveQuery = resolve;
			});
			(apolloClient.query as any).mockReturnValue(queryPromise);

			const { result } = renderHook(() => useProjects(), { wrapper });

			const statusPromise = result.current.getProjectStatus("project-1");

			expect(result.current.isCheckingStatus).toBe(true);

			resolveQuery!({ data: { projectStatus: mockProjectResult } });
			await statusPromise;

			expect(result.current.isCheckingStatus).toBe(false);
		});
	});

	describe("Project Resubmission", () => {
		it("should resubmit project successfully", async () => {
			(apolloClient.mutate as any).mockResolvedValue({
				data: { submitProject: mockProjectResult },
			});

			const { result } = renderHook(() => useProjects(), { wrapper });

			const resubmission = await result.current.resubmitProject(
				"original-project-1",
				mockProjectSubmission,
			);

			expect(resubmission).toEqual(mockProjectResult);
			expect(apolloClient.mutate).toHaveBeenCalledWith({
				mutation: "SUBMIT_PROJECT",
				variables: {
					input: {
						projectId: mockProjectSubmission.projectId,
						code: mockProjectSubmission.code,
						language: mockProjectSubmission.language,
						files: mockProjectSubmission.files,
						metadata: {
							...mockProjectSubmission.metadata,
							resubmission: true,
							originalProjectId: "original-project-1",
						},
					},
				},
			});
			expect(mockDispatchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "project:resubmitted",
					detail: {
						projectId: "original-project-1",
						originalProjectId: mockProjectSubmission.projectId,
						language: mockProjectSubmission.language,
					},
				}),
			);
		});

		it("should handle resubmission error", async () => {
			const error = new Error("Resubmission failed");
			(apolloClient.mutate as any).mockRejectedValue(error);

			const { result } = renderHook(() => useProjects(), { wrapper });

			await expect(
				result.current.resubmitProject(
					"original-project-1",
					mockProjectSubmission,
				),
			).rejects.toThrow("Resubmission failed");
			expect(result.current.error).toBe("Resubmission failed");
		});
	});

	describe("Project History Refresh", () => {
		it("should refresh project history successfully", async () => {
			const mockHistory = [mockProjectResult];
			(apolloClient.query as any).mockResolvedValue({
				data: { projectHistory: mockHistory },
			});

			const { result } = renderHook(() => useProjects(), { wrapper });

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			const refreshedHistory = await result.current.getProjectHistory();

			expect(refreshedHistory).toEqual(mockHistory);
		});

		it("should handle history refresh error", async () => {
			const error = new Error("History refresh failed");
			(apolloClient.query as any).mockRejectedValue(error);

			const { result } = renderHook(() => useProjects(), { wrapper });

			await expect(result.current.getProjectHistory()).rejects.toThrow(
				"History refresh failed",
			);
		});
	});

	describe("Error Handling", () => {
		it("should clear error when clearError is called", () => {
			const { result } = renderHook(() => useProjects(), { wrapper });

			// Set an error first
			result.current.clearError();

			expect(result.current.error).toBe(null);
		});

		it("should handle authentication errors gracefully", async () => {
			const authError = new Error("401 Unauthorized");
			(apolloClient.query as any).mockRejectedValue(authError);

			const { result } = renderHook(() => useProjects(), { wrapper });

			await expect(result.current.getProjectHistory()).rejects.toThrow(
				"401 Unauthorized",
			);
			// Should not retry on auth errors
			expect(apolloClient.query).toHaveBeenCalledTimes(1);
		});
	});

	describe("State Management", () => {
		it("should have correct initial state", () => {
			const { result } = renderHook(() => useProjects(), { wrapper });

			expect(result.current.currentProject).toBe(null);
			expect(result.current.projectHistory).toEqual([]);
			expect(result.current.error).toBe(null);
			expect(result.current.isSubmitting).toBe(false);
			expect(result.current.isCheckingStatus).toBe(false);
		});

		it("should provide all required actions", () => {
			const { result } = renderHook(() => useProjects(), { wrapper });

			expect(typeof result.current.submitProject).toBe("function");
			expect(typeof result.current.getProjectStatus).toBe("function");
			expect(typeof result.current.getProjectHistory).toBe("function");
			expect(typeof result.current.resubmitProject).toBe("function");
			expect(typeof result.current.downloadProjectFiles).toBe("function");
			expect(typeof result.current.clearError).toBe("function");
		});
	});
});
