import type {FeedbackCategory,FeedbackStatus} from './feedback';
export const FEEDBACK_CATEGORIES:Readonly<Record<FeedbackCategory,string>>;
export const FEEDBACK_STATUSES:Readonly<Record<FeedbackStatus,string>>;
export const FEEDBACK_LIMITS:Readonly<{images:number;imageBytes:number;bodyBytes:number;message:number;reply:number}>;
