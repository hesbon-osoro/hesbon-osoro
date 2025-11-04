const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration - Modify these as needed
const CONFIG = {
  readmePath: path.join(__dirname, 'README.md'),
  projectsBaseDir: 'd:\\Projects',
  dryRun: false, // Set to true to preview without making changes
  updateExisting: false, // Set to true to pull latest changes for existing repos
  skipErrors: true, // Continue even if some repos fail
  username: 'hesbon-osoro', // Your GitHub username
};

class PortfolioRepoManager {
  constructor(config) {
    this.config = config;
    this.stats = {
      total: 0,
      existing: 0,
      cloned: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
    };
  }

  /**
   * Extract GitHub repository URLs from README.md
   */
  extractGitHubRepos() {
    const content = fs.readFileSync(this.config.readmePath, 'utf-8');
    const repoRegex = new RegExp(
      `https:\\/\\/github\\.com\\/${this.config.username}\\/([a-zA-Z0-9_-]+)`,
      'g'
    );
    const repos = new Map();

    let match;
    while ((match = repoRegex.exec(content)) !== null) {
      const repoName = match[1];
      const repoUrl = `https://github.com/${this.config.username}/${repoName}.git`;
      repos.set(repoName, { name: repoName, url: repoUrl });
    }

    return Array.from(repos.values());
  }

  /**
   * Check if a repository already exists locally
   */
  repoExists(repoName) {
    const repoPath = path.join(this.config.projectsBaseDir, repoName);
    return (
      fs.existsSync(repoPath) && fs.existsSync(path.join(repoPath, '.git'))
    );
  }

  /**
   * Get repository status
   */
  getRepoStatus(repoName) {
    const repoPath = path.join(this.config.projectsBaseDir, repoName);

    try {
      const status = execSync('git status --porcelain', {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const branch = execSync('git branch --show-current', {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      return {
        hasChanges: status.trim().length > 0,
        branch: branch,
      };
    } catch (error) {
      return { hasChanges: false, branch: 'unknown' };
    }
  }

  /**
   * Clone a repository
   */
  cloneRepo(repoUrl, repoName) {
    const targetPath = path.join(this.config.projectsBaseDir, repoName);

    try {
      console.log(`\n📦 Cloning ${repoName}...`);

      if (this.config.dryRun) {
        console.log(`   [DRY RUN] Would clone to: ${targetPath}`);
        return true;
      }

      execSync(`git clone ${repoUrl} "${targetPath}"`, {
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      console.log(`✅ Successfully cloned ${repoName}`);
      this.stats.cloned++;
      return true;
    } catch (error) {
      console.error(`❌ Failed to clone ${repoName}: ${error.message}`);
      this.stats.failed++;
      return false;
    }
  }

  /**
   * Update an existing repository
   */
  updateRepo(repoName) {
    const repoPath = path.join(this.config.projectsBaseDir, repoName);

    try {
      const status = this.getRepoStatus(repoName);

      if (status.hasChanges) {
        console.log(
          `⚠️  ${repoName} has uncommitted changes - skipping update`
        );
        this.stats.skipped++;
        return false;
      }

      console.log(`\n🔄 Updating ${repoName} (${status.branch})...`);

      if (this.config.dryRun) {
        console.log(`   [DRY RUN] Would pull latest changes`);
        return true;
      }

      execSync('git pull', {
        cwd: repoPath,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      console.log(`✅ Successfully updated ${repoName}`);
      this.stats.updated++;
      return true;
    } catch (error) {
      console.error(`❌ Failed to update ${repoName}: ${error.message}`);
      this.stats.failed++;
      return false;
    }
  }

  /**
   * Process all repositories
   */
  processRepos() {
    const repos = this.extractGitHubRepos();
    this.stats.total = repos.length;

    console.log(`🔍 Found ${repos.length} unique repositories\n`);

    if (repos.length === 0) {
      console.log('⚠️  No repositories found in README.md');
      return;
    }

    const toClone = [];
    const toUpdate = [];
    const existing = [];

    // Categorize repos
    repos.forEach(({ name, url }) => {
      if (this.repoExists(name)) {
        existing.push(name);
        if (this.config.updateExisting) {
          toUpdate.push({ name, url });
          console.log(`🔄 ${name} - Will update`);
        } else {
          console.log(`✓ ${name} - Already exists`);
          this.stats.existing++;
        }
      } else {
        toClone.push({ name, url });
        console.log(`✗ ${name} - Needs cloning`);
      }
    });

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 Summary:');
    console.log(`   Total repositories: ${repos.length}`);
    console.log(`   Already exist: ${existing.length}`);
    console.log(`   To clone: ${toClone.length}`);
    console.log(`   To update: ${toUpdate.length}`);
    console.log(`${'='.repeat(50)}\n`);

    if (toClone.length === 0 && toUpdate.length === 0) {
      console.log('✨ All repositories are up to date!');
      return;
    }

    if (this.config.dryRun) {
      console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
    }

    // Clone missing repos
    if (toClone.length > 0) {
      console.log('🔄 Cloning missing repositories...');
      toClone.forEach(({ name, url }) => {
        const success = this.cloneRepo(url, name);
        if (!success && !this.config.skipErrors) {
          throw new Error(`Failed to clone ${name}`);
        }
      });
    }

    // Update existing repos
    if (toUpdate.length > 0) {
      console.log('\n🔄 Updating existing repositories...');
      toUpdate.forEach(({ name }) => {
        const success = this.updateRepo(name);
        if (!success && !this.config.skipErrors) {
          throw new Error(`Failed to update ${name}`);
        }
      });
    }
  }

  /**
   * Print final statistics
   */
  printStats() {
    console.log('\n' + '='.repeat(50));
    console.log('📈 Final Results:');
    console.log(`   📁 Total repositories: ${this.stats.total}`);
    console.log(`   ✅ Successfully cloned: ${this.stats.cloned}`);
    console.log(`   🔄 Successfully updated: ${this.stats.updated}`);
    console.log(`   📂 Already existed: ${this.stats.existing}`);
    console.log(`   ⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`   ❌ Failed: ${this.stats.failed}`);
    console.log('='.repeat(50));
  }

  /**
   * Main execution
   */
  run() {
    console.log('🚀 Portfolio Repository Manager\n');
    console.log(`📂 Base directory: ${this.config.projectsBaseDir}`);
    console.log(`📄 Reading from: ${this.config.readmePath}`);
    console.log(`🔧 Mode: ${this.config.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(
      `🔄 Update existing: ${this.config.updateExisting ? 'YES' : 'NO'}\n`
    );

    // Ensure base directory exists
    if (!fs.existsSync(this.config.projectsBaseDir)) {
      console.log(`📁 Creating base directory: ${this.config.projectsBaseDir}`);
      if (!this.config.dryRun) {
        fs.mkdirSync(this.config.projectsBaseDir, { recursive: true });
      }
    }

    try {
      this.processRepos();
      this.printStats();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      this.printStats();
      process.exit(1);
    }
  }
}

// Run the script
if (require.main === module) {
  const manager = new PortfolioRepoManager(CONFIG);
  manager.run();
}

module.exports = PortfolioRepoManager;
