export type FeedbackCategory='generation'|'account'|'billing'|'assets'|'suggestion'|'other';
export type FeedbackStatus='open'|'processing'|'resolved'|'closed';
export type FeedbackSummary={id:string;category:FeedbackCategory;message:string;status:FeedbackStatus;version:number;createdAt:string;updatedAt:string;replyCount:number;ownerEmail?:string};
export type FeedbackDetail=FeedbackSummary&{images:{position:number;url:string}[];events:{id:string;message:string|null;status:FeedbackStatus;createdAt:string}[]};
export type FeedbackList={items:FeedbackSummary[];nextCursor:string|null};
