import fs from "fs";
import path from "path";
import { Job, JobStatus } from "./types";

export interface Storage {
    append(job: Job): void;
    loadAll(): Map<string, Job>;
    recoverJobs(jobs: Map<string, Job>): Job[];
}

/**
 * Create a file-based storage engine.
 * Responsible ONLY for persistence.
 */
export function createStorage(filePath: string): Storage {
    ensureFile(filePath);

    function append(job: Job) {
        const line = JSON.stringify(job);
        fs.appendFileSync(filePath, line + "\n", { encoding: "utf-8" });
    }

    function loadAll(): Map<string, Job> {
        const jobs = new Map<string, Job>();

        if (!fs.existsSync(filePath)) return jobs;

        const content = fs.readFileSync(filePath, "utf-8");
        if (!content.trim()) return jobs;

        const lines = content.split("\n");

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const job: Job = JSON.parse(line);
                jobs.set(job.id, job);
            } catch {
                // ignore malformed lines
            }
        }

        return jobs;
    }

    function recoverJobs(jobs: Map<string, Job>): Job[] {
        const recovered: Job[] = [];

        for (const job of jobs.values()) {
            if (job.status === JobStatus.RUNNING) {
                job.status = JobStatus.PENDING;
                job.updatedAt = Date.now();
                append(job);
            }

            if (job.status === JobStatus.PENDING) {
                recovered.push(job);
            }
        }

        return recovered;
    }

    return {
        append,
        loadAll,
        recoverJobs,
    };
}

/**
 * Ensure the storage file exists.
 */
function ensureFile(filePath: string) {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "", { encoding: "utf-8" });
    }
}
