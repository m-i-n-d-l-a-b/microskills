import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCertificates } from "./useCertificates";
import { certificateService } from "../services/certificateService";
import { useAuth } from "./useAuth";

// Mock the certificate service
vi.mock("../services/certificateService", () => ({
	certificateService: {
		getUserCertificates: vi.fn(),
		generateCertificate: vi.fn(),
		shareBadge: vi.fn(),
		verifyCertificate: vi.fn(),
		downloadCertificate: vi.fn(),
		revokeCertificate: vi.fn(),
		getCertificateAnalytics: vi.fn(),
		generatePreview: vi.fn(),
		getTemplates: vi.fn(),
	},
}));

// Mock the auth hook
vi.mock("./useAuth", () => ({
	useAuth: vi.fn(),
}));

// Mock window.open
const mockOpen = vi.fn();
Object.defineProperty(window, "open", {
	value: mockOpen,
	writable: true,
});

describe("useCertificates", () => {
	const mockUser = {
		id: "user-123",
		email: "test@example.com",
		username: "testuser",
	};

	const mockCertificates = [
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
	];

	beforeEach(() => {
		vi.clearAllMocks();
		(useAuth as any).mockReturnValue({ user: mockUser });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("initialization", () => {
		it("should load certificates on mount", async () => {
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			expect(result.current.loading).toBe(true);

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.certificates).toEqual(mockCertificates);
			expect(certificateService.getUserCertificates).toHaveBeenCalledWith(
				"user-123",
			);
		});

		it("should handle loading error", async () => {
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: false,
				message: "Failed to load certificates",
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.error).toBe("Failed to load certificates");
			expect(result.current.certificates).toEqual([]);
		});

		it("should not load certificates if no user", () => {
			(useAuth as any).mockReturnValue({ user: null });

			renderHook(() => useCertificates());

			expect(certificateService.getUserCertificates).not.toHaveBeenCalled();
		});
	});

	describe("generateCertificate", () => {
		it("should generate certificate successfully", async () => {
			const mockRequest = {
				trackId: "track-123",
				template: "premium",
			};

			const mockResponse = {
				success: true,
				data: {
					certificateId: "cert-123",
					downloadUrl: "https://example.com/download",
					shareUrl: "https://example.com/share",
				},
			};

			(certificateService.generateCertificate as any).mockResolvedValue(
				mockResponse,
			);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.generateCertificate(mockRequest);
			});

			expect(response.success).toBe(true);
			await waitFor(() => {
				expect(result.current.generating).toBe(false);
			});
			expect(certificateService.generateCertificate).toHaveBeenCalledWith(
				mockRequest,
			);
		});

		it("should handle generation error", async () => {
			const mockRequest = {
				trackId: "track-123",
			};

			(certificateService.generateCertificate as any).mockRejectedValue(
				new Error("Generation failed"),
			);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.generateCertificate(mockRequest);
			});

			expect(response.success).toBe(false);
			expect(response.message).toBe("Generation failed");

			await waitFor(() => {
				expect(result.current.error).toBe("Generation failed");
				expect(result.current.generating).toBe(false);
			});
		});
	});

	describe("shareBadge", () => {
		it("should share badge successfully", async () => {
			const mockRequest = {
				certificateId: "cert-123",
				platform: "linkedin",
				customMessage: "Check out my achievement!",
			};

			const mockResponse = {
				success: true,
				data: {
					success: true,
					shareUrl: "https://linkedin.com/share/123",
					message: "Badge shared successfully",
				},
			};

			(certificateService.shareBadge as any).mockResolvedValue(mockResponse);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.shareBadge(mockRequest);
			});

			expect(response.success).toBe(true);
			await waitFor(() => {
				expect(result.current.sharing).toBe(false);
			});
			expect(certificateService.shareBadge).toHaveBeenCalledWith(mockRequest);
		});

		it("should handle sharing error", async () => {
			const mockRequest = {
				certificateId: "cert-123",
				platform: "twitter",
			};

			(certificateService.shareBadge as any).mockRejectedValue(
				new Error("Sharing failed"),
			);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.shareBadge(mockRequest);
			});

			expect(response.success).toBe(false);
			expect(response.message).toBe("Sharing failed");

			await waitFor(() => {
				expect(result.current.error).toBe("Sharing failed");
				expect(result.current.sharing).toBe(false);
			});
		});
	});

	describe("verifyCertificate", () => {
		it("should verify certificate successfully", async () => {
			const verificationCode = "ABC123";

			const mockResponse = {
				success: true,
				data: {
					certificate: mockCertificates[0],
					isValid: true,
					message: "Certificate is valid",
				},
			};

			(certificateService.verifyCertificate as any).mockResolvedValue(
				mockResponse,
			);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.verifyCertificate(verificationCode);
			});

			expect(response.success).toBe(true);
			expect(response.data.isValid).toBe(true);
			await waitFor(() => {
				expect(result.current.verifying).toBe(false);
			});
			expect(certificateService.verifyCertificate).toHaveBeenCalledWith(
				verificationCode,
			);
		});
	});

	describe("downloadCertificate", () => {
		it("should download certificate and open in new tab", async () => {
			const certificateId = "cert-123";
			const format = "pdf";

			const mockResponse = {
				success: true,
				data: {
					downloadUrl: "https://example.com/cert.pdf",
				},
			};

			(certificateService.downloadCertificate as any).mockResolvedValue(
				mockResponse,
			);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.downloadCertificate(certificateId, format);
			});

			expect(response.success).toBe(true);
			expect(mockOpen).toHaveBeenCalledWith(
				"https://example.com/cert.pdf",
				"_blank",
			);
			expect(certificateService.downloadCertificate).toHaveBeenCalledWith(
				certificateId,
				format,
			);
		});

		it("should handle download error", async () => {
			const certificateId = "cert-123";

			(certificateService.downloadCertificate as any).mockRejectedValue(
				new Error("Download failed"),
			);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.downloadCertificate(certificateId);
			});

			expect(response.success).toBe(false);
			expect(response.message).toBe("Download failed");

			await waitFor(() => {
				expect(result.current.error).toBe("Download failed");
			});
		});
	});

	describe("revokeCertificate", () => {
		it("should revoke certificate and refresh list", async () => {
			const certificateId = "cert-123";
			const reason = "Violation of terms";

			const mockResponse = {
				success: true,
				data: {
					success: true,
					message: "Certificate revoked successfully",
				},
			};

			(certificateService.revokeCertificate as any).mockResolvedValue(
				mockResponse,
			);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.revokeCertificate(certificateId, reason);
			});

			expect(response.success).toBe(true);
			expect(certificateService.revokeCertificate).toHaveBeenCalledWith(
				certificateId,
				reason,
			);
			// Should refresh certificates after revocation
			expect(certificateService.getUserCertificates).toHaveBeenCalledTimes(2);
		});
	});

	describe("getCertificateAnalytics", () => {
		it("should fetch certificate analytics", async () => {
			const certificateId = "cert-123";

			const mockAnalytics = {
				views: 150,
				shares: 25,
				downloads: 10,
				verificationAttempts: 5,
				lastViewed: "2024-01-20T10:30:00Z",
			};

			const mockResponse = {
				success: true,
				data: mockAnalytics,
			};

			(certificateService.getCertificateAnalytics as any).mockResolvedValue(
				mockResponse,
			);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.getCertificateAnalytics(certificateId);
			});

			expect(response.success).toBe(true);
			expect(response.data.views).toBe(150);
			expect(response.data.shares).toBe(25);
			expect(certificateService.getCertificateAnalytics).toHaveBeenCalledWith(
				certificateId,
			);
		});
	});

	describe("generatePreview", () => {
		it("should generate certificate preview", async () => {
			const template = "premium";
			const customData = { name: "John Doe", course: "React Development" };

			const mockResponse = {
				success: true,
				data: {
					previewUrl: "https://example.com/preview.png",
				},
			};

			(certificateService.generatePreview as any).mockResolvedValue(
				mockResponse,
			);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.generatePreview(template, customData);
			});

			expect(response.success).toBe(true);
			expect(response.data.previewUrl).toBe("https://example.com/preview.png");
			expect(certificateService.generatePreview).toHaveBeenCalledWith(
				template,
				customData,
			);
		});
	});

	describe("getTemplates", () => {
		it("should fetch certificate templates", async () => {
			const mockTemplates = [
				{
					id: "basic",
					name: "Basic Template",
					description: "Simple and clean design",
					previewUrl: "https://example.com/basic.png",
					category: "standard",
					isPremium: false,
				},
			];

			const mockResponse = {
				success: true,
				data: mockTemplates,
			};

			(certificateService.getTemplates as any).mockResolvedValue(mockResponse);
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const response = await act(async () => {
				return await result.current.getTemplates();
			});

			expect(response.success).toBe(true);
			expect(response.data).toEqual(mockTemplates);
			expect(certificateService.getTemplates).toHaveBeenCalled();
		});
	});

	describe("refreshCertificates", () => {
		it("should refresh certificates list", async () => {
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Clear certificates and refresh
			await act(async () => {
				await result.current.refreshCertificates();
			});

			await waitFor(() => {
				expect(result.current.certificates).toEqual(mockCertificates);
			});
			expect(certificateService.getUserCertificates).toHaveBeenCalledTimes(2);
		});
	});

	describe("clearError", () => {
		it("should clear error state", async () => {
			(certificateService.getUserCertificates as any).mockResolvedValue({
				success: true,
				data: mockCertificates,
			});

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Set an error and clear it
			await act(async () => {
				result.current.clearError();
			});

			await waitFor(() => {
				expect(result.current.error).toBeNull();
			});
		});
	});

	describe("error handling", () => {
		it("should handle service errors gracefully", async () => {
			(certificateService.getUserCertificates as any).mockRejectedValue(
				new Error("Network error"),
			);

			const { result } = renderHook(() => useCertificates());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.error).toBe("Network error");
			expect(result.current.certificates).toEqual([]);
		});

		it("should handle missing user gracefully", () => {
			(useAuth as any).mockReturnValue({ user: null });

			renderHook(() => useCertificates());

			expect(certificateService.getUserCertificates).not.toHaveBeenCalled();
		});
	});
});
