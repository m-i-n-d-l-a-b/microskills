import { useState, useEffect, useCallback, useRef } from "react";
import {
	encryptionService,
	encrypt,
	decrypt,
	encryptForStorage,
	decryptFromStorage,
	secureTransmission,
	verifyIntegrity,
	type EncryptedData,
	type SecureTransmissionOptions,
	type IntegrityResult,
} from "@/services/encryptionService";
import { addBreadcrumb } from "@/services/monitoringService";

// Hook for basic encryption operations
export function useEncryption() {
	const [isInitialized, setIsInitialized] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		const initializeEncryption = async () => {
			try {
				setIsLoading(true);
				setError(null);

				await encryptionService.initialize();
				setIsInitialized(true);

				addBreadcrumb("encryption_initialized", {
					category: "security",
					level: "info",
				});
			} catch (err) {
				const error =
					err instanceof Error
						? err
						: new Error("Encryption initialization failed");
				setError(error);

				addBreadcrumb("encryption_init_failed", {
					category: "security",
					level: "error",
					error: error.message,
				});
			} finally {
				setIsLoading(false);
			}
		};

		initializeEncryption();
	}, []);

	const encryptData = useCallback(
		async (
			data: string | object,
			options?: Partial<SecureTransmissionOptions>,
		): Promise<EncryptedData> => {
			try {
				setError(null);
				const result = await encrypt(data, options);

				addBreadcrumb("data_encrypted", {
					category: "security",
					level: "info",
					dataType: typeof data,
					algorithm: result.algorithm,
				});

				return result;
			} catch (err) {
				const error =
					err instanceof Error ? err : new Error("Encryption failed");
				setError(error);

				addBreadcrumb("encryption_failed", {
					category: "security",
					level: "error",
					error: error.message,
				});

				throw error;
			}
		},
		[],
	);

	const decryptData = useCallback(
		async (encryptedData: EncryptedData): Promise<string | object> => {
			try {
				setError(null);
				const result = await decrypt(encryptedData);

				addBreadcrumb("data_decrypted", {
					category: "security",
					level: "info",
					algorithm: encryptedData.algorithm,
					hasIntegrityCheck: !!encryptedData.integrityHash,
				});

				return result;
			} catch (err) {
				const error =
					err instanceof Error ? err : new Error("Decryption failed");
				setError(error);

				addBreadcrumb("decryption_failed", {
					category: "security",
					level: "error",
					error: error.message,
				});

				throw error;
			}
		},
		[],
	);

	const verifyDataIntegrity = useCallback(
		async (
			data: string,
			expectedHash: string,
			key: CryptoKey,
		): Promise<IntegrityResult> => {
			try {
				setError(null);
				const result = await verifyIntegrity(data, expectedHash, key);

				addBreadcrumb("integrity_verified", {
					category: "security",
					level: result.isValid ? "info" : "warning",
					isValid: result.isValid,
					error: result.error,
				});

				return result;
			} catch (err) {
				const error =
					err instanceof Error
						? err
						: new Error("Integrity verification failed");
				setError(error);

				addBreadcrumb("integrity_check_failed", {
					category: "security",
					level: "error",
					error: error.message,
				});

				throw error;
			}
		},
		[],
	);

	return {
		isInitialized,
		isLoading,
		error,
		encryptData,
		decryptData,
		verifyDataIntegrity,
	};
}

