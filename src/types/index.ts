
export interface Notebook {
  id: string;
  name: string;
  color: string; // hex color
  icon: string; // Lucide icon name
  createdAt: string; // ISO string date
  updatedAt: string; // ISO string date
}

export interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: string; // HTML string for notes, Data URL string for whiteboards
  type: 'note' | 'whiteboard'; // Type of the entry
  createdAt: string; // ISO string date
  updatedAt: string; // ISO string date
  isBookmarked: boolean;
}

export interface DailyQuoteType {
  id: string;
  text: string;
  author: string;
}
