import { sendEmail, EmailOptions } from './mailer';

interface QueuedEmail {
  id: string;
  options: EmailOptions;
  attempts: number;
  createdAt: Date;
}

const emailQueue: QueuedEmail[] = [];
let isProcessing = false;

export function queueEmail(options: EmailOptions): void {
  const item: QueuedEmail = {
    id: Math.random().toString(36).substring(2, 11),
    options,
    attempts: 0,
    createdAt: new Date(),
  };
  emailQueue.push(item);
  processQueue();
}

async function processQueue(): Promise<void> {
  if (isProcessing || emailQueue.length === 0) return;
  isProcessing = true;

  while (emailQueue.length > 0) {
    const item = emailQueue.shift();
    if (!item) break;

    try {
      await sendEmail(item.options);
      console.log(`[EmailQueue] Sent email '${item.options.subject}' to ${item.options.to}`);
    } catch (err) {
      console.error(`[EmailQueue Error] Delivery failed for ${item.options.to}:`, err);
      if (item.attempts < 3) {
        item.attempts += 1;
        emailQueue.push(item); // Retry later
      }
    }
  }

  isProcessing = false;
}
