import { randomUUID } from 'crypto';
import { Job, JobStatus } from './job';
import { logger } from '../../utils/logger';

export class Queue {
  private static instance: Queue;
  private jobs: Map<string, Job>;
  private handlers: Map<string, (payload: any) => Promise<void>>;

  private constructor() {
    this.jobs = new Map();
    this.handlers = new Map();
    this.startWorker();
  }

  public static getInstance(): Queue {
    if (!Queue.instance) {
      Queue.instance = new Queue();
    }
    return Queue.instance;
  }

  public registerHandler(type: string, handler: (payload: any) => Promise<void>) {
    this.handlers.set(type, handler);
    logger.info(`[Queue] Handler registered for job type: ${type}`);
  }

  public enqueue<T>(type: string, payload: T, maxAttempts = 3): string {
    const job: Job<T> = {
      id: randomUUID(),
      type,
      payload,
      status: JobStatus.PENDING,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.jobs.set(job.id, job);
    logger.debug(`[Queue] Job enqueued: ${type} - ${job.id}`);
    return job.id;
  }

  private async startWorker() {
    setInterval(async () => {
      const pendingJobs = Array.from(this.jobs.values()).filter(j => j.status === JobStatus.PENDING);
      
      for (const job of pendingJobs) {
        await this.processJob(job);
      }
    }, 1000); // Poll every second for hyperscale simulation
  }

  private async processJob(job: Job) {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      logger.error(`[Queue] No handler for job type: ${job.type}`);
      job.status = JobStatus.FAILED;
      job.error = 'No handler registered';
      return;
    }

    job.status = JobStatus.PROCESSING;
    job.attempts += 1;
    job.updatedAt = new Date();

    try {
      await handler(job.payload);
      job.status = JobStatus.COMPLETED;
      job.updatedAt = new Date();
      logger.info(`[Queue] Job completed successfully: ${job.id}`);
      this.jobs.delete(job.id); // Cleanup completed jobs
    } catch (error: any) {
      logger.error(`[Queue] Job failed: ${job.id}`, { error: error.message });
      job.error = error.message;
      
      if (job.attempts >= job.maxAttempts) {
        job.status = JobStatus.FAILED;
        job.updatedAt = new Date();
        logger.error(`[Queue] Job max attempts reached. Moved to dead letter queue: ${job.id}`);
      } else {
        job.status = JobStatus.PENDING; // Retry
        job.updatedAt = new Date();
        logger.info(`[Queue] Job rescheduled for retry: ${job.id} (Attempt ${job.attempts}/${job.maxAttempts})`);
      }
    }
  }
}

export const queue = Queue.getInstance();
