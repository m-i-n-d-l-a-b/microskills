describe("Lesson Flow", () => {
	beforeEach(() => {
		cy.clearLocalStorage();
		cy.visit("/");
		cy.completeOnboarding();
	});

	it("should start and complete a lesson successfully", () => {
		// Mock lesson data
		cy.mockGraphQL("getDailyLesson", {
			data: {
				getDailyLesson: {
					id: "lesson-1",
					title: "Test Lesson",
					content: "This is a test lesson content",
					difficulty: "beginner",
					estimatedTime: 5,
				},
			},
		});

		// Start lesson
		cy.startLesson();

		// Verify lesson screen is displayed
		cy.get('[data-testid="lesson-chat-screen"]').should("be.visible");
		cy.get('[data-testid="lesson-title"]').should(
			"contain.text",
			"Test Lesson",
		);

		// Submit quiz answer
		cy.submitQuizAnswer("This is my answer to the quiz question");

		// Verify feedback is displayed
		cy.get('[data-testid="quiz-feedback"]').should("be.visible");
		cy.get('[data-testid="quiz-score"]').should("be.visible");

		// Complete lesson
		cy.get('[data-testid="complete-lesson"]').click();

		// Verify return to dashboard
		cy.get('[data-testid="main-dashboard"]').should("be.visible");

		// Verify progress is updated
		cy.get('[data-testid="progress-bar"]').should("contain.text", "20%");
	});

	it("should handle lesson navigation", () => {
		cy.startLesson();

		// Test back button
		cy.get('[data-testid="back-button"]').click();
		cy.get('[data-testid="main-dashboard"]').should("be.visible");

		// Start lesson again
		cy.startLesson();

		// Test lesson info toggle
		cy.get('[data-testid="lesson-info-toggle"]').click();
		cy.get('[data-testid="lesson-info-panel"]').should("be.visible");

		// Close lesson info
		cy.get('[data-testid="lesson-info-toggle"]').click();
		cy.get('[data-testid="lesson-info-panel"]').should("not.be.visible");
	});

	it("should handle quick actions", () => {
		cy.startLesson();

		// Test hint action
		cy.get('[data-testid="hint-button"]').click();
		cy.get('[data-testid="hint-content"]').should("be.visible");

		// Test explain action
		cy.get('[data-testid="explain-button"]').click();
		cy.get('[data-testid="explain-content"]').should("be.visible");

		// Test example action
		cy.get('[data-testid="example-button"]').click();
		cy.get('[data-testid="example-content"]').should("be.visible");
	});

	it("should handle lesson errors gracefully", () => {
		// Mock lesson error
		cy.mockGraphQL("getDailyLesson", {
			errors: [{ message: "Lesson not found" }],
		});

		cy.startLesson();

		// Check for error message
		cy.get('[data-testid="error-message"]').should("be.visible");
		cy.get('[data-testid="error-message"]').should(
			"contain.text",
			"Failed to load lesson",
		);

		// Test retry functionality
		cy.get('[data-testid="retry-button"]').click();
		cy.get('[data-testid="error-message"]').should("not.exist");
	});

	it("should track lesson analytics", () => {
		cy.startLesson();

		// Mock analytics tracking
		cy.window().then((win) => {
			cy.spy(win, "postMessage").as("postMessage");
		});

		// Submit quiz answer
		cy.submitQuizAnswer("Test answer");

		// Verify analytics events
		cy.get("@postMessage").should("have.been.calledWith", {
			type: "analytics",
			event: "lesson_started",
			properties: {
				lessonId: "lesson-1",
				source: "dashboard",
			},
		});

		cy.get("@postMessage").should("have.been.calledWith", {
			type: "analytics",
			event: "quiz_submitted",
			properties: {
				lessonId: "lesson-1",
				answerLength: 11,
			},
		});
	});

	it("should handle slow network conditions", () => {
		cy.simulateSlowNetwork(2000);

		cy.startLesson();

		// Check for loading state
		cy.get('[data-testid="loading-spinner"]').should("be.visible");
		cy.wait(2000);
		cy.get('[data-testid="loading-spinner"]').should("not.exist");
	});

	it("should be accessible", () => {
		cy.startLesson();

		cy.checkA11yViolations();
		cy.testKeyboardNavigation();
		cy.testScreenReader();
	});

	it("should be responsive", () => {
		cy.startLesson();

		// Test mobile viewport
		cy.setMobileViewport();
		cy.get('[data-testid="lesson-chat-screen"]').should("be.visible");
		cy.get('[data-testid="quiz-textarea"]').should("be.visible");

		// Test tablet viewport
		cy.setTabletViewport();
		cy.get('[data-testid="lesson-chat-screen"]').should("be.visible");

		// Test desktop viewport
		cy.setDesktopViewport();
		cy.get('[data-testid="lesson-chat-screen"]').should("be.visible");
	});

	it("should handle lesson timeouts", () => {
		// Mock slow lesson loading
		cy.intercept("POST", "/api/graphql", (req) => {
			req.alias("lessonRequest");
			req.reply({ delay: 15000 }); // 15 second delay
		});

		cy.startLesson();

		// Check for timeout message
		cy.get('[data-testid="timeout-message"]').should("be.visible");
		cy.get('[data-testid="timeout-message"]').should(
			"contain.text",
			"Lesson is taking longer than expected",
		);
	});

	it("should handle lesson interruptions", () => {
		cy.startLesson();

		// Simulate page visibility change
		cy.window().then((win) => {
			Object.defineProperty(win.document, "hidden", {
				value: true,
				writable: true,
			});
			win.document.dispatchEvent(new Event("visibilitychange"));
		});

		// Check for interruption message
		cy.get('[data-testid="interruption-message"]').should("be.visible");
		cy.get('[data-testid="interruption-message"]').should(
			"contain.text",
			"Lesson paused",
		);
	});

	it("should handle lesson resumption", () => {
		cy.startLesson();

		// Submit partial answer
		cy.get('[data-testid="quiz-textarea"]').type("Partial answer");

		// Navigate away
		cy.get('[data-testid="back-button"]').click();

		// Return to lesson
		cy.startLesson();

		// Verify partial answer is preserved
		cy.get('[data-testid="quiz-textarea"]').should(
			"have.value",
			"Partial answer",
		);
	});

	it("should handle lesson completion with achievements", () => {
		cy.startLesson();

		// Mock achievement unlock
		cy.mockAPI("POST", "/api/achievements/unlock", {
			statusCode: 200,
			body: {
				achievement: {
					id: "first-lesson",
					title: "First Lesson Complete",
					description: "You completed your first lesson!",
				},
			},
		});

		// Complete lesson
		cy.submitQuizAnswer("Final answer");
		cy.get('[data-testid="complete-lesson"]').click();

		// Check for achievement notification
		cy.get('[data-testid="achievement-toast"]').should("be.visible");
		cy.get('[data-testid="achievement-toast"]').should(
			"contain.text",
			"First Lesson Complete",
		);
	});

	it("should handle lesson progress tracking", () => {
		cy.startLesson();

		// Check initial progress
		cy.get('[data-testid="lesson-progress"]').should(
			"contain.text",
			"Step 1 of 5",
		);

		// Submit answer to advance
		cy.submitQuizAnswer("Answer for step 1");

		// Check updated progress
		cy.get('[data-testid="lesson-progress"]').should(
			"contain.text",
			"Step 2 of 5",
		);

		// Complete all steps
		for (let i = 2; i <= 5; i++) {
			cy.submitQuizAnswer(`Answer for step ${i}`);
		}

		// Check completion
		cy.get('[data-testid="lesson-progress"]').should(
			"contain.text",
			"Step 5 of 5",
		);
		cy.get('[data-testid="lesson-complete"]').should("be.visible");
	});

	it("should handle lesson sharing", () => {
		cy.startLesson();

		// Open share menu
		cy.get('[data-testid="share-button"]').click();
		cy.get('[data-testid="share-menu"]').should("be.visible");

		// Test social media sharing
		cy.get('[data-testid="share-twitter"]').click();
		cy.get('[data-testid="share-linkedin"]').click();

		// Verify share URLs are generated
		cy.window().then((win) => {
			expect(win.open).to.have.been.called;
		});
	});

	it("should handle lesson feedback", () => {
		cy.startLesson();

		// Complete lesson
		cy.submitQuizAnswer("Test answer");
		cy.get('[data-testid="complete-lesson"]').click();

		// Submit feedback
		cy.get('[data-testid="feedback-rating"]').click();
		cy.get('[data-testid="feedback-comment"]').type("Great lesson!");
		cy.get('[data-testid="submit-feedback"]').click();

		// Verify feedback submitted
		cy.get('[data-testid="feedback-success"]').should("be.visible");
		cy.get('[data-testid="feedback-success"]').should(
			"contain.text",
			"Thank you for your feedback",
		);
	});
});
