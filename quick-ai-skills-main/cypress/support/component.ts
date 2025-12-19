// ***********************************************************
// This example support/component.ts is processed and
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

// Add custom commands for component testing
Cypress.Commands.add("mount", (component: any, options = {}) => {
	// Custom mount command for component testing
	return cy.mount(component, {
		...options,
		providers: {
			// Add any providers needed for component testing
			...options.providers,
		},
	});
});

Cypress.Commands.add("mountWithRouter", (component: any, options = {}) => {
	// Mount component with router context
	return cy.mount(component, {
		...options,
		providers: {
			...options.providers,
			router: true,
		},
	});
});

Cypress.Commands.add("mountWithQueryClient", (component: any, options = {}) => {
	// Mount component with query client context
	return cy.mount(component, {
		...options,
		providers: {
			...options.providers,
			queryClient: true,
		},
	});
});

Cypress.Commands.add("mountWithTheme", (component: any, options = {}) => {
	// Mount component with theme provider
	return cy.mount(component, {
		...options,
		providers: {
			...options.providers,
			theme: true,
		},
	});
});

// Custom commands for component-specific testing
Cypress.Commands.add("testComponentAccessibility", (component: any) => {
	cy.mount(component);
	cy.injectAxe();
	cy.checkA11y();
});

Cypress.Commands.add("testComponentResponsive", (component: any) => {
	const viewports = [
		{ width: 375, height: 667, name: "mobile" },
		{ width: 768, height: 1024, name: "tablet" },
		{ width: 1280, height: 720, name: "desktop" },
	];

	viewports.forEach((viewport) => {
		cy.viewport(viewport.width, viewport.height);
		cy.mount(component);
		cy.get("body").should("be.visible");
		cy.log(`Testing ${viewport.name} viewport`);
	});
});

Cypress.Commands.add("testComponentInteractions", (component: any) => {
	cy.mount(component);

	// Test click interactions
	cy.get('button, [role="button"]').each(($el) => {
		cy.wrap($el).click();
	});

	// Test keyboard interactions
	cy.get("input, textarea, select").each(($el) => {
		cy.wrap($el).focus();
		cy.wrap($el).type("test");
	});

	// Test hover interactions
	cy.get('[data-testid*="hover"]').each(($el) => {
		cy.wrap($el).trigger("mouseover");
		cy.wrap($el).trigger("mouseout");
	});
});

Cypress.Commands.add("testComponentStates", (component: any) => {
	cy.mount(component);

	// Test loading state
	cy.get('[data-testid="loading"]').should("be.visible");

	// Test error state
	cy.get('[data-testid="error"]').should("be.visible");

	// Test success state
	cy.get('[data-testid="success"]').should("be.visible");

	// Test disabled state
	cy.get('[data-testid="disabled"]').should("be.disabled");
});

Cypress.Commands.add("testComponentProps", (component: any, props: any) => {
	cy.mount(component, { props });

	// Verify props are applied correctly
	Object.entries(props).forEach(([key, value]) => {
		if (typeof value === "string") {
			cy.get(`[data-testid="${key}"]`).should("contain.text", value);
		} else if (typeof value === "boolean") {
			if (value) {
				cy.get(`[data-testid="${key}"]`).should("be.visible");
			} else {
				cy.get(`[data-testid="${key}"]`).should("not.exist");
			}
		}
	});
});

Cypress.Commands.add("testComponentEvents", (component: any) => {
	cy.mount(component);

	// Test click events
	cy.get('[data-testid="clickable"]').click();
	cy.get('[data-testid="click-event"]').should("be.visible");

	// Test change events
	cy.get('[data-testid="input"]').type("test");
	cy.get('[data-testid="change-event"]').should("be.visible");

	// Test submit events
	cy.get('[data-testid="form"]').submit();
	cy.get('[data-testid="submit-event"]').should("be.visible");
});

Cypress.Commands.add("testComponentStyling", (component: any) => {
	cy.mount(component);

	// Test CSS classes
	cy.get('[data-testid="styled-element"]').should(
		"have.class",
		"expected-class",
	);

	// Test CSS properties
	cy.get('[data-testid="styled-element"]').should(
		"have.css",
		"color",
		"rgb(0, 0, 0)",
	);

	// Test responsive styles
	cy.viewport(375, 667);
	cy.get('[data-testid="responsive-element"]').should(
		"have.css",
		"display",
		"block",
	);

	cy.viewport(1280, 720);
	cy.get('[data-testid="responsive-element"]').should(
		"have.css",
		"display",
		"flex",
	);
});

Cypress.Commands.add("testComponentAnimation", (component: any) => {
	cy.mount(component);

	// Test animation start
	cy.get('[data-testid="animated-element"]').should("have.class", "animate-in");

	// Wait for animation to complete
	cy.wait(1000);

	// Test animation end
	cy.get('[data-testid="animated-element"]').should(
		"not.have.class",
		"animate-in",
	);
});

Cypress.Commands.add("testComponentPerformance", (component: any) => {
	const startTime = performance.now();

	cy.mount(component);

	cy.window().then(({ performance }) => {
		const endTime = performance.now();
		const renderTime = endTime - startTime;

		cy.log(`Component render time: ${renderTime}ms`);
		expect(renderTime).to.be.lessThan(100); // Should render in less than 100ms
	});
});

Cypress.Commands.add("testComponentMemory", (component: any) => {
	cy.mount(component);

	cy.window().then((win) => {
		if ("memory" in win.performance) {
			const memory = (win.performance as any).memory;
			const initialMemory = memory.usedJSHeapSize;

			// Perform some interactions
			cy.get('[data-testid="interactive"]').click();

			cy.window().then((win) => {
				const memory2 = (win.performance as any).memory;
				const finalMemory = memory2.usedJSHeapSize;
				const memoryIncrease = finalMemory - initialMemory;

				cy.log(`Memory increase: ${memoryIncrease} bytes`);
				expect(memoryIncrease).to.be.lessThan(1024 * 1024); // Less than 1MB increase
			});
		}
	});
});

// Type definitions for component testing commands
declare global {
	namespace Cypress {
		interface Chainable {
			mount(component: any, options?: any): Chainable<any>;
			mountWithRouter(component: any, options?: any): Chainable<any>;
			mountWithQueryClient(component: any, options?: any): Chainable<any>;
			mountWithTheme(component: any, options?: any): Chainable<any>;
			testComponentAccessibility(component: any): Chainable<void>;
			testComponentResponsive(component: any): Chainable<void>;
			testComponentInteractions(component: any): Chainable<void>;
			testComponentStates(component: any): Chainable<void>;
			testComponentProps(component: any, props: any): Chainable<void>;
			testComponentEvents(component: any): Chainable<void>;
			testComponentStyling(component: any): Chainable<void>;
			testComponentAnimation(component: any): Chainable<void>;
			testComponentPerformance(component: any): Chainable<void>;
			testComponentMemory(component: any): Chainable<void>;
		}
	}
}
