import { useState, useCallback, useEffect } from "react";
import { certificateService } from "../services/certificateService";
import type {
	Certificate,
	CertificateGenerationRequest,
	CertificateGenerationResponse,
	BadgeShareRequest,
	BadgeShareResponse,
	ApiResponse,
} from "../types/api";
import { useAuth } from "./useAuth";

interface CertificateState {
	certificates: Certificate[];
	loading: boolean;
	error: string | null;
	generating: boolean;
	sharing: boolean;
	verifying: boolean;
}

interface CertificateActions {
	generateCertificate: (
		request: CertificateGenerationRequest,
	) => Promise<ApiResponse<CertificateGenerationResponse>>;
	shareBadge: (
		request: BadgeShareRequest,
	) => Promise<ApiResponse<BadgeShareResponse>>;
	verifyCertificate: (
		verificationCode: string,
	) => Promise<
		ApiResponse<{ certificate: Certificate; isValid: boolean; message: string }>
	>;
	downloadCertificate: (
		certificateId: string,
		format?: "pdf" | "png",
	) => Promise<ApiResponse<{ downloadUrl: string }>>;
	revokeCertificate: (
		certificateId: string,
		reason?: string,
	) => Promise<ApiResponse<{ success: boolean; message: string }>>;
	getCertificateAnalytics: (certificateId: string) => Promise<
		ApiResponse<{
			views: number;
			shares: number;
			downloads: number;
			verificationAttempts: number;
			lastViewed?: string;
		}>
	>;
	generatePreview: (
		template: string,
		customData: Record<string, any>,
	) => Promise<ApiResponse<{ previewUrl: string }>>;
	getTemplates: () => Promise<
		ApiResponse<
			Array<{
				id: string;
				name: string;
				description: string;
				previewUrl: string;
				category: string;
				isPremium: boolean;
			}>
		>
	>;
	refreshCertificates: () => Promise<void>;
	clearError: () => void;
}

