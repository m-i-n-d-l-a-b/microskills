import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadgeShareModal } from "./BadgeShareModal";
import { useCertificates } from "@/hooks/useCertificates";
import { useToast } from "@/hooks/use-toast";

// Mock the hooks
vi.mock("@/hooks/useCertificates");
vi.mock("@/hooks/use-toast");

const mockUseCertificates = vi.mocked(useCertificates);
const mockUseToast = vi.mocked(useToast);

// Mock clipboard API
Object.assign(navigator, {
	clipboard: {
		writeText: vi.fn(),
	},
});

// Mock window.open
Object.assign(window, {
	open: vi.fn(),
});

const mockCertificate = {
	id: "cert-123",
	title: "AI Fundamentals",
	trackId: "track-1",
	trackName: "AI Basics",
	issuedAt: new Date("2024-01-15"),
	level: "gold" as const,
	shareLink: "https://example.com/cert/cert-123",
	badgeImageUrl: "https://example.com/badge.png",
};

const mockShareBadge = vi.fn();
const mockToast = vi.fn();

describe("BadgeShareModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockUseCertificates.mockReturnValue({
			shareBadge: mockShareBadge,
			sharing: false,
			error: null,
			certificates: [],
			loading: false,
			generating: false,
			verifying: false,
			generateCertificate: vi.fn(),
			verifyCertificate: vi.fn(),
			downloadCertificate: vi.fn(),
			revokeCertificate: vi.fn(),
			getCertificateAnalytics: vi.fn(),
			generatePreview: vi.fn(),
			getTemplates: vi.fn(),
			refreshCertificates: vi.fn(),
			clearError: vi.fn(),
		});

		mockUseToast.mockReturnValue({
			toast: mockToast,
		});
	});

	it("renders the modal trigger button", () => {
		render(<BadgeShareModal certificate={mockCertificate} />);

		expect(screen.getByText("Share Badge")).toBeInTheDocument();
	});

	it("opens modal when trigger is clicked", async () => {
		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			expect(screen.getByText("Share Your Achievement")).toBeInTheDocument();
		});
	});

	it("displays certificate information correctly", async () => {
		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			expect(screen.getByText("AI Fundamentals")).toBeInTheDocument();
			expect(screen.getByText("AI Basics")).toBeInTheDocument();
			expect(screen.getByText("GOLD Level")).toBeInTheDocument();
			// Use a more flexible date matcher
			expect(screen.getByText(/Issued on/)).toBeInTheDocument();
		});
	});

	it("copies link to clipboard when copy button is clicked", async () => {
		const mockWriteText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: {
				writeText: mockWriteText,
			},
		});

		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			const copyButton = screen.getByLabelText("Copy certificate link");
			fireEvent.click(copyButton);
		});

		expect(mockWriteText).toHaveBeenCalledWith(
			"https://example.com/cert/cert-123",
		);
		expect(mockToast).toHaveBeenCalledWith({
			title: "Link copied!",
			description: "Certificate link copied to clipboard",
		});
	});

	it("handles LinkedIn share correctly", async () => {
		mockShareBadge.mockResolvedValue(undefined);
		const mockOpen = vi.fn();
		Object.assign(window, { open: mockOpen });

		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			const linkedinButton = screen.getByText("LinkedIn");
			fireEvent.click(linkedinButton);
		});

		expect(mockShareBadge).toHaveBeenCalledWith({
			certificateId: "cert-123",
			platform: "linkedin",
			message: "I just earned the AI Fundamentals certificate in AI Basics! 🎉",
			shareLink: "https://example.com/cert/cert-123",
		});

		expect(mockOpen).toHaveBeenCalledWith(
			"https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fcert%2Fcert-123",
			"_blank",
			"width=600,height=400",
		);

		expect(mockToast).toHaveBeenCalledWith({
			title: "Shared on LinkedIn!",
			description: "Your achievement has been shared successfully",
		});
	});

	it("handles Notion share correctly", async () => {
		mockShareBadge.mockResolvedValue(undefined);
		const mockWriteText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: {
				writeText: mockWriteText,
			},
		});

		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			const notionButton = screen.getByText("Notion");
			fireEvent.click(notionButton);
		});

		expect(mockShareBadge).toHaveBeenCalledWith({
			certificateId: "cert-123",
			platform: "notion",
			message: expect.stringContaining("🏆 **AI Fundamentals**"),
			shareLink: "https://example.com/cert/cert-123",
		});

		expect(mockWriteText).toHaveBeenCalledWith(
			expect.stringContaining("🏆 **AI Fundamentals**"),
		);

		expect(mockToast).toHaveBeenCalledWith({
			title: "Notion template copied!",
			description: "Paste this into your Notion page",
		});
	});

	it("handles download certificate correctly", async () => {
		const mockOpen = vi.fn();
		Object.assign(window, { open: mockOpen });

		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			const downloadButton = screen.getByText("Download Certificate");
			fireEvent.click(downloadButton);
		});

		expect(mockOpen).toHaveBeenCalledWith(
			"https://example.com/cert/cert-123",
			"_blank",
		);
		expect(mockToast).toHaveBeenCalledWith({
			title: "Certificate opened!",
			description: "Your certificate has been opened in a new tab",
		});
	});

	it("displays error when share fails", async () => {
		mockShareBadge.mockRejectedValue(new Error("Share failed"));
		const mockOpen = vi.fn();
		Object.assign(window, { open: mockOpen });

		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			const linkedinButton = screen.getByText("LinkedIn");
			fireEvent.click(linkedinButton);
		});

		expect(mockToast).toHaveBeenCalledWith({
			title: "Share failed",
			description: "Unable to share on LinkedIn. Please try again.",
			variant: "destructive",
		});
	});

	it("displays sharing state correctly", async () => {
		mockUseCertificates.mockReturnValue({
			shareBadge: mockShareBadge,
			sharing: true,
			error: null,
			certificates: [],
			loading: false,
			generating: false,
			verifying: false,
			generateCertificate: vi.fn(),
			verifyCertificate: vi.fn(),
			downloadCertificate: vi.fn(),
			revokeCertificate: vi.fn(),
			getCertificateAnalytics: vi.fn(),
			generatePreview: vi.fn(),
			getTemplates: vi.fn(),
			refreshCertificates: vi.fn(),
			clearError: vi.fn(),
		});

		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			// Check that there are multiple "Sharing..." elements (LinkedIn and Notion buttons)
			const sharingElements = screen.getAllByText("Sharing...");
			expect(sharingElements).toHaveLength(2);

			// Check that both buttons are disabled by finding them by their container
			const buttons = screen.getAllByRole("button");
			const linkedinButton = buttons.find(
				(button) =>
					button.textContent?.includes("Sharing...") &&
					button.className.includes("bg-[#0077B5]"),
			);
			const notionButton = buttons.find(
				(button) =>
					button.textContent?.includes("Sharing...") &&
					button.className.includes("border-gray-300"),
			);

			expect(linkedinButton).toBeDisabled();
			expect(notionButton).toBeDisabled();
		});
	});

	it("displays error message when error exists", async () => {
		mockUseCertificates.mockReturnValue({
			shareBadge: mockShareBadge,
			sharing: false,
			error: "Failed to share badge",
			certificates: [],
			loading: false,
			generating: false,
			verifying: false,
			generateCertificate: vi.fn(),
			verifyCertificate: vi.fn(),
			downloadCertificate: vi.fn(),
			revokeCertificate: vi.fn(),
			getCertificateAnalytics: vi.fn(),
			generatePreview: vi.fn(),
			getTemplates: vi.fn(),
			refreshCertificates: vi.fn(),
			clearError: vi.fn(),
		});

		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			expect(screen.getByText("Failed to share badge")).toBeInTheDocument();
		});
	});

	it("handles clipboard write failure gracefully", async () => {
		const mockWriteText = vi
			.fn()
			.mockRejectedValue(new Error("Clipboard write failed"));
		Object.assign(navigator, {
			clipboard: {
				writeText: mockWriteText,
			},
		});

		render(<BadgeShareModal certificate={mockCertificate} />);

		const trigger = screen.getByText("Share Badge");
		fireEvent.click(trigger);

		await waitFor(() => {
			const copyButton = screen.getByLabelText("Copy certificate link");
			fireEvent.click(copyButton);
		});

		expect(mockToast).toHaveBeenCalledWith({
			title: "Copy failed",
			description: "Please copy the link manually",
			variant: "destructive",
		});
	});

	it("renders with custom trigger", () => {
		const customTrigger = <button type="button">Custom Share Button</button>;
		render(
			<BadgeShareModal certificate={mockCertificate} trigger={customTrigger} />,
		);

		expect(screen.getByText("Custom Share Button")).toBeInTheDocument();
		expect(screen.queryByText("Share Badge")).not.toBeInTheDocument();
	});
});
