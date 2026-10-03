export const ANNOUNCEMENT_LIMITS = Object.freeze({ title: 100, body: 12000, bodyBytes: 65536, page: 20, streamsPerUser: 4 });
export const ANNOUNCEMENT_STATUSES = Object.freeze(["draft", "published", "withdrawn", "deleted"]);
export const ANNOUNCEMENT_ACTIONS = Object.freeze(["save", "publish", "withdraw", "delete"]);
export const ANNOUNCEMENTS_CHANGED_EVENT = "goodgood:announcements-changed";
