describe("Onboarding Flow", () => {
	beforeEach(() => {
		cy.clearLocalStorage();
		cy.visit("/");
	});

	it("should complete onboarding successfully", () => {
		// Check that onboarding wizard is displayed
		cy.get('[data-testid="onboarding-wizard"]').should("be.visible");

		// Select role
		cy.get('[data-testid="role-selector"]').click();
		cy.get('[data-testid="role-developer"]').click();

		// Set time commitment
		cy.get('[data-testid="time-commit-slider"]')
			.invoke("val", 15)
			.trigger("change");

		// Select tone
		cy.get('[data-testid="tone-selector"]').click();
		cy.get('[data-testid="tone-professional"]').click();

		// Select difficulty
		cy.get('[data-testid="difficulty-selector"]').click();
		cy.get('[data-testid="difficulty-intermediate"]').click();

		// Complete onboarding
		cy.get('[data-testid="complete-onboarding"]').click();

		// Verify redirect to main dashboard
		cy.url().should("eq", `${Cypress.config().baseUrl}/`);
		cy.get('[data-testid="main-dashboard"]').should("be.visible");

		// Verify user preferences are saved
		cy.getLocalStorage("user-preferences").then((prefs) => {
			const preferences = JSON.parse(prefs || "{}");
			expect(preferences.role).to.equal("Developer");
			expect(preferences.timeCommit).to.equal(15);
			expect(preferences.tone).to.equal("Professional");
			expect(preferences.difficulty).to.equal("Intermediate");
		});
	});

	it("should validate required fields", () => {
		// Try to complete without selecting options
		cy.get('[data-testid="complete-onboarding"]').click();

		// Check for validation errors
		cy.get('[data-testid="validation-error"]').should("be.visible");
		cy.get('[data-testid="validation-error"]').should(
			"contain.text",
			"Please select a role",
		);
	});

	it("should handle onboarding cancellation", () => {
		// Start onboarding
		cy.get('[data-testid="role-selector"]').click();
		cy.get('[data-testid="role-developer"]').click();

		// Cancel onboarding
		cy.get('[data-testid="cancel-onboarding"]').click();

		// Verify confirmation dialog
		cy.get('[data-testid="confirmation-dialog"]').should("be.visible");
		cy.get('[data-testid="confirm-cancel"]').click();

		// Verify return to onboarding
		cy.get('[data-testid="onboarding-wizard"]').should("be.visible");
	});

	it("should be accessible", () => {
		cy.checkA11yViolations();

		// Test keyboard navigation
		cy.testKeyboardNavigation();

		// Test screen reader compatibility
		cy.testScreenReader();
	});

	it("should be responsive", () => {
		// Test mobile viewport
		cy.setMobileViewport();
		cy.get('[data-testid="onboarding-wizard"]').should("be.visible");
		cy.get('[data-testid="role-selector"]').should("be.visible");

		// Test tablet viewport
		cy.setTabletViewport();
		cy.get('[data-testid="onboarding-wizard"]').should("be.visible");

		// Test desktop viewport
		cy.setDesktopViewport();
		cy.get('[data-testid="onboarding-wizard"]').should("be.visible");
	});

	it("should handle network errors gracefully", () => {
		// Mock network error
		cy.mockAPI("POST", "/api/onboarding/complete", { statusCode: 500 });

		// Complete onboarding
		cy.completeOnboarding();

		// Check for error message
		cy.get('[data-testid="error-message"]').should("be.visible");
		cy.get('[data-testid="error-message"]').should(
			"contain.text",
			"Failed to save preferences",
		);

		// Check retry functionality
		cy.get('[data-testid="retry-button"]').click();
		cy.get('[data-testid="error-message"]').should("not.exist");
	});

	it("should track analytics events", () => {
		// Mock analytics tracking
		cy.window().then((win) => {
			cy.spy(win, "postMessage").as("postMessage");
		});

		// Complete onboarding
		cy.completeOnboarding();

		// Verify analytics events
		cy.get("@postMessage").should("have.been.calledWith", {
			type: "analytics",
			event: "onboarding_completed",
			properties: {
				role: "Developer",
				timeCommit: 15,
				tone: "Professional",
				difficulty: "Intermediate",
			},
		});
	});

	it("should handle slow network conditions", () => {
		// Simulate slow network
		cy.simulateSlowNetwork(3000);

		// Complete onboarding
		cy.completeOnboarding();

		// Check for loading state
		cy.get('[data-testid="loading-spinner"]').should("be.visible");
		cy.wait(3000);
		cy.get('[data-testid="loading-spinner"]').should("not.exist");
	});

	it("should handle offline mode", () => {
		// Simulate offline mode
		cy.simulateOffline();

		// Complete onboarding
		cy.completeOnboarding();

		// Check for offline message
		cy.get('[data-testid="offline-message"]').should("be.visible");
		cy.get('[data-testid="offline-message"]').should(
			"contain.text",
			"You are currently offline",
		);
	});

	it("should persist partial progress", () => {
		// Start onboarding
		cy.get('[data-testid="role-selector"]').click();
		cy.get('[data-testid="role-developer"]').click();

		// Refresh page
		cy.reload();

		// Verify role is still selected
		cy.get('[data-testid="role-developer"]').should("have.class", "selected");
	});

	it("should handle browser back/forward navigation", () => {
		// Start onboarding
		cy.get('[data-testid="role-selector"]').click();
		cy.get('[data-testid="role-developer"]').click();

		// Go back
		cy.go("back");

		// Verify onboarding is still visible
		cy.get('[data-testid="onboarding-wizard"]').should("be.visible");

		// Go forward
		cy.go("forward");

		// Verify role is still selected
		cy.get('[data-testid="role-developer"]').should("have.class", "selected");
	});
});
