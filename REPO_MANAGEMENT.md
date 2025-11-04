# Portfolio Repository Management Tools

Automated tools to clone and manage all GitHub repositories featured in your portfolio.

## 📋 Overview

These scripts automatically:

- Extract all GitHub repository URLs from your `README.md`
- Check which repos exist locally
- Clone missing repositories
- Optionally update existing repositories with latest changes

## 🚀 Quick Start

### Option 1: Simple Clone Script (Recommended for first-time setup)

```bash
node clone-portfolio-repos.js
```

This will:

- Read all repo URLs from `README.md`
- Clone any missing repos to `d:\Projects\`
- Skip repos that already exist

### Option 2: Advanced Management Script

```bash
# Clone missing repos only
node manage-portfolio-repos.js

# Preview what would happen (dry run)
node manage-portfolio-repos.js --dry-run

# Clone missing AND update existing repos
node manage-portfolio-repos.js --update
```

### Option 3: Using NPM Scripts

```bash
# Clone missing repos
npm run clone:repos

# Manage repos (clone missing)
npm run manage:repos

# Preview changes (dry run)
npm run manage:repos:dry

# Update all existing repos
npm run update:repos
```

## 🔧 Configuration

### Simple Script (`clone-portfolio-repos.js`)

Edit these variables at the top of the file:

```javascript
const README_PATH = path.join(__dirname, 'README.md');
const PROJECTS_BASE_DIR = 'd:\\Projects';
const DRY_RUN = false; // Set to true to preview without cloning
```

### Advanced Script (`manage-portfolio-repos.js`)

Edit the `CONFIG` object:

```javascript
const CONFIG = {
  readmePath: path.join(__dirname, 'README.md'),
  projectsBaseDir: 'd:\\Projects',
  dryRun: false, // Preview mode
  updateExisting: false, // Pull latest changes for existing repos
  skipErrors: true, // Continue even if some repos fail
  username: 'hesbon-osoro', // Your GitHub username
};
```

## 📊 Features

### Simple Script Features

- ✅ Extract repos from README
- ✅ Check if repos exist locally
- ✅ Clone missing repos
- ✅ Dry run mode
- ✅ Summary statistics

### Advanced Script Features

- ✅ All simple script features
- ✅ Update existing repos (git pull)
- ✅ Check for uncommitted changes before updating
- ✅ Show current branch
- ✅ Skip repos with local changes
- ✅ Detailed progress reporting
- ✅ Error handling and recovery

## 📝 Example Output

```
🚀 Portfolio Repository Manager

📂 Base directory: d:\Projects
📄 Reading from: d:\Projects\hesbon-osoro\README.md
🔧 Mode: LIVE
🔄 Update existing: NO

🔍 Found 25 unique repositories

✓ restaurant - Already exists
✓ tourism-hampi - Already exists
✗ video-app - Needs cloning
✗ chat-app-merng-client - Needs cloning
...

==================================================
📊 Summary:
   Total repositories: 25
   Already exist: 20
   To clone: 5
   To update: 0
==================================================

🔄 Cloning missing repositories...

📦 Cloning video-app...
✅ Successfully cloned video-app

📦 Cloning chat-app-merng-client...
✅ Successfully cloned chat-app-merng-client

==================================================
📈 Final Results:
   📁 Total repositories: 25
   ✅ Successfully cloned: 5
   🔄 Successfully updated: 0
   📂 Already existed: 20
   ⏭️  Skipped: 0
   ❌ Failed: 0
==================================================
```

## 🎯 Use Cases

### First Time Setup

Clone all portfolio repos to your local machine:

```bash
node clone-portfolio-repos.js
```

### Regular Maintenance

Check for new repos and clone them:

```bash
npm run manage:repos
```

### Update All Repos

Pull latest changes for all repos:

```bash
npm run update:repos
```

### Preview Changes

See what would happen without making changes:

```bash
npm run manage:repos:dry
```

## ⚙️ Advanced Usage

### Custom Base Directory

Edit the script to use a different directory:

```javascript
const PROJECTS_BASE_DIR = 'C:\\MyProjects';
```

### Different GitHub Username

If you want to clone repos from a different user:

```javascript
const CONFIG = {
  ...
  username: 'different-username'
};
```

### Selective Updates

The advanced script will skip repos with uncommitted changes to prevent data loss.

## 🛠️ Troubleshooting

### "git: command not found"

- Ensure Git is installed: `git --version`
- Add Git to your PATH environment variable

### Permission Errors

- Run terminal as administrator
- Check folder permissions

### Clone Failures

- Check your internet connection
- Verify the repository exists and is public
- Check if you have access to private repos (may need SSH keys or tokens)

### Repos Not Found in README

- Ensure URLs follow the format: `https://github.com/hesbon-osoro/repo-name`
- Check that README.md is in the correct location

## 📦 Requirements

- Node.js (v12 or higher)
- Git installed and available in PATH
- Internet connection for cloning

## 🔒 Security Notes

- Scripts only clone public repositories by default
- For private repos, ensure you have:
  - SSH keys configured, OR
  - GitHub Personal Access Token configured
  - Git credential manager set up

## 💡 Tips

1. **Run dry mode first**: Always test with `dryRun: true` before making changes
2. **Backup important work**: Commit and push changes before running update commands
3. **Check disk space**: Ensure you have enough space for all repos
4. **Use update sparingly**: Only update repos when you need the latest changes
5. **Review failed clones**: Check the error messages for failed repos

## 🤝 Contributing

Feel free to modify these scripts for your needs. Common modifications:

- Change directory structure
- Add filtering for specific repos
- Add post-clone setup commands
- Integrate with CI/CD pipelines

## 📄 License

These scripts are part of your portfolio project and follow the same license.

---

**Last Updated**: November 2025
**Maintained by**: Hesbon Osoro
