import * as Keychain from 'react-native-keychain';
import { SecurityError } from '../errors/AppError';

export class SecureStorage {
  static async setSecureItem(
    serviceKey: string,
    secret: string,
    options?: Keychain.SetOptions
  ): Promise<boolean> {
    try {
      const result = await Keychain.setGenericPassword('UniversalDocsUser', secret, {
        service: serviceKey,
        ...options,
      });
      return !!result;
    } catch (error) {
      throw new SecurityError(`Failed to save secure item for ${serviceKey}`, error);
    }
  }

  static async getSecureItem(
    serviceKey: string,
    options?: Keychain.GetOptions
  ): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: serviceKey,
        ...options,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      throw new SecurityError(`Failed to retrieve secure item for ${serviceKey}`, error);
    }
  }

  static async removeSecureItem(serviceKey: string): Promise<boolean> {
    try {
      return await Keychain.resetGenericPassword({ service: serviceKey });
    } catch (error) {
      throw new SecurityError(`Failed to remove secure item for ${serviceKey}`, error);
    }
  }
}

export default SecureStorage;
