import {
	ENV,
	API_ENDPOINTS,
	HTTP_STATUS,
	ERROR_MESSAGES,
} from "@/lib/constants";
import { handleError } from "@/utils/errorHandling";
import {
	llmService,
	type CodeEvaluationRequest,
	type CodeEvaluationResponse,
} from "./llmService";

// Queue item status types
export type QueueItemStatus =
	| "pending"
	| "processing"
	| "evaluating"
	| "completed"
	| "failed"
	| "cancelled"
	| "retrying";

// Queue item priority types
export type QueuePriority = "low" | "normal" | "high" | "urgent";

// Queue item interface
export interface QueueItem {
	id: string;
	projectId: string;
	userId: string;
	submission: {
		code: string;
		language: string;
		files?: any[];
		metadata?: Record<string, any>;
	};
	status: QueueItemStatus;
	priority: QueuePriority;
	position: number;
	estimatedWaitTime: number; // in seconds
	processingTime?: number; // in seconds
	startedAt?: string;
	completedAt?: string;
	error?: string;
	retryCount: number;
	maxRetries: number;
	result?: CodeEvaluationResponse;
	createdAt: string;
	updatedAt: string;
}

// Queue statistics interface
export interface QueueStats {
	totalItems: number;
	pendingItems: number;
	processingItems: number;
	completedItems: number;
	failedItems: number;
	averageWaitTime: number; // in seconds
	averageProcessingTime: number; // in seconds
	estimatedQueueTime: number; // in seconds
}

// Queue configuration interface
export interface QueueConfig {
	maxConcurrentJobs: number;
	maxRetries: number;
	retryDelay: number; // in seconds
	priorityWeights: Record<QueuePriority, number>;
	timeout: number; // in seconds
	cleanupInterval: number; // in seconds
}

// Queue event types
export type QueueEventType =
	| "item_added"
	| "item_started"
	| "item_completed"
	| "item_failed"
	| "item_cancelled"
	| "queue_updated";

// Queue event interface
export interface QueueEvent {
	type: QueueEventType;
	itemId: string;
	timestamp: string;
	data?: any;
}

// Queue listener interface
export interface QueueListener {
	id: string;
	eventTypes: QueueEventType[];
	callback: (event: QueueEvent) => void;
}

// Project Queue Service class
export class ProjectQueueService {
	private queue: Map<string, QueueItem> = new Map();
	private processing: Set<string> = new Set();
	private listeners: Map<string, QueueListener> = new Map();
	private config: QueueConfig;
	private isRunning: boolean = false;
	private cleanupInterval?: NodeJS.Timeout;
	private stats: QueueStats;

	constructor(config?: Partial<QueueConfig>) {
		this.config = {
			maxConcurrentJobs: 3,
			maxRetries: 3,
			retryDelay: 30,
			priorityWeights: {
				low: 1,
				normal: 2,
				high: 3,
				urgent: 4,
			},
			timeout: 300, // 5 minutes
			cleanupInterval: 3600, // 1 hour
			...config,
		};

		this.stats = this.calculateStats();
		this.startCleanupInterval();
	}

