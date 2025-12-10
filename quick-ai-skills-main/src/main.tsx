import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { validateEnv, validateProductionEnv } from './lib/envValidation'

// Validate environment variables at startup
try {
  validateEnv();
  const productionCheck = validateProductionEnv();
  if (!productionCheck.isValid && import.meta.env.PROD) {
    console.error('Production environment validation failed:', productionCheck.errors);
    // In production, we might want to show an error page
  }
} catch (error) {
  console.error('Environment validation error:', error);
  // In development, throw to prevent silent failures
  if (import.meta.env.DEV) {
    throw error;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Make sure there's a <div id='root'></div> in your HTML.");
}

try {
  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  // Display error in the DOM as fallback
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: system-ui; color: #dc2626;">
      <h1>Application Error</h1>
      <p>Failed to initialize the application.</p>
      <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `;
  throw error;
}
