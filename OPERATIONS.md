# Jianghu Operations Manual (SOP)

> **Persona**: Global Top-Tier Mobile Architect
> **Goal**: Ensure 99.9% uptime and <0.1% crash rate for the Jianghu app.

## 1. Monitoring Routine (Daily)

Every morning, check the following dashboards:

### A. Sentry (Health)
*   **Issues Stream**: Are there any new spikes in errors?
*   **Crash Free Session Rate**: Should be > 99%.
*   **Action**: If a new issue has >10 events, create a P0 ticket.

### B. Supabase (Data)
*   **Logs > Auth**: Check for unusual failed login attempts.
*   **Database > Replication**: Ensure realtime functionality is healthy.

---

## 2. Release Protocol

We use **Expo EAS** for all deployments.

### A. Hotfixes (OTA Updates)
*   **Use Case**: Typos, JS bug fixes, minor UI tweaks (NO native code changes).
*   **Command**: `eas update --branch production --message "Fix: description of fix"`
*   **Effect**: Users receive update on next app restart.

### B. Store Release (Binary Build)
*   **Use Case**: Adding new native libraries, changing app icon/name, major version bump.
*   **Command**: `eas build --profile production --platform all`
*   **Action**: Submit the resulting `.aab` / `.ipa` to App Store Connect / Google Play.

---

## 3. Emergency Protocols

### Case 1: App Crashing on Launch (Bad OTA)
1.  **Identify**: Sentry alerts show spike in startup crashes.
2.  **Rollback**: 
    Go to Expo Dashboard -> Updates -> Select "production" branch -> Revert to previous working update group.
3.  **Fix**: Investigate locally, test thoroughly, then push new update.

### Case 2: Data Corruption / API Failure
1.  **Status**: Check Supabase Status page.
2.  **Mitigation**: If Supabase is down, the App is designed to show cached content (Offline-First).
3.  **Communicate**: Update social media / status page if outage > 1 hour.

---

## 4. Maintenance Commands

*   `npm run lint`: Check code quality before commit.
*   `npm run test`: Run unit tests (if added).
*   `eas update`: Push JS updates.
