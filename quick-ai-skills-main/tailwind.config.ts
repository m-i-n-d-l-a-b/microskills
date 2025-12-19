import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
					glow: "hsl(var(--primary-glow))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				sidebar: {
					DEFAULT: "hsl(var(--sidebar-background))",
					foreground: "hsl(var(--sidebar-foreground))",
					primary: "hsl(var(--sidebar-primary))",
					"primary-foreground": "hsl(var(--sidebar-primary-foreground))",
					accent: "hsl(var(--sidebar-accent))",
					"accent-foreground": "hsl(var(--sidebar-accent-foreground))",
					border: "hsl(var(--sidebar-border))",
					ring: "hsl(var(--sidebar-ring))",
				},
				/* Learning app specific colors */
				success: {
					DEFAULT: "hsl(var(--success))",
					foreground: "hsl(var(--success-foreground))",
				},
				error: {
					DEFAULT: "hsl(var(--error))",
					foreground: "hsl(var(--error-foreground))",
				},
				"lesson-bubble": "hsl(var(--lesson-bubble))",
				"user-bubble": "hsl(var(--user-bubble))",
				"streak-flame": "hsl(var(--streak-flame))",
				"xp-progress": "hsl(var(--xp-progress))",
			},
			backgroundImage: {
				"gradient-primary": "var(--gradient-primary)",
				"gradient-hero": "var(--gradient-hero)",
				"gradient-card": "var(--gradient-card)",
			},
			boxShadow: {
				glow: "var(--shadow-glow)",
				card: "var(--shadow-card)",
			},
			transitionTimingFunction: {
				smooth: "var(--animation-smooth)",
				spring: "var(--animation-spring)",
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: {
						height: "0",
					},
					to: {
						height: "var(--radix-accordion-content-height)",
					},
				},
				"accordion-up": {
					from: {
						height: "var(--radix-accordion-content-height)",
					},
					to: {
						height: "0",
					},
				},
				"fade-in": {
					"0%": {
						opacity: "0",
						transform: "translateY(10px)",
					},
					"100%": {
						opacity: "1",
						transform: "translateY(0)",
					},
				},
				"slide-up": {
					"0%": {
						opacity: "0",
						transform: "translateY(20px)",
					},
					"100%": {
						opacity: "1",
						transform: "translateY(0)",
					},
				},
				"scale-in": {
					"0%": {
						opacity: "0",
						transform: "scale(0.95)",
					},
					"100%": {
						opacity: "1",
						transform: "scale(1)",
					},
				},
				"streak-flame": {
					"0%, 100%": {
						transform: "scale(1) rotate(-1deg)",
						filter: "hue-rotate(0deg)",
					},
					"50%": {
						transform: "scale(1.05) rotate(1deg)",
						filter: "hue-rotate(10deg)",
					},
				},
				"xp-fill": {
					"0%": {
						transform: "scaleX(0)",
					},
					"100%": {
						transform: "scaleX(1)",
					},
				},
				"bubble-pop": {
					"0%": {
						opacity: "0",
						transform: "scale(0.8) translateY(10px)",
					},
					"100%": {
						opacity: "1",
						transform: "scale(1) translateY(0)",
					},
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"fade-in": "fade-in 0.3s ease-out",
				"slide-up": "slide-up 0.4s ease-out",
				"scale-in": "scale-in 0.2s ease-out",
				"streak-flame": "streak-flame 2s ease-in-out infinite",
				"xp-fill": "xp-fill 0.8s ease-out",
				"bubble-pop": "bubble-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
