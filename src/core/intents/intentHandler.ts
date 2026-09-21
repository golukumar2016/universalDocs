/**
 * IntentHandler
 * 
 * Low-level interface for intercepting Android intents (ACTION_VIEW, ACTION_SEND, etc.)
 * Communicates with the native IncomingFileModule and provides fallback to React Native Linking.
 * 
 * Architecture:
 * Android Intent -> intentHandler -> incomingFileService -> Document Resolver -> Document Model
 */

import { NativeModules, NativeEventEmitter, Platform, Linking } from 'react-native';

export interface RawIncomingIntent {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
  action?: string;
  scheme?: string;
}

const { IncomingFileModule } = NativeModules;

class IntentHandler {
  private eventEmitter: NativeEventEmitter | null = null;
  private lastHandledUri: string | null = null;
  private lastHandledTime: number = 0;

  constructor() {
    if (Platform.OS === 'android' && IncomingFileModule) {
      this.eventEmitter = new NativeEventEmitter(IncomingFileModule);
    }
  }

  /**
   * Retrieves the initial file intent if the application was launched via "Open with"
   * or a document file association.
   */
  public async getInitialIntent(): Promise<RawIncomingIntent | null> {
    if (Platform.OS !== 'android') {
      return this.getFallbackInitialUri();
    }

    try {
      if (IncomingFileModule && typeof IncomingFileModule.getInitialFile === 'function') {
        const raw = await IncomingFileModule.getInitialFile();
        if (raw && raw.uri) {
          this.lastHandledUri = raw.uri;
          this.lastHandledTime = Date.now();
          return {
            uri: raw.uri,
            name: raw.name,
            mimeType: raw.mimeType,
            size: typeof raw.size === 'number' ? raw.size : undefined,
            action: raw.action,
            scheme: raw.scheme,
          };
        }
      }
    } catch (error) {
      console.warn('IntentHandler: Error querying native initial file:', error);
    }

    // Fallback to React Native Linking if native module didn't provide a result
    return this.getFallbackInitialUri();
  }

  /**
   * Subscribes to incoming intent events when the application is already running in background.
   * Returns an unsubscribe cleanup function.
   */
  public onIntentReceived(callback: (intent: RawIncomingIntent) => void): () => void {
    const cleanups: Array<() => void> = [];

    if (Platform.OS === 'android' && this.eventEmitter) {
      const subscription = this.eventEmitter.addListener('onIncomingFile', (raw: any) => {
        if (!raw || !raw.uri) return;

        // Debounce identical intents received within 1 second
        const now = Date.now();
        if (raw.uri === this.lastHandledUri && now - this.lastHandledTime < 1000) {
          return;
        }
        this.lastHandledUri = raw.uri;
        this.lastHandledTime = now;

        callback({
          uri: raw.uri,
          name: raw.name,
          mimeType: raw.mimeType,
          size: typeof raw.size === 'number' ? raw.size : undefined,
          action: raw.action,
          scheme: raw.scheme,
        });
      });

      cleanups.push(() => subscription.remove());
    }

    // Fallback: Also listen to Linking url events
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      if (event && event.url) {
        const now = Date.now();
        if (event.url === this.lastHandledUri && now - this.lastHandledTime < 1000) {
          return;
        }
        this.lastHandledUri = event.url;
        this.lastHandledTime = now;

        callback({
          uri: event.url,
          action: 'android.intent.action.VIEW',
        });
      }
    });

    cleanups.push(() => linkingSubscription.remove());

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }

  /**
   * Resolves metadata for any given URI string via native ContentResolver.
   */
  public async resolveUriMetadata(uri: string): Promise<RawIncomingIntent | null> {
    if (Platform.OS === 'android' && IncomingFileModule && typeof IncomingFileModule.resolveUri === 'function') {
      try {
        const raw = await IncomingFileModule.resolveUri(uri);
        if (raw && raw.uri) {
          return {
            uri: raw.uri,
            name: raw.name,
            mimeType: raw.mimeType,
            size: typeof raw.size === 'number' ? raw.size : undefined,
            action: raw.action,
            scheme: raw.scheme,
          };
        }
      } catch (error) {
        console.warn('IntentHandler: Error resolving URI with native module:', error);
      }
    }

    return { uri };
  }

  /**
   * Clears the initial file intent in native state.
   */
  public async clearInitialIntent(): Promise<void> {
    if (Platform.OS === 'android' && IncomingFileModule && typeof IncomingFileModule.clearInitialFile === 'function') {
      try {
        await IncomingFileModule.clearInitialFile();
      } catch (error) {
        console.warn('IntentHandler: Error clearing initial file:', error);
      }
    }
  }

  private async getFallbackInitialUri(): Promise<RawIncomingIntent | null> {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        this.lastHandledUri = url;
        this.lastHandledTime = Date.now();
        return {
          uri: url,
          action: 'android.intent.action.VIEW',
        };
      }
    } catch {
      // Ignore
    }
    return null;
  }
}

export const intentHandler = new IntentHandler();
export default intentHandler;