export const useCertificates = (): CertificateState & CertificateActions => {
	const { user } = useAuth();
	const [state, setState] = useState<CertificateState>({
		certificates: [],
		loading: false,
		error: null,
		generating: false,
		sharing: false,
		verifying: false,
	});

	// Load user certificates on mount and when user changes
	useEffect(() => {
		if (user?.id) {
			refreshCertificates();
		}
	}, [user?.id]);

	const refreshCertificates = useCallback(async () => {
		if (!user?.id) return;

		setState((prev) => ({ ...prev, loading: true, error: null }));

		try {
			const response = await certificateService.getUserCertificates(user.id);

			if (response.success) {
				setState((prev) => ({
					...prev,
					certificates: response.data || [],
					loading: false,
				}));
			} else {
				setState((prev) => ({
					...prev,
					error: response.message || "Failed to load certificates",
					loading: false,
				}));
			}
		} catch (error) {
			setState((prev) => ({
				...prev,
				error:
					error instanceof Error
						? error.message
						: "Failed to load certificates",
				loading: false,
			}));
		}
	}, [user?.id]);

	const generateCertificate = useCallback(
		async (
			request: CertificateGenerationRequest,
		): Promise<ApiResponse<CertificateGenerationResponse>> => {
			setState((prev) => ({ ...prev, generating: true, error: null }));

			try {
				const response = await certificateService.generateCertificate(request);

				if (response.success) {
					// Refresh certificates list to include the new one
					await refreshCertificates();
				}

				setState((prev) => ({ ...prev, generating: false }));
				return response;
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to generate certificate";
				setState((prev) => ({
					...prev,
					error: errorMessage,
					generating: false,
				}));

				return {
					data: null,
					status: 500,
					message: errorMessage,
					success: false,
				};
			}
		},
		[refreshCertificates],
	);

	const shareBadge = useCallback(
		async (
			request: BadgeShareRequest,
		): Promise<ApiResponse<BadgeShareResponse>> => {
			setState((prev) => ({ ...prev, sharing: true, error: null }));

			try {
				const response = await certificateService.shareBadge(request);
				setState((prev) => ({ ...prev, sharing: false }));
				return response;
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Failed to share badge";
				setState((prev) => ({
					...prev,
					error: errorMessage,
					sharing: false,
				}));

				return {
					data: null,
					status: 500,
					message: errorMessage,
					success: false,
				};
			}
		},
		[],
	);

	const verifyCertificate = useCallback(
		async (
			verificationCode: string,
		): Promise<
			ApiResponse<{
				certificate: Certificate;
				isValid: boolean;
				message: string;
			}>
		> => {
			setState((prev) => ({ ...prev, verifying: true, error: null }));

			try {
				const response =
					await certificateService.verifyCertificate(verificationCode);
				setState((prev) => ({ ...prev, verifying: false }));
				return response;
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to verify certificate";
				setState((prev) => ({
					...prev,
					error: errorMessage,
					verifying: false,
				}));

				return {
					data: null,
					status: 500,
					message: errorMessage,
					success: false,
				};
			}
		},
		[],
	);

	const downloadCertificate = useCallback(
		async (
			certificateId: string,
			format: "pdf" | "png" = "pdf",
		): Promise<ApiResponse<{ downloadUrl: string }>> => {
			setState((prev) => ({ ...prev, error: null }));

			try {
				const response = await certificateService.downloadCertificate(
					certificateId,
					format,
				);

				if (response.success && response.data?.downloadUrl) {
					// Open download URL in new tab
					window.open(response.data.downloadUrl, "_blank");
				}

				return response;
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to download certificate";
				setState((prev) => ({ ...prev, error: errorMessage }));

				return {
					data: null,
					status: 500,
					message: errorMessage,
					success: false,
				};
			}
		},
		[],
	);

	const revokeCertificate = useCallback(
		async (
			certificateId: string,
			reason?: string,
		): Promise<ApiResponse<{ success: boolean; message: string }>> => {
			setState((prev) => ({ ...prev, error: null }));

			try {
				const response = await certificateService.revokeCertificate(
					certificateId,
					reason,
				);

				if (response.success) {
					// Refresh certificates list to reflect the revocation
					await refreshCertificates();
				}

				return response;
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to revoke certificate";
				setState((prev) => ({ ...prev, error: errorMessage }));

				return {
					data: null,
					status: 500,
					message: errorMessage,
					success: false,
				};
			}
		},
		[refreshCertificates],
	);

	const getCertificateAnalytics = useCallback(
		async (
			certificateId: string,
		): Promise<
			ApiResponse<{
				views: number;
				shares: number;
				downloads: number;
				verificationAttempts: number;
				lastViewed?: string;
			}>
		> => {
			setState((prev) => ({ ...prev, error: null }));

			try {
				const response =
					await certificateService.getCertificateAnalytics(certificateId);
				return response;
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Failed to fetch analytics";
				setState((prev) => ({ ...prev, error: errorMessage }));

				return {
					data: null,
					status: 500,
					message: errorMessage,
					success: false,
				};
			}
		},
		[],
	);

	const generatePreview = useCallback(
		async (
			template: string,
			customData: Record<string, any>,
		): Promise<ApiResponse<{ previewUrl: string }>> => {
			setState((prev) => ({ ...prev, error: null }));

			try {
				const response = await certificateService.generatePreview(
					template,
					customData,
				);
				return response;
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Failed to generate preview";
				setState((prev) => ({ ...prev, error: errorMessage }));

				return {
					data: null,
					status: 500,
					message: errorMessage,
					success: false,
				};
			}
		},
		[],
	);

	const getTemplates = useCallback(async (): Promise<
		ApiResponse<
			Array<{
				id: string;
				name: string;
				description: string;
				previewUrl: string;
				category: string;
				isPremium: boolean;
			}>
		>
	> => {
		setState((prev) => ({ ...prev, error: null }));

		try {
			const response = await certificateService.getTemplates();
			return response;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to fetch templates";
			setState((prev) => ({ ...prev, error: errorMessage }));

			return {
				data: null,
				status: 500,
				message: errorMessage,
				success: false,
			};
		}
	}, []);

	const clearError = useCallback(() => {
		setState((prev) => ({ ...prev, error: null }));
	}, []);

	return {
		...state,
		generateCertificate,
		shareBadge,
		verifyCertificate,
		downloadCertificate,
		revokeCertificate,
		getCertificateAnalytics,
		generatePreview,
		getTemplates,
		refreshCertificates,
		clearError,
	};
};
