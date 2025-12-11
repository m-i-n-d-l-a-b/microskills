import { renderHook, waitFor, act } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSpacedRepetition } from "./useSpacedRepetition";
import {
	GET_SPACED_REPETITION_ITEMS,
	GET_DUE_REVIEWS,
	UPDATE_SPACED_REPETITION,
	CREATE_SPACED_REPETITION_ITEM,
} from "@/lib/graphql";
import { useAuth } from "./useAuth";

// Mock the useAuth hook
vi.mock("./useAuth");
const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

// Mock the error handling utility
vi.mock("@/utils/errorHandling", () => ({
	handleError: vi.fn(),
}));

describe("useSpacedRepetition", () => {
	const mockUser = {
		id: "user-1",
		email: "test@example.com",
		username: "testuser",
	};

	const mockSpacedRepetitionItems = [
		{
			id: "item-1",
			userId: "user-1",
			lessonId: "lesson-1",
			interval: 7,
			repetitions: 3,
			easeFactor: 2.5,
			nextReview: "2024-01-08T00:00:00Z",
			lastReview: "2024-01-01T00:00:00Z",
			createdAt: "2023-12-25T00:00:00Z",
		},
		{
			id: "item-2",
			userId: "user-1",
			lessonId: "lesson-2",
			interval: 14,
			repetitions: 5,
			easeFactor: 2.8,
			nextReview: "2024-01-15T00:00:00Z",
			lastReview: "2024-01-01T00:00:00Z",
			createdAt: "2023-12-20T00:00:00Z",
		},
	];

	const mockDueReviews = [
		{
			id: "item-1",
			lessonId: "lesson-1",
			interval: 7,
			repetitions: 3,
			easeFactor: 2.5,
			nextReview: "2024-01-01T00:00:00Z",
			lastReview: "2023-12-25T00:00:00Z",
			priority: 10,
			daysOverdue: 3,
		},
		{
			id: "item-2",
			lessonId: "lesson-2",
			interval: 14,
			repetitions: 5,
			easeFactor: 2.8,
			nextReview: "2024-01-03T00:00:00Z",
			lastReview: "2023-12-20T00:00:00Z",
			priority: 8,
			daysOverdue: 1,
		},
	];

	const mocks = [
		{
			request: {
				query: GET_SPACED_REPETITION_ITEMS,
			},
			result: {
				data: {
					spacedRepetitionItems: mockSpacedRepetitionItems,
				},
			},
		},
		{
			request: {
				query: GET_DUE_REVIEWS,
			},
			result: {
				data: {
					dueReviews: mockDueReviews,
				},
			},
		},
	];

	beforeEach(() => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: true,
			user: mockUser,
			login: jest.fn(),
			logout: jest.fn(),
			register: jest.fn(),
			isLoading: false,
			error: null,
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should initialize with empty state when not authenticated", () => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: false,
			user: null,
			login: jest.fn(),
			logout: jest.fn(),
			register: jest.fn(),
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={mocks} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		expect(result.current.items).toEqual([]);
		expect(result.current.dueReviews).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(result.current.isUpdating).toBe(false);
	});

	it("should load spaced repetition items when authenticated", async () => {
		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={mocks} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.items).toEqual(mockSpacedRepetitionItems);
		expect(result.current.dueReviews).toEqual(mockDueReviews);
	});

	it("should handle loading state correctly", () => {
		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={[]} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		expect(result.current.isLoading).toBe(true);
	});

	it("should get next review for a specific lesson", async () => {
		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={mocks} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const nextReview = result.current.getNextReview("lesson-1");
		expect(nextReview).toEqual(mockSpacedRepetitionItems[0]);

		const nonExistentReview = result.current.getNextReview("lesson-999");
		expect(nonExistentReview).toBeNull();
	});

	it("should get due cards", async () => {
		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={mocks} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const dueCards = result.current.getDueCards();
		expect(dueCards).toEqual(mockDueReviews);
	});

	it("should get recommended lessons sorted by priority", async () => {
		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={mocks} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const recommendedLessons = result.current.getRecommendedLessons();

		// Should be sorted by priority (higher first), then by days overdue, then by ease factor
		expect(recommendedLessons[0].priority).toBe(10); // lesson-1
		expect(recommendedLessons[1].priority).toBe(8); // lesson-2
	});

	it("should update existing spaced repetition item", async () => {
		const updateMock = {
			request: {
				query: UPDATE_SPACED_REPETITION,
				variables: {
					input: {
						lessonId: "lesson-1",
						quality: 4,
					},
				},
			},
			result: {
				data: {
					updateSpacedRepetition: {
						itemId: "item-1",
						nextReview: "2024-01-09T00:00:00Z",
						interval: 8,
						repetitions: 4,
						easeFactor: 2.6,
						success: true,
					},
				},
			},
		};

		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={[...mocks, updateMock]} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.updateSpacedRepetition({
				lessonId: "lesson-1",
				quality: 4,
			});
		});

		expect(result.current.isUpdating).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("should create new spaced repetition item", async () => {
		const createMock = {
			request: {
				query: CREATE_SPACED_REPETITION_ITEM,
				variables: {
					input: {
						lessonId: "lesson-3",
						initialQuality: 5,
					},
				},
			},
			result: {
				data: {
					createSpacedRepetitionItem: {
						id: "item-3",
						lessonId: "lesson-3",
						interval: 1,
						repetitions: 1,
						easeFactor: 2.5,
						nextReview: "2024-01-02T00:00:00Z",
						success: true,
					},
				},
			},
		};

		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={[...mocks, createMock]} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.updateSpacedRepetition({
				lessonId: "lesson-3",
				quality: 5,
			});
		});

		expect(result.current.isUpdating).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("should handle update error", async () => {
		const errorMock = {
			request: {
				query: UPDATE_SPACED_REPETITION,
				variables: {
					input: {
						lessonId: "lesson-1",
						quality: 4,
					},
				},
			},
			error: new Error("Update failed"),
		};

		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={[...mocks, errorMock]} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.updateSpacedRepetition({
				lessonId: "lesson-1",
				quality: 4,
			});
		});

		expect(result.current.isUpdating).toBe(false);
		expect(result.current.error).toBe("Update failed");
	});

	it("should handle authentication error when updating", async () => {
		mockUseAuth.mockReturnValue({
			isAuthenticated: false,
			user: null,
			login: jest.fn(),
			logout: jest.fn(),
			register: jest.fn(),
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={mocks} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await act(async () => {
			await result.current.updateSpacedRepetition({
				lessonId: "lesson-1",
				quality: 4,
			});
		});

		expect(result.current.error).toBe(
			"User must be authenticated to update spaced repetition.",
		);
	});

	it("should refresh items successfully", async () => {
		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={mocks} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		await act(async () => {
			await result.current.refreshItems();
		});

		expect(result.current.error).toBeNull();
	});

	it("should handle refresh error", async () => {
		const errorMocks = [
			{
				request: {
					query: GET_SPACED_REPETITION_ITEMS,
				},
				error: new Error("Network error"),
			},
			{
				request: {
					query: GET_DUE_REVIEWS,
				},
				error: new Error("Network error"),
			},
		];

		const { result } = renderHook(() => useSpacedRepetition(), {
			wrapper: ({ children }) => (
				<MockedProvider mocks={errorMocks} addTypename={false}>
					{children}
				</MockedProvider>
			),
		});

		await act(async () => {
			await result.current.refreshItems();
		});

		expect(result.current.error).toBe("Network error");
	});
});
