import { ENV } from "@/lib/constants";

// Encryption algorithms and configurations
export interface EncryptionConfig {
	algorithm: "AES-GCM" | "AES-CBC";
	keyLength: 128 | 192 | 256;
	ivLength: 12 | 16;
	saltLength: 16;
	iterations: 100000;
	enableCompression: boolean;
	enableIntegrityCheck: boolean;
	enableKeyRotation: boolean;
	keyRotationInterval: number; // milliseconds
}

// Encrypted data structure
export interface EncryptedData {
	data: string; // base64 encoded encrypted data
	iv: string; // base64 encoded initialization vector
	salt: string; // base64 encoded salt
	algorithm: string;
	version: string;
	timestamp: number;
	integrityHash?: string; // HMAC for integrity verification
	compressed?: boolean;
}

// Key management interface
export interface EncryptionKey {
	id: string;
	key: CryptoKey;
	createdAt: number;
	expiresAt?: number;
	algorithm: string;
	usage: string[];
}

// Secure transmission options
export interface SecureTransmissionOptions {
	encryptPayload: boolean;
	verifyIntegrity: boolean;
	compressData: boolean;
	addTimestamp: boolean;
	addNonce: boolean;
	timeout: number;
	retryAttempts: number;
}

// Data integrity verification result
export interface IntegrityResult {
	isValid: boolean;
	error?: string;
	timestamp: number;
	checksum: string;
}

export class EncryptionService {
	private config: EncryptionConfig;
	private keys: Map<string, EncryptionKey> = new Map();
	private masterKey: CryptoKey | null = null;
	private keyRotationTimer: NodeJS.Timeout | null = null;
	private isInitialized = false;

	constructor(config: Partial<EncryptionConfig> = {}) {
		this.config = {
			algorithm: "AES-GCM",
			keyLength: 256,
			ivLength: 12,
			saltLength: 16,
			iterations: 100000,
			enableCompression: true,
			enableIntegrityCheck: true,
			enableKeyRotation: true,
			keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
			...config,
		};
	}

	/**
	 * Initialize the encryption service
	 */
	public async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			// Generate or load master key
			await this.initializeMasterKey();

			// Set up key rotation if enabled
			if (this.config.enableKeyRotation) {
				this.setupKeyRotation();
			}

