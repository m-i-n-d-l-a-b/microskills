import { createClient } from "@supabase/supabase-js";
import { ENV } from "./constants";

// Supabase client configuration
const supabaseUrl = ENV.SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY || "your-anon-key";

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
		flowType: "pkce",
	},
	realtime: {
		params: {
			eventsPerSecond: 10,
		},
	},
});

// OAuth provider types
export type OAuthProvider =
	| "google"
	| "github"
	| "discord"
	| "twitter"
	| "linkedin";

// Authentication options interface
export interface AuthOptions {
	redirectTo?: string;
	scopes?: string;
}

// User profile interface for Supabase
export interface SupabaseUser {
	id: string;
	email?: string;
	email_confirmed_at?: string;
	phone?: string;
	phone_confirmed_at?: string;
	created_at: string;
	updated_at: string;
	user_metadata?: Record<string, any>;
	app_metadata?: Record<string, any>;
	aud: string;
	role: string;
}

// Session interface for Supabase
export interface SupabaseSession {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	expires_at?: number;
	token_type: string;
	user: SupabaseUser;
}

// Auth state interface
export interface SupabaseAuthState {
	user: SupabaseUser | null;
	session: SupabaseSession | null;
	loading: boolean;
	error: string | null;
}

// OAuth configuration
export const OAUTH_CONFIG = {
	google: {
		name: "Google",
		icon: "🔍",
		scopes: "email profile",
	},
	github: {
		name: "GitHub",
		icon: "🐙",
		scopes: "read:user user:email",
	},
	discord: {
		name: "Discord",
		icon: "🎮",
		scopes: "identify email",
	},
	twitter: {
		name: "Twitter",
		icon: "🐦",
		scopes: "tweet.read users.read",
	},
	linkedin: {
		name: "LinkedIn",
		icon: "💼",
		scopes: "r_liteprofile r_emailaddress",
	},
} as const;

// Export default instance
export default supabase;
