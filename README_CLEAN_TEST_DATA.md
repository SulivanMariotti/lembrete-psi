# Clean test data (attendance logs)

This package contains a one-shot script to delete ALL documents from the Firestore collection
that feeds Admin -> Presence/Absences.

Files:
- scripts/purgeAttendanceLogs.cjs

How to use:
1) Copy scripts/purgeAttendanceLogs.cjs into your project (create /scripts if needed).
2) Make sure your project root has .env.local (or .env) with ONE of:
   - FIREBASE_ADMIN_SERVICE_ACCOUNT_B64=...
   - FIREBASE_ADMIN_SERVICE_ACCOUNT={...json...}
   Or set FIREBASE_ADMIN_KEYFILE=C:\path\to\serviceAccountKey.json
3) Run (from project root where package.json is):
   node scripts/purgeAttendanceLogs.cjs --yes

Optional (other collections):
   node scripts/purgeAttendanceLogs.cjs --collection=history --yes
   node scripts/purgeAttendanceLogs.cjs --collection=audit_logs --yes

Then reload the Admin page (Ctrl+Shift+R).
