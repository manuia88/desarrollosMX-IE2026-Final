import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCommandPaletteStore } from '../hooks/use-command-palette';

beforeEach(() => {
  useCommandPaletteStore.setState({ isOpen: false, recents: [], hydrated: false });
});
afterEach(() => {
  useCommandPaletteStore.setState({ isOpen: false, recents: [], hydrated: false });
});

describe('useCommandPaletteStore', () => {
  it('starts closed and toggles', () => {
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });

  it('addRecent prepends and dedupes (max 5)', () => {
    const { addRecent } = useCommandPaletteStore.getState();
    addRecent('a');
    addRecent('b');
    addRecent('a');
    expect(useCommandPaletteStore.getState().recents).toEqual(['a', 'b']);
  });

  it('open and close mutate state explicitly', () => {
    useCommandPaletteStore.getState().open();
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
    useCommandPaletteStore.getState().close();
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });
});
