export const appleAuth = {
  isSupported: false,
  Operation: {LOGIN: 1},
  Scope: {FULL_NAME: 0, EMAIL: 1},
  performRequest: jest.fn(),
};
export const AppleButton = Object.assign(() => null, {
  Style: {BLACK: 0},
  Type: {SIGN_IN: 0},
});
