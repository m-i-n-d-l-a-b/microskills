import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CertificateService } from "./certificateService";
import { client } from "../lib/graphql";
import {
	type CertificateGenerationRequest,
	type BadgeShareRequest,
	Certificate,
} from "../types/api";

// Mock Apollo Client
vi.mock("../lib/graphql", () => ({
	client: {
		mutate: vi.fn(),
		query: vi.fn(),
	},
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

describe("CertificateService", () => {
	let certificateService: CertificateService;
	let mockClient: any;

	beforeEach(() => {
		certificateService = new CertificateService();
		mockClient = client as any;
		vi.clearAllMocks();
		localStorageMock.getItem.mockReturnValue("mock-token");
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("generateCertificate", () => {
		it("should generate certificate successfully", async () => {
			const mockRequest: CertificateGenerationRequest = {
				trackId: "track-123",
				template: "premium",
				customData: { customField: "value" },
			};

			const mockResponse = {
				data: {
					generateCertificate: {
						certificateId: "cert-123",
						downloadUrl: "https://example.com/download",
						shareUrl: "https://example.com/share",
						expiresAt: "2024-12-31T23:59:59Z",
						certificate: {
							id: "cert-123",
							userId: "user-123",
							title: "React Developer Certificate",
							description: "Advanced React Development",
							issuedAt: "2024-01-01T00:00:00Z",
							verificationCode: "ABC123",
							metadata: { score: 95 },
							template: "premium",
							status: "active",
						},
					},
				},
			};

			mockClient.mutate.mockResolvedValue(mockResponse);

			const result = await certificateService.generateCertificate(mockRequest);

			expect(result.success).toBe(true);
			expect(result.data.certificateId).toBe("cert-123");
			expect(result.data.downloadUrl).toBe("https://example.com/download");
			expect(mockClient.mutate).toHaveBeenCalledWith({
				mutation: expect.any(Object),
				variables: {
					input: {
						trackId: "track-123",
						template: "premium",
						customData: { customField: "value" },
					},
				},
			});
		});

		it("should handle generation failure", async () => {
			const mockRequest: CertificateGenerationRequest = {
				trackId: "track-123",
			};

			mockClient.mutate.mockRejectedValue(new Error("Generation failed"));

			const result = await certificateService.generateCertificate(mockRequest);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Generation failed");
			expect(result.status).toBe(500);
		});
	});

	describe("shareBadge", () => {
		it("should share badge successfully", async () => {
			const mockRequest: BadgeShareRequest = {
				certificateId: "cert-123",
				platform: "linkedin",
				customMessage: "Check out my achievement!",
			};

			const mockResponse = {
				data: {
					shareBadge: {
						success: true,
						shareUrl: "https://linkedin.com/share/123",
						message: "Badge shared successfully",
					},
				},
			};

			mockClient.mutate.mockResolvedValue(mockResponse);

			const result = await certificateService.shareBadge(mockRequest);

			expect(result.success).toBe(true);
			expect(result.data.success).toBe(true);
			expect(result.data.shareUrl).toBe("https://linkedin.com/share/123");
			expect(mockClient.mutate).toHaveBeenCalledWith({
				mutation: expect.any(Object),
				variables: {
					input: {
						certificateId: "cert-123",
						platform: "linkedin",
						customMessage: "Check out my achievement!",
					},
				},
			});
		});

		it("should handle sharing failure", async () => {
			const mockRequest: BadgeShareRequest = {
				certificateId: "cert-123",
				platform: "twitter",
			};

			mockClient.mutate.mockRejectedValue(new Error("Sharing failed"));

			const result = await certificateService.shareBadge(mockRequest);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Sharing failed");
		});
	});

	describe("verifyCertificate", () => {
		it("should verify certificate successfully", async () => {
			const verificationCode = "ABC123";

			const mockResponse = {
				data: {
					verifyCertificate: {
						certificate: {
							id: "cert-123",
							userId: "user-123",
							title: "React Developer Certificate",
							description: "Advanced React Development",
							issuedAt: "2024-01-01T00:00:00Z",
							verificationCode: "ABC123",
							metadata: { score: 95 },
							template: "basic",
							status: "active",
						},
						isValid: true,
						message: "Certificate is valid",
					},
				},
			};

			mockClient.query.mockResolvedValue(mockResponse);

			const result =
				await certificateService.verifyCertificate(verificationCode);

			expect(result.success).toBe(true);
			expect(result.data.isValid).toBe(true);
			expect(result.data.certificate.verificationCode).toBe("ABC123");
			expect(mockClient.query).toHaveBeenCalledWith({
				query: expect.any(Object),
				variables: { verificationCode: "ABC123" },
				fetchPolicy: "network-only",
			});
		});

		it("should handle invalid certificate", async () => {
			const verificationCode = "INVALID";

			const mockResponse = {
				data: {
					verifyCertificate: {
						certificate: null,
						isValid: false,
						message: "Certificate not found",
					},
				},
			};

			mockClient.query.mockResolvedValue(mockResponse);

			const result =
				await certificateService.verifyCertificate(verificationCode);

			expect(result.success).toBe(true);
			expect(result.data.isValid).toBe(false);
			expect(result.data.message).toBe("Certificate not found");
		});
	});

	describe("getUserCertificates", () => {
		it("should fetch user certificates successfully", async () => {
			const userId = "user-123";

			const mockResponse = {
				data: {
					userCertificates: [
						{
							id: "cert-1",
							userId: "user-123",
							title: "React Developer Certificate",
							description: "Advanced React Development",
							issuedAt: "2024-01-01T00:00:00Z",
							verificationCode: "ABC123",
							metadata: { score: 95 },
							template: "basic",
							status: "active",
						},
						{
							id: "cert-2",
							userId: "user-123",
							title: "Node.js Developer Certificate",
							description: "Backend Development",
							issuedAt: "2024-01-15T00:00:00Z",
							verificationCode: "DEF456",
							metadata: { score: 88 },
							template: "premium",
							status: "active",
						},
					],
				},
			};

			mockClient.query.mockResolvedValue(mockResponse);

			const result = await certificateService.getUserCertificates(userId);

			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(2);
			expect(result.data[0].title).toBe("React Developer Certificate");
			expect(result.data[1].title).toBe("Node.js Developer Certificate");
			expect(mockClient.query).toHaveBeenCalledWith({
				query: expect.any(Object),
				variables: { userId: "user-123" },
				fetchPolicy: "cache-and-network",
			});
		});
	});

	describe("downloadCertificate", () => {
		it("should download certificate successfully", async () => {
			const certificateId = "cert-123";
			const format = "pdf";

			const mockFetchResponse = {
				ok: true,
				status: 200,
				json: vi
					.fn()
					.mockResolvedValue({ downloadUrl: "https://example.com/cert.pdf" }),
			};

			(global.fetch as any).mockResolvedValue(mockFetchResponse);

			const result = await certificateService.downloadCertificate(
				certificateId,
				format,
			);

			expect(result.success).toBe(true);
			expect(result.data.downloadUrl).toBe("https://example.com/cert.pdf");
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/certificates/cert-123/download?format=pdf"),
				expect.objectContaining({
					method: "GET",
					headers: expect.objectContaining({
						Authorization: "Bearer mock-token",
					}),
				}),
			);
		});

		it("should handle download failure", async () => {
			const certificateId = "cert-123";

			const mockFetchResponse = {
				ok: false,
				status: 404,
				statusText: "Certificate not found",
			};

			(global.fetch as any).mockResolvedValue(mockFetchResponse);

			const result =
				await certificateService.downloadCertificate(certificateId);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Download failed: Certificate not found");
		});
	});

	describe("revokeCertificate", () => {
		it("should revoke certificate successfully", async () => {
			const certificateId = "cert-123";
			const reason = "Violation of terms";

			const mockFetchResponse = {
				ok: true,
				status: 200,
				json: vi
					.fn()
					.mockResolvedValue({ message: "Certificate revoked successfully" }),
			};

			(global.fetch as any).mockResolvedValue(mockFetchResponse);

			const result = await certificateService.revokeCertificate(
				certificateId,
				reason,
			);

			expect(result.success).toBe(true);
			expect(result.data.success).toBe(true);
			expect(result.data.message).toBe("Certificate revoked successfully");
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/certificates/cert-123/revoke"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ reason: "Violation of terms" }),
				}),
			);
		});
	});

	describe("getCertificateAnalytics", () => {
		it("should fetch certificate analytics successfully", async () => {
			const certificateId = "cert-123";

			const mockAnalytics = {
				views: 150,
				shares: 25,
				downloads: 10,
				verificationAttempts: 5,
				lastViewed: "2024-01-20T10:30:00Z",
			};

			const mockFetchResponse = {
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue(mockAnalytics),
			};

			(global.fetch as any).mockResolvedValue(mockFetchResponse);

			const result =
				await certificateService.getCertificateAnalytics(certificateId);

			expect(result.success).toBe(true);
			expect(result.data.views).toBe(150);
			expect(result.data.shares).toBe(25);
			expect(result.data.downloads).toBe(10);
		});
	});

	describe("generatePreview", () => {
		it("should generate certificate preview successfully", async () => {
			const template = "premium";
			const customData = { name: "John Doe", course: "React Development" };

			const mockFetchResponse = {
				ok: true,
				status: 200,
				json: vi
					.fn()
					.mockResolvedValue({ previewUrl: "https://example.com/preview.png" }),
			};

			(global.fetch as any).mockResolvedValue(mockFetchResponse);

			const result = await certificateService.generatePreview(
				template,
				customData,
			);

			expect(result.success).toBe(true);
			expect(result.data.previewUrl).toBe("https://example.com/preview.png");
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/certificates/preview"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ template, customData }),
				}),
			);
		});
	});

	describe("getTemplates", () => {
		it("should fetch certificate templates successfully", async () => {
			const mockTemplates = [
				{
					id: "basic",
					name: "Basic Template",
					description: "Simple and clean design",
					previewUrl: "https://example.com/basic.png",
					category: "standard",
					isPremium: false,
				},
				{
					id: "premium",
					name: "Premium Template",
					description: "Elegant and professional design",
					previewUrl: "https://example.com/premium.png",
					category: "premium",
					isPremium: true,
				},
			];

			const mockFetchResponse = {
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ templates: mockTemplates }),
			};

			(global.fetch as any).mockResolvedValue(mockFetchResponse);

			const result = await certificateService.getTemplates();

			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(2);
			expect(result.data[0].name).toBe("Basic Template");
			expect(result.data[1].name).toBe("Premium Template");
			expect(result.data[1].isPremium).toBe(true);
		});
	});

	describe("error handling", () => {
		it("should handle network errors gracefully", async () => {
			const mockRequest: CertificateGenerationRequest = {
				trackId: "track-123",
			};

			mockClient.mutate.mockRejectedValue({
				message: "Network error",
				status: 503,
				code: "NETWORK_ERROR",
			});

			const result = await certificateService.generateCertificate(mockRequest);

			expect(result.success).toBe(false);
			expect(result.status).toBe(503);
			expect(result.message).toBe("Network error");
		});

		it("should handle missing auth token", async () => {
			localStorageMock.getItem.mockReturnValue(null);

			const mockRequest: CertificateGenerationRequest = {
				trackId: "track-123",
			};

			mockClient.mutate.mockRejectedValue(new Error("Unauthorized"));

			const result = await certificateService.generateCertificate(mockRequest);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Unauthorized");
		});
	});
});
