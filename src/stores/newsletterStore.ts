import { create } from 'zustand';
import type { NewsletterSummary } from '../types';

interface NewsletterState {
  newsletterId: string | null;
  title: string;
  savedNewsletters: NewsletterSummary[];
  exportPath: string;

  setNewsletterId: (id: string | null) => void;
  setTitle: (title: string) => void;
  setSavedNewsletters: (list: NewsletterSummary[]) => void;
  setExportPath: (path: string) => void;
}

export const useNewsletterStore = create<NewsletterState>((set) => ({
  newsletterId: null,
  title: 'Untitled Newsletter',
  savedNewsletters: [],
  exportPath: '',

  setNewsletterId: (id) => set({ newsletterId: id }),
  setTitle: (title) => set({ title }),
  setSavedNewsletters: (list) => set({ savedNewsletters: list }),
  setExportPath: (path) => set({ exportPath: path }),
}));
