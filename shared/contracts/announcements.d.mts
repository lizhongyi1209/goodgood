export const ANNOUNCEMENT_LIMITS: Readonly<{ title: 100; body: 12000; bodyBytes: 65536; page: 20; streamsPerUser: 4 }>;
export const ANNOUNCEMENT_STATUSES: readonly ["draft", "published", "withdrawn", "deleted"];
export const ANNOUNCEMENT_ACTIONS: readonly ["save", "publish", "withdraw", "delete"];
export const ANNOUNCEMENTS_CHANGED_EVENT: "goodgood:announcements-changed";
