# ⚠️ IMMEDIATE ACTION REQUIRED - API Key Exposure

## 🚨 DO THIS NOW (5 minutes)

Your Firebase API key `AIzaSyD5PJVgiEaS6vfPIUusVQpDdYtdgAQSxeI` is publicly exposed on GitHub.

### Step 1: Regenerate the API Key (2 min)

1. **Open**: https://console.cloud.google.com/apis/credentials?project=stadlandrivier
2. **Find** the exposed API key
3. **Click** "Regenerate Key"
4. **Copy** the new key somewhere safe

### Step 2: Add Restrictions (2 min)

While still in the API key settings:

1. **Application restrictions** → Select "HTTP referrers"
   Add these URLs:
   ```
   https://jwbeekhuis.github.io/*
   https://stadlandrivier.web.app/*
   http://localhost:*
   ```

2. **API restrictions** → Select "Restrict key"
   Enable only:
   - Cloud Firestore API
   - Identity Toolkit API
   - Firebase Analytics API

3. **Click Save**

### Step 3: Update Local File (1 min)

```bash
# In your project folder:
cp firebase-config.template.js firebase-config.js
```

Open `firebase-config.js` and paste your NEW API key at line 17.

---

## 🔄 NEXT STEPS (do within 24 hours)

See [SECURITY-SETUP.md](SECURITY-SETUP.md) for:
- Removing the key from Git history
- Monitoring for abuse
- Complete security checklist

---

## ✅ Quick Verification

After completing the above:

```bash
# Verify firebase-config.js is NOT tracked by git:
git status

# You should see: "nothing to commit, working tree clean"
# You should NOT see firebase-config.js listed

# Verify the old key is no longer in your working files:
grep -r "AIzaSyD5PJVgiEaS6vfPIUusVQpDdYtdgAQSxeI" .

# Should only find it in:
# - IMMEDIATE-ACTION.md (this file)
# - SECURITY-SETUP.md
# - Git history (will clean up next)
```

---

**Don't panic** - Firebase API keys are meant to be included in client-side code, BUT they should have restrictions. The restrictions you just added will limit abuse. The history cleanup prevents future scanners from finding it.
