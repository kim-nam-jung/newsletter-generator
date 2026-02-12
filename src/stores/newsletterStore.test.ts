import { describe, it, expect, beforeEach } from 'vitest';
import { useNewsletterStore } from './newsletterStore';

describe('newsletterStore', () => {
  beforeEach(() => {
    useNewsletterStore.setState({
      newsletterId: null,
      title: 'Untitled Newsletter',
      savedNewsletters: [],
      exportPath: '',
    });
  });

  it('should have correct initial state', () => {
    const state = useNewsletterStore.getState();
    expect(state.newsletterId).toBeNull();
    expect(state.title).toBe('Untitled Newsletter');
    expect(state.savedNewsletters).toEqual([]);
    expect(state.exportPath).toBe('');
  });

  it('should set newsletterId', () => {
    useNewsletterStore.getState().setNewsletterId('abc-123');
    expect(useNewsletterStore.getState().newsletterId).toBe('abc-123');
  });

  it('should set newsletterId to null', () => {
    useNewsletterStore.getState().setNewsletterId('abc');
    useNewsletterStore.getState().setNewsletterId(null);
    expect(useNewsletterStore.getState().newsletterId).toBeNull();
  });

  it('should set title', () => {
    useNewsletterStore.getState().setTitle('My Newsletter');
    expect(useNewsletterStore.getState().title).toBe('My Newsletter');
  });

  it('should set savedNewsletters', () => {
    const list = [
      { id: '1', title: 'First', updatedAt: 1000 },
      { id: '2', title: 'Second', updatedAt: 2000 },
    ];
    useNewsletterStore.getState().setSavedNewsletters(list);
    expect(useNewsletterStore.getState().savedNewsletters).toEqual(list);
  });

  it('should set exportPath', () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');
    expect(useNewsletterStore.getState().exportPath).toBe('C:\\exports');
  });
});
