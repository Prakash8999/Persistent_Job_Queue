import { Job, JobHandlerMap, JobStatus } from "./types";
import { InMemoryQueue } from "./queue";
import { Storage } from "./storage";

/**
 * Start a pool of workers.
 * Each worker runs an infinite async loop.
 */
export function startWorkers(
    workerCount: number,
    queue: InMemoryQueue,
    handlers: JobHandlerMap,
    storage: Storage
) {
    for (let i = 0; i < workerCount; i++) {
        runWorker(queue, handlers, storage);
    }
}

/**
 * Single worker loop.
 */
async function runWorker(
    queue: InMemoryQueue,
    handlers: JobHandlerMap,
    storage: Storage
) {
    while (true) {
        const job = queue.dequeue();

        if (!job) {
            // No job available, yield control to event loop
            await sleep(100);
            continue;
        }

        await executeJob(job, handlers, queue, storage);
    }
}

/**
 * Execute a single job safely.
 */
async function executeJob(
    job: Job,
    handlers: JobHandlerMap,
    queue: InMemoryQueue,
    storage: Storage
) {
    const handler = handlers[job.type];

    if (!handler) {
        // No handler registered for this job type
        job.status = JobStatus.FAILED;
        job.updatedAt = Date.now();
        storage.append(job);
        return;
    }

    try {
        // Mark job as RUNNING
        job.status = JobStatus.RUNNING;
        job.updatedAt = Date.now();
        storage.append(job);

        // Execute business logic (async)
        await handler(job.payload);

        // Mark job as COMPLETED
        job.status = JobStatus.COMPLETED;
        job.updatedAt = Date.now();
        storage.append(job);
    } catch (err) {
        job.attempts += 1;

        if (job.attempts >= job.maxAttempts) {
            job.status = JobStatus.FAILED;
        } else {
            job.status = JobStatus.PENDING;
            queue.enqueue(job);
        }

        job.updatedAt = Date.now();
        storage.append(job);
    }
}

/**
 * Simple async sleep helper.
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
