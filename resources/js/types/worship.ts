export type UserRole = 'admin' | 'leader' | 'member';

export type InstrumentType = 
  | 'guitar'
  | 'bass'
  | 'drums'
  | 'keyboard'
  | 'acoustic_guitar'
  | 'violin'
  | 'other';

export type VoiceType = 
  | 'soprano'
  | 'alto'
  | 'tenor'
  | 'bass'
  | 'lead';

export interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  instruments: InstrumentType[];
  voiceTypes: VoiceType[];
  canLead: boolean;
  role: UserRole;
  createdAt: Date;
}

export interface Schedule {
  id: string;
  date: Date;
  members: ScheduleMember[];
  songs: Song[];
  status: 'draft' | 'published' | 'confirmed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleMember {
  memberId: string;
  memberName: string;
  function: string;
  confirmed: boolean;
  requestedChange: boolean;
  changeReason?: string;
}

export interface Song {
  id: string;
  title: string;
  artist?: string;
  chordsUrl?: string;
  lyricsUrl?: string;
  videoUrl?: string;
  tags: string[];
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'schedule' | 'reminder' | 'change_request' | 'announcement';
  read: boolean;
  createdAt: Date;
}
