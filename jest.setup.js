/* eslint-disable no-undef */
jest.mock('react-native-permissions', () => require('react-native-permissions/mock'));
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/document/path',
  ExternalDirectoryPath: '/mock/external/path',
  CachesDirectoryPath: '/mock/caches/path',
  mkdir: jest.fn().mockResolvedValue(true),
  exists: jest.fn().mockResolvedValue(true),
  readFile: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(true),
  unlink: jest.fn().mockResolvedValue(true),
  copyFile: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  types: { allFiles: '*/*' },
}));

jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn().mockReturnValue({
    transaction: jest.fn(),
    executeSql: jest.fn(),
  }),
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

jest.mock('react-native-biometrics', () => {
  return jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn().mockResolvedValue({ available: false }),
    simplePrompt: jest.fn().mockResolvedValue({ success: false }),
  }));
});

const { NativeModules } = require('react-native');
NativeModules.AndroidNavigationBarModule = {
  setNavigationBarTheme: jest.fn().mockResolvedValue(true),
  setSystemBarsTheme: jest.fn().mockResolvedValue(true),
};

