const vscode = require('vscode');
const ActivityTracker = require('./activityTracker');
const GitManager = require('./gitManager');
const GithubAPI = require('./githubAPI');
const Scheduler = require('./scheduler');

let tracker;
let gitManager;
let githubApi;
let scheduler;

async function activate(context) {
    try {
        // Initialize Github API and authenticate
        githubApi = new GithubAPI();
        await githubApi.authenticate().catch(error => {
            throw new Error(`GitHub authentication failed: ${error.message}`);
        });

        // Initialize GitManager with the authenticated githubApi
        gitManager = new GitManager(githubApi);
        
        // Auto setup repository and configurations
        await gitManager.autoSetupRepository();

        // Initialize tracker and scheduler
        tracker = new ActivityTracker(gitManager);
        scheduler = new Scheduler(tracker);

        // Register commands
        let startTracking = vscode.commands.registerCommand(
            'activity-tracker.startTracking',
            () => tracker.start()
        );

        let stopTracking = vscode.commands.registerCommand(
            'activity-tracker.stopTracking',
            () => tracker.stop()
        );

        // Add new command for manual sync/setup
        let syncSetup = vscode.commands.registerCommand(
            'activity-tracker.syncSetup',
            async () => {
                try {
                    await gitManager.autoSetupRepository();
                    vscode.window.showInformationMessage('Activity tracker sync completed successfully!');
                } catch (error) {
                    vscode.window.showErrorMessage(`Sync failed: ${error.message}`);
                }
            }
        );

        context.subscriptions.push(startTracking, stopTracking, syncSetup);
        
        // Start tracking automatically
        tracker.start();
        
        vscode.window.showInformationMessage('Activity tracking initialized and started automatically!');
    } catch (error) {
        vscode.window.showErrorMessage(`Activation failed: ${error.message}`);
    }

    // Setup auto-save to trigger activity logging
    vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (tracker.isTracking) {
            await tracker.logFileActivity(document);
        }
    });
}
// async function initializeTracking() {
//     try {
//         await gitManager.ensureActivityTrackerRepo();
//         await gitManager.ensureProfileReadme();
//         scheduler.startPeriodicTracking();
//     } catch (error) {
//         vscode.window.showErrorMessage(`Initialization failed: ${error.message}`);
//     }
// }

function deactivate() {
    if (scheduler) {
        scheduler.stop();
        scheduler = null;
    }
    if (tracker) {
        tracker.stop();
        tracker = null;
    }
    if (gitManager) {
        gitManager = null;
    }
    if (githubApi) {
        githubApi = null;
    }
}

module.exports = { activate, deactivate };
