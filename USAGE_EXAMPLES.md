# 💻 Usage Examples - Portfolio Repository Manager

## 📖 Real-World Scenarios

### Scenario 1: First Time Setup - Clone All Portfolio Projects

**Goal**: You want to clone all 27 portfolio projects to your local machine.

**Solution**:

```bash
# Step 1: Preview what will happen
node clone-portfolio-repos.js
# (Set DRY_RUN = true in the file first)

# Step 2: Actually clone all repos
node clone-portfolio-repos.js
# (Set DRY_RUN = false)
```

**Expected Output**:

```
🚀 Portfolio Repository Cloner

📂 Base directory: d:\Projects
📄 Reading from: d:\Projects\hesbon-osoro\README.md

🔍 Found 27 unique repositories in README.md

✗ restaurant - Needs cloning
✗ tourism-hampi - Needs cloning
✗ video-app - Needs cloning
... (24 more)

📊 Summary:
   Existing: 0
   To clone: 27

🔄 Starting to clone missing repositories...

📦 Cloning restaurant...
✅ Successfully cloned restaurant

📦 Cloning tourism-hampi...
✅ Successfully cloned tourism-hampi

... (continues for all repos)

==================================================
📈 Final Results:
   ✅ Successfully cloned: 27
   ❌ Failed: 0
   📁 Total repositories: 27
==================================================
```

---

### Scenario 2: You Added New Projects to Your Portfolio

**Goal**: You've added 3 new projects to your README and want to clone only those.

**Solution**:

```bash
npm run manage:repos
```

**Expected Output**:

```
🚀 Portfolio Repository Manager

📂 Base directory: d:\Projects
🔧 Mode: LIVE
🔄 Update existing: NO

🔍 Found 30 unique repositories

✓ restaurant - Already exists
✓ tourism-hampi - Already exists
✓ video-app - Already exists
... (24 more existing)
✗ new-project-1 - Needs cloning
✗ new-project-2 - Needs cloning
✗ new-project-3 - Needs cloning

==================================================
📊 Summary:
   Total repositories: 30
   Already exist: 27
   To clone: 3
==================================================

🔄 Cloning missing repositories...

📦 Cloning new-project-1...
✅ Successfully cloned new-project-1

📦 Cloning new-project-2...
✅ Successfully cloned new-project-2

📦 Cloning new-project-3...
✅ Successfully cloned new-project-3

📈 Final Results:
   ✅ Successfully cloned: 3
   📂 Already existed: 27
```

---

### Scenario 3: Update All Projects with Latest Changes

**Goal**: Pull the latest changes from GitHub for all your local repos.

**Solution**:

```bash
npm run update:repos
```

**Expected Output**:

```
🚀 Portfolio Repository Manager

🔧 Mode: LIVE
🔄 Update existing: YES

🔍 Found 27 unique repositories

🔄 restaurant - Will update
🔄 tourism-hampi - Will update
🔄 video-app - Will update
... (24 more)

==================================================
📊 Summary:
   Total repositories: 27
   To update: 27
==================================================

🔄 Updating existing repositories...

🔄 Updating restaurant (main)...
Already up to date.
✅ Successfully updated restaurant

🔄 Updating tourism-hampi (main)...
Updating 3a2b1c4..7d8e9f0
Fast-forward
 README.md | 5 +++--
 1 file changed, 3 insertions(+), 2 deletions(-)
✅ Successfully updated tourism-hampi

⚠️  video-app has uncommitted changes - skipping update

... (continues for all repos)

📈 Final Results:
   🔄 Successfully updated: 24
   ⏭️  Skipped: 3
   ❌ Failed: 0
```

---

### Scenario 4: Preview Changes Before Making Them

**Goal**: See what would happen without actually cloning or updating anything.

**Solution**:

```bash
npm run manage:repos:dry
```

**Expected Output**:

```
🚀 Portfolio Repository Manager

🔧 Mode: DRY RUN
🔄 Update existing: NO

🔍 DRY RUN MODE - No actual changes will be made

✗ new-project - Needs cloning
✓ restaurant - Already exists
✓ tourism-hampi - Already exists

==================================================
📊 Summary:
   Total repositories: 28
   Already exist: 27
   To clone: 1
==================================================

🔄 Cloning missing repositories...

📦 Cloning new-project...
   [DRY RUN] Would clone to: d:\Projects\new-project
✅ Successfully cloned new-project

📈 Final Results:
   ✅ Successfully cloned: 1
   (No actual changes were made)
```

---

### Scenario 5: Clone to a Different Directory

**Goal**: Clone repos to `C:\MyProjects` instead of `d:\Projects`.

