import type { Notebook, Note, DailyQuoteType } from '@/types';

export const mockNotebooks: Notebook[] = [];

export const mockNotes: Note[] = [];

export const mockDailyQuotes: DailyQuoteType[] = [
  { id: 'q1', text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { id: 'q2', text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { id: 'q3', text: "The mind is everything. What you think you become.", author: "Buddha" },
  { id: 'q4', text: "Your time is limited, so don’t waste it living someone else’s life.", author: "Steve Jobs" },
  { id: 'q5', text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
];
