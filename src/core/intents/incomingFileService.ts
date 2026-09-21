/**
 * IncomingFileService
 * 
 * Dedicated service responsible for incoming files.
 * The rest of the application does NOT directly read Android intents.
 * 
 * Architecture:
 * Android Intent -> intentHandler -> incomingFileService -> Document Resolver -> Document Model -> Editor/View Router
 */

import { intentHandler, RawIncomingIntent } from './intentHandler';
import { DocumentResolver, ResolvedDocument } from '../documents/documentResolver';

export type IncomingDocumentListener = (resolved: ResolvedDocument) => void;

class IncomingFileService {
  private listeners: Set<IncomingDocumentListener> = new Set();
  private currentDocument: ResolvedDocument | null = null;
  private isInitialized: boolean = false;
  private unsubscribeIntentHandler: (() => void) | null = null;

  /**
   * Initializes the service, checks for initial launch intent, and starts
   * listening for background / new incoming intents.
   */
  public async initialize(): Promise<ResolvedDocument | null> {
    if (this.isInitialized) {
      return this.currentDocument;
    }

    this.isInitialized = true;

    // Listen for incoming intents while app is active
    this.unsubscribeIntentHandler = intentHandler.onIntentReceived((rawIntent) => {
      this.handleIncomingRawIntent(rawIntent);
    });

    // Check if app was launched via an intent
    const initialIntent = await intentHandler.getInitialIntent();
    if (initialIntent) {
      const resolved = this.handleIncomingRawIntent(initialIntent);
      return resolved;
    }

    return null;
  }

  /**
   * Subscribes a listener to be notified whenever a new incoming document is received.
   * If there is already a current document, immediately notifies the listener.
   */
  public subscribe(listener: IncomingDocumentListener): () => void {
    this.listeners.add(listener);

    // If a document was already resolved before listener subscribed, dispatch it
    if (this.currentDocument) {
      try {
        listener(this.currentDocument);
      } catch (e) {
        console.error('IncomingFileService: Error notifying new subscriber:', e);
      }
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Returns the currently active incoming document, or null if none.
   */
  public getCurrentDocument(): ResolvedDocument | null {
    return this.currentDocument;
  }

  /**
   * Checks the initial document that launched the app.
   */
  public async getInitialDocument(): Promise<ResolvedDocument | null> {
    const rawIntent = await intentHandler.getInitialIntent();
    if (rawIntent) {
      return this.handleIncomingRawIntent(rawIntent);
    }
    return null;
  }

  /**
   * Resolves an arbitrary URI string (e.g., from document picker or external trigger).
   */
  public async resolveUri(uri: string, name?: string, mimeType?: string): Promise<ResolvedDocument> {
    // Attempt native metadata resolution if URI is a content:// URI
    const rawMeta = await intentHandler.resolveUriMetadata(uri);

    const resolved = DocumentResolver.resolveDocument({
      uri,
      name: name || rawMeta?.name,
      mimeType: mimeType || rawMeta?.mimeType,
      size: rawMeta?.size,
      scheme: rawMeta?.scheme,
      action: 'android.intent.action.VIEW',
    });

    this.setCurrentDocument(resolved);
    return resolved;
  }

  /**
   * Clears the current incoming document state.
   */
  public clearCurrentDocument(): void {
    this.currentDocument = null;
    intentHandler.clearInitialIntent().catch(() => {});
  }

  /**
   * Clean up listeners when needed.
   */
  public destroy(): void {
    if (this.unsubscribeIntentHandler) {
      this.unsubscribeIntentHandler();
      this.unsubscribeIntentHandler = null;
    }
    this.listeners.clear();
    this.currentDocument = null;
    this.isInitialized = false;
  }

  private handleIncomingRawIntent(rawIntent: RawIncomingIntent): ResolvedDocument {
    const resolved = DocumentResolver.resolveDocument(rawIntent);
    this.setCurrentDocument(resolved);
    return resolved;
  }

  private setCurrentDocument(resolved: ResolvedDocument): void {
    this.currentDocument = resolved;
    this.notifyListeners(resolved);
  }

  private notifyListeners(resolved: ResolvedDocument): void {
    this.listeners.forEach((listener) => {
      try {
        listener(resolved);
      } catch (error) {
        console.error('IncomingFileService: Listener error:', error);
      }
    });
  }
}

export const incomingFileService = new IncomingFileService();
export default incomingFileService;
