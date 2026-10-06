import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';

LogBox.ignoreAllLogs(true);
import { AppProvider } from './providers/AppProvider';
import { RootNavigator } from './navigation/RootNavigator';
import { useAppTheme } from '../shared/hooks';
import { incomingFileService } from '../core/intents/incomingFileService';
import { navigate } from './navigation/navigationRef';

import { AppLockProvider } from '../features/security/context/AppLockContext';
import { AppLockOverlay } from '../features/security/components/AppLockOverlay';

const AppContent: React.FC = () => {
  const { themeColors } = useAppTheme();

  useEffect(() => {
    // Initialize incoming file service to handle incoming launch intents
    incomingFileService
      .initialize()
      .then((initialDoc) => {
        if (initialDoc && !initialDoc.isSupported) {
          navigate('UnsupportedDocument', {
            document: initialDoc.document,
            reason: `UniversalDocs does not support the .${initialDoc.document.extension} format yet.`,
          });
        }
      })
      .catch((err) => {
        console.warn('App: Failed to initialize incomingFileService:', err);
      });

    // Subscribe to new incoming files while app is active
    
    const unsubscribe = incomingFileService.subscribe((doc) => {
      if (!doc) return;
      if (!doc.isSupported) {
        navigate('UnsupportedDocument', {
          document: doc.document,
          reason: `UniversalDocs does not support the .${doc.document.extension} format yet.`,
        });
      } else {
        navigate('InitialDocument');
      }
    });

    return () => {
      unsubscribe();
      incomingFileService.destroy();
    };
  }, []);

  return (
    <>
      <StatusBar barStyle={themeColors.statusBar} />
      <RootNavigator />
      <AppLockOverlay />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppLockProvider>
        <AppContent />
      </AppLockProvider>
    </AppProvider>
  );
};

export default App;
