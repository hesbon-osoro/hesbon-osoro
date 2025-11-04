# 🚀 Quick Start Guide - Portfolio Repository Management

## First Time Setup (3 Steps)

### 1️⃣ Preview What Will Be Cloned

```bash
node clone-portfolio-repos.js
```

Open the script and set `DRY_RUN = true` first to see what would happen.

### 2️⃣ Clone All Missing Repos

Set `DRY_RUN = false` and run:

```bash
node clone-portfolio-repos.js
```

### 3️⃣ Done! ✨

All your portfolio repos are now in `d:\Projects\`

---

## Common Tasks

### 📥 Clone New Projects Added to Portfolio

```bash
npm run manage:repos
```

### 🔄 Update All Existing Projects

```bash
npm run update:repos
```

### 👀 Preview Changes (No Actual Changes)

```bash
npm run manage:repos:dry
```

---

## Configuration

Edit these files to customize:

- **`clone-portfolio-repos.js`** - Simple cloning script
- **`manage-portfolio-repos.js`** - Advanced management with updates
- **`.repo-manager-config.json`** - Configuration reference

### Change Clone Directory

Edit either script and change:

```javascript
const PROJECTS_BASE_DIR = 'd:\\Projects'; // Change this path
```

---

## Extracted Repositories

The scripts will automatically find all repos from your README.md:

✅ restaurant  
✅ tourism-hampi  
✅ video-app  
✅ chat-app-merng-client  
✅ dating-app-frontend  
✅ salad  
✅ agency-site  
✅ portfolio-hb  
✅ recipes-homemade  
✅ messaging-app-frontend  
✅ shoppy-admin-dashboard  
✅ simple-multistep-form  
✅ alarm-clock  
✅ snake-game  
✅ react-chess  
✅ sort-visualizer  
✅ shopping-cart  
✅ custom-pagination  
✅ react-select  
✅ drag-and-drop  
✅ ck-editor-react  
✅ tic-tac-toe  
✅ face-auth  
✅ dynamic-next-previous-buttons  
✅ nextjs-video-streaming  
✅ MindTap  
✅ follow-for-follow-back

**Total: 27 repositories**

---

## Troubleshooting

### Git Not Found?

```bash
git --version
```

If this fails, install Git from: https://git-scm.com/

### Permission Denied?

Run your terminal as Administrator

### Repo Already Exists?

The script will skip it automatically ✅

### Want to Re-clone a Repo?

Delete the local folder first, then run the script again

---

## Need Help?

📖 Full documentation: [REPO_MANAGEMENT.md](./REPO_MANAGEMENT.md)

---

**Happy Coding! 🎉**
