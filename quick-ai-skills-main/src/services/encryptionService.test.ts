import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	EncryptionService,
	encryptionService,
	encrypt,
	decrypt,
	encryptForStorage,
	decryptFromStorage,
	secureTransmission,
	verifyIntegrity,
	type EncryptedData,
	type EncryptionConfig,
	type SecureTransmissionOptions,
	type IntegrityResult,
} from "./encryptionService";

// Mock crypto API
const mockCrypto = {
	subtle: {
		generateKey: vi.fn(),
		importKey: vi.fn(),
		exportKey: vi.fn(),
		encrypt: vi.fn(),
		decrypt: vi.fn(),
		sign: vi.fn(),
	},
	getRandomValues: vi.fn(),
};

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

// Mock fetch
const mockFetch = vi.fn();

// Mock AbortSignal
const mockAbortSignal = {
	timeout: vi.fn(() => ({ signal: "mock-signal" })),
};

describe("EncryptionService", () => {
	let service: EncryptionService;
	let mockKey: CryptoKey;
	let mockEncryptedBuffer: ArrayBuffer;
	let mockDecryptedBuffer: ArrayBuffer;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
		vi.clearAllTimers();

		// Setup crypto mocks using Object.defineProperty to override read-only property
		Object.defineProperty(global, "crypto", {
			value: mockCrypto,
			writable: true,
			configurable: true,
		});

		Object.defineProperty(global, "fetch", {
			value: mockFetch,
			writable: true,
			configurable: true,
		});

		Object.defineProperty(global, "AbortSignal", {
			value: mockAbortSignal,
			writable: true,
			configurable: true,
		});

		// Setup localStorage mock
		Object.defineProperty(window, "localStorage", {
			value: localStorageMock,
			writable: true,
		});

		// Create mock key
		mockKey = {} as CryptoKey;

		// Create proper base64 encoded mock data
		const testData = "test data";
		const testDataBuffer = new TextEncoder().encode(testData);
		mockEncryptedBuffer = testDataBuffer.buffer;
		mockDecryptedBuffer = testDataBuffer.buffer;

		// Setup crypto.subtle mocks
		mockCrypto.subtle.generateKey.mockResolvedValue(mockKey);
		mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
		mockCrypto.subtle.exportKey.mockResolvedValue(testDataBuffer.buffer);
		mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedBuffer);

		// Mock decrypt to return the actual expected data
		mockCrypto.subtle.decrypt.mockImplementation((algorithm, key, data) => {
			// Return the original test data as if it was decrypted
			return Promise.resolve(testDataBuffer.buffer);
		});

		mockCrypto.subtle.sign.mockResolvedValue(testDataBuffer.buffer);

		// Setup getRandomValues mock
		mockCrypto.getRandomValues.mockImplementation((array) => {
			for (let i = 0; i < array.length; i++) {
				array[i] = Math.floor(Math.random() * 256);
			}
			return array;
		});

		// Create fresh service instance
		service = new EncryptionService();
	});

	afterEach(() => {
		if (service) {
			service.destroy();
		}
	});

	describe("Initialization", () => {
		it("should initialize successfully", async () => {
			localStorageMock.getItem.mockReturnValue(null);

			await service.initialize();

			expect(service.getStats().isInitialized).toBe(true);
			expect(mockCrypto.subtle.generateKey).toHaveBeenCalled();
		});

		it("should load existing master key from localStorage", async () => {
			const mockKeyData = {
				key: btoa("mock-key-data"), // Proper base64 encoding
				createdAt: Date.now(),
			};
			localStorageMock.getItem.mockReturnValue(JSON.stringify(mockKeyData));

			await service.initialize();

			expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
			expect(service.getStats().isInitialized).toBe(true);
		});

		it("should handle initialization errors gracefully", async () => {
			mockCrypto.subtle.generateKey.mockRejectedValue(
				new Error("Crypto error"),
			);

			await expect(service.initialize()).rejects.toThrow(
				"Encryption service initialization failed",
			);
		});
	});

	describe("Key Management", () => {
		beforeEach(async () => {
			localStorageMock.getItem.mockReturnValue(null);
			await service.initialize();
		});

		it("should generate new keys", async () => {
			const key = await service.generateKey("AES-GCM", 256, [
				"encrypt",
				"decrypt",
			]);

			expect(key).toBe(mockKey);
			expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
				{
					name: "AES-GCM",
					length: 256,
				},
				true,
				["encrypt", "decrypt"],
			);
		});

		it("should import keys from raw data", async () => {
			const keyData = btoa("mock-key-data"); // Proper base64 encoding
			const key = await service.importKey(keyData, "AES-GCM", [
				"encrypt",
				"decrypt",
			]);

			expect(key).toBe(mockKey);
			expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
		});

		it("should export keys to raw data", async () => {
			const exported = await service.exportKey(mockKey);

			expect(typeof exported).toBe("string");
			expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith("raw", mockKey);
		});

		it("should rotate keys automatically", async () => {
			vi.useFakeTimers();

			// Trigger key rotation
			await service.rotateKeys();

			expect(service.getStats().keyCount).toBe(0);

			vi.useRealTimers();
		});
	});

	describe("Encryption and Decryption", () => {
		beforeEach(async () => {
			localStorageMock.getItem.mockReturnValue(null);
			await service.initialize();
		});

		it("should encrypt string data", async () => {
			const testData = "sensitive data";
			const encrypted = await service.encrypt(testData);

			expect(encrypted).toMatchObject({
				data: expect.any(String),
				iv: expect.any(String),
				salt: expect.any(String),
				algorithm: "AES-GCM",
				version: "1.0",
				timestamp: expect.any(Number),
				compressed: true,
			});

			expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
		});

		it("should encrypt object data", async () => {
			const testData = { sensitive: "data", number: 123 };
			const encrypted = await service.encrypt(testData);

			expect(encrypted).toMatchObject({
				data: expect.any(String),
				algorithm: "AES-GCM",
				compressed: true,
			});
		});

		it("should decrypt encrypted data", async () => {
			const testData = "sensitive data";
			const encrypted = await service.encrypt(testData);
			const decrypted = await service.decrypt(encrypted);

			expect(decrypted).toBe(testData);
			expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
		});

		it("should decrypt object data", async () => {
			const testData = { sensitive: "data", number: 123 };
			const encrypted = await service.encrypt(testData);
			const decrypted = await service.decrypt(encrypted);

			expect(decrypted).toEqual(testData);
		});

		it("should handle decryption errors", async () => {
			mockCrypto.subtle.decrypt.mockRejectedValue(
				new Error("Decryption failed"),
			);

			const encrypted: EncryptedData = {
				data: btoa("invalid-data"), // Proper base64 encoding
				iv: btoa("invalid-iv"), // Proper base64 encoding
				salt: btoa("invalid-salt"), // Proper base64 encoding
				algorithm: "AES-GCM",
				version: "1.0",
				timestamp: Date.now(),
			};

			await expect(service.decrypt(encrypted)).rejects.toThrow(
				"Data decryption failed",
			);
		});

		it("should verify data integrity", async () => {
			const testData = "sensitive data";
			const encrypted = await service.encrypt(testData, undefined, {
				verifyIntegrity: true,
			});

			expect(encrypted.integrityHash).toBeDefined();
			expect(mockCrypto.subtle.sign).toHaveBeenCalled();
		});

		it("should fail integrity check with invalid hash", async () => {
			const testData = "sensitive data";
			const encrypted = await service.encrypt(testData, undefined, {
				verifyIntegrity: true,
			});

			// Modify the data to break integrity
			const modifiedEncrypted = { ...encrypted, data: btoa("modified-data") };

			await expect(service.decrypt(modifiedEncrypted)).rejects.toThrow(
				"Data integrity check failed",
			);
		});
	});

	describe("Storage Operations", () => {
		beforeEach(async () => {
			localStorageMock.getItem.mockReturnValue(null);
			await service.initialize();
		});

		it("should encrypt data for storage", async () => {
			const testData = { sensitive: "data" };
			const storageKey = "test-key";

			await service.encryptForStorage(testData, storageKey);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"encrypted_test-key",
				expect.any(String),
			);
		});

		it("should decrypt data from storage", async () => {
			const testData = { sensitive: "data" };
			const storageKey = "test-key";

			// Mock encrypted data in storage
			const encrypted = await service.encrypt(testData);
			localStorageMock.getItem.mockReturnValue(JSON.stringify(encrypted));

			const decrypted = await service.decryptFromStorage(storageKey);

			expect(decrypted).toEqual(testData);
		});

		it("should return null for non-existent storage key", async () => {
			localStorageMock.getItem.mockReturnValue(null);

			const result = await service.decryptFromStorage("non-existent");

			expect(result).toBeNull();
		});

		it("should handle storage decryption errors", async () => {
			localStorageMock.getItem.mockReturnValue('{"invalid": "json"'); // Invalid JSON

			const result = await service.decryptFromStorage("test-key");

			expect(result).toBeNull();
		});
	});

	describe("Secure Transmission", () => {
		beforeEach(async () => {
			localStorageMock.getItem.mockReturnValue(null);
			await service.initialize();
		});

		it("should perform secure transmission with encryption", async () => {
			const testData = { sensitive: "data" };
			const url = "https://api.example.com/secure";
			const mockResponse = { success: true, data: "response" };

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await service.secureTransmission(url, testData, {
				encryptPayload: true,
				verifyIntegrity: true,
			});

			expect(result).toEqual(mockResponse);
			expect(mockFetch).toHaveBeenCalledWith(
				url,
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						"X-Encryption-Version": "1.0",
						"X-Timestamp": expect.any(String),
					}),
					body: expect.any(String),
				}),
			);
		});

		it("should handle transmission errors with retries", async () => {
			const testData = { sensitive: "data" };
			const url = "https://api.example.com/secure";

			mockFetch.mockRejectedValue(new Error("Network error"));

			await expect(
				service.secureTransmission(url, testData, {
					retryAttempts: 1,
					timeout: 1000,
				}),
			).rejects.toThrow("Network error");

			expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
		});

		it("should handle HTTP errors", async () => {
			const testData = { sensitive: "data" };
			const url = "https://api.example.com/secure";

			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
			});

			await expect(
				service.secureTransmission(url, testData, { timeout: 500 }),
			).rejects.toThrow("HTTP 500: Internal Server Error");
		});

		it("should decrypt encrypted responses", async () => {
			const testData = { sensitive: "data" };
			const url = "https://api.example.com/secure";
			const encryptedResponse = await service.encrypt({
				success: true,
				data: "encrypted",
			});

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ encrypted: true, ...encryptedResponse }),
			});

			const result = await service.secureTransmission(url, testData);

			expect(result).toEqual({ success: true, data: "encrypted" });
		});
	});

	describe("Utility Functions", () => {
		beforeEach(async () => {
			localStorageMock.getItem.mockReturnValue(null);
			await service.initialize();
		});

		it("should provide working encrypt utility", async () => {
			const testData = "sensitive data";
			const encrypted = await encrypt(testData);

			expect(encrypted).toMatchObject({
				data: expect.any(String),
				algorithm: "AES-GCM",
				version: "1.0",
			});
		});

		it("should provide working decrypt utility", async () => {
			const testData = "sensitive data";
			const encrypted = await encrypt(testData);
			const decrypted = await decrypt(encrypted);

			expect(decrypted).toBe(testData);
		});

		it("should provide working encryptForStorage utility", async () => {
			const testData = { sensitive: "data" };
			const storageKey = "test-key";

			await encryptForStorage(testData, storageKey);

			expect(localStorageMock.setItem).toHaveBeenCalled();
		});

		it("should provide working decryptFromStorage utility", async () => {
			const testData = { sensitive: "data" };
			const storageKey = "test-key";

			const encrypted = await encrypt(testData);
			localStorageMock.getItem.mockReturnValue(JSON.stringify(encrypted));

			const decrypted = await decryptFromStorage(storageKey);

			expect(decrypted).toEqual(testData);
		});

		it("should provide working secureTransmission utility", async () => {
			const testData = { sensitive: "data" };
			const url = "https://api.example.com/secure";

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ success: true }),
			});

			const result = await secureTransmission(url, testData);

			expect(result).toEqual({ success: true });
		});

		it("should provide working verifyIntegrity utility", async () => {
			const testData = "sensitive data";
			const encrypted = await encrypt(testData, undefined, {
				verifyIntegrity: true,
			});

			const result = await verifyIntegrity(
				encrypted.data,
				encrypted.integrityHash!,
				mockKey,
			);

			expect(result).toMatchObject({
				isValid: expect.any(Boolean),
				timestamp: expect.any(Number),
				checksum: expect.any(String),
			});
		});
	});

	describe("Configuration", () => {
		it("should accept custom configuration", () => {
			const customConfig: Partial<EncryptionConfig> = {
				algorithm: "AES-CBC",
				keyLength: 128,
				enableCompression: false,
				enableIntegrityCheck: false,
			};

			const customService = new EncryptionService(customConfig);
			const config = customService.getConfig();

			expect(config.algorithm).toBe("AES-CBC");
			expect(config.keyLength).toBe(128);
			expect(config.enableCompression).toBe(false);
			expect(config.enableIntegrityCheck).toBe(false);
		});

		it("should update configuration", () => {
			service.updateConfig({
				algorithm: "AES-CBC",
				enableCompression: false,
			});

			const config = service.getConfig();
			expect(config.algorithm).toBe("AES-CBC");
			expect(config.enableCompression).toBe(false);
		});

		it("should provide statistics", async () => {
			localStorageMock.getItem.mockReturnValue(null);
			await service.initialize();

			const stats = service.getStats();

			expect(stats).toMatchObject({
				isInitialized: true,
				keyCount: expect.any(Number),
				algorithm: "AES-GCM",
				keyLength: 256,
				enableIntegrityCheck: true,
				enableCompression: true,
				enableKeyRotation: true,
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle crypto API errors gracefully", async () => {
			mockCrypto.subtle.generateKey.mockRejectedValue(
				new Error("Crypto API not supported"),
			);

			await expect(service.initialize()).rejects.toThrow(
				"Encryption service initialization failed",
			);
		});

		it("should handle localStorage errors", async () => {
			localStorageMock.setItem.mockImplementation(() => {
				throw new Error("Storage quota exceeded");
			});

			await expect(service.initialize()).rejects.toThrow(
				"Encryption service initialization failed",
			);
		});

		it("should handle network errors in secure transmission", async () => {
			localStorageMock.getItem.mockReturnValue(null);
			await service.initialize();

			mockFetch.mockRejectedValue(new Error("Network unavailable"));

			await expect(
				service.secureTransmission("https://api.example.com", { data: "test" }),
			).rejects.toThrow("Network unavailable");
		});
	});

	describe("Cleanup", () => {
		it("should clean up resources on destroy", async () => {
			localStorageMock.getItem.mockReturnValue(null);
			await service.initialize();

			service.destroy();

			const stats = service.getStats();
			expect(stats.isInitialized).toBe(false);
			expect(stats.keyCount).toBe(0);
		});
	});
});