**Solution**:

1. Edit `clone-portfolio-repos.js`:

```javascript
const PROJECTS_BASE_DIR = 'C:\\MyProjects';
```

2. Run:

```bash
node clone-portfolio-repos.js
```

**Result**: All repos will be cloned to `C:\MyProjects\`

---

### Scenario 6: Using Windows Batch Files (No Command Line)

**Goal**: Clone repos by double-clicking a file.

**Solution**:

1. Double-click `clone-repos.bat`
2. Wait for completion
3. Press any key to close

**What You'll See**:

```
========================================
Portfolio Repository Cloner
========================================

Node.js version:
v18.17.0

Git version:
git version 2.41.0.windows.1

========================================
Starting repository cloning...
========================================

🚀 Portfolio Repository Cloner
... (same output as command line)

========================================
Process completed!
========================================

Press any key to continue...
```

---

### Scenario 7: Interactive Menu (Windows)

**Goal**: Choose what to do from a menu.

**Solution**:

1. Double-click `manage-repos.bat`
2. Choose an option:

```
========================================
Portfolio Repository Manager
========================================

Options:
1. Clone missing repos only
2. Clone missing + Update existing repos
3. Dry run (preview only)
4. Exit

Enter your choice (1-4): 2
```

---

### Scenario 8: Handling Errors

**Goal**: Some repos fail to clone, but you want to continue with the rest.

**Configuration** (in `manage-portfolio-repos.js`):

```javascript
const CONFIG = {
  skipErrors: true, // Continue even if some fail
  // ...
};
```

**Output**:

```
📦 Cloning restaurant...
✅ Successfully cloned restaurant

📦 Cloning private-repo...
❌ Failed to clone private-repo: Repository not found

📦 Cloning tourism-hampi...
✅ Successfully cloned tourism-hampi

... (continues with remaining repos)

📈 Final Results:
   ✅ Successfully cloned: 26
   ❌ Failed: 1
```

---

### Scenario 9: Clone Only Specific Types of Projects

**Goal**: Clone only React projects.

**Solution**: Create a custom script or modify existing one:

```javascript
// In clone-portfolio-repos.js, add filtering:
const repos = extractGitHubRepos(README_PATH);
const reactRepos = repos.filter(
  repo => repo.name.includes('react') || repo.name.includes('next')
);

// Then clone only reactRepos
```

---

### Scenario 10: Check Status of All Repos

**Goal**: See which repos have uncommitted changes.

**Solution**: Use the advanced script with update mode:

```bash
npm run update:repos
```

**Output** (shows status):

```
🔄 Updating restaurant (main)...
✅ Successfully updated restaurant

⚠️  tourism-hampi has uncommitted changes - skipping update
⚠️  video-app has uncommitted changes - skipping update

🔄 Updating chat-app-merng-client (main)...
✅ Successfully updated chat-app-merng-client
```

---

## 🎯 Quick Reference

| Task                            | Command                         |
| ------------------------------- | ------------------------------- |
| Clone all missing repos         | `npm run clone:repos`           |
| Clone missing + update existing | `npm run update:repos`          |
| Preview changes only            | `npm run manage:repos:dry`      |
| Simple clone (no updates)       | `npm run manage:repos`          |
| Windows - Simple clone          | Double-click `clone-repos.bat`  |
| Windows - Interactive menu      | Double-click `manage-repos.bat` |

---

## 💡 Tips & Tricks

### Tip 1: Always Preview First

```bash
npm run manage:repos:dry
```

### Tip 2: Check Git Status Before Updating

```bash
cd d:\Projects\your-repo
git status
```

### Tip 3: Commit Changes Before Updating

```bash
git add .
git commit -m "Save work before update"
npm run update:repos
```

### Tip 4: Clone to External Drive

```javascript
const PROJECTS_BASE_DIR = 'E:\\BackupProjects';
```

### Tip 5: Schedule Regular Updates

Create a Windows Task Scheduler task to run:

```bash
npm run update:repos
```

---

## 🚨 Common Issues & Solutions

### Issue: "Repository not found"

**Cause**: Private repo or typo in URL  
**Solution**: Check repo exists and is public

### Issue: "Permission denied"

**Cause**: No write access to directory  
**Solution**: Run as Administrator or change directory

### Issue: "Uncommitted changes"

**Cause**: Local changes not committed  
**Solution**: Commit or stash changes first

### Issue: "Already up to date"

**Cause**: No new changes on GitHub  
**Solution**: This is normal, no action needed

---

**Need more help?** Check [REPO_MANAGEMENT.md](./REPO_MANAGEMENT.md) for full documentation.
