const fs = require('fs');
const path = require('path');

class GitManager {
    constructor(githubApi) {
        this.githubApi = githubApi;
        this.activityQueue = new Map();
        this.isProcessingQueue = false;
        this.queueProcessInterval = null;
        this.REPO_NAME = 'activity-tracker';
    }

    async ensureProfileRepository() {
        try {
            console.log('Checking for profile repository...');
            const exists = await this.githubApi.checkRepoExists(this.githubApi.username);
            
            if (!exists) {
                console.log('Creating profile repository...');
                await this.githubApi.createRepo(this.githubApi.username, {
                    description: `${this.githubApi.username}'s GitHub Profile`,
                    isProfile: true
                });
                // Wait for repository creation to complete
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Failed to ensure profile repository:', error);
            throw error;
        }
    }
    
    async ensureProfileReadme() {
        try {
            console.log('Checking profile README...');
            const existingContent = await this.githubApi.getFileContent(this.githubApi.username, 'README.md');
    
            // Correctly format both visualizations as images
            const visualizationsUrl = `https://raw.githubusercontent.com/${this.githubApi.username}/activity-tracker/main/visualizations`;
    
            const updatedContent = `# Hi there 👋
Welcome to my GitHub profile!
            
## Coding Activity
            
### Activity Heatmap
![Activity Heatmap](${visualizationsUrl}/heatmap.svg)
            
### Project Activity
![Project Activity](${visualizationsUrl}/activity-chart.svg)
            
_Last updated: ${new Date().toUTCString()}_
            `;
            
            if (!existingContent || existingContent !== updatedContent) {
                console.log('Updating profile README with visualizations...');
                await this.githubApi.updateFile(
                    this.githubApi.username,
                    'README.md',
                    updatedContent,
                    'Update profile README with visualizations',
                    existingContent ? existingContent.sha : null
                );
            }
        } catch (error) {
            console.error('Failed to update profile README:', error);
            throw error;
        }
    }
    
    
    async autoSetupRepository() {
        try {
            console.log('Starting automated repository setup...');
            
            // First ensure the profile repository exists
            await this.ensureProfileRepository();
            await this.ensureProfileReadme();
            
            // Then set up the activity tracker repository
            await this.ensureRepository();
            await this.configureRepositorySettings();
            await this.initializeRepoStructure();
            await this.setupGitHubActions();
            
            console.log('Automated repository setup completed successfully');
            return true;
        } catch (error) {
            console.error('Automated setup failed:', error);
            throw new Error(`Automated setup failed: ${error.message}`);
        }
    }

    async ensureRepository() {
        const exists = await this.githubApi.checkRepoExists(this.REPO_NAME);
        if (!exists) {
            console.log('Creating new repository...');
            await this.githubApi.createRepo(this.REPO_NAME);
            // Wait for repository creation to complete
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    async configureRepositorySettings() {
        try {
            console.log('Configuring repository settings...');
            
            // Update repository settings using the correct API endpoint
            await this.githubApi.octokit.repos.update({
                owner: this.githubApi.username,
                repo: this.REPO_NAME,
                has_issues: true,
                has_projects: true,
                has_wiki: true,
                allow_squash_merge: true,
                allow_merge_commit: true,
                allow_rebase_merge: true,
                delete_branch_on_merge: true,
                allow_auto_merge: true,
                visibility: 'public'
            });

            // Enable vulnerability alerts and security features
            await this.githubApi.octokit.request('PUT /repos/{owner}/{repo}/vulnerability-alerts', {
                owner: this.githubApi.username,
                repo: this.REPO_NAME,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

        } catch (error) {
            console.log('Some repository settings may already be configured:', error.message);
        }
    }

    async setupBranchAndEnvironments() {
        try {
            console.log('Setting up branch protection and environments...');
            
            await this.githubApi.octokit.repos.createOrUpdateEnvironment({
                owner: this.githubApi.username,
                repo: this.REPO_NAME,
                environment_name: 'github-pages',
                deployment_branch_policy: {
                    protected_branches: false,
                    custom_branch_policies: true
                }
            });

            await this.githubApi.octokit.repos.updateBranchProtection({
                owner: this.githubApi.username,
                repo: this.REPO_NAME,
                branch: 'main',
                required_status_checks: null,
                enforce_admins: false,
                required_pull_request_reviews: null,
                restrictions: null,
                allow_force_pushes: true,
                allow_deletions: false
            });
        } catch (error) {
            console.log('Branch and environment setup completed with warnings:', error.message);
        }
    }

    // async setupGitHubPages() {
    //     try {
    //         console.log('Setting up GitHub Pages...');
            
    //         // Create index.html directly in root instead of visualizations directory
    //         await this.githubApi.updateFile(
    //             this.REPO_NAME,
    //             'index.html',
    //             `<!DOCTYPE html>
    // <html>
    // <head>
    //     <title>Coding Activity Dashboard</title>
    //     <meta http-equiv="refresh" content="0; url=visualizations/index.html">
    // </head>
    // <body>
    //     <p>Redirecting to dashboard...</p>
    // </body>
    // </html>`,
    //             'Add root redirect page'
    //         );
    
    //         // Update the visualization index.html
    //         await this.githubApi.updateFile(
    //             this.REPO_NAME,
    //             'visualizations/index.html',
    //             `<!DOCTYPE html>
    // <html>
    // <head>
    //     <title>Coding Activity Dashboard</title>
    //     <meta charset="UTF-8">
    //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //     <style>
    //         body { 
    //             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    //             max-width: 1000px; 
    //             margin: 0 auto; 
    //             padding: 20px;
    //             background: #f6f8fa;
    //         }
    //         .visualization {
    //             background: white;
    //             border-radius: 8px;
    //             padding: 20px;
    //             margin: 20px 0;
    //             box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    //         }
    //         h1 { color: #24292e; }
    //         h2 { color: #586069; }
    //         img { 
    //             max-width: 100%;
    //             height: auto;
    //         }
    //     </style>
    // </head>
    // <body>
    //     <h1>Coding Activity Dashboard</h1>
    //     <div class="visualization">
    //         <h2>Activity Heatmap</h2>
    //         <img src="heatmap.svg" alt="Activity Heatmap">
    //     </div>
    //     <div class="visualization">
    //         <h2>Project Activity</h2>
    //         <img src="activity-chart.svg" alt="Project Activity">
    //     </div>
    // </body>
    // </html>`,
    //             'Update visualization page'
    //         );
    
    //         // Enable GitHub Pages with the correct source path
    //         try {
    //             await this.githubApi.octokit.request('POST /repos/{owner}/{repo}/pages', {
    //                 owner: this.githubApi.username,
    //                 repo: this.REPO_NAME,
    //                 source: {
    //                     branch: 'main',
    //                     path: '/'  // Deploy from root
    //                 },
    //                 headers: {
    //                     'X-GitHub-Api-Version': '2022-11-28'
    //                 }
    //             });
    //         } catch (error) {
    //             if (error.status !== 409) { // 409 means already exists
    //                 throw error;
    //             }
    //         }
    //     } catch (error) {
    //         console.error('GitHub Pages setup error:', error);
    //         throw error;
    //     }
    // }

    // getVisualizationScript() {
    //     return fs.readFileSync(path.join(__dirname, 'visualization.js'), 'utf8');
    // }

    async setupGitHubActions() {
        try {
            console.log('Setting up GitHub Actions...');
            
            await this.githubApi.octokit.repos.update({
                owner: this.githubApi.username,
                repo: this.REPO_NAME,
                has_actions_write: true  // Explicitly enable Actions write permissions
            });
            
            // First ensure the workflows directory exists by creating a dummy file
            await this.githubApi.updateFile(
                this.REPO_NAME,
                '.github/workflows/README.md',
                'GitHub Actions Workflows Directory',
                'Initialize workflows directory'
            );

            // Add visualization.js to scripts directory
            await this.githubApi.updateFile(
                this.REPO_NAME,
                '.github/scripts/visualization.js',
                fs.readFileSync(path.join(__dirname, 'visualization.js'), 'utf8'),
                'Add visualization script'
            );

            // Now add the workflow file
            await this.githubApi.updateFile(
                this.REPO_NAME,
                '.github/workflows/update-activity.yml',
                this.getWorkflowContent(),
                'Setup automated workflow'
            );

            // Enable Actions using the correct API endpoint
            await this.githubApi.octokit.request('PUT /repos/{owner}/{repo}/actions/permissions', {
                owner: this.githubApi.username,
                repo: this.REPO_NAME,
                enabled: true,
                allowed_actions: 'all'
            });

        } catch (error) {
            console.error('GitHub Actions setup error:', error);
            throw error;
        }
    }

    async initializeRepoStructure() {
        try {
            console.log('Initializing repository structure...');
            const files = [
                {
                    path: 'README.md',
                    content: this.getInitialReadme()
                },
                // {
                //     path: '.github/scripts/generate-visualizations.js',
                //     content: this.getVisualizationScript()
                // },
                {
                    path: '.github/scripts/update-profile.js',
                    content: this.getProfileScript()
                },
                {
                    path: 'projects/README.md',
                    content: '# Project Activity Logs\nThis directory contains activity logs for different projects.'
                },
                {
                    path: 'visualizations/README.md',
                    content: '# Visualizations\nThis directory contains automatically generated activity visualizations.'
                }
            ];

            for (const file of files) {
                await this.githubApi.updateFile(
                    this.REPO_NAME,
                    file.path,
                    file.content,
                    `Initialize ${file.path}`
                );
                // Add delay between file creations to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Failed to initialize repo structure:', error);
            throw error;
        }
    }

    startQueueProcessor() {
        if (!this.queueProcessInterval) {
            this.queueProcessInterval = setInterval(() => this.processActivityQueue(), 5000);
        }
    }

    stopQueueProcessor() {
        if (this.queueProcessInterval) {
            clearInterval(this.queueProcessInterval);
            this.queueProcessInterval = null;
        }
    }

    async logActivity(activityLog) {
        try {
            const projectKey = activityLog.project;
            if (!this.activityQueue.has(projectKey)) {
                this.activityQueue.set(projectKey, []);
            }
            
            this.activityQueue.get(projectKey).push(activityLog);
            this.startQueueProcessor();
        } catch (error) {
            console.error('Failed to queue activity:', error);
            throw new Error('Failed to queue activity: ' + error.message);
        }
    }

    async processActivityQueue() {
        if (this.isProcessingQueue || this.activityQueue.size === 0) return;
        
        this.isProcessingQueue = true;
        try {
            // Batch update approach - collect all updates first
            const updates = [];
            
            for (const [project, activities] of this.activityQueue.entries()) {
                if (activities.length === 0) continue;
                
                const logFile = `projects/${project}/activity-log.json`;
                let logs = [];
                
                try {
                    const existingContent = await this.githubApi.getFileContent(
                        this.REPO_NAME,
                        logFile
                    );
                    if (existingContent) {
                        logs = JSON.parse(existingContent);
                    }
                } catch (error) {
                    console.log('No existing log file found, creating new one');
                }
                
                logs.push(...activities);
                
                updates.push({
                    file: logFile,
                    content: JSON.stringify(logs, null, 2),
                    message: `Update activity log with ${activities.length} entries`
                });
                
                this.activityQueue.set(project, []);
            }
            
            // Execute updates with delay between them to avoid rate limiting
            for (const update of updates) {
                await this.githubApi.updateFile(
                    this.REPO_NAME,
                    update.file,
                    update.content,
                    update.message
                );
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error processing activity queue:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    getWorkflowContent() {
        return `name: Update Activity Visualizations

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  update-visualizations:
    runs-on: ubuntu-latest
    
    permissions:
      contents: write
      
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm init -y
          npm install d3@7.8.5 @svgdotjs/svg.js@3.2.0 svgdom@0.1.19

      - name: Generate visualizations
        run: node .github/scripts/visualization.js
        env:
          GITHUB_TOKEN: \${{ github.token }}

      - name: Commit changes
        run: |
          git config --global user.name 'github-actions[bot]'
          git config --global user.email 'github-actions[bot]@users.noreply.github.com'
          git add visualizations/
          git commit -m "Update visualizations" || echo "No changes"
          git push`;
    }

getInitialReadme () {
  return `# Code Activity Tracker

## Overview
Automatically tracks and visualizes your coding activity across different projects.

## Structure
- /projects - Contains activity logs for each project
- /visualizations - Contains generated activity visualizations
- /.github - Contains automation workflows and scripts

## Latest Activity
Activity tracking will begin shortly after repository initialization.`;
};

// getVisualizationScript () {

//   return `
// const fs = require('fs');
// const path = require('path');

// // Helper function to ensure directory exists
// function ensureDirectoryExists(dirPath) {
//     if (!fs.existsSync(dirPath)) {
//         fs.mkdirSync(dirPath, { recursive: true });
//         console.log(\`Created directory: \${dirPath}\`);
//     }
// }

// // Helper function to create SVG elements as strings
// function SVGBuilder(width, height) {
//     this.width = width;
//     this.height = height;
//     this.elements = [];
// }

// SVGBuilder.prototype.addRect = function(x, y, width, height, fill, radius = 0) {
//     this.elements.push('<rect x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" fill="' + fill + '" rx="' + radius + '" ry="' + radius + '" />');
//     return this;
// };

// SVGBuilder.prototype.addText = function(x, y, text, options = {}) {
//     const fontSize = options.fontSize || '12';
//     const anchor = options.anchor || 'middle';
//     this.elements.push('<text x="' + x + '" y="' + y + '" font-size="' + fontSize + '" text-anchor="' + anchor + '">' + text + '</text>');
//     return this;
// };

// SVGBuilder.prototype.toString = function() {
//     return '<?xml version="1.0" encoding="UTF-8"?>\\n' +
//            '<svg xmlns="http://www.w3.org/2000/svg" width="' + this.width + '" height="' + this.height + '" viewBox="0 0 ' + this.width + ' ' + this.height + '">\\n' +
//            '    ' + this.elements.join('\\n    ') + '\\n' +
//            '</svg>';
// };

// // Convert intensity to a heatmap color
// function getHeatmapColor(intensity) {
//     const normalizedIntensity = Math.max(0, Math.min(1, intensity));
//     const greenValue = Math.floor(normalizedIntensity * 155);
//     const blueValue = Math.floor(normalizedIntensity * 255);
//     return 'rgb(0,' + greenValue + ',' + blueValue + ')';
// }

// // Generate Heatmap SVG
// function generateHeatmap(activity) {
//     const svg = new SVGBuilder(800, 200);

//     // Process activity data for heatmap
//     const activityByDate = new Map();
//     activity.forEach(entry => {
//         const date = new Date(entry.timestamp).toISOString().split('T')[0];
//         activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
//     });

//     // Create heatmap cells
//     const cellSize = 10;
//     const cellPadding = 2;
//     const maxActivity = Math.max(...activityByDate.values(), 1);

//     Array.from(activityByDate.entries()).forEach(([date, count], i) => {
//         const x = (i % 52) * (cellSize + cellPadding) + 20;
//         const y = Math.floor(i / 52) * (cellSize + cellPadding) + 20;
//         const intensity = count / maxActivity;
//         const fillColor = getHeatmapColor(intensity);

//         svg.addRect(x, y, cellSize, cellSize, fillColor, 2);
//     });

//     return svg.toString();
// }

// // Generate Activity Chart SVG
// function generateActivityChart(activity) {
//     const svg = new SVGBuilder(800, 300);

//     // Process activity data by project
//     const projectActivity = new Map();
//     activity.forEach(entry => {
//         projectActivity.set(entry.project, (projectActivity.get(entry.project) || 0) + 1);
//     });

//     // Create bar chart
//     const barWidth = 40;
//     const barGap = 20;
//     const maxActivity = Math.max(...projectActivity.values(), 1);

//     Array.from(projectActivity.entries()).forEach(([project, count], i) => {
//         const height = (count / maxActivity) * 200;
//         const x = i * (barWidth + barGap) + 50;
//         const y = 250 - height;

//         // Add bar
//         svg.addRect(x, y, barWidth, height, '#4A90E2', 4);

//         // Add label
//         svg.addText(x + barWidth / 2, 260, project, { fontSize: '12', anchor: 'middle' });
//     });

//     return svg.toString();
// }

// // Generate visualizations
// function generateVisualizations(callback) {
//     try {
//         const projectsDir = path.join(process.cwd(), 'projects');
//         const visualizationsDir = path.join(process.cwd(), 'visualizations');

//         // Ensure directories exist
//         ensureDirectoryExists(projectsDir);
//         ensureDirectoryExists(visualizationsDir);

//         // Initialize with empty data if no projects exist
//         let allActivity = [];

//         // Only try to read project logs if the directory has contents
//         const projectContents = fs.readdirSync(projectsDir);
//         const projects = projectContents
//             .filter(file => {
//                 const fullPath = path.join(projectsDir, file);
//                 return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
//             });
        
//         if (projects.length > 0) {
//             projects.forEach(project => {
//                 const logPath = path.join(projectsDir, project, 'activity-log.json');
//                 if (fs.existsSync(logPath)) {
//                     try {
//                         const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
//                         allActivity = allActivity.concat(logs);
//                     } catch (err) {
//                         console.warn(\`Warning: Could not parse log file for project \${project}:\`, err);
//                     }
//                 }
//             });
//         } else {
//             console.log('No project directories found. Generating empty visualizations.');
//         }

//         // Generate Heatmap
//         const heatmapSvg = generateHeatmap(allActivity);
//         fs.writeFileSync(
//             path.join(visualizationsDir, 'heatmap.svg'),
//             heatmapSvg
//         );

//         // Generate Activity Chart
//         const chartSvg = generateActivityChart(allActivity);
//         fs.writeFileSync(
//             path.join(visualizationsDir, 'activity-chart.svg'),
//             chartSvg
//         );

//         console.log('Visualizations generated successfully');
//         if (callback) callback(null);
//     } catch (error) {
//         console.error('Error generating visualizations:', error);
//         if (callback) callback(error);
//         else throw error;
//     }
// }

// // Export for both CommonJS and direct execution
// if (require.main === module) {
//     generateVisualizations(function(err) {
//         if (err) process.exit(1);
//     });
// } else {
//     module.exports = { generateVisualizations };
// }
// `;
// };
getProfileScript() {
    return `const fs = require('fs');
const path = require('path');
const https = require('https');

async function updateProfile() {
    try {
        console.log('Starting profile update...');
        
        if (!process.env.GITHUB_REPOSITORY) {
            throw new Error('GITHUB_REPOSITORY environment variable not found');
        }
        if (!process.env.GITHUB_TOKEN) {
            throw new Error('GITHUB_TOKEN environment variable not found');
        }
        
        // Get authenticated username for both profile and activity tracker repos
        const username = await getAuthenticatedUsername(process.env.GITHUB_TOKEN);
        console.log(\`Authenticated username: \${username}\`);
        
        // Construct the correct URL for visualizations from the activity-tracker repo
        const visualizationsUrl = \`https://raw.githubusercontent.com/\${username}/activity-tracker/main\`;
        console.log(\`Visualizations URL: \${visualizationsUrl}\`);
        
        const content = [
            '# Coding Activity Overview',
            '',
            '## Recent Coding Activity',
            '',
            '### Activity Heatmap',
            \`![Activity Heatmap](\${visualizationsUrl}/visualizations/heatmap.svg)\`,
            '',
            '### Project Activity',
            \`![Project Activity](\${visualizationsUrl}/visualizations/activity-chart.svg)\`,
            '',
            \`Last updated: \${new Date().toUTCString()}\`
        ].join('\\n');
        console.log('Generated README content');

        // Update the profile README
        const currentContent = await getRepoContent(username, username, 'README.md');
        await updateRepoContent(
            username,
            username,
            'README.md',
            'Update coding activity visualizations',
            content,
            currentContent ? currentContent.sha : null
        );
        console.log('Profile README updated successfully');
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

async function getAuthenticatedUsername(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: '/user',
            headers: {
                'User-Agent': 'Activity-Tracker',
                'Authorization': \`Bearer \${token}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        
        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const userData = JSON.parse(data);
                    resolve(userData.login);
                } else {
                    reject(new Error(\`Failed to get username: \${res.statusCode} - \${data}\`));
                }
            });
        }).on('error', reject);
    });
}

async function getRepoContent(owner, repo, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: '/repos/' + owner + '/' + repo + '/contents/' + path,
            headers: {
                'User-Agent': 'Activity-Tracker',
                'Authorization': \`Bearer \${process.env.GITHUB_TOKEN}\`,
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 404) {
                    resolve(null);
                } else if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(\`Failed to get content: \${res.statusCode}\`));
                }
            });
        }).on('error', reject);
    });
}

async function updateRepoContent(owner, repo, path, message, content, sha = null) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            message,
            content: Buffer.from(content).toString('base64'),
            sha: sha
        });

        const options = {
            hostname: 'api.github.com',
            path: '/repos/' + owner + '/' + repo + '/contents/' + path,
            method: 'PUT',
            headers: {
                'User-Agent': 'Activity-Tracker',
                'Authorization': \`Bearer \${process.env.GITHUB_TOKEN}\`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(JSON.parse(responseData));
                } else {
                    reject(new Error(\`Failed to update content: \${responseData}\`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Export and execute
if (require.main === module) {
    updateProfile().catch(error => {
        console.error('Script execution failed:', error.message || String(error));
        process.exit(1);
    });
} else {
    module.exports = { updateProfile };
}`;
}

}
module.exports = GitManager;