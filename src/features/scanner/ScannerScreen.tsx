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
import { colors } from '../../shared/theme';

export const ScannerScreen: React.FC = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Document Scanner</Text>
        <Text style={styles.subtitle}>
          Scan physical paper documents into high-clarity offline PDF files.
        </Text>

        {/* Scanner Pipeline Overview Card */}
        <View style={styles.pipelineCard}>
          <Text style={styles.pipelineTitle}>Offline Scanning Workflow</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <Text style={styles.stepText}>Camera Capture</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <Text style={styles.stepText}>Edge Detection & Crop</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <Text style={styles.stepText}>Color & Contrast Filter</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>4</Text>
            </View>
            <Text style={styles.stepText}>Export to Local PDF & Save</Text>
          </View>
        </View>

        {/* Camera Permission State */}
        <View style={styles.statusBox}>
          {isChecking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : hasCameraPermission ? (
            <View style={styles.permissionReady}>
              <Text style={styles.readyBadge}>✓ Camera Ready</Text>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => Alert.alert('Camera', 'Scanner viewfinder initialized.')}
              >
                <Text style={styles.scanBtnText}>📸 Start Scan Session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.permissionNeed}>
              <Text style={styles.needText}>
                Camera permission is required to use the document scanner.
              </Text>
              <TouchableOpacity
                style={styles.permissionBtn}
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
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  pipelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  pipelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
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
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  stepLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 13,
    marginVertical: 2,
  },
  statusBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primary,
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
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
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
