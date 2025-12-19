// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Custom command to wait for page load
Cypress.Commands.add("waitForPageLoad", () => {
	cy.get("body").should("not.have.class", "loading");
	cy.get('[data-testid="loading-spinner"]').should("not.exist");
});

// Custom command to clear local storage
Cypress.Commands.add("clearLocalStorage", () => {
	cy.window().then((win) => {
		win.localStorage.clear();
	});
});

// Custom command to set local storage
Cypress.Commands.add("setLocalStorage", (key: string, value: string) => {
	cy.window().then((win) => {
		win.localStorage.setItem(key, value);
	});
});

// Custom command to get local storage
Cypress.Commands.add("getLocalStorage", (key: string) => {
	cy.window().then((win) => {
		return win.localStorage.getItem(key);
	});
});

// Custom command to wait for network requests
Cypress.Commands.add("waitForNetworkIdle", (timeout = 1000) => {
	cy.wait(timeout);
});

// Custom command to check if element is visible and clickable
Cypress.Commands.add("clickIfVisible", (selector: string) => {
	cy.get("body").then(($body) => {
		if ($body.find(selector).length > 0) {
			cy.get(selector).should("be.visible").click();
		}
	});
});

// Custom command to type with delay
Cypress.Commands.add(
	"typeWithDelay",
	(selector: string, text: string, delay = 100) => {
		cy.get(selector).clear();
		text.split("").forEach((char) => {
			cy.get(selector).type(char, { delay });
		});
	},
);

// Custom command to scroll to element
Cypress.Commands.add("scrollToElement", (selector: string) => {
	cy.get(selector).scrollIntoView();
});

// Custom command to check for console errors
Cypress.Commands.add("checkConsoleErrors", () => {
	cy.window().then((win) => {
		const consoleSpy = cy.spy(win.console, "error");
		cy.wrap(consoleSpy).as("consoleError");
	});
});

// Custom command to assert no console errors
Cypress.Commands.add("assertNoConsoleErrors", () => {
	cy.get("@consoleError").should("not.have.been.called");
});

// Custom command to wait for animation to complete
Cypress.Commands.add("waitForAnimation", (selector: string) => {
	cy.get(selector).should("not.have.class", "animating");
});

// Custom command to check if element has specific CSS property
Cypress.Commands.add(
	"hasCSSProperty",
	(selector: string, property: string, value: string) => {
		cy.get(selector).should("have.css", property, value);
	},
);

// Custom command to check if element is in viewport
Cypress.Commands.add("isInViewport", (selector: string) => {
	cy.get(selector).should("be.visible");
	cy.get(selector).then(($el) => {
		const rect = $el[0].getBoundingClientRect();
		expect(rect.top).to.be.greaterThan(0);
		expect(rect.bottom).to.be.lessThan(Cypress.config("viewportHeight"));
	});
});

// Custom command to wait for element to be stable
Cypress.Commands.add("waitForStable", (selector: string, timeout = 1000) => {
	let previousHeight = 0;
	cy.get(selector).then(($el) => {
		previousHeight = $el.height();
	});

	cy.wait(timeout);

	cy.get(selector).then(($el) => {
		expect($el.height()).to.equal(previousHeight);
	});
});

// Custom command to check for memory leaks
Cypress.Commands.add("checkMemoryUsage", () => {
	cy.window().then((win) => {
		if ("memory" in win.performance) {
			const memory = (win.performance as any).memory;
			cy.log(`Memory usage: ${memory.usedJSHeapSize / 1024 / 1024} MB`);
		}
	});
});

// Custom command to simulate slow network
Cypress.Commands.add("simulateSlowNetwork", (delay = 2000) => {
	cy.intercept("**/*", (req) => {
		req.on("response", (res) => {
			res.setDelay(delay);
		});
	});
});

// Custom command to simulate offline mode
Cypress.Commands.add("simulateOffline", () => {
	cy.intercept("**/*", { forceNetworkError: true });
});

// Custom command to check for accessibility violations
Cypress.Commands.add("checkA11yViolations", () => {
	cy.injectAxe();
	cy.checkA11y(null, {
		rules: {
			"color-contrast": { enabled: true },
			"button-name": { enabled: true },
			"image-alt": { enabled: true },
		},
	});
});

