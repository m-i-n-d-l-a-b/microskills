import { client } from "../lib/graphql";
import { gql } from "@apollo/client";
import type {
	Certificate,
	CertificateGenerationRequest,
	CertificateGenerationResponse,
	BadgeShareRequest,
	BadgeShareResponse,
	ApiResponse,
	ApiError,
} from "../types/api";
import { ENV, ERROR_MESSAGES } from "../lib/constants";

// GraphQL Mutations
const GENERATE_CERTIFICATE = gql`
  mutation GenerateCertificate($input: CertificateGenerationInput!) {
    generateCertificate(input: $input) {
      certificateId
      downloadUrl
      shareUrl
      expiresAt
      certificate {
        id
        userId
        title
        description
        issuedAt
        expiresAt
        verificationCode
        metadata
        template
        status
      }
    }
  }
`;

const SHARE_BADGE = gql`
  mutation ShareBadge($input: BadgeShareInput!) {
    shareBadge(input: $input) {
      success
      shareUrl
      message
    }
  }
`;

const VERIFY_CERTIFICATE = gql`
  query VerifyCertificate($verificationCode: String!) {
    verifyCertificate(verificationCode: $verificationCode) {
      certificate {
        id
        userId
        title
        description
        issuedAt
        expiresAt
        verificationCode
        metadata
        template
        status
      }
      isValid
      message
    }
  }
`;

const GET_USER_CERTIFICATES = gql`
  query GetUserCertificates($userId: String!) {
    userCertificates(userId: $userId) {
      id
      userId
      title
      description
      issuedAt
      expiresAt
      verificationCode
      metadata
      template
      status
    }
  }
`;

export class CertificateService {
	private readonly baseUrl: string;

	constructor() {
		this.baseUrl = ENV.API_BASE_URL;
	}

	/**
	 * Generate a certificate for a completed track
	 */
	async generateCertificate(
		request: CertificateGenerationRequest,
	): Promise<ApiResponse<CertificateGenerationResponse>> {
		try {
			const { data } = await client.mutate({
				mutation: GENERATE_CERTIFICATE,
				variables: {
					input: {
						trackId: request.trackId,
						template: request.template || "basic",
						customData: request.customData || {},
					},
				},
			});

			if (data?.generateCertificate) {
				return {
					data: data.generateCertificate,
					status: 200,
					success: true,
				};
			}

			throw new Error("Failed to generate certificate");
		} catch (error) {
			console.error("Certificate generation error:", error);
			return this.handleError(error);
		}
	}

	/**
	 * Share a badge on social media platforms
	 */
	async shareBadge(
		request: BadgeShareRequest,
	): Promise<ApiResponse<BadgeShareResponse>> {
		try {
			const { data } = await client.mutate({
				mutation: SHARE_BADGE,
				variables: {
					input: {
						certificateId: request.certificateId,
						platform: request.platform,
						customMessage: request.customMessage,
					},
				},
			});

			if (data?.shareBadge) {
				return {
					data: data.shareBadge,
					status: 200,
					success: true,
				};
			}

			throw new Error("Failed to share badge");
		} catch (error) {
			console.error("Badge sharing error:", error);
			return this.handleError(error);
		}
	}

	/**
	 * Verify a certificate using its verification code
	 */
	async verifyCertificate(
		verificationCode: string,
	): Promise<
		ApiResponse<{ certificate: Certificate; isValid: boolean; message: string }>
	> {
		try {
			const { data } = await client.query({
				query: VERIFY_CERTIFICATE,
				variables: { verificationCode },
				fetchPolicy: "network-only",
			});

			if (data?.verifyCertificate) {
				return {
					data: data.verifyCertificate,
					status: 200,
					success: true,
				};
			}

			throw new Error("Failed to verify certificate");
		} catch (error) {
			console.error("Certificate verification error:", error);
			return this.handleError(error);
		}
	}

