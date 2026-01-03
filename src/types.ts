// Unique identifier for a job
export type JobId = string;

// Job lifecycle states
export enum JobStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
}

// Generic job definition
export interface Job<TPayload = unknown> {
    id: JobId;
    type: string;           // e.g. "send_email", "resize_image"
    payload: TPayload;      // input data for the handler
    status: JobStatus;
    attempts: number;
    maxAttempts: number;
    createdAt: number;      // timestamp (ms)
    updatedAt: number;      // timestamp (ms)
}

// Job handler function signature
export type JobHandler<TPayload = unknown> = (
    payload: TPayload
) => Promise<void>;

// Map of job type → handler
export type JobHandlerMap = Record<string, JobHandler<any>>;

// Queue configuration
export interface QueueConfig {
    /**
     * Path where queue runtime data is stored.
     * This directory/file must be gitignored.
     */
    storagePath: string;

    /**
     * Number of workers running in parallel.
     * Controls concurrency.
     */
    workerCount: number;
}
