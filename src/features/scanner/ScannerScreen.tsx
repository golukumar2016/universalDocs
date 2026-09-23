import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PermissionService } from '../../core/permissions/permissionService';
import { useAppTheme } from '../../shared/hooks';

export const ScannerScreen: React.FC = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const { themeColors, isDark } = useAppTheme();

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      setIsChecking(true);
      const granted = await PermissionService.checkCameraPermission();
      setHasCameraPermission(granted);
    } catch (error) {
      console.error('Camera permission check error:', error);
      setHasCameraPermission(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await PermissionService.requestCameraPermission();
      setHasCameraPermission(granted);
      if (!granted) {
        Alert.alert(
          'Permission Denied',
          'Camera access is required to scan physical documents into PDF format.'
        );
      }
    } catch (error: any) {
      Alert.alert('Permission Error', error?.message || 'Could not request camera permission.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>Document Scanner</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Scan physical paper documents into high-clarity offline PDF files.
        </Text>

        {/* Scanner Pipeline Overview Card */}
        <View
          style={[
            styles.pipelineCard,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.pipelineTitle, { color: themeColors.textPrimary }]}>
            Offline Scanning Workflow
          </Text>
          <View style={styles.stepRow}>
            <View style={[styles.stepCircle, { backgroundColor: themeColors.badgeBg }]}>
              <Text style={[styles.stepNum, { color: themeColors.primary }]}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: themeColors.textPrimary }]}>
              Camera Capture
            </Text>
          </View>
          <View style={[styles.stepLine, { backgroundColor: themeColors.border }]} />
          <View style={styles.stepRow}>
            <View style={[styles.stepCircle, { backgroundColor: themeColors.badgeBg }]}>
              <Text style={[styles.stepNum, { color: themeColors.primary }]}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: themeColors.textPrimary }]}>
              Edge Detection & Crop
            </Text>
          </View>
          <View style={[styles.stepLine, { backgroundColor: themeColors.border }]} />
          <View style={styles.stepRow}>
            <View style={[styles.stepCircle, { backgroundColor: themeColors.badgeBg }]}>
              <Text style={[styles.stepNum, { color: themeColors.primary }]}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: themeColors.textPrimary }]}>
              Color & Contrast Filter
            </Text>
          </View>
          <View style={[styles.stepLine, { backgroundColor: themeColors.border }]} />
          <View style={styles.stepRow}>
            <View style={[styles.stepCircle, { backgroundColor: themeColors.badgeBg }]}>
              <Text style={[styles.stepNum, { color: themeColors.primary }]}>4</Text>
            </View>
            <Text style={[styles.stepText, { color: themeColors.textPrimary }]}>
              Export to Local PDF & Save
            </Text>
          </View>
        </View>

        {/* Camera Permission State */}
        <View
          style={[
            styles.statusBox,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color={themeColors.primary} />
          ) : hasCameraPermission ? (
            <View style={styles.permissionReady}>
              <Text style={styles.readyBadge}>✓ Camera Ready</Text>
              <TouchableOpacity
                style={[styles.scanBtn, { backgroundColor: themeColors.primary }]}
                onPress={() => Alert.alert('Camera', 'Scanner viewfinder initialized.')}
              >
                <Text style={styles.scanBtnText}>📸 Start Scan Session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.permissionNeed}>
              <Text style={[styles.needText, { color: themeColors.textSecondary }]}>
                Camera permission is required to use the document scanner.
              </Text>
              <TouchableOpacity
                style={[styles.permissionBtn, { backgroundColor: themeColors.primary }]}
                onPress={handleRequestPermission}
              >
                <Text style={styles.permissionBtnText}>Grant Camera Permission</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  pipelineCard: {
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  pipelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepLine: {
    width: 2,
    height: 16,
    marginLeft: 13,
    marginVertical: 2,
  },
  statusBox: {
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  permissionReady: {
    alignItems: 'center',
    width: '100%',
  },
  readyBadge: {
    color: '#15803D',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 12,
  },
  scanBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  permissionNeed: {
    alignItems: 'center',
    width: '100%',
  },
  needText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  permissionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ScannerScreen;
