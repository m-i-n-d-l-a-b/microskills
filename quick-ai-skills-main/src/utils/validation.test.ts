import { describe, it, expect, vi } from "vitest";
import {
	sanitizeInput,
	validateEmail,
	validatePassword,
	validateUsername,
	validateProjectSubmission,
	validateLessonProgress,
	validateUserPreferences,
	validateGraphQLVariables,
	validateFileUpload,
	validateForm,
	createValidationErrorMessage,
	validateApiRequest,
	type ValidationError,
	ValidationResult,
	SanitizeOptions,
} from "./validation";
import { VALIDATION_RULES } from "../lib/constants";

describe("Validation Utility", () => {
	describe("sanitizeInput", () => {
		it("should sanitize string input with default options", () => {
			const input = '  <script>alert("xss")</script>Hello World  ';
			const result = sanitizeInput(input);
			expect(result).toBe(
				"&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Hello World",
			);
		});

		it("should trim whitespace when trim is true", () => {
			const input = "  test  ";
			const result = sanitizeInput(input, { trim: true });
			expect(result).toBe("test");
		});

		it("should not trim whitespace when trim is false", () => {
			const input = "  test  ";
			const result = sanitizeInput(input, { trim: false });
			expect(result).toBe("  test  ");
		});

		it("should remove HTML tags when removeHtml is true", () => {
			const input = "<p>Hello <b>World</b></p>";
			const result = sanitizeInput(input, { removeHtml: true });
			expect(result).toBe("Hello World");
		});

		it("should allow specific HTML tags when specified", () => {
			const input = '<p>Hello <b>World</b> <script>alert("xss")</script></p>';
			const result = sanitizeInput(input, {
				removeHtml: true,
				allowedTags: ["p", "b"],
			});
			expect(result).toBe("<p>Hello <b>World</b> </p>");
		});

		it("should limit string length when maxLength is specified", () => {
			const input = "This is a very long string that should be truncated";
			const result = sanitizeInput(input, { maxLength: 20 });
			expect(result).toBe("This is a very long ");
		});

		it("should escape special characters", () => {
			const input = '<script>alert("Hello & World")</script>';
			const result = sanitizeInput(input);
			expect(result).toBe(
				"&lt;script&gt;alert(&quot;Hello &amp; World&quot;)&lt;/script&gt;",
			);
		});

		it("should handle null and undefined values", () => {
			expect(sanitizeInput(null)).toBe(null);
			expect(sanitizeInput(undefined)).toBe(undefined);
		});

		it("should sanitize arrays", () => {
			const input = ['<script>alert("xss")</script>', "  test  "];
			const result = sanitizeInput(input);
			expect(result).toEqual([
				"&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
				"test",
			]);
		});

		it("should sanitize objects", () => {
			const input = {
				name: "  John  ",
				email: '<script>alert("xss")</script>',
				age: 25,
			};
			const result = sanitizeInput(input);
			expect(result).toEqual({
				name: "John",
				email: "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
				age: 25,
			});
		});

		it("should handle non-string values", () => {
			expect(sanitizeInput(123)).toBe(123);
			expect(sanitizeInput(true)).toBe(true);
			expect(sanitizeInput(false)).toBe(false);
		});
	});

	describe("validateEmail", () => {
		it("should validate correct email addresses", () => {
			const validEmails = [
				"test@example.com",
				"user.name@domain.co.uk",
				"user+tag@example.org",
				"123@example.com",
			];

			validEmails.forEach((email) => {
				const result = validateEmail(email);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
				expect(result.sanitizedData).toBe(email.trim());
			});
		});

		it("should reject invalid email addresses", () => {
			const invalidEmails = [
				"",
				"invalid-email",
				"@example.com",
				"user@",
				"user..name@example.com",
				"user@.com",
			];

			invalidEmails.forEach((email) => {
				const result = validateEmail(email);
				expect(result.isValid).toBe(false);
				expect(result.errors).toHaveLength(1);
				expect(result.errors[0].field).toBe("email");
			});
		});

		it("should handle null and undefined", () => {
			const result = validateEmail("");
			expect(result.isValid).toBe(false);
			expect(result.errors[0].code).toBe("REQUIRED");
		});
	});

	describe("validatePassword", () => {
		it("should validate strong passwords", () => {
			const validPasswords = [
				"password123",
				"MySecurePass!",
				"ComplexP@ssw0rd",
				"a".repeat(VALIDATION_RULES.PASSWORD_MIN_LENGTH),
			];

			validPasswords.forEach((password) => {
				const result = validatePassword(password);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});
		});

		it("should reject weak passwords", () => {
			const weakPasswords = ["", "short", "12345678", "aaaaaaaa", "11111111"];

			weakPasswords.forEach((password) => {
				const result = validatePassword(password);
				expect(result.isValid).toBe(false);
				expect(result.errors.length).toBeGreaterThan(0);
			});
		});

		it("should handle null and undefined", () => {
			const result = validatePassword("");
			expect(result.isValid).toBe(false);
			expect(result.errors[0].code).toBe("REQUIRED");
		});
	});

	describe("validateUsername", () => {
		it("should validate correct usernames", () => {
			const validUsernames = [
				"john_doe",
				"user123",
				"test-user",
				"a".repeat(VALIDATION_RULES.USERNAME_MIN_LENGTH),
			];

			validUsernames.forEach((username) => {
				const result = validateUsername(username);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});
		});

		it("should reject invalid usernames", () => {
			const invalidUsernames = [
				"",
				"ab",
				"a".repeat(VALIDATION_RULES.USERNAME_MAX_LENGTH + 1),
				"user@name",
				"user name",
				"user.name",
			];

			invalidUsernames.forEach((username) => {
				const result = validateUsername(username);
				expect(result.isValid).toBe(false);
				expect(result.errors.length).toBeGreaterThan(0);
			});
		});
	});

	describe("validateProjectSubmission", () => {
		it("should validate correct project submission", () => {
			const validSubmission = {
				projectId: "proj-123",
				code: 'console.log("Hello World");',
				language: "javascript",
				files: [
					{
						name: "index.js",
						content: 'console.log("test");',
						type: "text/javascript",
					},
				],
				metadata: { version: "1.0.0" },
			};

			const result = validateProjectSubmission(validSubmission);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.sanitizedData).toBeDefined();
		});

		it("should reject invalid project submission", () => {
			const invalidSubmissions = [
				{ projectId: "", code: "test", language: "javascript" },
				{ projectId: "proj-123", code: "", language: "javascript" },
				{ projectId: "proj-123", code: "test", language: "" },
				{ projectId: "proj-123", code: "test", language: "invalid-lang" },
			];

			invalidSubmissions.forEach((submission) => {
				const result = validateProjectSubmission(submission);
				expect(result.isValid).toBe(false);
				expect(result.errors.length).toBeGreaterThan(0);
			});
		});

		it("should handle large code submissions", () => {
			const largeCode = "a".repeat(100001);
			const submission = {
				projectId: "proj-123",
				code: largeCode,
				language: "javascript",
			};

			const result = validateProjectSubmission(submission);
			expect(result.isValid).toBe(false);
			expect(result.errors.some((e) => e.field === "code")).toBe(true);
		});
	});

	describe("validateLessonProgress", () => {
		it("should validate correct lesson progress", () => {
			const validProgress = {
				lessonId: "lesson-123",
				progress: 75,
				completed: false,
				timeSpent: 300,
			};

			const result = validateLessonProgress(validProgress);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject invalid lesson progress", () => {
			const invalidProgresses = [
				{ lessonId: "", progress: 75, completed: false },
				{ lessonId: "lesson-123", progress: -1, completed: false },
				{ lessonId: "lesson-123", progress: 101, completed: false },
				{ lessonId: "lesson-123", progress: 75, completed: "not-boolean" },
				{
					lessonId: "lesson-123",
					progress: 75,
					completed: false,
					timeSpent: -1,
				},
			];

			invalidProgresses.forEach((progress) => {
				const result = validateLessonProgress(progress);
				expect(result.isValid).toBe(false);
				expect(result.errors.length).toBeGreaterThan(0);
			});
		});
	});

	describe("validateUserPreferences", () => {
		it("should validate correct user preferences", () => {
			const validPreferences = {
				theme: "dark",
				language: "en",
				emailNotifications: true,
				pushNotifications: false,
				learningReminders: true,
				difficulty: "intermediate",
				sessionLength: 45,
				learningGoals: ["JavaScript", "React"],
				preferredTopics: ["Web Development"],
			};

			const result = validateUserPreferences(validPreferences);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject invalid user preferences", () => {
			const invalidPreferences = [
				{ theme: "invalid-theme" },
				{ language: "invalid-lang" },
				{ difficulty: "invalid-difficulty" },
				{ sessionLength: -1 },
				{ emailNotifications: "not-boolean" },
			];

			invalidPreferences.forEach((preferences) => {
				const result = validateUserPreferences(preferences);
				expect(result.isValid).toBe(false);
				expect(result.errors.length).toBeGreaterThan(0);
			});
		});
	});

	describe("validateGraphQLVariables", () => {
		it("should validate correct GraphQL variables", () => {
			const validVariables = {
				id: "123",
				name: "test",
				count: 42,
				active: true,
				items: ["a", "b", "c"],
			};

			const result = validateGraphQLVariables(validVariables, {});
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject invalid GraphQL variables", () => {
			const invalidVariables = {
				longString: "a".repeat(10001),
				largeNumber: 1000000000,
				invalidNumber: -1000000000,
			};

			const result = validateGraphQLVariables(invalidVariables, {});
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe("validateFileUpload", () => {
		it("should validate correct file upload", () => {
			const mockFile = new File(["test content"], "test.js", {
				type: "text/javascript",
			});
			Object.defineProperty(mockFile, "size", { value: 1024 });

			const result = validateFileUpload(mockFile);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject invalid file uploads", () => {
			// Test file too large
			const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.txt", {
				type: "text/plain",
			});
			const largeResult = validateFileUpload(largeFile);
			expect(largeResult.isValid).toBe(false);

			// Test invalid file type
			const invalidTypeFile = new File(["test"], "test.exe", {
				type: "application/x-executable",
			});
			const invalidTypeResult = validateFileUpload(invalidTypeFile);
			expect(invalidTypeResult.isValid).toBe(false);
		});

		it("should handle null file", () => {
			const result = validateFileUpload(null as any);
			expect(result.isValid).toBe(false);
			expect(result.errors[0].code).toBe("REQUIRED");
		});
	});

	describe("validateForm", () => {
		it("should validate form with correct schema", () => {
			const schema = {
				name: { required: true, type: "string", minLength: 2, maxLength: 50 },
				email: {
					required: true,
					type: "string",
					pattern: VALIDATION_RULES.EMAIL,
				},
				age: { required: false, type: "number", min: 0, max: 120 },
			};

			const formData = {
				name: "John Doe",
				email: "john@example.com",
				age: 25,
			};

			const result = validateForm(formData, schema);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject form with invalid data", () => {
			const schema = {
				name: { required: true, type: "string", minLength: 2 },
				email: {
					required: true,
					type: "string",
					pattern: VALIDATION_RULES.EMAIL,
				},
				age: { required: true, type: "number", min: 0 },
			};

			const formData = {
				name: "J",
				email: "invalid-email",
				age: -1,
			};

			const result = validateForm(formData, schema);
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe("createValidationErrorMessage", () => {
		it("should create error message from validation errors", () => {
			const errors: ValidationError[] = [
				{
					field: "email",
					message: "Invalid email format",
					code: "INVALID_FORMAT",
				},
				{ field: "password", message: "Password too short", code: "TOO_SHORT" },
			];

			const message = createValidationErrorMessage(errors);
			expect(message).toBe("Invalid email format. Password too short");
		});

		it("should return empty string for no errors", () => {
			const message = createValidationErrorMessage([]);
			expect(message).toBe("");
		});
	});

	describe("validateApiRequest", () => {
		it("should validate login request", () => {
			const loginData = {
				email: "test@example.com",
				password: "password123",
			};

			const result = validateApiRequest(loginData, "/auth/login");
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject invalid login request", () => {
			const invalidLoginData = {
				email: "invalid-email",
				password: "short",
			};

			const result = validateApiRequest(invalidLoginData, "/auth/login");
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should handle unknown endpoints", () => {
			const data = { test: "value" };
			const result = validateApiRequest(data, "/unknown/endpoint");
			expect(result.isValid).toBe(true);
			expect(result.sanitizedData).toBeDefined();
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle deeply nested objects", () => {
			const nestedObject = {
				level1: {
					level2: {
						level3: {
							value: '<script>alert("xss")</script>',
						},
					},
				},
			};

			const result = sanitizeInput(nestedObject);
			expect(result.level1.level2.level3.value).toBe(
				"&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
			);
		});

		it("should handle circular references gracefully", () => {
			const circular: any = { name: "test" };
			circular.self = circular;

			// Should not throw an error
			expect(() => sanitizeInput(circular)).not.toThrow();
		});

		it("should handle very large strings", () => {
			const largeString = "a".repeat(1000000);
			const result = sanitizeInput(largeString, { maxLength: 1000 });
			expect(result.length).toBe(1000);
		});

		it("should handle special characters in usernames", () => {
			const specialUsername = "user@name.com";
			const result = validateUsername(specialUsername);
			expect(result.isValid).toBe(false);
			expect(result.errors.some((e) => e.code === "INVALID_CHARACTERS")).toBe(
				true,
			);
		});

		it("should handle empty arrays and objects", () => {
			expect(sanitizeInput([])).toEqual([]);
			expect(sanitizeInput({})).toEqual({});
		});

		it("should handle functions and symbols", () => {
			const func = () => "test";
			const symbol = Symbol("test");

			expect(sanitizeInput(func)).toBe(func);
			expect(sanitizeInput(symbol)).toBe(symbol);
		});
	});

	describe("Performance Tests", () => {
		it("should handle large datasets efficiently", () => {
			const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
				id: i,
				name: `User ${i}`,
				email: `user${i}@example.com`,
				data: "x".repeat(100),
			}));

			const startTime = performance.now();
			const result = sanitizeInput(largeDataset);
			const endTime = performance.now();

			expect(result).toHaveLength(1000);
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
		});

		it("should handle large strings efficiently", () => {
			const largeString = "x".repeat(100000);
			const startTime = performance.now();
			const result = sanitizeInput(largeString);
			const endTime = performance.now();

			expect(result).toBeDefined();
			expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
		});
	});
});
