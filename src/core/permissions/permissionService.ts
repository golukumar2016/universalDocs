import { Platform } from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  PermissionStatus,
} from 'react-native-permissions';
import { PermissionError } from '../errors/AppError';

export class PermissionService {
  static async checkCameraPermission(): Promise<boolean> {
    const permission = Platform.select({
      ios: PERMISSIONS.IOS.CAMERA,
      android: PERMISSIONS.ANDROID.CAMERA,
      default: null,
    });

    if (!permission) return true;

    try {
      const result: PermissionStatus = await check(permission);
      return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
    } catch (error) {
      throw new PermissionError('Failed to check camera permission', error);
    }
  }

  static async requestCameraPermission(): Promise<boolean> {
    const permission = Platform.select({
      ios: PERMISSIONS.IOS.CAMERA,
      android: PERMISSIONS.ANDROID.CAMERA,
      default: null,
    });

    if (!permission) return true;

    try {
      const result: PermissionStatus = await request(permission);
      return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
    } catch (error) {
      throw new PermissionError('Failed to request camera permission', error);
    }
  }

  static async checkStoragePermission(): Promise<boolean> {
    if (Platform.OS === 'ios') return true;

    // For Android 13+ (API 33+), granular media permissions are used; below 13, READ_EXTERNAL_STORAGE
    const permission =
      Number(Platform.Version) >= 33
        ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

    try {
      const result: PermissionStatus = await check(permission);
      return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
    } catch (error) {
      throw new PermissionError('Failed to check storage permission', error);
    }
  }

  static async requestStoragePermission(): Promise<boolean> {
    if (Platform.OS === 'ios') return true;

    const permission =
      Number(Platform.Version) >= 33
        ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

    try {
      const result: PermissionStatus = await request(permission);
      return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
    } catch (error) {
      throw new PermissionError('Failed to request storage permission', error);
    }
  }
}

export default PermissionService;
