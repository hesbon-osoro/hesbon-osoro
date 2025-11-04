const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const README_PATH = path.join(__dirname, 'README.md');
const PROJECTS_BASE_DIR = 'd:\\Projects'; // Base directory where repos will be cloned
const DRY_RUN = false; // Set to true to see what would be cloned without actually cloning

/**
 * Extract GitHub repository URLs from README.md
 */
function extractGitHubRepos(readmePath) {
  const content = fs.readFileSync(readmePath, 'utf-8');
  const repoRegex = /https:\/\/github\.com\/hesbon-osoro\/([a-zA-Z0-9_-]+)/g;
  const repos = new Set();

  let match;
  while ((match = repoRegex.exec(content)) !== null) {
    const repoName = match[1];
    const repoUrl = `https://github.com/hesbon-osoro/${repoName}.git`;
    repos.add({ name: repoName, url: repoUrl });
  }

  return Array.from(repos);
}

/**
 * Check if a repository already exists locally
 */
function repoExists(repoName, baseDir) {
  const repoPath = path.join(baseDir, repoName);
  return fs.existsSync(repoPath) && fs.existsSync(path.join(repoPath, '.git'));
}

/**
 * Clone a repository
 */
function cloneRepo(repoUrl, repoName, baseDir) {
  const targetPath = path.join(baseDir, repoName);

  try {
    console.log(`\n📦 Cloning ${repoName}...`);
    execSync(`git clone ${repoUrl} "${targetPath}"`, {
      stdio: 'inherit',
      encoding: 'utf-8',
    });
    console.log(`✅ Successfully cloned ${repoName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to clone ${repoName}: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Portfolio Repository Cloner\n');
  console.log(`📂 Base directory: ${PROJECTS_BASE_DIR}`);
  console.log(`📄 Reading from: ${README_PATH}\n`);

  // Ensure base directory exists
  if (!fs.existsSync(PROJECTS_BASE_DIR)) {
    console.log(`📁 Creating base directory: ${PROJECTS_BASE_DIR}`);
    fs.mkdirSync(PROJECTS_BASE_DIR, { recursive: true });
  }

  // Extract repos from README
  const repos = extractGitHubRepos(README_PATH);
  console.log(`🔍 Found ${repos.length} unique repositories in README.md\n`);

  if (repos.length === 0) {
    console.log('⚠️  No repositories found in README.md');
    return;
  }

  // Check and clone repos
  const toClone = [];
  const existing = [];

  repos.forEach(({ name, url }) => {
    if (repoExists(name, PROJECTS_BASE_DIR)) {
      existing.push(name);
      console.log(`✓ ${name} - Already exists`);
    } else {
      toClone.push({ name, url });
      console.log(`✗ ${name} - Needs cloning`);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Existing: ${existing.length}`);
  console.log(`   To clone: ${toClone.length}`);

  if (toClone.length === 0) {
    console.log('\n✨ All repositories are already cloned!');
    return;
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - Would clone:');
    toClone.forEach(({ name }) => console.log(`   - ${name}`));
    console.log('\nSet DRY_RUN = false to actually clone repositories.');
    return;
  }

  // Clone missing repos
  console.log('\n🔄 Starting to clone missing repositories...');
  const results = {
    success: 0,
    failed: 0,
  };

  toClone.forEach(({ name, url }) => {
    if (cloneRepo(url, name, PROJECTS_BASE_DIR)) {
      results.success++;
    } else {
      results.failed++;
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('📈 Final Results:');
  console.log(`   ✅ Successfully cloned: ${results.success}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📁 Total repositories: ${repos.length}`);
  console.log('='.repeat(50));
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { extractGitHubRepos, repoExists, cloneRepo };
