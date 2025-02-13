const vscode = require('vscode');

class GithubAPI {
    constructor() {
        this.octokit = null;
        this.username = null;
        this.Octokit = null;
    }

    async initializeOctokit() {
        const { Octokit } = await import('@octokit/rest');
        this.Octokit = Octokit;
    }

    async authenticate() {
        try {
            if (!this.Octokit) {
                await this.initializeOctokit();
            }

            // Get GitHub session with expanded scopes
            const token = await vscode.authentication.getSession('github', [
                'repo',
                'workflow',
                'admin:repo_hook',
                'delete_repo'
            ], { createIfNone: true });

            if (!token || !token.accessToken) {
                throw new Error('Failed to obtain GitHub token. Please ensure you are logged in to GitHub in VS Code.');
            }

            console.log('Authentication token obtained successfully');

            this.octokit = new this.Octokit({ 
                auth: token.accessToken,
                retry: {
                    enabled: true,
                    retries: 3
                }
            });
            
            const { data } = await this.octokit.users.getAuthenticated();
            this.username = data.login;

            console.log('Successfully authenticated as:', this.username);

            return true;
        } catch (error) {
            console.error('Authentication error details:', {
                message: error.message,
                status: error.status,
                response: error.response?.data
            });
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    async createRepo(name, options = {}) {
        try {
            console.log(`Creating repository: ${name}`);
            const repoConfig = {
                name,
                auto_init: true,
                private: false,
                has_issues: true,
                has_projects: true,
                has_wiki: true
            };
    
            // If this is a profile repository, add special configuration
            if (options.isProfile) {
                repoConfig.private = false;
                repoConfig.description = options.description || 'Special repository for GitHub Profile';
            } else {
                repoConfig.description = options.description || 'Automatically tracks and visualizes coding activity';
            }
    
            const response = await this.octokit.repos.createForAuthenticatedUser(repoConfig);
    
            console.log(`Repository created successfully: ${response.data.html_url}`);
    
            // Wait for repository creation to complete
            await new Promise(resolve => setTimeout(resolve, 3000));
    
            return response;
        } catch (error) {
            console.error('Repository creation error:', {
                message: error.message,
                status: error.status,
                response: error.response?.data
            });
            throw new Error(`Failed to create repository: ${error.message}`);
        }
    }
    async checkRepoExists(repo) {
        try {
            await this.octokit.repos.get({
                owner: this.username,
                repo
            });
            return true;
        } catch (error) {
            if (error.status === 404) {
                return false;
            }
            throw error;
        }
    }

    async updateFile(repo, path, content, message = 'Update activity log') {
        try {
            console.log(`Updating file: ${repo}/${path}`);

            const repoExists = await this.checkRepoExists(repo);
            if (!repoExists) {
                throw new Error(`Repository ${repo} does not exist`);
            }

            let sha;
            try {
                const fileResponse = await this.octokit.repos.getContent({
                    owner: this.username,
                    repo,
                    path
                });

                if (!Array.isArray(fileResponse.data)) {
                    sha = fileResponse.data.sha;
                    console.log(`Existing file found with SHA: ${sha}`);
                }
            } catch (error) {
                if (error.status !== 404) {
                    throw error;
                }
                console.log('No existing file found - creating new file');
            }

            const updateResponse = await this.octokit.repos.createOrUpdateFileContents({
                owner: this.username,
                repo,
                path,
                message,
                content: Buffer.from(content).toString('base64'),
                sha
            });

            console.log(`File ${path} updated successfully`);
            return updateResponse;
        } catch (error) {
            console.error('File update error:', {
                message: error.message,
                status: error.status,
                response: error.response?.data,
                repo,
                path
            });
            throw new Error(`Failed to update file: ${error.message}`);
        }
    }

    async getFileContent(repo, path) {
        try {
            const response = await this.octokit.repos.getContent({
                owner: this.username,
                repo,
                path
            });

            if (!Array.isArray(response.data) && response.data.type === 'file') {
                const content = Buffer.from(response.data.content, 'base64').toString();
                return content;
            }
            throw new Error('Path points to a directory, not a file');
        } catch (error) {
            if (error.status === 404) {
                return null;
            }
            throw error;
        }
    }
}

module.exports = GithubAPI;