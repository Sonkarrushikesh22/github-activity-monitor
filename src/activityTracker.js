const vscode = require('vscode');

class ActivityTracker {
    constructor(gitManager, options = {}) {
        this.gitManager = gitManager;
        this.isTracking = false;
        this.currentActivity = {};
        this.previousContent = new Map();
        this.maxCachedFiles = options.maxCachedFiles || 100;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
    }

    async trackCodeChanges(document) {
        try {
            const currentContent = document.getText();
            const previousContent = this.previousContent.get(document.fileName) || '';
            
            const changes = {
                functions: this.detectFunctionChanges(previousContent, currentContent),
                classes: { added: [], modified: [], removed: [] },  // Initialize with empty arrays
                imports: { added: [], modified: [], removed: [] },  // Initialize with empty arrays
                lineChanges: this.getLineChanges(previousContent, currentContent)
            };

            this.managePreviousContent(document.fileName, currentContent);
            return changes;
        } catch (error) {
            console.error('Error tracking changes:', error);
            throw new Error(`Failed to track changes: ${error.message}`);
        }
    }

    managePreviousContent(fileName, content) {
        // Implement LRU-like cache
        if (this.previousContent.size >= this.maxCachedFiles) {
            const oldestKey = this.previousContent.keys().next().value;
            this.previousContent.delete(oldestKey);
        }
        this.previousContent.set(fileName, content);
    }

    async logFileActivity(document) {
        if (!this.isTracking) return;

        let attempt = 0;
        while (attempt < this.retryAttempts) {
            try {
                const changes = await this.trackCodeChanges(document);
                const activityLog = {
                    file: document.fileName,
                    project: this.getProjectName(document.uri),
                    timestamp: new Date().toISOString(),
                    changes: {
                        functions: changes.functions,
                        classes: changes.classes,
                        imports: changes.imports,
                        lineStats: changes.lineChanges,
                        type: this.determineChangeType(changes)
                    }
                };

                await this.gitManager.logActivity(activityLog);
                return;
            } catch (error) {
                attempt++;
                if (attempt === this.retryAttempts) {
                    vscode.window.showErrorMessage(`Failed to log activity after ${this.retryAttempts} attempts: ${error.message}`);
                    console.error('Failed to log activity:', error);
                } else {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                }
            }
        }
    }

    determineChangeType(changes) {
        const types = new Set();
        if (changes.functions.added.length > 0) types.add('FUNCTION_ADDED');
        if (changes.functions.modified.length > 0) types.add('FUNCTION_MODIFIED');
        if (changes.functions.removed.length > 0) types.add('FUNCTION_REMOVED');
        if (changes.classes.added.length > 0) types.add('CLASS_ADDED');
        if (changes.classes.modified.length > 0) types.add('CLASS_MODIFIED');
        if (changes.imports.added.length > 0) types.add('IMPORT_ADDED');
        if (changes.lineChanges.modifiedLines > 0) types.add('CODE_MODIFIED');
        return Array.from(types);
    }

    getProjectName(uri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        return workspaceFolder ? workspaceFolder.name : uri.fsPath.split(/[\\/]/).pop();
    }

    start() {
        this.isTracking = true;
        vscode.window.showInformationMessage('Activity tracking started');
    }

    stop() {
        this.isTracking = false;
        this.previousContent.clear();
        vscode.window.showInformationMessage('Activity tracking stopped');
    }

    dispose() {
        this.stop();
        this.previousContent = null;
        this.gitManager = null;
    }

    detectFunctionChanges(oldContent, newContent) {
        // Simple regex-based function detection
        const functionRegex = /function\s+(\w+)\s*\(/g;
        const oldFunctions = [...oldContent.matchAll(functionRegex)].map(m => m[1]);
        const newFunctions = [...newContent.matchAll(functionRegex)].map(m => m[1]);
        
        return {
            added: newFunctions.filter(f => !oldFunctions.includes(f)),
            modified: [], // Would need more complex parsing to detect modifications
            removed: oldFunctions.filter(f => !newFunctions.includes(f))
        };
    }

    getLineChanges(oldContent, newContent) {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        return {
            addedLines: newLines.length - oldLines.length,
            modifiedLines: Math.abs(newLines.length - oldLines.length),
            totalLines: newLines.length
        };
    }
}

module.exports = ActivityTracker;