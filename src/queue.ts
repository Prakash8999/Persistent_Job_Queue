import { Job } from "./types";

/**
 * In-memory FIFO queue.
 * Responsible ONLY for holding jobs during runtime.
 */
export interface InMemoryQueue {
    enqueue(job: Job): void;
    dequeue(): Job | undefined;
    size(): number;
}

/**
 * Create a simple FIFO queue.
 */
export function createQueue(): InMemoryQueue {
    const queue: Job[] = [];

    function enqueue(job: Job) {
        queue.push(job);
    }

    function dequeue(): Job | undefined {
        return queue.shift();
    }

    function size(): number {
        return queue.length;
    }

    return {
        enqueue,
        dequeue,
        size,
    };
}