// Custom command to test keyboard navigation
Cypress.Commands.add("testKeyboardNavigation", () => {
	cy.get("body").tab();
	cy.focused().should("exist");

	// Test tab navigation through interactive elements
	cy.get("button, a, input, textarea, select").each(($el) => {
		cy.wrap($el).focus();
		cy.focused().should("have.attr", "tabindex");
	});
});

// Custom command to test screen reader compatibility
Cypress.Commands.add("testScreenReader", () => {
	// Check for ARIA labels
	cy.get("[role]").each(($el) => {
		cy.wrap($el).should("have.attr", "aria-label");
	});

	// Check for alt text on images
	cy.get("img").each(($el) => {
		cy.wrap($el).should("have.attr", "alt");
	});
});

// Custom command to test responsive design
Cypress.Commands.add("testResponsiveDesign", () => {
	const viewports = [
		{ width: 375, height: 667, name: "mobile" },
		{ width: 768, height: 1024, name: "tablet" },
		{ width: 1280, height: 720, name: "desktop" },
	];

	viewports.forEach((viewport) => {
		cy.viewport(viewport.width, viewport.height);
		cy.get("body").should("be.visible");
		cy.log(`Testing ${viewport.name} viewport`);
	});
});

// Custom command to test error boundaries
Cypress.Commands.add("testErrorBoundary", () => {
	// Trigger an error by navigating to a non-existent route
	cy.visit("/non-existent-route");
	cy.get('[data-testid="error-boundary"]').should("be.visible");
	cy.get('[data-testid="error-boundary"]').should(
		"contain.text",
		"Something went wrong",
	);
});

// Custom command to test loading states
Cypress.Commands.add("testLoadingStates", () => {
	cy.get('[data-testid="loading-spinner"]').should("be.visible");
	cy.wait(1000);
	cy.get('[data-testid="loading-spinner"]').should("not.exist");
});

// Custom command to test form validation
Cypress.Commands.add("testFormValidation", (formSelector: string) => {
	cy.get(formSelector).within(() => {
		// Submit empty form
		cy.get('button[type="submit"]').click();

		// Check for validation errors
		cy.get('[data-testid="error-message"]').should("be.visible");

		// Fill required fields
		cy.get("input[required]").each(($input) => {
			cy.wrap($input).type("test value");
		});

		// Submit again
		cy.get('button[type="submit"]').click();

		// Check that errors are gone
		cy.get('[data-testid="error-message"]').should("not.exist");
	});
});

// Type definitions for custom commands
declare global {
	namespace Cypress {
		interface Chainable {
			waitForPageLoad(): Chainable<void>;
			clearLocalStorage(): Chainable<void>;
			setLocalStorage(key: string, value: string): Chainable<void>;
			getLocalStorage(key: string): Chainable<string | null>;
			waitForNetworkIdle(timeout?: number): Chainable<void>;
			clickIfVisible(selector: string): Chainable<void>;
			typeWithDelay(
				selector: string,
				text: string,
				delay?: number,
			): Chainable<void>;
			scrollToElement(selector: string): Chainable<void>;
			checkConsoleErrors(): Chainable<void>;
			assertNoConsoleErrors(): Chainable<void>;
			waitForAnimation(selector: string): Chainable<void>;
			hasCSSProperty(
				selector: string,
				property: string,
				value: string,
			): Chainable<void>;
			isInViewport(selector: string): Chainable<void>;
			waitForStable(selector: string, timeout?: number): Chainable<void>;
			checkMemoryUsage(): Chainable<void>;
			simulateSlowNetwork(delay?: number): Chainable<void>;
			simulateOffline(): Chainable<void>;
			checkA11yViolations(): Chainable<void>;
			testKeyboardNavigation(): Chainable<void>;
			testScreenReader(): Chainable<void>;
			testResponsiveDesign(): Chainable<void>;
			testErrorBoundary(): Chainable<void>;
			testLoadingStates(): Chainable<void>;
			testFormValidation(formSelector: string): Chainable<void>;
		}
	}
}
