import {
  flushPendingCommunityNotification,
  navigateFromCommunityNotification,
  resetPendingCommunityNotificationsForTests,
} from '../app/navigation/navigationRef';
import {navigationRef} from '../app/navigation/navigationRef';

const mockNavigate = jest.fn();
const mockResetRoot = jest.fn();
const mockDispatch = jest.fn();
let mockNavigationReady = false;

jest.mock('@react-navigation/native', () => ({
  CommonActions: {navigate: (payload: unknown) => payload},
  createNavigationContainerRef: () => ({
    isReady: () => mockNavigationReady,
    navigate: mockNavigate,
    resetRoot: mockResetRoot,
    dispatch: mockDispatch,
  }),
}));

describe('community notification navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationReady = false;
    resetPendingCommunityNotificationsForTests();
  });

  it('queues a notification until navigation is ready', () => {
    expect(navigateFromCommunityNotification({communityId: 'c1'})).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();

    flushPendingCommunityNotification();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('reports success when it navigates immediately', () => {
    mockNavigationReady = true;
    (navigationRef as any).isReady = () => mockNavigationReady;
    (navigationRef as any).dispatch = mockDispatch;

    expect(navigateFromCommunityNotification({communityId: 'c1'})).toBe(true);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });
});