// Hook for secure storage operations
export function useSecureStorage() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const storeSecurely = useCallback(
		async <T>(key: string, data: T): Promise<void> => {
			try {
				setIsLoading(true);
				setError(null);

				await encryptForStorage(data, key);

				addBreadcrumb("data_stored_securely", {
					category: "security",
					level: "info",
					storageKey: key,
					dataType: typeof data,
				});
			} catch (err) {
				const error =
					err instanceof Error ? err : new Error("Secure storage failed");
				setError(error);

				addBreadcrumb("secure_storage_failed", {
					category: "security",
					level: "error",
					storageKey: key,
					error: error.message,
				});

				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	const retrieveSecurely = useCallback(
		async <T>(key: string): Promise<T | null> => {
			try {
				setIsLoading(true);
				setError(null);

				const result = await decryptFromStorage<T>(key);

				addBreadcrumb("data_retrieved_securely", {
					category: "security",
					level: "info",
					storageKey: key,
					found: result !== null,
				});

				return result;
			} catch (err) {
				const error =
					err instanceof Error ? err : new Error("Secure retrieval failed");
				setError(error);

				addBreadcrumb("secure_retrieval_failed", {
					category: "security",
					level: "error",
					storageKey: key,
					error: error.message,
				});

				throw error;
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	const clearSecureData = useCallback((key: string): void => {
		try {
			localStorage.removeItem(`encrypted_${key}`);

			addBreadcrumb("secure_data_cleared", {
				category: "security",
				level: "info",
				storageKey: key,
			});
		} catch (err) {
			const error =
				err instanceof Error ? err : new Error("Failed to clear secure data");
			setError(error);

			addBreadcrumb("clear_secure_data_failed", {
				category: "security",
				level: "error",
				storageKey: key,
				error: error.message,
			});
		}
	}, []);

	return {
		isLoading,
		error,
		storeSecurely,
		retrieveSecurely,
		clearSecureData,
	};
}

// Hook for secure API transmission
export function useSecureTransmission() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const transmitSecurely = useCallback(
		async <T>(
			url: string,
			data: any,
			options?: Partial<SecureTransmissionOptions>,
		): Promise<T> => {
			try {
				setIsLoading(true);
				setError(null);

				// Cancel any ongoing request
				if (abortControllerRef.current) {
					abortControllerRef.current.abort();
				}

				abortControllerRef.current = new AbortController();

				const result = await secureTransmission<T>(url, data, {
					...options,
					timeout: options?.timeout || 30000,
				});

				addBreadcrumb("secure_transmission_success", {
					category: "security",
					level: "info",
					url,
					dataType: typeof data,
					encrypted: options?.encryptPayload !== false,
				});

				return result;
			} catch (err) {
				const error =
					err instanceof Error ? err : new Error("Secure transmission failed");
				setError(error);

				addBreadcrumb("secure_transmission_failed", {
					category: "security",
					level: "error",
					url,
					error: error.message,
				});

				throw error;
			} finally {
				setIsLoading(false);
				abortControllerRef.current = null;
			}
		},
		[],
	);

	const cancelTransmission = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
			setIsLoading(false);

			addBreadcrumb("secure_transmission_cancelled", {
				category: "security",
				level: "info",
			});
		}
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	return {
		isLoading,
		error,
		transmitSecurely,
		cancelTransmission,
	};
}

// Hook for encryption configuration management
export function useEncryptionConfig() {
	const [config, setConfig] = useState(encryptionService.getConfig());
	const [stats, setStats] = useState(encryptionService.getStats());

	const updateConfig = useCallback((updates: Partial<typeof config>) => {
		try {
			encryptionService.updateConfig(updates);
			setConfig(encryptionService.getConfig());
			setStats(encryptionService.getStats());

			addBreadcrumb("encryption_config_updated", {
				category: "security",
				level: "info",
				updates: Object.keys(updates),
			});
		} catch (err) {
			const error =
				err instanceof Error
					? err
					: new Error("Failed to update encryption config");

			addBreadcrumb("encryption_config_update_failed", {
				category: "security",
				level: "error",
				error: error.message,
			});

			throw error;
		}
	}, []);

	const rotateKeys = useCallback(async () => {
		try {
			await encryptionService.rotateKeys();
			setStats(encryptionService.getStats());

			addBreadcrumb("encryption_keys_rotated", {
				category: "security",
				level: "info",
			});
		} catch (err) {
			const error =
				err instanceof Error
					? err
					: new Error("Failed to rotate encryption keys");

			addBreadcrumb("encryption_key_rotation_failed", {
				category: "security",
				level: "error",
				error: error.message,
			});

			throw error;
		}
	}, []);

	// Update stats periodically
	useEffect(() => {
		const interval = setInterval(() => {
			setStats(encryptionService.getStats());
		}, 5000); // Update every 5 seconds

		return () => clearInterval(interval);
	}, []);

	return {
		config,
		stats,
		updateConfig,
		rotateKeys,
	};
}

// Hook for sensitive form data handling
export function useSensitiveForm<T extends Record<string, any>>(
	initialData: T,
	storageKey?: string,
) {
	const [data, setData] = useState<T>(initialData);
	const [isEncrypted, setIsEncrypted] = useState(false);
	const {
		storeSecurely,
		retrieveSecurely,
		isLoading: storageLoading,
	} = useSecureStorage();
	const {
		encryptData,
		decryptData,
		isLoading: encryptionLoading,
	} = useEncryption();

	// Load encrypted data from storage on mount
	useEffect(() => {
		if (storageKey) {
			const loadEncryptedData = async () => {
				try {
					const stored = await retrieveSecurely<T>(storageKey);
					if (stored) {
						setData(stored);
						setIsEncrypted(true);
					}
				} catch (error) {
					console.warn("Failed to load encrypted form data:", error);
				}
			};

			loadEncryptedData();
		}
	}, [storageKey, retrieveSecurely]);

	const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
		setData((prev) => ({ ...prev, [field]: value }));
	}, []);

	const updateData = useCallback((newData: Partial<T>) => {
		setData((prev) => ({ ...prev, ...newData }));
	}, []);

	const encryptFormData = useCallback(async (): Promise<EncryptedData> => {
		const encrypted = await encryptData(data);
		setIsEncrypted(true);
		return encrypted;
	}, [data, encryptData]);

	const decryptFormData = useCallback(
		async (encryptedData: EncryptedData): Promise<void> => {
			const decrypted = (await decryptData(encryptedData)) as T;
			setData(decrypted);
			setIsEncrypted(false);
		},
		[decryptData],
	);

	const saveToStorage = useCallback(async (): Promise<void> => {
		if (storageKey) {
			await storeSecurely(storageKey, data);
			setIsEncrypted(true);
		}
	}, [storageKey, data, storeSecurely]);

	const clearForm = useCallback(() => {
		setData(initialData);
		setIsEncrypted(false);
	}, [initialData]);

	return {
		data,
		isEncrypted,
		isLoading: storageLoading || encryptionLoading,
		updateField,
		updateData,
		encryptFormData,
		decryptFormData,
		saveToStorage,
		clearForm,
	};
}

// Hook for secure file handling
export function useSecureFile() {
	const { encryptData, decryptData, isLoading } = useEncryption();

	const encryptFile = useCallback(
		async (file: File): Promise<EncryptedData> => {
			try {
				const arrayBuffer = await file.arrayBuffer();
				const base64 = btoa(
					String.fromCharCode(...new Uint8Array(arrayBuffer)),
				);

				const fileData = {
					name: file.name,
					type: file.type,
					size: file.size,
					data: base64,
					lastModified: file.lastModified,
				};

				return await encryptData(fileData);
			} catch (error) {
				throw new Error(
					`Failed to encrypt file: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		},
		[encryptData],
	);

	const decryptFile = useCallback(
		async (encryptedData: EncryptedData): Promise<File> => {
			try {
				const decrypted = (await decryptData(encryptedData)) as {
					name: string;
					type: string;
					size: number;
					data: string;
					lastModified: number;
				};

				const binaryString = atob(decrypted.data);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}

				return new File([bytes], decrypted.name, {
					type: decrypted.type,
					lastModified: decrypted.lastModified,
				});
			} catch (error) {
				throw new Error(
					`Failed to decrypt file: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		},
		[decryptData],
	);

	return {
		isLoading,
		encryptFile,
		decryptFile,
	};
}
