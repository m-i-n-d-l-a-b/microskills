import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const isProd = mode === "production";
	const isDev = mode === "development";

	return {
		server: {
			host: "::",
			port: 8080,
		},
		plugins: [react()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		build: {
			// Performance optimizations
			target: "esnext",
			minify: "terser",
			terserOptions: {
				compress: {
					// Keep console for error debugging in production
					drop_console: false,
					drop_debugger: isProd,
				},
			},
			rollupOptions: {
				output: {
					// Code splitting configuration
					manualChunks: {
						// Vendor chunks
						vendor: ["react", "react-dom"],
						router: ["react-router-dom"],
						ui: [
							"@radix-ui/react-dialog",
							"@radix-ui/react-dropdown-menu",
							"@radix-ui/react-tabs",
						],
						charts: ["recharts"],
						auth: ["@supabase/supabase-js"],
						graphql: ["@apollo/client", "graphql"],
						// Feature chunks
						lessons: [
							"./src/hooks/useLessons.ts",
							"./src/components/lesson/LessonChatScreen.tsx",
						],
						projects: [
							"./src/hooks/useProjects.ts",
							"./src/components/project/MiniProjectSandbox.tsx",
						],
						analytics: [
							"./src/hooks/useAnalytics.ts",
							"./src/components/admin/AdminAnalytics.tsx",
						],
						monitoring: [
							"./src/services/monitoringService.ts",
							"./src/services/performanceService.ts",
						],
					},
					// Asset optimization
					assetFileNames: (assetInfo) => {
						const info = assetInfo.name?.split(".") || [];
						const ext = info[info.length - 1];
						if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || "")) {
							return `assets/images/[name]-[hash][extname]`;
						}
						if (/css/i.test(ext || "")) {
							return `assets/css/[name]-[hash][extname]`;
						}
						return `assets/[name]-[hash][extname]`;
					},
					chunkFileNames: "assets/js/[name]-[hash].js",
					entryFileNames: "assets/js/[name]-[hash].js",
				},
			},
			// Chunk size warnings
			chunkSizeWarningLimit: 1000,
			// Source maps for debugging
			sourcemap: isDev,
		},
		optimizeDeps: {
			// Pre-bundle dependencies for faster dev server
			include: [
				"react",
				"react-dom",
				"react-router-dom",
				"@apollo/client",
				"graphql",
				"@supabase/supabase-js",
				"recharts",
				"lucide-react",
			],
			// Exclude dependencies that should not be pre-bundled
			exclude: [
				"vitest",
				"@testing-library/react",
				"@testing-library/jest-dom",
			],
		},
		// Performance optimizations
		esbuild: {
			treeShaking: true,
		},
		// CSS optimization
		css: {
			devSourcemap: isDev,
		},
		// Define environment variables
		define: {
			__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
			__BUILD_VERSION__: JSON.stringify(
				process.env.npm_package_version || "1.0.0",
			),
		},
	};
});
