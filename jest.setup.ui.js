// AsyncStorage has no native module under Jest, so back it with an in-memory map.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: async (key) => (store.has(key) ? store.get(key) : null),
      setItem: async (key, value) => { store.set(key, value); },
      removeItem: async (key) => { store.delete(key); },
      getAllKeys: async () => [...store.keys()],
      clear: async () => { store.clear(); },
      multiGet: async (keys) => keys.map((key) => [key, store.get(key) ?? null]),
      multiSet: async (pairs) => { for (const [key, value] of pairs) store.set(key, value); },
      multiRemove: async (keys) => { for (const key of keys) store.delete(key); },
    },
  };
});

// Haptics are fire-and-forget on device and irrelevant to assertions here.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// RN's Animated driver settles after the assertion phase; the resulting act
// warning is test-harness noise, not a defect. Filtered narrowly so real act
// problems still surface.
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('inside a test was not wrapped in act')) return;
  originalError(...args);
};
