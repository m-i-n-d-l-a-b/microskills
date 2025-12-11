import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
	apolloClient,
	SUBMIT_PROJECT,
	GET_PROJECT_STATUS,
	GET_PROJECT_HISTORY,
} from "@/lib/graphql";
import { handleError } from "@/utils/errorHandling";
import {
	llmService,
	type CodeEvaluationRequest,
	type CodeEvaluationResponse,
} from "@/services/llmService";
import type {
	Project,
	ProjectSubmission,
	ProjectResult,
	ProjectFile,
} from "@/types/api";

// Project state interface
export interface ProjectState {
	currentProject: Project | null;
	projectHistory: ProjectResult[];
	isLoading: boolean;
	error: string | null;
	isSubmitting: boolean;
	isCheckingStatus: boolean;
}

// Project actions interface
export interface ProjectActions {
	submitProject: (submission: ProjectSubmission) => Promise<ProjectResult>;
	getProjectStatus: (projectId: string) => Promise<ProjectResult>;
	getProjectHistory: () => Promise<ProjectResult[]>;
	resubmitProject: (
		projectId: string,
		submission: ProjectSubmission,
	) => Promise<ProjectResult>;
	evaluateCode: (
		request: CodeEvaluationRequest,
	) => Promise<CodeEvaluationResponse>;
	downloadProjectFiles: (projectId: string) => Promise<ProjectFile[]>;
	clearError: () => void;
}

// Hook return type
export type UseProjectsReturn = ProjectState & ProjectActions;

// Query keys
const PROJECT_QUERY_KEYS = {
	projectHistory: ["projects", "history"],
	projectStatus: (id: string) => ["projects", "status", id],
	projectById: (id: string) => ["projects", id],
} as const;

