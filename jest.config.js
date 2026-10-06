module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation)/)',
  ],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.tsx',
    '^@react-native-firebase/messaging$': '<rootDir>/__mocks__/firebaseMessaging.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/asyncStorage.ts',
    '^react-native-device-info$': '<rootDir>/__mocks__/react-native-device-info.ts',
  },
};
