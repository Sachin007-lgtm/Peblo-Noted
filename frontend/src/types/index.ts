export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface Note {
  note_id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  archived: boolean;
  pinned: boolean;
  isPublic: boolean;
  shareId?: string;
  updatedAt: string;
  createdAt: string;
  userId: string;
  aiSummary?: AISummary;
  color?: string;
}

export interface AISummary {
  summary: string;
  action_items: string[];
  suggested_title: string;
  generatedAt: string;
}

export interface InsightData {
  totalNotes: number;
  archivedNotes: number;
  aiUsageCount: number;
  mostUsedTags: { tag: string; count: number }[];
  weeklyActivity: { day: string; count: number }[];
  recentlyEdited: Note[];
}

export type FilterOption = 'all' | 'pinned' | 'archived' | 'shared';
export type SortOption = 'updated' | 'created' | 'title';
