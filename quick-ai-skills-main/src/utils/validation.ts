import { VALIDATION_RULES, ERROR_MESSAGES } from "../lib/constants";

// Validation error type
export interface ValidationError {
	field: string;
	message: string;
	code: string;
}

// Validation result type
export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
	sanitizedData?: any;
}

// Input sanitization options
export interface SanitizeOptions {
	trim?: boolean;
	removeHtml?: boolean;
	maxLength?: number;
	allowedTags?: string[];
	allowedAttributes?: string[];
}

/**
 * Sanitizes input data to prevent XSS and injection attacks
 */
export function sanitizeInput(input: any, options: SanitizeOptions = {}): any {
	const {
		trim = true,
		removeHtml = true,
		maxLength,
		allowedTags = [],
		allowedAttributes = [],
	} = options;

	if (input === null || input === undefined) {
		return input;
	}

	if (typeof input === "string") {
		let sanitized = input;

		// Trim whitespace
		if (trim) {
			sanitized = sanitized.trim();
		}

		// Remove HTML tags if not allowed
		if (removeHtml && allowedTags.length === 0) {
			sanitized = sanitized.replace(/<[^>]*>/g, "");
		} else if (removeHtml && allowedTags.length > 0) {
			// Allow only specific HTML tags
			const allowedTagsRegex = new RegExp(
				`<(?!\/?(?:${allowedTags.join("|")})\b)[^>]+>`,
				"gi",
			);
			sanitized = sanitized.replace(allowedTagsRegex, "");
		}

		// Limit length
		if (maxLength && sanitized.length > maxLength) {
			sanitized = sanitized.substring(0, maxLength);
		}

		// Escape special characters (only if HTML tags were removed)
		if (removeHtml) {
			sanitized = sanitized
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#x27;");
		}

		return sanitized;
	}

	if (Array.isArray(input)) {
		return input.map((item) => sanitizeInput(item, options));
	}

	if (typeof input === "object" && input !== null) {
		// Handle circular references using a closure
		const seen = new WeakSet();

		const sanitizeWithCircularCheck = (obj: any): any => {
			// Only add objects to WeakSet, not primitives
			if (typeof obj === "object" && obj !== null) {
				if (seen.has(obj)) {
					return "[Circular Reference]";
				}
				seen.add(obj);
			}

			if (Array.isArray(obj)) {
				return obj.map((item) => sanitizeWithCircularCheck(item));
			}

			if (typeof obj === "object" && obj !== null) {
				const sanitized: any = {};
				for (const [key, value] of Object.entries(obj)) {
					sanitized[key] = sanitizeWithCircularCheck(value);
				}
				return sanitized;
			}

			return obj;
		};

		return sanitizeWithCircularCheck(input);
	}

	return input;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
	const errors: ValidationError[] = [];

	if (!email) {
		errors.push({
			field: "email",
			message: "Email is required",
			code: "REQUIRED",
		});
		return { isValid: false, errors };
	}

	const sanitizedEmail = sanitizeInput(email, { trim: true });

	// More strict email validation
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!emailRegex.test(sanitizedEmail)) {
		errors.push({
			field: "email",
			message: "Please enter a valid email address",
			code: "INVALID_FORMAT",
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
		sanitizedData: sanitizedEmail,
	};
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): ValidationResult {
	const errors: ValidationError[] = [];

	if (!password) {
		errors.push({
			field: "password",
			message: "Password is required",
			code: "REQUIRED",
		});
		return { isValid: false, errors };
	}

	const sanitizedPassword = sanitizeInput(password, { trim: false });

	if (sanitizedPassword.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
		errors.push({
			field: "password",
			message: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`,
			code: "TOO_SHORT",
		});
	}

	// Check for common weak patterns (only if password meets minimum length)
	if (sanitizedPassword.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
		// Check for repeated characters
		if (/^(.)\1+$/.test(sanitizedPassword)) {
			errors.push({
				field: "password",
				message: "Password cannot contain repeated characters only",
				code: "WEAK_PATTERN",
			});
		}

		// Check for only numbers
		if (/^[0-9]+$/.test(sanitizedPassword)) {
			errors.push({
				field: "password",
				message: "Password cannot contain only numbers",
				code: "WEAK_PATTERN",
			});
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		sanitizedData: sanitizedPassword,
	};
}

/**
 * Validates username
 */
export function validateUsername(username: string): ValidationResult {
	const errors: ValidationError[] = [];

	if (!username) {
		errors.push({
			field: "username",
			message: "Username is required",
			code: "REQUIRED",
		});
		return { isValid: false, errors };
	}

	const sanitizedUsername = sanitizeInput(username, {
		trim: true,
		maxLength: VALIDATION_RULES.USERNAME_MAX_LENGTH,
	});

	if (sanitizedUsername.length < VALIDATION_RULES.USERNAME_MIN_LENGTH) {
		errors.push({
			field: "username",
			message: `Username must be at least ${VALIDATION_RULES.USERNAME_MIN_LENGTH} characters long`,
			code: "TOO_SHORT",
		});
	}

	if (sanitizedUsername.length > VALIDATION_RULES.USERNAME_MAX_LENGTH) {
		errors.push({
			field: "username",
			message: `Username cannot exceed ${VALIDATION_RULES.USERNAME_MAX_LENGTH} characters`,
			code: "TOO_LONG",
		});
	}

	// Check for valid characters (alphanumeric, underscore, hyphen)
	if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedUsername)) {
		errors.push({
			field: "username",
			message:
				"Username can only contain letters, numbers, underscores, and hyphens",
			code: "INVALID_CHARACTERS",
		});
	}

	// Check for reserved usernames (only if username is valid)
	if (
		sanitizedUsername.length >= VALIDATION_RULES.USERNAME_MIN_LENGTH &&
		sanitizedUsername.length <= VALIDATION_RULES.USERNAME_MAX_LENGTH
	) {
		const reservedUsernames = ["admin", "root", "system", "guest", "anonymous"];
		if (reservedUsernames.includes(sanitizedUsername.toLowerCase())) {
			errors.push({
				field: "username",
				message: "This username is reserved and cannot be used",
				code: "RESERVED_USERNAME",
			});
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		sanitizedData: sanitizedUsername,
	};
}

/**
 * Validates project submission data
 */
export function validateProjectSubmission(data: any): ValidationResult {
	const errors: ValidationError[] = [];
	const sanitizedData: any = {};

	// Validate projectId
	if (!data.projectId) {
		errors.push({
			field: "projectId",
			message: "Project ID is required",
			code: "REQUIRED",
		});
	} else {
		sanitizedData.projectId = sanitizeInput(data.projectId, { trim: true });
	}

	// Validate code
	if (!data.code || typeof data.code !== "string") {
		errors.push({
			field: "code",
			message: "Code submission is required",
			code: "REQUIRED",
		});
	} else {
		const sanitizedCode = sanitizeInput(data.code, {
			trim: false,
			removeHtml: false,
		});

		if (sanitizedCode.length === 0) {
			errors.push({
				field: "code",
				message: "Code cannot be empty",
				code: "EMPTY",
			});
		} else if (sanitizedCode.length > 100000) {
			// 100KB limit
			errors.push({
				field: "code",
				message: "Code submission is too large (maximum 100KB)",
				code: "TOO_LARGE",
			});
		} else {
			sanitizedData.code = sanitizedCode;
		}
	}

	// Validate language
	if (!data.language) {
		errors.push({
			field: "language",
			message: "Programming language is required",
			code: "REQUIRED",
		});
	} else {
		const sanitizedLanguage = sanitizeInput(data.language, { trim: true });
		const allowedLanguages = [
			"javascript",
			"python",
			"java",
			"cpp",
			"csharp",
			"go",
			"rust",
			"php",
			"ruby",
			"swift",
		];

		if (!allowedLanguages.includes(sanitizedLanguage.toLowerCase())) {
			errors.push({
				field: "language",
				message: "Invalid programming language",
				code: "INVALID_LANGUAGE",
			});
		} else {
			sanitizedData.language = sanitizedLanguage.toLowerCase();
		}
	}

	// Validate files (optional)
	if (data.files && Array.isArray(data.files)) {
		sanitizedData.files = data.files.map((file: any) => {
			return {
				name: sanitizeInput(file.name, { trim: true, maxLength: 255 }),
				content: sanitizeInput(file.content, { trim: false, maxLength: 50000 }),
				type: sanitizeInput(file.type, { trim: true }),
			};
		});
	}

	// Validate metadata (optional)
	if (data.metadata && typeof data.metadata === "object") {
		sanitizedData.metadata = sanitizeInput(data.metadata);
	}

	return {
		isValid: errors.length === 0,
		errors,
		sanitizedData,
	};
}

/**
 * Validates lesson progress data
 */
export function validateLessonProgress(data: any): ValidationResult {
	const errors: ValidationError[] = [];
	const sanitizedData: any = {};

	// Validate lessonId
	if (!data.lessonId) {
		errors.push({
			field: "lessonId",
			message: "Lesson ID is required",
			code: "REQUIRED",
		});
	} else {
		sanitizedData.lessonId = sanitizeInput(data.lessonId, { trim: true });
	}

	// Validate progress (0-100)
	if (
		typeof data.progress !== "number" ||
		data.progress < 0 ||
		data.progress > 100
	) {
		errors.push({
			field: "progress",
			message: "Progress must be a number between 0 and 100",
			code: "INVALID_RANGE",
		});
	} else {
		sanitizedData.progress = Math.round(data.progress);
	}

	// Validate completed (boolean)
	if (typeof data.completed !== "boolean") {
		errors.push({
			field: "completed",
			message: "Completed must be a boolean value",
			code: "INVALID_TYPE",
		});
	} else {
		sanitizedData.completed = data.completed;
	}

	// Validate timeSpent (optional, positive number)
	if (data.timeSpent !== undefined) {
		if (typeof data.timeSpent !== "number" || data.timeSpent < 0) {
			errors.push({
				field: "timeSpent",
				message: "Time spent must be a positive number",
				code: "INVALID_RANGE",
			});
		} else {
			sanitizedData.timeSpent = Math.round(data.timeSpent);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		sanitizedData,
	};
}

/**
 * Validates user preferences data
 */
export function validateUserPreferences(data: any): ValidationResult {
	const errors: ValidationError[] = [];
	const sanitizedData: any = {};

	// Validate theme
	if (data.theme) {
		const allowedThemes = ["light", "dark", "system"];
		const sanitizedTheme = sanitizeInput(data.theme, { trim: true });

		if (!allowedThemes.includes(sanitizedTheme)) {
			errors.push({
				field: "theme",
				message: "Invalid theme selection",
				code: "INVALID_VALUE",
			});
		} else {
			sanitizedData.theme = sanitizedTheme;
		}
	}

	// Validate language
	if (data.language) {
		const allowedLanguages = ["en", "es", "fr", "de", "ja", "ko", "zh"];
		const sanitizedLanguage = sanitizeInput(data.language, { trim: true });

		if (!allowedLanguages.includes(sanitizedLanguage)) {
			errors.push({
				field: "language",
				message: "Invalid language selection",
				code: "INVALID_VALUE",
			});
		} else {
			sanitizedData.language = sanitizedLanguage;
		}
	}

	// Validate boolean preferences
	const booleanFields = [
		"emailNotifications",
		"pushNotifications",
		"learningReminders",
	];
	booleanFields.forEach((field) => {
		if (data[field] !== undefined) {
			if (typeof data[field] !== "boolean") {
				errors.push({
					field,
					message: `${field} must be a boolean value`,
					code: "INVALID_TYPE",
				});
			} else {
				sanitizedData[field] = data[field];
			}
		}
	});

	// Validate difficulty
	if (data.difficulty) {
		const allowedDifficulties = ["beginner", "intermediate", "advanced"];
		const sanitizedDifficulty = sanitizeInput(data.difficulty, { trim: true });

		if (!allowedDifficulties.includes(sanitizedDifficulty)) {
			errors.push({
				field: "difficulty",
				message: "Invalid difficulty level",
				code: "INVALID_VALUE",
			});
		} else {
			sanitizedData.difficulty = sanitizedDifficulty;
		}
	}

	// Validate sessionLength (positive number)
	if (data.sessionLength !== undefined) {
		if (typeof data.sessionLength !== "number" || data.sessionLength <= 0) {
			errors.push({
				field: "sessionLength",
				message: "Session length must be a positive number",
				code: "INVALID_RANGE",
			});
		} else {
			sanitizedData.sessionLength = Math.round(data.sessionLength);
		}
	}

	// Validate arrays
	const arrayFields = ["learningGoals", "preferredTopics"];
	arrayFields.forEach((field) => {
		if (data[field] && Array.isArray(data[field])) {
			sanitizedData[field] = data[field]
				.map((item: any) => sanitizeInput(item, { trim: true, maxLength: 100 }))
				.filter((item: any) => item.length > 0);
		}
	});

	return {
		isValid: errors.length === 0,
		errors,
		sanitizedData,
	};
}

/**
 * Validates GraphQL query/mutation variables
 */
export function validateGraphQLVariables(
	variables: any,
	schema: any,
): ValidationResult {
	const errors: ValidationError[] = [];
	const sanitizedVariables: any = {};

	// Basic validation for common GraphQL variable types
	for (const [key, value] of Object.entries(variables)) {
		if (value === null || value === undefined) {
			continue; // Allow null/undefined values
		}

		const sanitizedValue = sanitizeInput(value);

		// Type-specific validation
		if (typeof value === "string" && value.length > 10000) {
			errors.push({
				field: key,
				message: "String value too long",
				code: "TOO_LONG",
			});
		} else if (
			typeof value === "number" &&
			(value < -999999999 || value > 999999999)
		) {
			errors.push({
				field: key,
				message: "Number value out of range",
				code: "OUT_OF_RANGE",
			});
		} else {
			sanitizedVariables[key] = sanitizedValue;
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		sanitizedVariables,
	};
}

/**
 * Validates file upload data
 */
export function validateFileUpload(
	file: File,
	options: {
		maxSize?: number;
		allowedTypes?: string[];
		maxFiles?: number;
	} = {},
): ValidationResult {
	const errors: ValidationError[] = [];
	const {
		maxSize = 10 * 1024 * 1024, // 10MB default
		allowedTypes = [
			"text/plain",
			"application/json",
			"text/javascript",
			"text/css",
			"text/markdown",
		],
		maxFiles = 10,
	} = options;

	if (!file) {
		errors.push({
			field: "file",
			message: "File is required",
			code: "REQUIRED",
		});
		return { isValid: false, errors };
	}

	// Check file size
	if (file.size > maxSize) {
		errors.push({
			field: "file",
			message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
			code: "FILE_TOO_LARGE",
		});
	}

	// Check file type
	if (!allowedTypes.includes(file.type)) {
		errors.push({
			field: "file",
			message: `File type ${file.type} is not allowed`,
			code: "INVALID_FILE_TYPE",
		});
	}

	// Check file name
	const sanitizedFileName = sanitizeInput(file.name, {
		trim: true,
		maxLength: 255,
	});
	if (sanitizedFileName.length === 0) {
		errors.push({
			field: "file",
			message: "Invalid file name",
			code: "INVALID_FILENAME",
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
		sanitizedData: {
			name: sanitizedFileName,
			size: file.size,
			type: file.type,
		},
	};
}

/**
 * Comprehensive form validation
 */
export function validateForm(
	formData: any,
	schema: Record<string, any>,
): ValidationResult {
	const errors: ValidationError[] = [];
	const sanitizedData: any = {};

	for (const [field, rules] of Object.entries(schema)) {
		const value = formData[field];
		const fieldErrors: ValidationError[] = [];

		// Required validation
		if (
			rules.required &&
			(value === null || value === undefined || value === "")
		) {
			fieldErrors.push({
				field,
				message: rules.requiredMessage || `${field} is required`,
				code: "REQUIRED",
			});
		}

		// Skip other validations if field is empty and not required
		if (
			(value === null || value === undefined || value === "") &&
			!rules.required
		) {
			continue;
		}

		// Type validation
		if (rules.type && typeof value !== rules.type) {
			fieldErrors.push({
				field,
				message: `${field} must be of type ${rules.type}`,
				code: "INVALID_TYPE",
			});
		}

		// String validations
		if (typeof value === "string") {
			const sanitizedValue = sanitizeInput(value, {
				trim: rules.trim !== false,
				maxLength: rules.maxLength,
			});

			if (rules.minLength && sanitizedValue.length < rules.minLength) {
				fieldErrors.push({
					field,
					message: `${field} must be at least ${rules.minLength} characters long`,
					code: "TOO_SHORT",
				});
			}

			if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
				fieldErrors.push({
					field,
					message: `${field} cannot exceed ${rules.maxLength} characters`,
					code: "TOO_LONG",
				});
			}

			if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
				fieldErrors.push({
					field,
					message: rules.patternMessage || `${field} format is invalid`,
					code: "INVALID_FORMAT",
				});
			}

			sanitizedData[field] = sanitizedValue;
		}

		// Number validations
		if (typeof value === "number") {
			if (rules.min !== undefined && value < rules.min) {
				fieldErrors.push({
					field,
					message: `${field} must be at least ${rules.min}`,
					code: "TOO_SMALL",
				});
			}

			if (rules.max !== undefined && value > rules.max) {
				fieldErrors.push({
					field,
					message: `${field} cannot exceed ${rules.max}`,
					code: "TOO_LARGE",
				});
			}

			sanitizedData[field] = value;
		}

		// Array validations
		if (Array.isArray(value)) {
			if (rules.minItems && value.length < rules.minItems) {
				fieldErrors.push({
					field,
					message: `${field} must have at least ${rules.minItems} items`,
					code: "TOO_FEW_ITEMS",
				});
			}

			if (rules.maxItems && value.length > rules.maxItems) {
				fieldErrors.push({
					field,
					message: `${field} cannot have more than ${rules.maxItems} items`,
					code: "TOO_MANY_ITEMS",
				});
			}

			sanitizedData[field] = value.map((item: any) => sanitizeInput(item));
		}

		// Add field errors to main errors array
		errors.push(...fieldErrors);
	}

	return {
		isValid: errors.length === 0,
		errors,
		sanitizedData,
	};
}

/**
 * Creates a validation error message for display
 */
export function createValidationErrorMessage(
	errors: ValidationError[],
): string {
	if (errors.length === 0) return "";

	const messages = errors.map((error) => error.message);
	return messages.join(". ");
}

/**
 * Validates and sanitizes API request data
 */
export function validateApiRequest(
	data: any,
	endpoint: string,
): ValidationResult {
	// Endpoint-specific validation schemas
	const schemas: Record<string, any> = {
		"/auth/login": {
			email: {
				required: true,
				type: "string",
				pattern: VALIDATION_RULES.EMAIL,
			},
			password: {
				required: true,
				type: "string",
				minLength: VALIDATION_RULES.PASSWORD_MIN_LENGTH,
			},
		},
		"/auth/register": {
			email: {
				required: true,
				type: "string",
				pattern: VALIDATION_RULES.EMAIL,
			},
			password: {
				required: true,
				type: "string",
				minLength: VALIDATION_RULES.PASSWORD_MIN_LENGTH,
			},
			username: {
				required: true,
				type: "string",
				minLength: VALIDATION_RULES.USERNAME_MIN_LENGTH,
				maxLength: VALIDATION_RULES.USERNAME_MAX_LENGTH,
			},
		},
		"/projects/submit": {
			projectId: { required: true, type: "string" },
			code: { required: true, type: "string", maxLength: 100000 },
			language: { required: true, type: "string" },
		},
		"/lessons/progress": {
			lessonId: { required: true, type: "string" },
			progress: { required: true, type: "number", min: 0, max: 100 },
			completed: { required: true, type: "boolean" },
		},
	};

	const schema = schemas[endpoint];
	if (!schema) {
		// If no specific schema, just sanitize the data
		return {
			isValid: true,
			errors: [],
			sanitizedData: sanitizeInput(data),
		};
	}

	return validateForm(data, schema);
}
