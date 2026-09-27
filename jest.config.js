module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.tsx',
    '^@react-native-firebase/messaging$': '<rootDir>/__mocks__/firebaseMessaging.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/asyncStorage.ts',
  },
};