	/**
	 * Add a project submission to the queue
	 */
	async addToQueue(
		projectId: string,
		userId: string,
		submission: any,
		priority: QueuePriority = "normal",
	): Promise<QueueItem> {
		const item: QueueItem = {
			id: this.generateId(),
			projectId,
			userId,
			submission,
			status: "pending",
			priority,
			position: this.getNextPosition(),
			estimatedWaitTime: this.calculateEstimatedWaitTime(priority),
			retryCount: 0,
			maxRetries: this.config.maxRetries,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		this.queue.set(item.id, item);
		this.updateStats();
		this.emitEvent("item_added", item.id, { item });

		// Start processing if not already running
		if (!this.isRunning) {
			this.startProcessing();
		}

		return item;
	}

	/**
	 * Get queue item by ID
	 */
	getQueueItem(itemId: string): QueueItem | undefined {
		return this.queue.get(itemId);
	}

	/**
	 * Get all queue items for a user
	 */
	getUserQueueItems(userId: string): QueueItem[] {
		return Array.from(this.queue.values())
			.filter((item) => item.userId === userId)
			.sort((a, b) => a.position - b.position);
	}

	/**
	 * Get queue statistics
	 */
	getQueueStats(): QueueStats {
		return { ...this.stats };
	}

	/**
	 * Cancel a queue item
	 */
	async cancelQueueItem(itemId: string, userId: string): Promise<boolean> {
		const item = this.queue.get(itemId);

		if (!item || item.userId !== userId) {
			return false;
		}

		if (item.status === "completed" || item.status === "failed") {
			return false;
		}

		item.status = "cancelled";
		item.updatedAt = new Date().toISOString();

		if (this.processing.has(itemId)) {
			this.processing.delete(itemId);
		}

		this.updateStats();
		this.emitEvent("item_cancelled", itemId, { item });

		return true;
	}

	/**
	 * Retry a failed queue item
	 */
	async retryQueueItem(itemId: string, userId: string): Promise<boolean> {
		const item = this.queue.get(itemId);

		if (!item || item.userId !== userId) {
			return false;
		}

		if (item.status !== "failed" || item.retryCount >= item.maxRetries) {
			return false;
		}

		item.status = "pending";
		item.retryCount++;
		item.error = undefined;
		item.position = this.getNextPosition();
		item.estimatedWaitTime = this.calculateEstimatedWaitTime(item.priority);
		item.updatedAt = new Date().toISOString();

		this.updateStats();
		this.emitEvent("item_added", itemId, { item });

		return true;
	}

	/**
	 * Subscribe to queue events
	 */
	subscribe(
		eventTypes: QueueEventType[],
		callback: (event: QueueEvent) => void,
	): string {
		const listenerId = this.generateId();
		const listener: QueueListener = {
			id: listenerId,
			eventTypes,
			callback,
		};

		this.listeners.set(listenerId, listener);
		return listenerId;
	}

	/**
	 * Unsubscribe from queue events
	 */
	unsubscribe(listenerId: string): boolean {
		return this.listeners.delete(listenerId);
	}

	/**
	 * Start processing the queue
	 */
	private async startProcessing(): Promise<void> {
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;

		while (
			this.isRunning &&
			this.processing.size < this.config.maxConcurrentJobs
		) {
			const nextItem = this.getNextItem();

			if (!nextItem) {
				break;
			}

			this.processItem(nextItem);
		}

		this.isRunning = false;
	}

	/**
	 * Get the next item to process based on priority
	 */
	private getNextItem(): QueueItem | undefined {
		const pendingItems = Array.from(this.queue.values())
			.filter((item) => item.status === "pending")
			.sort((a, b) => {
				// Sort by priority weight first
				const priorityDiff =
					this.config.priorityWeights[b.priority] -
					this.config.priorityWeights[a.priority];
				if (priorityDiff !== 0) {
					return priorityDiff;
				}
				// Then by position (FIFO within same priority)
				return a.position - b.position;
			});

		return pendingItems[0];
	}

	/**
	 * Process a queue item
	 */
	private async processItem(item: QueueItem): Promise<void> {
		this.processing.add(item.id);

		item.status = "processing";
		item.startedAt = new Date().toISOString();
		item.updatedAt = new Date().toISOString();

		this.emitEvent("item_started", item.id, { item });

		try {
			// Start processing timeout
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() => reject(new Error("Processing timeout")),
					this.config.timeout * 1000,
				);
			});

			// Process the item
			const processPromise = this.evaluateProject(item);

			const result = await Promise.race([processPromise, timeoutPromise]);

			// Mark as completed
			item.status = "completed";
			item.result = result;
			item.completedAt = new Date().toISOString();
			item.processingTime = this.calculateProcessingTime(
				item.startedAt!,
				item.completedAt!,
			);
			item.updatedAt = new Date().toISOString();

