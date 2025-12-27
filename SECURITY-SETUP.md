# 🔒 Security Setup - Firebase Configuration

## ⚠️ CRITICAL: Exposed API Key Incident

Your Firebase API key was exposed in the public GitHub repository. Follow these steps **immediately** to secure your project.

---

## 🚨 IMMEDIATE ACTIONS REQUIRED

### Step 1: Regenerate the Compromised API Key

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials?project=stadlandrivier)
2. Find the API key: `AIzaSyD5PJVgiEaS6vfPIUusVQpDdYtdgAQSxeI`
3. Click on the key to edit it
4. Click the **"Regenerate Key"** button
5. Copy the new API key (you'll need it in Step 3)

### Step 2: Add API Key Restrictions

While editing the API key in Google Cloud Console:

1. **Application restrictions**:
   - Select "HTTP referrers (web sites)"
   - Add your authorized domains:
     ```
     https://jwbeekhuis.github.io/*
     https://stadlandrivier.web.app/*
     https://stadlandrivier.firebaseapp.com/*
     http://localhost:*
     http://127.0.0.1:*
     ```

2. **API restrictions**:
   - Select "Restrict key"
   - Enable only the APIs you use:
     - Firebase Authentication API
     - Cloud Firestore API
     - Firebase Analytics API
     - Identity Toolkit API

3. Click **Save**

### Step 3: Update Your Local Configuration

1. Copy the template file to create your config:
   ```bash
   cp firebase-config.template.js firebase-config.js
   ```

2. Open `firebase-config.js` and replace the placeholders with your **NEW** API key and other config values:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_NEW_API_KEY_HERE",  // ← Put the regenerated key here
       authDomain: "stadlandrivier.firebaseapp.com",
       projectId: "stadlandrivier",
       storageBucket: "stadlandrivier.firebasestorage.app",
       messagingSenderId: "749426554950",
       appId: "1:749426554950:web:234c94d43c9b02d6337247",
       measurementId: "G-XLGXL4SCWQ"
   };
   ```

3. **Verify** that `firebase-config.js` is listed in `.gitignore` (it should be already)

### Step 4: Remove the Exposed Key from Git History

The exposed key still exists in your Git history. You MUST remove it:

#### Option A: Using git-filter-repo (Recommended)

```bash
# Install git-filter-repo
pip install git-filter-repo

# Backup your repository first!
cd ..
cp -r StadLandRivier StadLandRivier-backup

# Remove the file from history
cd StadLandRivier
git filter-repo --path firebase-config.js --invert-paths

# Force push to GitHub (⚠️ WARNING: This rewrites history)
git push origin --force --all
git push origin --force --tags
```

#### Option B: Using BFG Repo-Cleaner

```bash
# Download BFG: https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh copy
cd ..
git clone --mirror https://github.com/jwbeekhuis/stadlandrivier.git stadlandrivier-mirror
cd stadlandrivier-mirror

# Remove the file
java -jar bfg.jar --delete-files firebase-config.js

# Clean up and push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

#### Option C: Contact GitHub Support

If you're not comfortable with the above methods:
1. Delete the repository on GitHub
2. Create a new repository
3. Push your cleaned local version

### Step 5: Review Billing & Usage

1. Go to [Google Cloud Console - Billing](https://console.cloud.google.com/billing?project=stadlandrivier)
2. Check for any unexpected usage or charges
3. Set up billing alerts if not already configured

### Step 6: Enable Monitoring

1. Go to [Firebase Console - Usage](https://console.firebase.google.com/project/stadlandrivier/usage)
2. Set up alerts for unusual activity
3. Monitor daily for the next week

---

## 🛡️ Prevention - Best Practices

### For This Project

1. **Never commit `firebase-config.js`** - It's now in `.gitignore`
2. **Always use the template** - Share `firebase-config.template.js` instead
3. **Review before committing**:
   ```bash
   git status          # Check what you're committing
   git diff --cached   # Review staged changes
   ```

### For Future Projects

1. **Use environment variables** for sensitive data
2. **Use Firebase App Check** for additional security
3. **Enable audit logging** in Google Cloud
4. **Regular security reviews** of your codebase
5. **Use GitHub secret scanning** alerts

---

## 📋 Checklist

Before considering this issue resolved, ensure:

- [ ] Old API key regenerated in Google Cloud Console
- [ ] API key restrictions configured (HTTP referrers + API limits)
- [ ] Local `firebase-config.js` updated with new key
- [ ] `firebase-config.js` is in `.gitignore`
- [ ] Git history cleaned (old key removed)
- [ ] Force pushed cleaned history to GitHub
- [ ] Verified old key no longer in repository (check all branches)
- [ ] Billing and usage reviewed (no unexpected charges)
- [ ] Monitoring alerts set up
- [ ] Team members informed (if applicable)

---

## 🆘 Need Help?

- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Handling Compromised Credentials](https://cloud.google.com/support/docs/compromised-credentials)

---

## 📝 Notes for Team Members

If you're cloning this repository:

1. Copy the template: `cp firebase-config.template.js firebase-config.js`
2. Ask the project owner for the Firebase configuration values
3. **Never commit your `firebase-config.js` file**

---

**Last Updated**: 2025-12-27
**Incident Reference**: Google API Key Exposure Notification
