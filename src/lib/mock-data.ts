import type { Notebook, Note, DailyQuoteType } from '@/types';

export const mockNotebooks: Notebook[] = [
  {
    id: 'nb-1',
    name: 'School Notes',
    color: '#FFD700', // Gold
    icon: 'BookOpen',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'nb-2',
    name: 'University Lectures',
    color: '#ADD8E6', // Light Blue
    icon: 'GraduationCap',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'nb-3',
    name: 'Meeting Minutes',
    color: '#90EE90', // Light Green
    icon: 'Briefcase',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'nb-4',
    name: 'Personal Journal',
    color: '#FFB6C1', // Light Pink
    icon: 'Heart',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockNotes: Note[] = [
  {
    id: 'note-1',
    notebookId: 'nb-1',
    title: 'Math Homework Q3',
    content: 'Remember to solve the quadratic equation using the new formula. Show all steps. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    updatedAt: new Date().toISOString(),
    isBookmarked: true,
  },
  {
    id: 'note-2',
    notebookId: 'nb-1',
    title: 'Literature Essay Ideas',
    content: 'Brainstorm themes for the upcoming essay on Shakespeare. Focus on tragedy vs comedy. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date().toISOString(),
    isBookmarked: false,
  },
  {
    id: 'note-3',
    notebookId: 'nb-2',
    title: 'Physics Lecture 101',
    content: 'Key concepts: Newton\'s laws, energy conservation. Review chapter 3. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isBookmarked: true,
  },
  {
    id: 'note-4',
    notebookId: 'nb-4',
    title: 'Thoughts on Today',
    content: 'Today was a good day. Felt productive and happy. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isBookmarked: false,
  },
  {
    id: 'note-5',
    notebookId: 'nb-3',
    title: 'Project Alpha Sync',
    content: 'Action items: Alice to finalize design mockups. Bob to research API integrations. Meeting adjourned at 4 PM. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    isBookmarked: false,
  },
];

export const mockDailyQuotes: DailyQuoteType[] = [
  { id: 'q1', text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { id: 'q2', text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { id: 'q3', text: "The mind is everything. What you think you become.", author: "Buddha" },
  { id: 'q4', text: "Your time is limited, so don’t waste it living someone else’s life.", author: "Steve Jobs" },
  { id: 'q5', text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
];