	/**
	 * Get all certificates for a user
	 */
	async getUserCertificates(
		userId: string,
	): Promise<ApiResponse<Certificate[]>> {
		try {
			const { data } = await client.query({
				query: GET_USER_CERTIFICATES,
				variables: { userId },
				fetchPolicy: "cache-and-network",
			});

			if (data?.userCertificates) {
				return {
					data: data.userCertificates,
					status: 200,
					success: true,
				};
			}

			throw new Error("Failed to fetch user certificates");
		} catch (error) {
			console.error("Get user certificates error:", error);
			return this.handleError(error);
		}
	}

	/**
	 * Download certificate as PDF
	 */
	async downloadCertificate(
		certificateId: string,
		format: "pdf" | "png" = "pdf",
	): Promise<ApiResponse<{ downloadUrl: string }>> {
		try {
			const response = await fetch(
				`${this.baseUrl}/certificates/${certificateId}/download?format=${format}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${this.getAuthToken()}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				throw new Error(`Download failed: ${response.statusText}`);
			}

			const data = await response.json();
			return {
				data: { downloadUrl: data.downloadUrl },
				status: response.status,
				success: true,
			};
		} catch (error) {
			console.error("Certificate download error:", error);
			return this.handleError(error);
		}
	}

	/**
	 * Revoke a certificate (admin only)
	 */
	async revokeCertificate(
		certificateId: string,
		reason?: string,
	): Promise<ApiResponse<{ success: boolean; message: string }>> {
		try {
			const response = await fetch(
				`${this.baseUrl}/certificates/${certificateId}/revoke`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.getAuthToken()}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ reason }),
				},
			);

			if (!response.ok) {
				throw new Error(`Revocation failed: ${response.statusText}`);
			}

			const data = await response.json();
			return {
				data: { success: true, message: data.message },
				status: response.status,
				success: true,
			};
		} catch (error) {
			console.error("Certificate revocation error:", error);
			return this.handleError(error);
		}
	}

	/**
	 * Get certificate analytics
	 */
	async getCertificateAnalytics(certificateId: string): Promise<
		ApiResponse<{
			views: number;
			shares: number;
			downloads: number;
			verificationAttempts: number;
			lastViewed?: string;
		}>
	> {
		try {
			const response = await fetch(
				`${this.baseUrl}/certificates/${certificateId}/analytics`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${this.getAuthToken()}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				throw new Error(`Analytics fetch failed: ${response.statusText}`);
			}

			const data = await response.json();
			return {
				data,
				status: response.status,
				success: true,
			};
		} catch (error) {
			console.error("Certificate analytics error:", error);
			return this.handleError(error);
		}
	}

	/**
	 * Generate certificate preview
	 */
	async generatePreview(
		template: string,
		customData: Record<string, any>,
	): Promise<ApiResponse<{ previewUrl: string }>> {
		try {
			const response = await fetch(`${this.baseUrl}/certificates/preview`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.getAuthToken()}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ template, customData }),
			});

			if (!response.ok) {
				throw new Error(`Preview generation failed: ${response.statusText}`);
			}

			const data = await response.json();
			return {
				data: { previewUrl: data.previewUrl },
				status: response.status,
				success: true,
			};
		} catch (error) {
			console.error("Certificate preview error:", error);
			return this.handleError(error);
		}
	}

	/**
	 * Get available certificate templates
	 */
	async getTemplates(): Promise<
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
	> {
		try {
			const response = await fetch(`${this.baseUrl}/certificates/templates`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.getAuthToken()}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`Templates fetch failed: ${response.statusText}`);
			}

			const data = await response.json();
			return {
				data: data.templates,
				status: response.status,
				success: true,
			};
		} catch (error) {
			console.error("Certificate templates error:", error);
			return this.handleError(error);
		}
	}

	private getAuthToken(): string {
		return localStorage.getItem("auth_token") || "";
	}

	private handleError(error: any): ApiResponse<any> {
		const apiError: ApiError = {
			message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
			status: error.status || 500,
			code: error.code || "UNKNOWN_ERROR",
			details: error.details,
		};

		return {
			data: null,
			status: apiError.status,
			message: apiError.message,
			success: false,
		};
	}
}

// Export singleton instance
export const certificateService = new CertificateService();
