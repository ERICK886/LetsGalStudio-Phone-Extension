export type CallDirection = "incoming" | "outgoing";
export type CallStatus = "answered" | "declined" | "missed";
export type PhoneCallPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" | "center";

export interface StoryFragmentRef {
  fragmentId: string;
  chapterId?: string;
}

export interface CallRecord {
  id: string;
  characterId: string;
  direction: CallDirection;
  status: CallStatus;
  timestamp: number;
}

export interface OutgoingStoryDefinition extends StoryFragmentRef {
  characterId: string;
  definedAt: number;
}

export interface PhoneCallState {
  contactsExtra: string[];
  contactsRemoved: string[];
  records: CallRecord[];
  outgoingStories: OutgoingStoryDefinition[];
}

export interface IncomingCallSession {
  id: string;
  characterId: string;
  requireAnswer: boolean;
  position?: PhoneCallPosition;
  phase?: "ringing";
  answerStory?: StoryFragmentRef;
  declineStory?: StoryFragmentRef;
}