			this.emitEvent("item_completed", item.id, { item, result });
		} catch (error: any) {
			// Handle failure
			item.status = "failed";
			item.error = error.message;
			item.updatedAt = new Date().toISOString();

			this.emitEvent("item_failed", item.id, { item, error: error.message });

			// Retry if possible
			if (item.retryCount < item.maxRetries) {
				setTimeout(() => {
					this.retryItem(item);
				}, this.config.retryDelay * 1000);
			}
		} finally {
			this.processing.delete(item.id);
			this.updateStats();

			// Continue processing if there are more items
			if (this.queue.size > 0) {
				this.startProcessing();
			}
		}
	}

	/**
	 * Evaluate a project using the LLM service
	 */
	private async evaluateProject(
		item: QueueItem,
	): Promise<CodeEvaluationResponse> {
		item.status = "evaluating";
		item.updatedAt = new Date().toISOString();

		const evaluationRequest: CodeEvaluationRequest = {
			code: item.submission.code,
			language: item.submission.language,
			projectId: item.projectId,
			requirements: [], // This would come from the project definition
			rubric: {
				functionality: 40,
				codeQuality: 30,
				bestPractices: 30,
			},
			context: {
				lessonId: item.submission.metadata?.lessonId,
				difficulty: item.submission.metadata?.difficulty,
				learningObjectives: item.submission.metadata?.learningObjectives,
			},
			metadata: item.submission.metadata,
		};

		return await llmService.evaluateCode(evaluationRequest);
	}

	/**
	 * Retry a failed item
	 */
	private async retryItem(item: QueueItem): Promise<void> {
		if (item.retryCount >= item.maxRetries) {
			return;
		}

		item.status = "pending";
		item.retryCount++;
		item.error = undefined;
		item.position = this.getNextPosition();
		item.estimatedWaitTime = this.calculateEstimatedWaitTime(item.priority);
		item.updatedAt = new Date().toISOString();

		this.updateStats();
		this.emitEvent("item_added", item.id, { item });

		// Start processing if not already running
		if (!this.isRunning) {
			this.startProcessing();
		}
	}

	/**
	 * Calculate estimated wait time based on priority and queue position
	 */
	private calculateEstimatedWaitTime(priority: QueuePriority): number {
		const baseTime = 30; // 30 seconds base time
		const priorityMultiplier = this.config.priorityWeights[priority];
		const queueLength = Array.from(this.queue.values()).filter(
			(item) => item.status === "pending",
		).length;

		return Math.max(baseTime, (queueLength * 15) / priorityMultiplier);
	}

	/**
	 * Calculate processing time in seconds
	 */
	private calculateProcessingTime(
		startedAt: string,
		completedAt: string,
	): number {
		const start = new Date(startedAt).getTime();
		const end = new Date(completedAt).getTime();
		return Math.round((end - start) / 1000);
	}

	/**
	 * Get next position in queue
	 */
	private getNextPosition(): number {
		const positions = Array.from(this.queue.values())
			.filter((item) => item.status === "pending")
			.map((item) => item.position);

		return positions.length > 0 ? Math.max(...positions) + 1 : 1;
	}

	/**
	 * Update queue statistics
	 */
	private updateStats(): void {
		this.stats = this.calculateStats();
		this.emitEvent("queue_updated", "", { stats: this.stats });
	}

	/**
	 * Calculate queue statistics
	 */
	private calculateStats(): QueueStats {
		const items = Array.from(this.queue.values());
		const pendingItems = items.filter((item) => item.status === "pending");
		const processingItems = items.filter(
			(item) => item.status === "processing" || item.status === "evaluating",
		);
		const completedItems = items.filter((item) => item.status === "completed");
		const failedItems = items.filter((item) => item.status === "failed");

		const processingTimes = completedItems
			.filter((item) => item.processingTime)
			.map((item) => item.processingTime!);

		const averageProcessingTime =
			processingTimes.length > 0
				? processingTimes.reduce((sum, time) => sum + time, 0) /
					processingTimes.length
				: 0;

		const averageWaitTime =
			pendingItems.length > 0
				? pendingItems.reduce((sum, item) => sum + item.estimatedWaitTime, 0) /
					pendingItems.length
				: 0;

		const estimatedQueueTime = pendingItems.length * averageProcessingTime;

		return {
			totalItems: items.length,
			pendingItems: pendingItems.length,
			processingItems: processingItems.length,
			completedItems: completedItems.length,
			failedItems: failedItems.length,
			averageWaitTime,
			averageProcessingTime,
			estimatedQueueTime,
		};
	}

	/**
	 * Emit queue event to listeners
	 */
	private emitEvent(type: QueueEventType, itemId: string, data?: any): void {
		const event: QueueEvent = {
			type,
			itemId,
			timestamp: new Date().toISOString(),
			data,
		};

		this.listeners.forEach((listener) => {
			if (listener.eventTypes.includes(type)) {
				try {
					listener.callback(event);
				} catch (error) {
					handleError(error, {
						action: "queue-event-callback",
						eventType: type,
					});
				}
			}
		});
	}

	/**
	 * Start cleanup interval
	 */
	private startCleanupInterval(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupCompletedItems();
		}, this.config.cleanupInterval * 1000);
	}

	/**
	 * Clean up completed items older than 24 hours
	 */
	private cleanupCompletedItems(): void {
		const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

		for (const [itemId, item] of this.queue.entries()) {
			if (
				(item.status === "completed" ||
					item.status === "failed" ||
					item.status === "cancelled") &&
				new Date(item.completedAt || item.updatedAt) < cutoffTime
			) {
				this.queue.delete(itemId);
			}
		}

		this.updateStats();
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Stop the queue service
	 */
	stop(): void {
		this.isRunning = false;

		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		this.listeners.clear();
		this.queue.clear();
		this.processing.clear();
	}

	/**
	 * Get queue health status
	 */
	getHealthStatus(): {
		isRunning: boolean;
		activeJobs: number;
		queueSize: number;
		lastActivity: string;
	} {
		const lastActivity = Array.from(this.queue.values()).reduce(
			(latest, item) => {
				const itemTime = new Date(item.updatedAt).getTime();
				return itemTime > latest ? itemTime : latest;
			},
			0,
		);

		return {
			isRunning: this.isRunning,
			activeJobs: this.processing.size,
			queueSize: this.queue.size,
			lastActivity: new Date(lastActivity).toISOString(),
		};
	}
}

// Export singleton instance
export const projectQueueService = new ProjectQueueService();

// Export for testing
export default ProjectQueueService;
