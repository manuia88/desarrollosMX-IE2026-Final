import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCopilotDrawerStore } from '../hooks/use-copilot-drawer';

beforeEach(() => {
  useCopilotDrawerStore.setState({ active: null });
});
afterEach(() => {
  useCopilotDrawerStore.setState({ active: null });
});

describe('useCopilotDrawerStore', () => {
  it('starts with no active drawer', () => {
    expect(useCopilotDrawerStore.getState().active).toBeNull();
  });

  it('toggle switches active key', () => {
    useCopilotDrawerStore.getState().toggle('voice');
    expect(useCopilotDrawerStore.getState().active).toBe('voice');
    useCopilotDrawerStore.getState().toggle('voice');
    expect(useCopilotDrawerStore.getState().active).toBeNull();
  });

  it('open sets active and close resets', () => {
    useCopilotDrawerStore.getState().open('briefing');
    expect(useCopilotDrawerStore.getState().active).toBe('briefing');
    useCopilotDrawerStore.getState().close();
    expect(useCopilotDrawerStore.getState().active).toBeNull();
  });
});
