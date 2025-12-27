# 🚀 Developer Setup Guide

## Prerequisites

- A web browser (Chrome, Firefox, Safari, or Edge)
- A text editor (VS Code recommended)
- Git installed
- Access to the Firebase project (ask the project owner)

---

## 🔧 Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jwbeekhuis/stadlandrivier.git
cd stadlandrivier
```

### 2. Configure Firebase (REQUIRED)

The Firebase configuration is **not** included in the repository for security reasons.

```bash
# Copy the template
cp firebase-config.template.js firebase-config.js
```

Then edit `firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",              // ← Ask project owner
    authDomain: "stadlandrivier.firebaseapp.com",
    projectId: "stadlandrivier",
    storageBucket: "stadlandrivier.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // ← Ask project owner
    appId: "YOUR_APP_ID",                     // ← Ask project owner
    measurementId: "YOUR_MEASUREMENT_ID"      // ← Ask project owner
};
```

**Where to get these values:**
- Ask the project owner (@jwbeekhuis) for the Firebase configuration
- Or get them from [Firebase Console](https://console.firebase.google.com/project/stadlandrivier/settings/general) (requires access)

### 3. Run the Application

Since this is a client-side only application, you can run it in two ways:

#### Option A: Using Python's HTTP Server

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: http://localhost:8000

#### Option B: Using Node.js http-server

```bash
# Install globally (once)
npm install -g http-server

# Run
http-server -p 8000
```

Then open: http://localhost:8000

#### Option C: Using VS Code Live Server Extension

1. Install the "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

---

## 🛡️ Security Guidelines

### NEVER Commit These Files:

- ❌ `firebase-config.js` - Contains API keys
- ❌ `.env` files - Environment variables
- ❌ Any file with credentials or secrets

These are already in `.gitignore`, but **always double-check** before committing:

```bash
git status
git diff --cached
```

### Before Every Commit:

1. **Review your changes**: `git diff`
2. **Check what you're committing**: `git status`
3. **Verify no secrets**: Search for "apiKey", "password", "secret", etc.

---

## 📁 Project Structure

```
stadlandrivier/
├── index.html              # Main HTML file
├── script.js               # Main game logic
├── style.css              # Styles
├── translations.js        # i18n translations (NL/EN)
├── firebase-config.js     # Firebase config (gitignored, you create this)
├── firebase-config.template.js  # Template for Firebase config
├── word-library.json      # Word library for game categories
└── README.md             # Project documentation
```

---

## 🔥 Firebase Project Structure

### Firestore Collections:

- **`rooms/`** - Game rooms
  - `code` - Room code (4 chars)
  - `host` - Host player UID
  - `players` - Array of player objects
  - `settings` - Game settings (timer, rounds, etc.)
  - `gameState` - Current game state
  - `rounds` - Array of round data

- **`users/`** - User profiles and preferences
  - `profile` - User profile data
  - `preferences` - User preferences (language, theme)

### Security Rules:

Firebase security rules are configured in the Firebase Console. Basic principles:
- Anyone can read public room data
- Only authenticated users can write
- Users can only modify their own data
- Room hosts have additional permissions

---

## 🧪 Testing Locally

### Test with Multiple Players:

1. Open the app in multiple browser windows/tabs
2. Or use different browsers
3. Or use incognito/private mode + regular mode

### Test Offline Mode:

1. Open DevTools (F12)
2. Go to Network tab
3. Select "Offline" from the throttling dropdown
4. Test that the app shows appropriate error messages

---

## 🌐 Deployment

The app is automatically deployed to:
- **GitHub Pages**: https://jwbeekhuis.github.io/stadlandrivier/
- **Firebase Hosting**: https://stadlandrivier.web.app/

### Manual Deployment to Firebase:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy
```

---

## 📚 Useful Commands

```bash
# Check git status
git status

# See what changed
git diff

# Create a new branch
git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "Description of changes"

# Push to GitHub
git push origin feature/my-feature
```

---

## 🐛 Troubleshooting

### "Firebase not initialized" error
- Make sure you've created `firebase-config.js` from the template
- Check that the API key and other values are correct

### "Permission denied" errors
- Check Firebase security rules
- Make sure you're authenticated (the app does this automatically)

### Changes not showing up
- Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Check browser console for errors (F12)

### Port already in use
- Use a different port: `python -m http.server 8080`
- Or kill the process using the port

---

## 📖 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [JavaScript ES6+ Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes
3. Test thoroughly
4. Commit: `git commit -m "Add amazing feature"`
5. Push: `git push origin feature/amazing-feature`
6. Create a Pull Request

---

## ❓ Getting Help

- Check the [SECURITY-SETUP.md](SECURITY-SETUP.md) for security-related questions
- Contact the project owner: @jwbeekhuis
- Check existing issues on GitHub

---

**Last Updated**: 2025-12-27
