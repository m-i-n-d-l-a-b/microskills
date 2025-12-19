// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands for common operations
Cypress.Commands.add("login", (email: string, password: string) => {
	cy.visit("/");
	cy.get('[data-testid="login-email"]').type(email);
	cy.get('[data-testid="login-password"]').type(password);
	cy.get('[data-testid="login-button"]').click();
	cy.url().should("not.include", "/login");
});

Cypress.Commands.add("completeOnboarding", () => {
	cy.get('[data-testid="role-selector"]').click();
	cy.get('[data-testid="role-developer"]').click();
	cy.get('[data-testid="time-commit-slider"]')
		.invoke("val", 15)
		.trigger("change");
	cy.get('[data-testid="tone-selector"]').click();
	cy.get('[data-testid="tone-professional"]').click();
	cy.get('[data-testid="difficulty-selector"]').click();
	cy.get('[data-testid="difficulty-intermediate"]').click();
	cy.get('[data-testid="complete-onboarding"]').click();
});

Cypress.Commands.add("startLesson", () => {
	cy.get('[data-testid="start-lesson-button"]').click();
	cy.get('[data-testid="lesson-chat-screen"]').should("be.visible");
});

Cypress.Commands.add("submitQuizAnswer", (answer: string) => {
	cy.get('[data-testid="quiz-textarea"]').type(answer);
	cy.get('[data-testid="submit-quiz-button"]').click();
});

Cypress.Commands.add("navigateToLeaderboard", () => {
	cy.get('[data-testid="leaderboard-button"]').click();
	cy.get('[data-testid="leaderboard"]').should("be.visible");
});

Cypress.Commands.add("navigateToSettings", () => {
	cy.get('[data-testid="settings-button"]').click();
	cy.get('[data-testid="settings-page"]').should("be.visible");
});

// Add custom assertions
chai.Assertion.addMethod("containText", function (text: string) {
	const obj = this._obj;
	this.assert(
		obj.text().includes(text),
		`expected #{this} to contain text '${text}'`,
		`expected #{this} to not contain text '${text}'`,
		text,
		obj.text(),
	);
});

// Global error handling
Cypress.on("uncaught:exception", (err, _runnable) => {
	// returning false here prevents Cypress from failing the test
	if (err.message.includes("ResizeObserver loop limit exceeded")) {
		return false;
	}
	return true;
});

// Custom viewport sizes for responsive testing
Cypress.Commands.add("setMobileViewport", () => {
	cy.viewport(375, 667);
});

Cypress.Commands.add("setTabletViewport", () => {
	cy.viewport(768, 1024);
});

Cypress.Commands.add("setDesktopViewport", () => {
	cy.viewport(1280, 720);
});

// Custom commands for API mocking
Cypress.Commands.add("mockGraphQL", (operationName: string, response: any) => {
	cy.intercept("POST", "/api/graphql", (req) => {
		if (req.body.query.includes(operationName)) {
			req.reply(response);
		}
	});
});

Cypress.Commands.add(
	"mockAPI",
	(method: string, url: string, response: any) => {
		cy.intercept(method, url, response);
	},
);

// Custom commands for performance testing
Cypress.Commands.add("measurePageLoad", () => {
	cy.window().then((win) => {
		const performance = win.performance;
		const navigation = performance.getEntriesByType(
			"navigation",
		)[0] as PerformanceNavigationTiming;
		const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
		cy.log(`Page load time: ${loadTime}ms`);
	});
});

// Custom commands for accessibility testing
Cypress.Commands.add("checkAccessibility", () => {
	cy.injectAxe();
	cy.checkA11y();
});

// Custom commands for visual regression testing
Cypress.Commands.add("compareSnapshot", (name: string) => {
	cy.matchImageSnapshot(name);
});

// Type definitions for custom commands
declare global {
	namespace Cypress {
		interface Chainable {
			login(email: string, password: string): Chainable<void>;
			completeOnboarding(): Chainable<void>;
			startLesson(): Chainable<void>;
			submitQuizAnswer(answer: string): Chainable<void>;
			navigateToLeaderboard(): Chainable<void>;
			navigateToSettings(): Chainable<void>;
			setMobileViewport(): Chainable<void>;
			setTabletViewport(): Chainable<void>;
			setDesktopViewport(): Chainable<void>;
			mockGraphQL(operationName: string, response: any): Chainable<void>;
			mockAPI(method: string, url: string, response: any): Chainable<void>;
			measurePageLoad(): Chainable<void>;
			checkAccessibility(): Chainable<void>;
			compareSnapshot(name: string): Chainable<void>;
		}
	}
}
