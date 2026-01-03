# Persistent Job Queue

A single-node, disk-backed background job queue for Node.js.

The system uses an **in-memory FIFO queue** for fast job scheduling, a **pool of async workers** to execute jobs concurrently, and a **file-based append-only log** for persistence and crash recovery.

Jobs store only intent (`type` + `payload`), while executable logic is provided at runtime via a handler registry. On startup, the queue replays persisted job state, resets in-flight jobs, and resumes processing without data loss.

This is **infrastructure level code** designed to be:
- **Simple**: No external dependencies (Redis, RabbitMQ, etc).
- **Resilient**: Jobs survive process crashes and restarts.
- **Concurrent**: Multiple workers run in parallel (async).

---

## Features

- 🚀 **In-Memory Speed**: Jobs are queued and retrieved from memory for high performance.
- 💾 **Disk Persistence**: All job states are written to a local append-only log to survive crashes.
- 🔄 **Crash Recovery**: Automatically replays logs on startup, resetting interrupted jobs to `pending`.
- 🛠 **Worker Pool**: Configurable concurrency (e.g., run 3 or 50 jobs in parallel).
- 🧩 **Decoupled Logic**: Jobs are just data (`type` + `payload`); handlers are code.

---

## Installation

```bash
npm install persistent-job-queue
```

---

## Quick Start (Simple Example)

For simple scripts or small apps, you can define everything in one file.

```javascript
import { createJobQueue } from "persistent-job-queue";

// 1. Define your handlers (the actual logic)
const handlers = {
  send_email: async (payload) => {
    console.log(`Sending email to ${payload.to}...`);
    await new Promise(r => setTimeout(r, 1000)); // Simulate async work
  },
  resize_image: async (payload) => {
    console.log(`Resizing ${payload.file} to ${payload.width}px...`);
  }
};

// 2. Create the queue instance
const queue = createJobQueue(
  {
    storagePath: ".queue/jobs.log", // Where to store persistence file
    workerCount: 3,                 // How many jobs to run concurrently
  },
  handlers
);

// 3. Add jobs
queue.add({
  id: "job-1", 
  type: "send_email",
  payload: { to: "user@example.com" },
  attempts: 0,
  maxAttempts: 3
});

queue.add({
  id: "job-2",
  type: "resize_image",
  payload: { file: "avatar.png", width: 300 },
  attempts: 0,
  maxAttempts: 3
});
```

---

## Production Structure (Best Practices)

For larger applications, you should separate your concerns. A recommended structure ensures your code remains clean and maintainable.

### Recommended Folder Layout
```
src/
├── jobs/                 # Individual job logic files
│   ├── sendEmail.ts
│   ├── generateReport.ts
│   └── heavyTask.ts
│
├── jobHandlers.ts        # The Registry (maps types to functions)
├── queue.ts              # The Queue Instance (Singleton)
└── server.ts             # App entry point
```

### 1. Define Jobs (`src/jobs/*.ts`)

Create isolated functions for each task. This keeps your business logic testable and clean.

**`src/jobs/sendEmail.ts`**
```typescript
export async function sendEmail(payload: { to: string }) {
  console.log("Sending email to", payload.to);
  // Real email logic here...
}
```

**`src/jobs/heavyTask.ts`**
```typescript
export async function heavyTask(payload: { duration: number }) {
  console.log("Starting heavy task...");
  await new Promise(r => setTimeout(r, payload.duration));
}
```

### 2. Create the Registry (`src/jobHandlers.ts`)

This file maps the "string intent" (Job Type) to the "executable function" (Handler). It acts as the contract for your system.

```typescript
import { sendEmail } from "./jobs/sendEmail";
import { heavyTask } from "./jobs/heavyTask";

export const jobHandlers = {
  send_email: sendEmail,
  heavy_task: heavyTask,
};
```

### 3. Initialize the Queue (`src/queue.ts`)

Initialize the queue once and export the instance.

```typescript
import { createJobQueue } from "persistent-job-queue";
import { jobHandlers } from "./jobHandlers";

export const queue = createJobQueue(
  {
    storagePath: ".queue/jobs.log", // Ensure this path is gitignored
    workerCount: 5,                 // Adjust based on your server capacity
  },
  jobHandlers
);
```

### 4. Use it in your App (`src/server.ts`)

Now you can import the `queue` anywhere in your application (API routes, other services, etc) to offload work.

```typescript
import { queue } from "./queue";

// Verify queue is running...

// Inside an API route or controller:
queue.add({
  id: "unique-job-id-123",
  type: "heavy_task",
  payload: { duration: 5000 },
  attempts: 0,
  maxAttempts: 3,
});
```

---

## How It Works

1.  **Enqueue**: When you call `queue.add()`, the job is added to an **in-memory queue** (for speed) and appended to the **disk log** (for safety).
2.  **Processing**: A pool of workers (size defined by `workerCount`) constantly pulls jobs from the in-memory queue.
3.  **Execution**: The worker looks up the handler for the job's `type` in the registry you provided.
4.  **Completion/Failure**: The job status is updated to `completed` or `failed` and persisted to disk.
5.  **Crash Recovery**: If the app restarts, the library reads the disk log, finds any jobs that were `running` or `pending`, and re-queues them ensures nothing is lost.

## Why use this over Cron/DB?

| Feature | Cron + DB Polling | Persistent Job Queue |
| :--- | :--- | :--- |
| **Trigger** | Time-based (Every X mins) | Event-based (Immediate) |
| **Latency** | High (Wait for next poll) | Low (Instant execution) |
| **DB Load** | Heavy (Constant polling queries) | Zero (Disk-append mostly) |
| **Crash Safety** | Manual handling required | Built-in (Automatic Recovery) |
| **Concurrency** | Hard to manage | Built-in Worker Pool |

---

## License

MIT