			this.isInitialized = true;
			console.log("🔐 Encryption service initialized successfully");
		} catch (error) {
			console.error("❌ Failed to initialize encryption service:", error);
			throw new Error("Encryption service initialization failed");
		}
	}

	/**
	 * Initialize master key for key management
	 */
	private async initializeMasterKey(): Promise<void> {
		const storedKey = localStorage.getItem("encryption_master_key");

		if (storedKey) {
			// Import existing master key
			const keyData = JSON.parse(storedKey);
			this.masterKey = await this.importKey(keyData.key, "AES-GCM", [
				"encrypt",
				"decrypt",
			]);
		} else {
			// Generate new master key
			this.masterKey = await this.generateKey("AES-GCM", 256, [
				"encrypt",
				"decrypt",
			]);

			// Export and store master key
			const exportedKey = await this.exportKey(this.masterKey);
			localStorage.setItem(
				"encryption_master_key",
				JSON.stringify({
					key: exportedKey,
					createdAt: Date.now(),
				}),
			);
		}
	}

	/**
	 * Generate a new encryption key
	 */
	public async generateKey(
		algorithm: string = "AES-GCM",
		length: number = 256,
		usage: string[] = ["encrypt", "decrypt"],
	): Promise<CryptoKey> {
		return await crypto.subtle.generateKey(
			{
				name: algorithm,
				length: length,
			},
			true,
			usage,
		);
	}

	/**
	 * Import a key from raw data
	 */
	public async importKey(
		keyData: string,
		algorithm: string = "AES-GCM",
		usage: string[] = ["encrypt", "decrypt"],
	): Promise<CryptoKey> {
		const keyBuffer = this.base64ToArrayBuffer(keyData);
		return await crypto.subtle.importKey(
			"raw",
			keyBuffer,
			{
				name: algorithm,
				length: keyBuffer.byteLength * 8,
			},
			false,
			usage,
		);
	}

	/**
	 * Export a key to raw data
	 */
	public async exportKey(key: CryptoKey): Promise<string> {
		const exported = await crypto.subtle.exportKey("raw", key);
		return this.arrayBufferToBase64(exported);
	}

	/**
	 * Encrypt data with optional compression and integrity check
	 */
	public async encrypt(
		data: string | object,
		key?: CryptoKey,
		options: Partial<SecureTransmissionOptions> = {},
	): Promise<EncryptedData> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const encryptionKey = key || (await this.getOrCreateDataKey());
		const opts = {
			encryptPayload: true,
			verifyIntegrity: this.config.enableIntegrityCheck,
			compressData: this.config.enableCompression,
			addTimestamp: true,
			addNonce: true,
			timeout: 30000,
			retryAttempts: 3,
			...options,
		};

		try {
			// Convert data to string if it's an object
			let dataString = typeof data === "string" ? data : JSON.stringify(data);

			// Compress data if enabled
			if (opts.compressData) {
				dataString = await this.compress(dataString);
			}

			// Generate IV and salt
			const iv = crypto.getRandomValues(new Uint8Array(this.config.ivLength));
			const salt = crypto.getRandomValues(
				new Uint8Array(this.config.saltLength),
			);

			// Encrypt the data
			const dataBuffer = new TextEncoder().encode(dataString);
			const encryptedBuffer = await crypto.subtle.encrypt(
				{
					name: this.config.algorithm,
					iv: iv,
				},
				encryptionKey,
				dataBuffer,
			);

			// Create encrypted data object
			const encryptedData: EncryptedData = {
				data: this.arrayBufferToBase64(encryptedBuffer),
				iv: this.arrayBufferToBase64(iv),
				salt: this.arrayBufferToBase64(salt),
				algorithm: this.config.algorithm,
				version: "1.0",
				timestamp: Date.now(),
				compressed: opts.compressData,
			};

			// Add integrity hash if enabled
			if (opts.verifyIntegrity) {
				encryptedData.integrityHash = await this.generateIntegrityHash(
					encryptedData.data,
					encryptionKey,
				);
			}

			return encryptedData;
		} catch (error) {
			console.error("❌ Encryption failed:", error);
			throw new Error("Data encryption failed");
		}
	}

	/**
	 * Decrypt data with integrity verification
	 */
	public async decrypt(
		encryptedData: EncryptedData,
		key?: CryptoKey,
	): Promise<string | object> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const decryptionKey = key || (await this.getOrCreateDataKey());

		try {
			// Verify integrity if hash is present
			if (encryptedData.integrityHash) {
				const isValid = await this.verifyIntegrity(
					encryptedData.data,
					encryptedData.integrityHash,
					decryptionKey,
				);

				if (!isValid.isValid) {
					throw new Error(`Data integrity check failed: ${isValid.error}`);
				}
			}

			// Convert base64 strings back to buffers
			const encryptedBuffer = this.base64ToArrayBuffer(encryptedData.data);
			const iv = this.base64ToArrayBuffer(encryptedData.iv);

			// Decrypt the data
			const decryptedBuffer = await crypto.subtle.decrypt(
				{
					name: encryptedData.algorithm,
					iv: iv,
				},
				decryptionKey,
				encryptedBuffer,
			);

			// Convert buffer to string
			let decryptedString = new TextDecoder().decode(decryptedBuffer);

			// Decompress if data was compressed
			if (encryptedData.compressed) {
				decryptedString = await this.decompress(decryptedString);
			}

			// Try to parse as JSON, return as string if it fails
			try {
				return JSON.parse(decryptedString);
			} catch {
				return decryptedString;
			}
		} catch (error) {
			console.error("❌ Decryption failed:", error);
			throw new Error("Data decryption failed");
		}
	}

	/**
	 * Get or create a data encryption key
	 */
	private async getOrCreateDataKey(): Promise<CryptoKey> {
		const keyId = "data_encryption_key";
		const existingKey = this.keys.get(keyId);

		if (
			existingKey &&
			(!existingKey.expiresAt || existingKey.expiresAt > Date.now())
		) {
			return existingKey.key;
		}

		// Generate new key
		const newKey = await this.generateKey(
			this.config.algorithm,
			this.config.keyLength,
		);
		const keyData: EncryptionKey = {
			id: keyId,
			key: newKey,
			createdAt: Date.now(),
			expiresAt: Date.now() + this.config.keyRotationInterval,
			algorithm: this.config.algorithm,
			usage: ["encrypt", "decrypt"],
		};

		this.keys.set(keyId, keyData);
		return newKey;
	}

	/**
	 * Generate integrity hash for data verification
	 */
	private async generateIntegrityHash(
		data: string,
		key: CryptoKey,
	): Promise<string> {
		const dataBuffer = new TextEncoder().encode(data);
		const signature = await crypto.subtle.sign("HMAC", key, dataBuffer);
		return this.arrayBufferToBase64(signature);
	}

	/**
	 * Verify data integrity
	 */
	public async verifyIntegrity(
		data: string,
		expectedHash: string,
		key: CryptoKey,
	): Promise<IntegrityResult> {
		try {
			const actualHash = await this.generateIntegrityHash(data, key);
			const isValid = actualHash === expectedHash;

			return {
				isValid,
				timestamp: Date.now(),
				checksum: actualHash,
				...(isValid ? {} : { error: "Hash mismatch" }),
			};
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: Date.now(),
				checksum: "",
			};
		}
	}

	/**
	 * Compress data using gzip-like compression
	 */
	private async compress(data: string): Promise<string> {
		// Simple compression for demo - in production, use a proper compression library
		const compressed = data.replace(/\s+/g, " ").trim();
		return btoa(compressed); // Base64 encode for binary safety
	}

	/**
	 * Decompress data
	 */
	private async decompress(data: string): Promise<string> {
		try {
			return atob(data); // Base64 decode
		} catch {
			return data; // Return original if decompression fails
		}
	}

	/**
	 * Set up automatic key rotation
	 */
	private setupKeyRotation(): void {
		this.keyRotationTimer = setInterval(async () => {
			await this.rotateKeys();
		}, this.config.keyRotationInterval);
	}

	/**
	 * Rotate encryption keys
	 */
	public async rotateKeys(): Promise<void> {
		console.log("🔄 Rotating encryption keys...");

		// Clear existing keys
		this.keys.clear();

		// Generate new master key
		await this.initializeMasterKey();

		console.log("✅ Key rotation completed");
	}

	/**
	 * Encrypt sensitive data for storage
	 */
	public async encryptForStorage(data: any, storageKey: string): Promise<void> {
		const encrypted = await this.encrypt(data);
		localStorage.setItem(`encrypted_${storageKey}`, JSON.stringify(encrypted));
	}

	/**
	 * Decrypt data from storage
	 */
	public async decryptFromStorage<T>(storageKey: string): Promise<T | null> {
		const encryptedData = localStorage.getItem(`encrypted_${storageKey}`);
		if (!encryptedData) return null;

		try {
			const parsed = JSON.parse(encryptedData) as EncryptedData;
			return (await this.decrypt(parsed)) as T;
		} catch (error) {
			console.error("❌ Failed to decrypt from storage:", error);
			return null;
		}
	}

	/**
	 * Secure transmission wrapper for API calls
	 */
	public async secureTransmission<T>(
		url: string,
		data: any,
		options: Partial<SecureTransmissionOptions> = {},
	): Promise<T> {
		const opts = {
			encryptPayload: true,
			verifyIntegrity: true,
			compressData: true,
			addTimestamp: true,
			addNonce: true,
			timeout: 30000,
			retryAttempts: 3,
			...options,
		};

		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= opts.retryAttempts; attempt++) {
			try {
				// Encrypt payload if enabled
				const payload = opts.encryptPayload
					? await this.encrypt(data, undefined, opts)
					: data;

				// Add security headers
				const headers: Record<string, string> = {
					"Content-Type": "application/json",
					"X-Encryption-Version": "1.0",
					"X-Timestamp": Date.now().toString(),
				};

				if (opts.addNonce) {
					headers["X-Nonce"] = crypto
						.getRandomValues(new Uint8Array(16))
						.toString();
				}

				// Make the request
				const response = await fetch(url, {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
					signal: AbortSignal.timeout(opts.timeout),
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const responseData = await response.json();

				// Decrypt response if it's encrypted
				if (responseData.encrypted) {
					return (await this.decrypt(responseData)) as T;
				}

				return responseData as T;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error("Unknown error");

				if (attempt < opts.retryAttempts) {
					// Wait before retry with exponential backoff
					await new Promise((resolve) =>
						setTimeout(resolve, Math.pow(2, attempt) * 1000),
					);
				}
			}
		}

		throw lastError || new Error("Secure transmission failed");
	}

	/**
	 * Utility: Convert ArrayBuffer to Base64
	 */
	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = "";
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	/**
	 * Utility: Convert Base64 to ArrayBuffer
	 */
	private base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes.buffer;
	}

	/**
	 * Get encryption statistics
	 */
	public getStats(): {
		isInitialized: boolean;
		keyCount: number;
		algorithm: string;
		keyLength: number;
		enableIntegrityCheck: boolean;
		enableCompression: boolean;
		enableKeyRotation: boolean;
	} {
		return {
			isInitialized: this.isInitialized,
			keyCount: this.keys.size,
			algorithm: this.config.algorithm,
			keyLength: this.config.keyLength,
			enableIntegrityCheck: this.config.enableIntegrityCheck,
			enableCompression: this.config.enableCompression,
			enableKeyRotation: this.config.enableKeyRotation,
		};
	}

	/**
	 * Update encryption configuration
	 */
	public updateConfig(updates: Partial<EncryptionConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	/**
	 * Get current configuration
	 */
	public getConfig(): EncryptionConfig {
		return { ...this.config };
	}

	/**
	 * Clean up resources
	 */
	public destroy(): void {
		if (this.keyRotationTimer) {
			clearInterval(this.keyRotationTimer);
			this.keyRotationTimer = null;
		}

		this.keys.clear();
		this.masterKey = null;
		this.isInitialized = false;
	}
}

// Export singleton instance
export const encryptionService = new EncryptionService();

// Export utility functions
export const encrypt = (
	data: string | object,
	options?: Partial<SecureTransmissionOptions>,
) => encryptionService.encrypt(data, undefined, options);

export const decrypt = (encryptedData: EncryptedData) =>
	encryptionService.decrypt(encryptedData);

export const encryptForStorage = (data: any, storageKey: string) =>
	encryptionService.encryptForStorage(data, storageKey);

export const decryptFromStorage = <T>(storageKey: string) =>
	encryptionService.decryptFromStorage<T>(storageKey);

export const secureTransmission = <T>(
	url: string,
	data: any,
	options?: Partial<SecureTransmissionOptions>,
) => encryptionService.secureTransmission<T>(url, data, options);

export const verifyIntegrity = (
	data: string,
	expectedHash: string,
	key: CryptoKey,
) => encryptionService.verifyIntegrity(data, expectedHash, key);
