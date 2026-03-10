# 🔥 Deploy Firestore Security Rules - Quick Guide

## The Problem
Your app shows "Saving..." but doesn't save because Firebase is blocking the writes. This happens when security rules aren't deployed.

## The Solution - Deploy Security Rules

### Option 1: Via Firebase Console (Recommended - Easiest)

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/project/news-9d3d2/firestore/rules

2. **Copy the Rules**
   - Open the file `firestore.rules` in your project folder
   - Copy ALL the contents

3. **Paste and Publish**
   - Paste the rules into the Firebase Console editor
   - Click **"Publish"** button

4. **Test**
   - Go back to your app
   - Try setting income/budget again
   - It should work now! ✅

---

### Option 2: Temporary Open Rules (FOR TESTING ONLY)

If you want to test quickly, you can temporarily use open rules:

1. Go to: https://console.firebase.google.com/project/news-9d3d2/firestore/rules
2. Replace with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

⚠️ **WARNING**: These rules allow any authenticated user to read/write ANY data. Only use for testing, then deploy the proper rules from `firestore.rules`!

---

## How to Check if Rules are Deployed

1. Open browser console (F12)
2. Try to save income/budget
3. If you see errors like "Missing or insufficient permissions", rules aren't deployed
4. If it saves successfully, rules are working! ✅

---

## Need Help?

If you're still having issues:
1. Check the browser console for error messages
2. Make sure you're logged in to the app
3. Verify you're using the correct Firebase project (news-9d3d2)
