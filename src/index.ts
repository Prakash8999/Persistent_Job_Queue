import { createQueue as createMemoryQueue } from "./queue";
import { createStorage } from "./storage";
import { recoverQueue } from "./recovery";
import { startWorkers } from "./worker";
import {
    Job,
    JobHandlerMap,
    QueueConfig,
    JobStatus,
} from "./types";

/**
 * Public factory function.
 * This is the ONLY thing users interact with.
 */
export function createJobQueue(
    config: QueueConfig,
    handlers: JobHandlerMap
) {
    // 1. Create persistence layer
    const storage = createStorage(config.storagePath);

    // 2. Create in-memory queue
    const memoryQueue = createMemoryQueue();

    // 3. Recover unfinished jobs from disk (must happen before workers)
    recoverQueue(storage, memoryQueue);

    // 4. Start workers
    startWorkers(
        config.workerCount,
        memoryQueue,
        handlers,
        storage
    );

    /**
     * Public API exposed to the user
     */
    function add<TPayload>(job: Omit<Job<TPayload>, "status" | "createdAt" | "updatedAt">) {
        const now = Date.now();

        const fullJob: Job<TPayload> = {
            ...job,
            status: JobStatus.PENDING,
            createdAt: now,
            updatedAt: now,
        };

        // Persist + enqueue
        storage.append(fullJob);
        memoryQueue.enqueue(fullJob);
    }

    return {
        add,
    };
}
