class Scheduler {
    constructor(tracker) {
        this.tracker = tracker;
        this.interval = null;
        this.isRunning = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    startPeriodicTracking() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.interval = setInterval(async () => {
            try {
                await this.tracker.saveCurrentActivity();
                this.retryCount = 0;
            } catch (error) {
                console.error('Tracking failed:', error);
                this.handleError();
            }
        }, 30 * 60 * 1000);
    }

    handleError() {
        this.retryCount++;
        if (this.retryCount >= this.maxRetries) {
            this.stop();
            throw new Error('Tracking failed after maximum retries');
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        this.retryCount = 0;
    }
}
module.exports = Scheduler;
