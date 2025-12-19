import { describe, it, expect, beforeEach, vi } from "vitest";
import RubricService, { rubricService } from "./rubricService";
import type {
	Rubric,
	RubricCriteria,
	OverallGradingResult,
} from "./rubricService";

describe("RubricService", () => {
	let service: RubricService;

	beforeEach(() => {
		service = new RubricService();
	});

	describe("Initialization", () => {
		it("should initialize with default rubrics", () => {
			const rubrics = service.listRubrics();
			expect(rubrics.length).toBeGreaterThan(0);

			const jsRubric = rubrics.find((r) => r.language === "javascript");
			expect(jsRubric).toBeDefined();
			expect(jsRubric?.criteria.length).toBeGreaterThan(0);
		});

		it("should have valid default rubric structure", () => {
			const jsRubric = service.getRubricByLanguage("javascript");
			expect(jsRubric).toBeDefined();
			expect(jsRubric?.id).toBe("js-basic");
			expect(jsRubric?.criteria.length).toBe(3);
			expect(jsRubric?.passingScore).toBe(70);
		});
	});

	describe("Rubric Management", () => {
		it("should get rubric by ID", () => {
			const rubric = service.getRubric("js-basic");
			expect(rubric).toBeDefined();
			expect(rubric?.name).toBe("JavaScript Basic Project Rubric");
		});

		it("should get rubric by language and difficulty", () => {
			const rubric = service.getRubricByLanguage("javascript", "intermediate");
			expect(rubric).toBeDefined();
			expect(rubric?.language).toBe("javascript");
			expect(rubric?.difficulty).toBe("intermediate");
		});

		it("should create custom rubric", () => {
			const customRubric: Omit<Rubric, "id" | "createdAt" | "updatedAt"> = {
				name: "Custom Test Rubric",
				description: "Test rubric for unit testing",
				version: "1.0.0",
				criteria: [
					{
						id: "test-1",
						category: "functionality",
						name: "Test Functionality",
						description: "Test functionality criteria",
						weight: 100,
						maxScore: 100,
						requirements: ["Test requirement"],
					},
				],
				passingScore: 80,
				maxScore: 100,
				difficulty: "beginner",
				language: "test",
				tags: ["test"],
			};

			const created = service.createRubric(customRubric);
			expect(created.id).toMatch(/^custom_/);
			expect(created.name).toBe("Custom Test Rubric");
			expect(created.criteria.length).toBe(1);
		});

		it("should update existing rubric", () => {
			const rubric = service.getRubric("js-basic");
			expect(rubric).toBeDefined();

			const updated = service.updateRubric("js-basic", {
				name: "Updated JS Rubric",
			});
			expect(updated?.name).toBe("Updated JS Rubric");
		});

		it("should delete rubric", () => {
			const customRubric = service.createRubric({
				name: "Delete Test Rubric",
				description: "Test rubric for deletion",
				version: "1.0.0",
				criteria: [],
				passingScore: 70,
				maxScore: 100,
				difficulty: "beginner",
				language: "test",
				tags: ["test"],
			});

			const deleted = service.deleteRubric(customRubric.id);
			expect(deleted).toBe(true);

			const retrieved = service.getRubric(customRubric.id);
			expect(retrieved).toBeUndefined();
		});

		it("should search rubrics", () => {
			const results = service.searchRubrics("javascript");
			expect(results.length).toBeGreaterThan(0);
			expect(results.some((r) => r.language === "javascript")).toBe(true);
		});
	});

	describe("Grading", () => {
		it("should grade submission with basic rubric", async () => {
			const code = `
        function add(a, b) {
          return a + b;
        }
        
        console.log(add(2, 3));
      `;

			const result = await service.gradeSubmission(
				code,
				"javascript",
				"js-basic",
				["function", "return", "console.log"],
			);

			expect(result).toBeDefined();
			expect(result.rubricId).toBe("js-basic");
			expect(result.totalScore).toBeGreaterThan(0);
			expect(result.percentage).toBeGreaterThan(0);
			expect(result.passed).toBeDefined();
			expect(result.grade).toMatch(/^[A-F]$/);
			expect(result.criteriaResults.length).toBe(3);
		});

		it("should handle empty code", async () => {
			const result = await service.gradeSubmission(
				"",
				"javascript",
				"js-basic",
			);

			expect(result.totalScore).toBe(0);
			expect(result.passed).toBe(false);
			expect(result.grade).toBe("F");
		});

		it("should calculate correct scores for different code quality", async () => {
			const poorCode = "var x = 1; var y = 2; var z = x + y;";
			const goodCode = `
        // Add two numbers
        function addNumbers(a, b) {
          return a + b;
        }
        
        const result = addNumbers(1, 2);
        console.log(result);
      `;

			const poorResult = await service.gradeSubmission(
				poorCode,
				"javascript",
				"js-basic",
			);
			const goodResult = await service.gradeSubmission(
				goodCode,
				"javascript",
				"js-basic",
			);

			expect(goodResult.totalScore).toBeGreaterThan(poorResult.totalScore);
		});

		it("should provide detailed feedback", async () => {
			const code = `
        function test() {
          return "hello";
        }
      `;

			const result = await service.gradeSubmission(
				code,
				"javascript",
				"js-basic",
			);

			expect(result.strengths.length).toBeGreaterThan(0);
			expect(result.weaknesses.length).toBeGreaterThan(0);
			expect(result.suggestions.length).toBeGreaterThan(0);
			expect(result.complexity).toMatch(/^(beginner|intermediate|advanced)$/);
		});
	});

	describe("Validation", () => {
		it("should validate rubric structure", () => {
			const validRubric: Rubric = {
				id: "test",
				name: "Test Rubric",
				description: "Test",
				version: "1.0.0",
				criteria: [
					{
						id: "test-1",
						category: "functionality",
						name: "Test",
						description: "Test",
						weight: 100,
						maxScore: 100,
						requirements: ["test"],
					},
				],
				passingScore: 70,
				maxScore: 100,
				difficulty: "beginner",
				language: "test",
				tags: ["test"],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const validation = service.validateRubric(validRubric);
			expect(validation.isValid).toBe(true);
			expect(validation.errors.length).toBe(0);
		});

		it("should detect invalid rubric", () => {
			const invalidRubric: Rubric = {
				id: "test",
				name: "",
				description: "Test",
				version: "1.0.0",
				criteria: [],
				passingScore: 150, // Invalid
				maxScore: 100,
				difficulty: "beginner",
				language: "test",
				tags: ["test"],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const validation = service.validateRubric(invalidRubric);
			expect(validation.isValid).toBe(false);
			expect(validation.errors.length).toBeGreaterThan(0);
		});
	});

	describe("Export/Import", () => {
		it("should export rubric to JSON", () => {
			const rubric = service.getRubric("js-basic");
			expect(rubric).toBeDefined();

			const exported = service.exportRubric("js-basic");
			expect(exported).toBeDefined();
			expect(typeof exported).toBe("string");

			const parsed = JSON.parse(exported!);
			expect(parsed.id).toBe("js-basic");
		});

		it("should import rubric from JSON", () => {
			const rubric = service.getRubric("js-basic");
			expect(rubric).toBeDefined();

			const exported = service.exportRubric("js-basic");
			expect(exported).toBeDefined();

			const imported = service.importRubric(exported!);
			expect(imported).toBeDefined();
			expect(imported?.name).toBe(rubric?.name);
			expect(imported?.id).not.toBe("js-basic"); // Should have new ID
		});

		it("should handle invalid JSON import", () => {
			const result = service.importRubric("invalid json");
			expect(result).toBeNull();
		});
	});

	describe("Complexity Analysis", () => {
		it("should determine beginner complexity", async () => {
			const simpleCode = `
        function hello() {
          console.log("Hello");
        }
      `;

			const result = await service.gradeSubmission(
				simpleCode,
				"javascript",
				"js-basic",
			);
			expect(result.complexity).toBe("beginner");
		});

		it("should determine intermediate complexity", async () => {
			const mediumCode = `
        function processData(data) {
          const results = [];
          for (let i = 0; i < data.length; i++) {
            if (data[i] > 0) {
              results.push(data[i] * 2);
            }
          }
          return results;
        }
      `;

			const result = await service.gradeSubmission(
				mediumCode,
				"javascript",
				"js-basic",
			);
			expect(result.complexity).toBe("intermediate");
		});
	});

	describe("Error Handling", () => {
		it("should handle non-existent rubric", async () => {
			await expect(
				service.gradeSubmission("test", "javascript", "non-existent"),
			).rejects.toThrow("Rubric not found");
		});

		it("should handle invalid language", async () => {
			const result = await service.gradeSubmission(
				"test",
				"invalid",
				"js-basic",
			);
			expect(result).toBeDefined();
			expect(result.totalScore).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Singleton Instance", () => {
		it("should provide singleton instance", () => {
			expect(rubricService).toBeInstanceOf(RubricService);
			expect(rubricService.listRubrics().length).toBeGreaterThan(0);
		});
	});
});
