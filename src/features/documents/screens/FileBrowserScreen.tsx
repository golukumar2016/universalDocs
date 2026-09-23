import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFileBrowser } from '../hooks/useFileBrowser';
import { FileList } from '../components/FileList';
import { BrowserItem, SortOption, SortDirection } from '../services/fileBrowserService';
import { DocumentResolver } from '../../../core/documents/documentResolver';
import { useAppTheme } from '../../../shared/hooks';

export const FileBrowserScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { themeColors, isDark } = useAppTheme();

  const {
    currentLocation,
    locationStack,
    filteredItems,
    isLoading,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    sortBy,
    sortDirection,
    setSortBy,
    setSortDirection,
    error,
    hasPermission,
    requestPermissions,
    refresh,
    navigateToFolder,
    navigateBack,
    navigateToBreadcrumb,
    pickAndOpenFolder,
    setLocation,
  } = useFileBrowser({ initialLocation: route.params?.initialLocation });

  const [isSortModalVisible, setIsSortModalVisible] = useState<boolean>(false);
  const [isLocationsModalVisible, setIsLocationsModalVisible] = useState<boolean>(false);

  // Handle opening a file
  const handleFilePress = (file: BrowserItem) => {
    try {
      const resolved = DocumentResolver.resolveDocument({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      });

      if (!resolved.isSupported) {
        navigation.navigate('UnsupportedDocument', {
          document: resolved.document,
          reason: `UniversalDocs does not support the .${resolved.document.extension} format yet.`,
        });
      } else {
        navigation.navigate('DocumentViewer', {
          document: resolved.document,
        });
      }
    } catch (err: any) {
      console.warn('FileBrowserScreen: Error opening file:', err);
    }
  };

  const handleBackPress = () => {
    const popped = navigateBack();
    if (!popped) {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      const popped = navigateBack();
      if (popped) {
        return true; // Handled internally by going up a folder
      }
      return false; // Not handled, let React Navigation pop the screen
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [navigateBack]);

  const selectSort = (newSortBy: SortOption) => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
    setIsSortModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Top Header Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Text style={[styles.backIcon, { color: themeColors.textPrimary }]}>←</Text>
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text style={[styles.topBarTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {currentLocation.name}
          </Text>
          <Text style={[styles.itemCountSubtitle, { color: themeColors.textSecondary }]}>
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={[
              styles.actionIconButton,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.border,
              },
            ]}
            onPress={() => setIsLocationsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIconText}>📂</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionIconButton,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.border,
              },
            ]}
            onPress={() => setIsSortModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionIconText, { color: themeColors.textPrimary }]}>⇅</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Permission Warning Banner (if external storage permission is restricted) */}
      {!hasPermission && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Storage access is limited. Grant permission to browse all files.
          </Text>
          <TouchableOpacity
            style={styles.grantButton}
            onPress={requestPermissions}
            activeOpacity={0.8}
          >
            <Text style={styles.grantButtonText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Breadcrumb Navigation Trail */}
      <View
        style={[
          styles.breadcrumbBar,
          {
            backgroundColor: themeColors.cardSecondary,
            borderBottomColor: themeColors.borderLight,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.breadcrumbScroll}
        >
          <TouchableOpacity
            style={styles.breadcrumbTouchable}
            onPress={() => navigateToBreadcrumb(0)}
            hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
            activeOpacity={0.7}
          >
            <Text style={[styles.breadcrumbRoot, { color: themeColors.primary }]}>🏠 Storage</Text>
          </TouchableOpacity>

          {locationStack.map((loc, index) => (
            <React.Fragment key={`${loc.path}_${index}`}>
              <Text style={[styles.breadcrumbSeparator, { color: themeColors.textMuted }]}>›</Text>
              <TouchableOpacity
                style={styles.breadcrumbTouchable}
                onPress={() => navigateToBreadcrumb(index)}
                hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                activeOpacity={0.7}
                disabled={index === locationStack.length - 1}
              >
                <Text
                  style={[
                    styles.breadcrumbItem,
                    { color: themeColors.textSecondary },
                    index === locationStack.length - 1 && [
                      styles.breadcrumbItemActive,
                      { color: themeColors.textPrimary },
                    ],
                  ]}
                  numberOfLines={1}
                >
                  {loc.name}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder={`Search in ${currentLocation.name}...`}
            placeholderTextColor={themeColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearSearchIcon, { color: themeColors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Real File & Folder List */}
      <FileList
        items={filteredItems}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onFolderPress={navigateToFolder}
        onFilePress={handleFilePress}
        emptyMessage={
          searchQuery
            ? `No matches found for "${searchQuery}"`
            : 'This folder is empty.'
        }
      />

      {/* Sort Options Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsSortModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Sort Items</Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>
              Folders will always appear first
            </Text>

            {(['name', 'date', 'size', 'type'] as SortOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.modalOption,
                  sortBy === opt && {
                    backgroundColor: themeColors.cardSecondary,
                  },
                ]}
                onPress={() => selectSort(opt)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: themeColors.textSecondary },
                    sortBy === opt && {
                      color: themeColors.primary,
                      fontWeight: '700',
                    },
                  ]}
                >
                  By {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  {sortBy === opt && ` (${sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'})`}
                </Text>
                {sortBy === opt && (
                  <Text style={[styles.checkmark, { color: themeColors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Quick Locations Modal */}
      <Modal
        visible={isLocationsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLocationsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLocationsModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              Storage Locations
            </Text>

            <TouchableOpacity
              style={[styles.locationOption, { borderBottomColor: themeColors.divider }]}
              onPress={() => {
                setIsLocationsModalVisible(false);
                setLocation({
                  name: 'Download',
                  path: '/storage/emulated/0/Download',
                  isContentUri: false,
                });
              }}
            >
              <Text style={styles.locationIcon}>📥</Text>
              <View>
                <Text style={[styles.locationName, { color: themeColors.textPrimary }]}>
                  Downloads
                </Text>
                <Text style={[styles.locationPath, { color: themeColors.textSecondary }]}>
                  /storage/emulated/0/Download
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationOption, { borderBottomColor: themeColors.divider }]}
              onPress={() => {
                setIsLocationsModalVisible(false);
                setLocation({
                  name: 'Documents',
                  path: '/storage/emulated/0/Documents',
                  isContentUri: false,
                });
              }}
            >
              <Text style={styles.locationIcon}>📄</Text>
              <View>
                <Text style={[styles.locationName, { color: themeColors.textPrimary }]}>
                  Documents
                </Text>
                <Text style={[styles.locationPath, { color: themeColors.textSecondary }]}>
                  /storage/emulated/0/Documents
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationOption, { borderBottomColor: themeColors.divider }]}
              onPress={() => {
                setIsLocationsModalVisible(false);
                setLocation({
                  name: 'Internal Storage',
                  path: '/storage/emulated/0',
                  isContentUri: false,
                });
              }}
            >
              <Text style={styles.locationIcon}>💾</Text>
              <View>
                <Text style={[styles.locationName, { color: themeColors.textPrimary }]}>
                  Internal Storage
                </Text>
                <Text style={[styles.locationPath, { color: themeColors.textSecondary }]}>
                  /storage/emulated/0
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationOption, styles.safOption]}
              onPress={() => {
                setIsLocationsModalVisible(false);
                pickAndOpenFolder();
              }}
            >
              <Text style={styles.locationIcon}>📁</Text>
              <View>
                <Text style={[styles.locationName, { color: themeColors.textPrimary }]}>
                  Choose Folder via SAF...
                </Text>
                <Text style={[styles.locationPath, { color: themeColors.textSecondary }]}>
                  Android Storage Access Framework
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '700',
  },
  titleWrapper: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemCountSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionIconText: {
    fontSize: 18,
  },
  permissionBanner: {
    backgroundColor: '#78350F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionText: {
    color: '#FEF3C7',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  grantButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  grantButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  breadcrumbBar: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  breadcrumbScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  breadcrumbTouchable: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  breadcrumbRoot: {
    fontSize: 13,
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    fontSize: 14,
    marginHorizontal: 6,
  },
  breadcrumbItem: {
    fontSize: 13,
    maxWidth: 120,
  },
  breadcrumbItemActive: {
    fontWeight: '700',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchIcon: {
    fontSize: 14,
    padding: 4,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
  },
  modalOptionText: {
    fontSize: 14,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  safOption: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  locationIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
  },
  locationPath: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default FileBrowserScreen;
