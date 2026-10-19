import {
  flushPendingCommunityNotification,
  navigateFromCommunityNotification,
  resetPendingCommunityNotificationsForTests,
} from '../app/navigation/navigationRef';

const mockNavigate = jest.fn();
const mockResetRoot = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  CommonActions: {navigate: (payload: unknown) => payload},
  createNavigationContainerRef: () => ({
    isReady: () => false,
    navigate: mockNavigate,
    resetRoot: mockResetRoot,
    dispatch: mockDispatch,
  }),
}));

describe('community notification navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPendingCommunityNotificationsForTests();
  });

  it('queues a notification until navigation is ready', () => {
    expect(navigateFromCommunityNotification({communityId: 'c1'})).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();

    flushPendingCommunityNotification();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
