# 🎯 Action Plan - API Key Security Incident Response

## 📋 Overview

Your Firebase API key was exposed in the public GitHub repository. This document outlines the complete action plan to resolve this security incident.

---

## ⏰ Timeline & Priorities

### 🚨 **RIGHT NOW** (Next 10 minutes) - CRITICAL

Follow the instructions in [IMMEDIATE-ACTION.md](IMMEDIATE-ACTION.md):

1. **Regenerate the API key** in Google Cloud Console (2 min)
2. **Add API restrictions** to limit abuse (2 min)
3. **Create local config file** from template (1 min)
4. **Test that the app still works** locally (5 min)

**Status**: ⬜ Not started / ⏳ In progress / ✅ Completed

---

### 📦 **TODAY** (Next 1-2 hours) - HIGH PRIORITY

#### Phase 1: Commit Security Improvements

```bash
# Stage the security-related files
git add .gitignore
git add firebase-config.template.js
git add IMMEDIATE-ACTION.md
git add SECURITY-SETUP.md
git add SETUP-FOR-DEVELOPERS.md
git add ACTION-PLAN.md
git add cleanup-git-history.sh
git add cleanup-git-history.bat

# Commit
git commit -m "security: Add Firebase config security measures

- Add firebase-config.js to .gitignore
- Create firebase-config.template.js for developers
- Add security documentation and setup guides
- Include git history cleanup scripts

This addresses the exposed API key incident reported by Google."

# Push to GitHub
git push origin main
```

**Status**: ⬜ Not started

---

#### Phase 2: Clean Git History

⚠️ **IMPORTANT**: Do this AFTER you've regenerated the API key and it's working!

**Option A: Automated Cleanup (Windows)**
```bash
# Run the Windows batch script
cleanup-git-history.bat
```

**Option B: Automated Cleanup (macOS/Linux/Git Bash)**
```bash
# Make script executable
chmod +x cleanup-git-history.sh

# Run the script
./cleanup-git-history.sh
```

**Option C: Manual Cleanup**
See detailed instructions in [SECURITY-SETUP.md](SECURITY-SETUP.md#step-4-remove-the-exposed-key-from-git-history)

**Status**: ⬜ Not started

---

### 🔍 **THIS WEEK** (Next 7 days) - MONITORING

#### Day 1-7: Monitor for Abuse

- [ ] **Daily**: Check [Google Cloud Billing](https://console.cloud.google.com/billing?project=stadlandrivier)
- [ ] **Daily**: Check [Firebase Usage](https://console.firebase.google.com/project/stadlandrivier/usage)
- [ ] **Daily**: Review [Firestore Usage Metrics](https://console.firebase.google.com/project/stadlandrivier/firestore/usage)

**Look for**:
- Unexpected spikes in API calls
- Requests from unknown IP addresses
- Unusual storage or bandwidth usage
- Any costs appearing in billing

**If you see suspicious activity**:
1. Regenerate the API key again
2. Check Firestore data for unauthorized writes
3. Review Cloud Logging for suspicious requests
4. Consider enabling Firebase App Check

**Status**: ⬜ Not started

---

#### Set Up Alerts

1. Go to [Google Cloud Console - Billing Budgets](https://console.cloud.google.com/billing/budgets?project=stadlandrivier)
2. Create a budget alert:
   - Budget amount: €10/month (or your preferred amount)
   - Alert thresholds: 50%, 90%, 100%
   - Email notifications: Your email

**Status**: ⬜ Not started

---

### 🛡️ **ONGOING** - PREVENTION

#### Implement Additional Security Measures

- [ ] **Firebase App Check**: Add App Check to prevent unauthorized API usage
  - [Setup Guide](https://firebase.google.com/docs/app-check)

- [ ] **Firestore Security Rules Review**: Audit and tighten your security rules
  - [Current Rules](https://console.firebase.google.com/project/stadlandrivier/firestore/rules)

- [ ] **GitHub Secret Scanning**: Enable secret scanning alerts
  - Go to: Settings → Security → Code security and analysis
  - Enable "Secret scanning"

- [ ] **Pre-commit Hooks**: Prevent accidental commits of secrets
  ```bash
  # Install git-secrets
  npm install -g git-secrets

  # Set up in your repo
  git secrets --install
  git secrets --register-aws  # Registers AWS patterns
  git secrets --add 'AIza[0-9A-Za-z-_]{35}'  # Firebase API key pattern
  ```

**Status**: ⬜ Not started

---

## 📊 Progress Tracker

### Critical Actions (Must Complete)
- [ ] 1. Regenerate API key in Google Cloud
- [ ] 2. Add API key restrictions
- [ ] 3. Update local firebase-config.js
- [ ] 4. Test app locally with new key
- [ ] 5. Commit security files to git
- [ ] 6. Clean git history (remove old key)
- [ ] 7. Verify old key is gone from GitHub

### Important Actions (Should Complete)
- [ ] 8. Set up billing alerts
- [ ] 9. Monitor usage for 7 days
- [ ] 10. Enable GitHub secret scanning
- [ ] 11. Review Firestore security rules

### Optional Enhancements
- [ ] 12. Implement Firebase App Check
- [ ] 13. Set up pre-commit hooks
- [ ] 14. Add monitoring dashboard
- [ ] 15. Document incident in team wiki

---

## 🎓 Lessons Learned

### What Went Wrong
- Firebase configuration with API key was committed to public repository
- No .gitignore entry for firebase-config.js
- No pre-commit hooks to catch secrets

### What We're Fixing
- ✅ Added firebase-config.js to .gitignore
- ✅ Created template file for developers
- ✅ Added comprehensive security documentation
- ✅ Created automated cleanup scripts
- 🔄 Will implement pre-commit hooks
- 🔄 Will enable secret scanning

### What To Do Differently
1. **Always use templates** for files with secrets
2. **Always .gitignore** configuration files with credentials
3. **Use pre-commit hooks** to catch secrets before they're committed
4. **Enable secret scanning** on GitHub
5. **Regular security audits** of the codebase

---

## 📞 Support & Resources

### If You Need Help

**During this incident response:**
- Google Cloud Support: [Contact Support](https://cloud.google.com/support)
- Firebase Support: [Firebase Help Center](https://firebase.google.com/support)

**General questions:**
- See [SECURITY-SETUP.md](SECURITY-SETUP.md) for detailed security instructions
- See [SETUP-FOR-DEVELOPERS.md](SETUP-FOR-DEVELOPERS.md) for development setup

### Useful Links

- [Firebase Console](https://console.firebase.google.com/project/stadlandrivier)
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=stadlandrivier)
- [GitHub Repository](https://github.com/jwbeekhuis/stadlandrivier)
- [Firebase Security Docs](https://firebase.google.com/docs/rules)

---

## ✅ Completion Checklist

Before closing this incident:

- [ ] Old API key regenerated
- [ ] New API key has restrictions applied
- [ ] App tested and working with new key
- [ ] Security files committed to git
- [ ] Git history cleaned (old key removed)
- [ ] Verified old key not in GitHub (search commits)
- [ ] Billing alerts configured
- [ ] No suspicious usage detected
- [ ] Team members informed (if applicable)
- [ ] Documentation updated
- [ ] Prevention measures implemented

**Incident Closed Date**: _________________

**Signed off by**: _________________

---

**Created**: 2025-12-27
**Incident**: Google Cloud API Key Exposure
**Severity**: High
**Status**: 🟡 In Progress → 🟢 Resolved (pending)
