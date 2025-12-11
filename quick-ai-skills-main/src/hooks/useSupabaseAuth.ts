import { useState, useEffect, useCallback } from "react";
import {
	supabaseAuthManager,
	type UseSupabaseAuthReturn,
	type SupabaseAuthState,
} from "@/lib/supabaseAuth";
import type { OAuthProvider, AuthOptions } from "@/lib/supabase";
import type { LoginCredentials, User } from "@/types/api";

export function useSupabaseAuth(): UseSupabaseAuthReturn {
	const [authState, setAuthState] = useState<SupabaseAuthState>(
		supabaseAuthManager.getState(),
	);

	// Subscribe to auth state changes
	useEffect(() => {
		const unsubscribe = supabaseAuthManager.subscribe((state) => {
			setAuthState(state);
		});

		return unsubscribe;
	}, []);

	// Authentication actions
	const signInWithEmail = useCallback(
		async (credentials: LoginCredentials): Promise<void> => {
			await supabaseAuthManager.signInWithEmail(credentials);
		},
		[],
	);

	const signInWithOAuth = useCallback(
		async (provider: OAuthProvider, options?: AuthOptions): Promise<void> => {
			await supabaseAuthManager.signInWithOAuth(provider, options);
		},
		[],
	);

	const signUp = useCallback(
		async (credentials: LoginCredentials): Promise<void> => {
			await supabaseAuthManager.signUp(credentials);
		},
		[],
	);

	const signOut = useCallback(async (): Promise<void> => {
		await supabaseAuthManager.signOut();
	}, []);

	const resetPassword = useCallback(async (email: string): Promise<void> => {
		await supabaseAuthManager.resetPassword(email);
	}, []);

	const updatePassword = useCallback(
		async (password: string): Promise<void> => {
			await supabaseAuthManager.updatePassword(password);
		},
		[],
	);

	const updateProfile = useCallback(
		async (profile: Partial<User>): Promise<void> => {
			await supabaseAuthManager.updateProfile(profile);
		},
		[],
	);

	const refreshSession = useCallback(async (): Promise<void> => {
		await supabaseAuthManager.refreshSession();
	}, []);

	const clearError = useCallback((): void => {
		supabaseAuthManager.clearError();
	}, []);

	return {
		// State
		user: authState.user,
		session: authState.session,
		loading: authState.loading,
		error: authState.error,
		isInitialized: authState.isInitialized,

		// Actions
		signInWithEmail,
		signInWithOAuth,
		signUp,
		signOut,
		resetPassword,
		updatePassword,
		updateProfile,
		refreshSession,
		clearError,
	};
}

// Export hook as default
export default useSupabaseAuth;