export function useProjects(): UseProjectsReturn {
	const { isAuthenticated, user } = useAuth();
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCheckingStatus, setIsCheckingStatus] = useState(false);

	// Get project history query
	const {
		data: projectHistory = [],
		isLoading: isLoadingHistory,
		refetch: refetchHistory,
	} = useQuery({
		queryKey: PROJECT_QUERY_KEYS.projectHistory,
		queryFn: async (): Promise<ProjectResult[]> => {
			const { data } = await apolloClient.query({
				query: GET_PROJECT_HISTORY,
				fetchPolicy: "network-only",
			});
			return data.projectHistory || [];
		},
		enabled: isAuthenticated,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 15 * 60 * 1000, // 15 minutes
		retry: (failureCount, error) => {
			// Don't retry on authentication errors
			if (
				error.message.includes("401") ||
				error.message.includes("Unauthorized")
			) {
				return false;
			}
			return failureCount < 3;
		},
	});

	// Submit project mutation
	const submitProjectMutation = useMutation({
		mutationFn: async (
			submission: ProjectSubmission,
		): Promise<ProjectResult> => {
			try {
				const { data } = await apolloClient.mutate({
					mutation: SUBMIT_PROJECT,
					variables: {
						input: {
							projectId: submission.projectId,
							code: submission.code,
							language: submission.language,
							files: submission.files,
							metadata: submission.metadata,
						},
					},
				});
				return data.submitProject;
			} catch (error: any) {
				const errorMessage =
					error.message || "Failed to submit project. Please try again.";
				setError(errorMessage);
				handleError(error, { action: "submit-project" });
				throw error;
			}
		},
		onMutate: () => {
			setIsSubmitting(true);
			setError(null);
		},
		onSuccess: async (result, submission) => {
			// Update project history
			await queryClient.invalidateQueries({
				queryKey: PROJECT_QUERY_KEYS.projectHistory,
			});

			// Add the new result to the cache
			queryClient.setQueryData(
				PROJECT_QUERY_KEYS.projectHistory,
				(old: ProjectResult[] = []) => {
					return [result, ...old];
				},
			);

			// Clear any previous errors
			setError(null);

			// Track project submission event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("project:submitted", {
						detail: {
							projectId: submission.projectId,
							language: submission.language,
							hasFiles: submission.files && submission.files.length > 0,
						},
					}),
				);
			}
		},
		onError: (error: any) => {
			const errorMessage =
				error.message || "Failed to submit project. Please try again.";
			setError(errorMessage);
			handleError(error, { action: "submit-project" });
		},
		onSettled: () => {
			setIsSubmitting(false);
		},
	});

	// Check project status mutation
	const checkProjectStatusMutation = useMutation({
		mutationFn: async (projectId: string): Promise<ProjectResult> => {
			try {
				const { data } = await apolloClient.query({
					query: GET_PROJECT_STATUS,
					variables: { projectId },
					fetchPolicy: "network-only",
				});
				return data.projectStatus;
			} catch (error: any) {
				const errorMessage =
					error.message || "Failed to check project status. Please try again.";
				setError(errorMessage);
				handleError(error, { action: "check-project-status" });
				throw error;
			}
		},
		onMutate: () => {
			setIsCheckingStatus(true);
			setError(null);
		},
		onSuccess: (result) => {
			// Update the specific project in history
			queryClient.setQueryData(
				PROJECT_QUERY_KEYS.projectHistory,
				(old: ProjectResult[] = []) => {
					return old.map((project) =>
						project.id === result.id ? result : project,
					);
				},
			);

			// Update the specific project status cache
			queryClient.setQueryData(
				PROJECT_QUERY_KEYS.projectStatus(result.id),
				result,
			);

			// Clear any previous errors
			setError(null);

			// Track status check event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("project:status-checked", {
						detail: {
							projectId: result.id,
							status: result.passed ? "passed" : "failed",
							score: result.percentage,
						},
					}),
				);
			}
		},
		onError: (error: any) => {
			const errorMessage =
				error.message || "Failed to check project status. Please try again.";
			setError(errorMessage);
			handleError(error, { action: "check-project-status" });
		},
		onSettled: () => {
			setIsCheckingStatus(false);
		},
	});

	// Resubmit project mutation
	const resubmitProjectMutation = useMutation({
		mutationFn: async ({
			projectId,
			submission,
		}: {
			projectId: string;
			submission: ProjectSubmission;
		}): Promise<ProjectResult> => {
			try {
				// For resubmission, we use the same submitProject mutation
				const { data } = await apolloClient.mutate({
					mutation: SUBMIT_PROJECT,
					variables: {
						input: {
							projectId: submission.projectId,
							code: submission.code,
							language: submission.language,
							files: submission.files,
							metadata: {
								...submission.metadata,
								resubmission: true,
								originalProjectId: projectId,
							},
						},
					},
				});
				return data.submitProject;
			} catch (error: any) {
				const errorMessage =
					error.message || "Failed to resubmit project. Please try again.";
				setError(errorMessage);
				handleError(error, { action: "resubmit-project" });
				throw error;
			}
		},
		onMutate: () => {
			setIsSubmitting(true);
			setError(null);
		},
		onSuccess: async (result, { projectId, submission }) => {
			// Update project history
			await queryClient.invalidateQueries({
				queryKey: PROJECT_QUERY_KEYS.projectHistory,
			});

			// Clear any previous errors
			setError(null);

			// Track resubmission event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("project:resubmitted", {
						detail: {
							projectId,
							originalProjectId: submission.projectId,
							language: submission.language,
						},
					}),
				);
			}
		},
		onError: (error: any) => {
			const errorMessage =
				error.message || "Failed to resubmit project. Please try again.";
			setError(errorMessage);
			handleError(error, { action: "resubmit-project" });
		},
		onSettled: () => {
			setIsSubmitting(false);
		},
	});

	// LLM Code Evaluation mutation
	const evaluateCodeMutation = useMutation({
		mutationFn: async (
			request: CodeEvaluationRequest,
		): Promise<CodeEvaluationResponse> => {
			return llmService.evaluateCode(request);
		},
		onSuccess: (evaluation) => {
			// Track evaluation event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("llm:evaluation-completed", {
						detail: {
							projectId: evaluation.projectId,
							score: evaluation.score,
							passed: evaluation.passed,
							processingTime: evaluation.processingTime,
							model: evaluation.model,
							provider: evaluation.provider,
						},
					}),
				);
			}
		},
		onError: (error: any) => {
			const errorMessage =
				error.message || "Failed to evaluate code. Please try again.";
			setError(errorMessage);
			handleError(error, { action: "llm-evaluate-code" });
		},
	});

	// Download project files mutation
	const downloadProjectFilesMutation = useMutation({
		mutationFn: async (projectId: string): Promise<ProjectFile[]> => {
			// This would typically call an API endpoint to get project files
			// For now, we'll return an empty array
			return Promise.resolve([]);
		},
		onSuccess: (files, projectId) => {
			// Track download event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("project:files-downloaded", {
						detail: {
							projectId,
							fileCount: files.length,
						},
					}),
				);
			}
		},
		onError: (error: any) => {
			const errorMessage = error.message || "Failed to download project files.";
			setError(errorMessage);
			handleError(error, { action: "download-project-files" });
		},
	});

	// Handle project errors
	const handleProjectError = useCallback((error: any) => {
		const errorMessage = error.message || "Failed to load project data.";
		setError(errorMessage);

		// If it's an authentication error, it will be handled by the auth hook
		if (
			!errorMessage.includes("401") &&
			!errorMessage.includes("Unauthorized")
		) {
			handleError(error, { action: "load-projects" });
		}
	}, []);

	// Project actions
	const submitProject = useCallback(
		async (submission: ProjectSubmission): Promise<ProjectResult> => {
			return submitProjectMutation.mutateAsync(submission);
		},
		[submitProjectMutation],
	);

	const getProjectStatus = useCallback(
		async (projectId: string): Promise<ProjectResult> => {
			return checkProjectStatusMutation.mutateAsync(projectId);
		},
		[checkProjectStatusMutation],
	);

	const getProjectHistory = useCallback(async (): Promise<ProjectResult[]> => {
		try {
			const result = await refetchHistory();
			if (result.data) {
				return result.data;
			}
			throw new Error("Failed to fetch project history");
		} catch (error: any) {
			handleProjectError(error);
			throw error;
		}
	}, [refetchHistory, handleProjectError]);

	const resubmitProject = useCallback(
		async (
			projectId: string,
			submission: ProjectSubmission,
		): Promise<ProjectResult> => {
			return resubmitProjectMutation.mutateAsync({ projectId, submission });
		},
		[resubmitProjectMutation],
	);

	const evaluateCode = useCallback(
		async (request: CodeEvaluationRequest): Promise<CodeEvaluationResponse> => {
			return evaluateCodeMutation.mutateAsync(request);
		},
		[evaluateCodeMutation],
	);

	const downloadProjectFiles = useCallback(
		async (projectId: string): Promise<ProjectFile[]> => {
			return downloadProjectFilesMutation.mutateAsync(projectId);
		},
		[downloadProjectFilesMutation],
	);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Determine loading state
	const isLoading = isLoadingHistory || !isAuthenticated;

	return {
		// State
		currentProject: null, // This would be set when viewing a specific project
		projectHistory,
		isLoading,
		error,
		isSubmitting,
		isCheckingStatus,

		// Actions
		submitProject,
		getProjectStatus,
		getProjectHistory,
		resubmitProject,
		evaluateCode,
		downloadProjectFiles,
		clearError,
	};
}

// Export hook as default
export default useProjects;
