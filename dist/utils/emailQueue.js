"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueEmail = queueEmail;
const mailer_1 = require("./mailer");
const emailQueue = [];
let isProcessing = false;
function queueEmail(options) {
    const item = {
        id: Math.random().toString(36).substring(2, 11),
        options,
        attempts: 0,
        createdAt: new Date(),
    };
    emailQueue.push(item);
    processQueue();
}
async function processQueue() {
    if (isProcessing || emailQueue.length === 0)
        return;
    isProcessing = true;
    while (emailQueue.length > 0) {
        const item = emailQueue.shift();
        if (!item)
            break;
        try {
            await (0, mailer_1.sendEmail)(item.options);
            console.log(`[EmailQueue] Sent email '${item.options.subject}' to ${item.options.to}`);
        }
        catch (err) {
            console.error(`[EmailQueue Error] Delivery failed for ${item.options.to}:`, err);
            if (item.attempts < 3) {
                item.attempts += 1;
                emailQueue.push(item); // Retry later
            }
        }
    }
    isProcessing = false;
}
