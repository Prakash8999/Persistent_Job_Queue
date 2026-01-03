import { JobStatus } from "./types";
import { InMemoryQueue } from "./queue";
import { Storage } from "./storage";

/**
 * Rebuild in-memory queue from persisted jobs.
 * Called ONCE on startup.
 */
export function recoverQueue(
    storage: Storage,
    queue: InMemoryQueue
) {
    // 1. Load latest job states from disk
    const jobs = storage.loadAll();

    // 2. Reset RUNNING → PENDING and persist
    const recoverableJobs = storage.recoverJobs(jobs);

    // 3. Re-enqueue unfinished jobs
    for (const job of recoverableJobs) {
        if (job.status === JobStatus.PENDING) {
            queue.enqueue(job);
        }
    }
}
