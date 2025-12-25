# Google Play Data Safety – Wakt

This guide maps Wakt’s behavior to Play Console Data Safety options.

## Summary
- No user accounts; no analytics; no ads.
- Location used for prayer times/Qibla; optional; stored on device.
- Occasional HTTPS requests for geocoding and font caching; no personal identifiers.

## Data collection
- **Location**: Collects when user opts in or grants permission.
  - Type: Approximate or precise (device sensors).
  - Purpose: App functionality (prayer times, Qibla).
  - Optional: Yes (manual city available).
  - Retention: On device.
- **App activity / Device IDs / Personal info**: Not collected.
- **Financial / Health**: Not collected.

## Data sharing
- No data shared with third parties.

## Data handling
- **Encryption in transit**: Yes, HTTPS.
- **User deletion**: User can clear app data or reset location in settings.
- **Data safety practices**: No sale; no required sign‑in.

## Declarations in Console
- Data collected: Location (optional), for functionality.
- Data shared: None.
- Purpose: Functionality only.
- Retention: On device.
- Security: Encrypted in transit.

## Permissions alignment
- Location, Notifications, Exact alarms, Internet.

Use this as a reference while completing the Data Safety form in Play Console.
