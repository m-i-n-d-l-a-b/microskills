import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useLocalStorage } from "./useLocalStorage";

describe("useLocalStorage", () => {
	const mockLocalStorage = {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		length: 0,
		key: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(window, "localStorage", {
			value: mockLocalStorage,
			writable: true,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Basic Functionality", () => {
		it("returns initial value when localStorage is empty", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			expect(result.current[0]).toBe("default-value");
			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("test-key");
		});

		it("returns stored value when localStorage has data", () => {
			const storedValue = JSON.stringify("stored-value");
			mockLocalStorage.getItem.mockReturnValue(storedValue);

			const { result } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			expect(result.current[0]).toBe("stored-value");
			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("test-key");
		});

		it("returns parsed object when localStorage has object data", () => {
			const storedObject = { name: "John", age: 30 };
			const storedValue = JSON.stringify(storedObject);
			mockLocalStorage.getItem.mockReturnValue(storedValue);

			const { result } = renderHook(() => useLocalStorage("test-key", {}));

			expect(result.current[0]).toEqual(storedObject);
		});

		it("returns parsed array when localStorage has array data", () => {
			const storedArray = [1, 2, 3, 4, 5];
			const storedValue = JSON.stringify(storedArray);
			mockLocalStorage.getItem.mockReturnValue(storedValue);

			const { result } = renderHook(() => useLocalStorage("test-key", []));

			expect(result.current[0]).toEqual(storedArray);
		});
	});

	describe("Setting Values", () => {
		it("updates localStorage when value is set", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			act(() => {
				result.current[1]("new-value");
			});

			expect(result.current[0]).toBe("new-value");
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify("new-value"),
			);
		});

		it("updates localStorage with object when object is set", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() => useLocalStorage("test-key", {}));

			const newObject = { name: "Jane", age: 25 };
			act(() => {
				result.current[1](newObject);
			});

			expect(result.current[0]).toEqual(newObject);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify(newObject),
			);
		});

		it("updates localStorage with array when array is set", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() => useLocalStorage("test-key", []));

			const newArray = ["a", "b", "c"];
			act(() => {
				result.current[1](newArray);
			});

			expect(result.current[0]).toEqual(newArray);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify(newArray),
			);
		});

		it("updates localStorage with number when number is set", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() => useLocalStorage("test-key", 0));

			act(() => {
				result.current[1](42);
			});

			expect(result.current[0]).toBe(42);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify(42),
			);
		});

		it("updates localStorage with boolean when boolean is set", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() => useLocalStorage("test-key", false));

			act(() => {
				result.current[1](true);
			});

			expect(result.current[0]).toBe(true);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify(true),
			);
		});
	});

	describe("Error Handling", () => {
		it("handles JSON parse errors gracefully", () => {
			mockLocalStorage.getItem.mockReturnValue("invalid-json");

			const { result } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			expect(result.current[0]).toBe("default-value");
		});

		it("handles localStorage getItem errors", () => {
			mockLocalStorage.getItem.mockImplementation(() => {
				throw new Error("localStorage error");
			});

			const { result } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			expect(result.current[0]).toBe("default-value");
		});

		it("handles localStorage setItem errors", () => {
			mockLocalStorage.getItem.mockReturnValue(null);
			mockLocalStorage.setItem.mockImplementation(() => {
				throw new Error("localStorage error");
			});

			const { result } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			act(() => {
				result.current[1]("new-value");
			});

			// Should still update the state even if localStorage fails
			expect(result.current[0]).toBe("new-value");
		});

		it("handles null values from localStorage", () => {
			mockLocalStorage.getItem.mockReturnValue("null");

			const { result } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			expect(result.current[0]).toBe(null);
		});

		it("handles undefined values from localStorage", () => {
			mockLocalStorage.getItem.mockReturnValue("undefined");

			const { result } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			expect(result.current[0]).toBe(undefined);
		});
	});

	describe("Function Values", () => {
		it("handles function values correctly", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() =>
				useLocalStorage("test-key", () => "function-result"),
			);

			expect(result.current[0]).toBe("function-result");
		});

		it("calls function initializer only once", () => {
			mockLocalStorage.getItem.mockReturnValue(null);
			const initializer = vi.fn(() => "function-result");

			renderHook(() => useLocalStorage("test-key", initializer));

			expect(initializer).toHaveBeenCalledTimes(1);
		});

		it("does not call function initializer when value exists in localStorage", () => {
			mockLocalStorage.getItem.mockReturnValue(JSON.stringify("stored-value"));
			const initializer = vi.fn(() => "function-result");

			renderHook(() => useLocalStorage("test-key", initializer));

			expect(initializer).not.toHaveBeenCalled();
		});
	});

	describe("Multiple Instances", () => {
		it("handles multiple hooks with different keys", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result: result1 } = renderHook(() =>
				useLocalStorage("key1", "value1"),
			);
			const { result: result2 } = renderHook(() =>
				useLocalStorage("key2", "value2"),
			);

			expect(result1.current[0]).toBe("value1");
			expect(result2.current[0]).toBe("value2");
			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("key1");
			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("key2");
		});

		it("handles multiple hooks with same key", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result: result1 } = renderHook(() =>
				useLocalStorage("same-key", "value1"),
			);
			const { result: result2 } = renderHook(() =>
				useLocalStorage("same-key", "value2"),
			);

			expect(result1.current[0]).toBe("value1");
			expect(result2.current[0]).toBe("value2");
		});
	});

	describe("Edge Cases", () => {
		it("handles empty string values", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() => useLocalStorage("test-key", ""));

			act(() => {
				result.current[1]("");
			});

			expect(result.current[0]).toBe("");
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify(""),
			);
		});

		it("handles zero values", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() => useLocalStorage("test-key", 0));

			act(() => {
				result.current[1](0);
			});

			expect(result.current[0]).toBe(0);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify(0),
			);
		});

		it("handles false values", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() => useLocalStorage("test-key", false));

			act(() => {
				result.current[1](false);
			});

			expect(result.current[0]).toBe(false);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify(false),
			);
		});

		it("handles null values", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() => useLocalStorage("test-key", null));

			act(() => {
				result.current[1](null);
			});

			expect(result.current[0]).toBe(null);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify(null),
			);
		});

		it("handles undefined values", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() =>
				useLocalStorage("test-key", undefined),
			);

			act(() => {
				result.current[1](undefined);
			});

			expect(result.current[0]).toBe(undefined);
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"test-key",
				JSON.stringify(undefined),
			);
		});
	});

	describe("Performance", () => {
		it("does not call localStorage.getItem on every render", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { rerender } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			// Initial call
			expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(1);

			// Rerender without changing anything
			rerender();
			expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(1);
		});

		it("only calls localStorage.setItem when value actually changes", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const { result } = renderHook(() =>
				useLocalStorage("test-key", "default-value"),
			);

			// Set same value
			act(() => {
				result.current[1]("default-value");
			});

			expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
		});
	});

	describe("Type Safety", () => {
		it("maintains type safety for different value types", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			// String type
			const { result: stringResult } = renderHook(() =>
				useLocalStorage("string-key", "default"),
			);
			expect(typeof stringResult.current[0]).toBe("string");

			// Number type
			const { result: numberResult } = renderHook(() =>
				useLocalStorage("number-key", 0),
			);
			expect(typeof numberResult.current[0]).toBe("number");

			// Boolean type
			const { result: booleanResult } = renderHook(() =>
				useLocalStorage("boolean-key", false),
			);
			expect(typeof booleanResult.current[0]).toBe("boolean");

			// Object type
			const { result: objectResult } = renderHook(() =>
				useLocalStorage("object-key", {}),
			);
			expect(typeof objectResult.current[0]).toBe("object");

			// Array type
			const { result: arrayResult } = renderHook(() =>
				useLocalStorage("array-key", []),
			);
			expect(Array.isArray(arrayResult.current[0])).toBe(true);
		});
	});
});
