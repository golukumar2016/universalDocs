import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { incomingFileService } from '../../core/intents/incomingFileService';
import { ResolvedDocument } from '../../core/documents/documentResolver';
import { DocumentRepository } from '../../core/database/repositories/documentRepository';
import { RecentRepository } from '../../core/database/repositories/recentRepository';
import { FileBrowserService } from './services/fileBrowserService';
import { Document, DocumentItem } from '../../shared/types';
import { formatFileSize, formatDate } from '../../shared/utils';
import { useAppTheme } from '../../shared/hooks';

export const InitialDocumentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { isDark, themeColors } = useAppTheme();

  const [resolvedDoc, setResolvedDoc] = useState<ResolvedDocument | null>(null);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [isPicking, setIsPicking] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [defaultDirs, setDefaultDirs] = useState<{ download?: string; documents?: string }>({});

  // Load recent documents from database
  const loadRecentDocuments = useCallback(async () => {
    try {
      const recents = await RecentRepository.getRecentDocuments(6);
      if (recents && recents.length > 0) {
        setRecentDocs(recents);
      } else {
        const fallbackDocs = await DocumentRepository.findByFolder(null);
        setRecentDocs(fallbackDocs.slice(0, 6));
      }
    } catch {
      // In initial mock / empty DB environment, fallback gracefully
      setRecentDocs([]);
    }
  }, []);

  // Fetch default storage directories
  const loadDefaultDirectories = useCallback(async () => {
    try {
      const dirs = await FileBrowserService.getDefaultDirectories();
      if (dirs) {
        setDefaultDirs(dirs);
      }
    } catch {
      // Ignore if not accessible
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadRecentDocuments(), loadDefaultDirectories()]);
    setIsRefreshing(false);
  }, [loadRecentDocuments, loadDefaultDirectories]);

  // Load data on screen focus
  useEffect(() => {
    if (isFocused) {
      loadRecentDocuments();
      loadDefaultDirectories();
    }
  }, [isFocused, loadRecentDocuments, loadDefaultDirectories]);

  // Subscribe to incoming file service for "Open With UniversalDocs"
  useEffect(() => {
    const unsubscribe = incomingFileService.subscribe((doc) => {
      if (!doc) return;

      if (!doc.isSupported) {
        navigation.navigate('UnsupportedDocument', {
          document: doc.document,
          reason: `UniversalDocs does not support the .${doc.document.extension} format yet.`,
        });
      } else {
        setResolvedDoc(doc);
      }
    });

    const current = incomingFileService.getCurrentDocument();
    if (current) {
      if (!current.isSupported) {
        navigation.navigate('UnsupportedDocument', {
          document: current.document,
          reason: `UniversalDocs does not support the .${current.document.extension} format yet.`,
        });
      } else {
        setResolvedDoc(current);
      }
    }

    return () => {
      unsubscribe();
    };
  }, [navigation]);

  // Handle manual "Open a document" picker
  const handlePickDocument = async () => {
    try {
      setIsPicking(true);
      const results = await pick({
        type: [types.allFiles],
        mode: 'open',
      });

      if (results && results.length > 0) {
        const file = results[0];
        const doc = await incomingFileService.resolveUri(
          file.uri,
          file.name ?? undefined,
          file.type ?? undefined
        );

        if (!doc.isSupported) {
          navigation.navigate('UnsupportedDocument', {
            document: doc.document,
            reason: `UniversalDocs does not support the .${doc.document.extension} format yet.`,
          });
        } else {
          setResolvedDoc(doc);
        }
      }
    } catch (error: any) {
      if (
        error?.message &&
        !error.message.includes('cancelled') &&
        !error.message.includes('canceled')
      ) {
        Alert.alert('Error', 'Could not open document.');
      }
    } finally {
      setIsPicking(false);
    }
  };

  // Open the resolved incoming file
  const handleOpenDocument = () => {
    if (!resolvedDoc) return;
    navigation.navigate('DocumentViewer', {
      document: resolvedDoc.document,
    });
  };

  // Check if file is editable as text
  const isEditable = (ext?: string) => {
    const e = (ext || '').toLowerCase();
    return ['txt', 'md', 'csv', 'json', 'log'].includes(e);
  };

  // Open text file in Editor
  const handleEditDocument = () => {
    if (!resolvedDoc) return;
    navigation.navigate('Editor', {
      filePath: resolvedDoc.document.uri,
      title: resolvedDoc.document.name,
      document: resolvedDoc.document,
    });
  };

  const handleClearSelection = () => {
    incomingFileService.clearCurrentDocument();
    setResolvedDoc(null);
  };

  // Open recent document
  const handleOpenRecent = (item: DocumentItem) => {
    const doc: Document = {
      id: item.id,
      name: item.name,
      uri: item.uri || `file://${item.path}`,
      mimeType: item.mimeType,
      extension: item.extension,
      size: item.size,
      createdAt: item.createdAt,
      modifiedAt: item.updatedAt,
    };

    if (isEditable(item.extension)) {
      navigation.navigate('Editor', {
        filePath: item.path,
        title: item.name,
        document: doc,
      });
    } else {
      navigation.navigate('DocumentViewer', { document: doc });
    }
  };

  // Format badge helper
  const getFormatBadge = (ext?: string) => {
    const e = (ext || '').toLowerCase();
    switch (e) {
      case 'pdf':
        return { icon: '📕', label: 'PDF', color: '#EF4444', bg: '#FEE2E2' };
      case 'doc':
      case 'docx':
        return { icon: '📘', label: 'DOC', color: '#3B82F6', bg: '#DBEAFE' };
      case 'xls':
      case 'xlsx':
        return { icon: '📊', label: 'XLS', color: '#10B981', bg: '#D1FAE5' };
      case 'ppt':
      case 'pptx':
        return { icon: '📙', label: 'PPT', color: '#F97316', bg: '#FFEDD5' };
      case 'txt':
      case 'text':
        return { icon: '📝', label: 'TXT', color: '#64748B', bg: '#F1F5F9' };
      case 'csv':
        return { icon: '📈', label: 'CSV', color: '#06B6D4', bg: '#CFFAFE' };
      case 'md':
        return { icon: '📑', label: 'MD', color: '#8B5CF6', bg: '#EDE9FE' };
      default:
        return {
          icon: '📄',
          label: (ext || 'FILE').toUpperCase().slice(0, 4),
          color: '#64748B',
          bg: '#F1F5F9',
        };
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Top App Bar */}
      <View style={[styles.appBar, { borderBottomColor: themeColors.border }]}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeEmoji}>📑</Text>
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: themeColors.textPrimary }]}>
              UniversalDocs
            </Text>
            <View style={styles.offlinePill}>
              <View style={styles.greenDot} />
              <Text style={styles.offlinePillText}>Offline Hub</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'SearchTab' })}
            activeOpacity={0.7}
            accessibilityLabel="Search Documents"
          >
            <Text style={styles.headerIconEmoji}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'SecurityTab' })}
            activeOpacity={0.7}
            accessibilityLabel="Secure Vault"
          >
            <Text style={styles.headerIconEmoji}>🔒</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        {/* State A: External File Ready (via Intent or Picker) */}
        {resolvedDoc && (
          <View style={[styles.incomingCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: '#3B82F6' }]}>
            <View style={styles.incomingHeader}>
              <View style={styles.incomingPill}>
                <Text style={styles.incomingPillText}>Ready to Open</Text>
              </View>
              <TouchableOpacity onPress={handleClearSelection} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeEmoji}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.incomingBody}>
              <View style={[styles.incomingIconBox, { backgroundColor: getFormatBadge(resolvedDoc.document.extension).bg }]}>
                <Text style={styles.incomingDocEmoji}>
                  {getFormatBadge(resolvedDoc.document.extension).icon}
                </Text>
              </View>

              <View style={styles.incomingDetails}>
                <Text
                  style={[styles.incomingDocName, { color: themeColors.textPrimary }]}
                  numberOfLines={2}
                >
                  {resolvedDoc.document.name}
                </Text>
                <View style={styles.incomingMetaRow}>
                  <Text style={styles.formatChip}>
                    {getFormatBadge(resolvedDoc.document.extension).label}
                  </Text>
                  {resolvedDoc.document.size !== undefined && (
                    <Text style={[styles.incomingMetaText, { color: themeColors.textSecondary }]}>
                      • {formatFileSize(resolvedDoc.document.size)}
                    </Text>
                  )}
                  <Text style={[styles.incomingMetaText, { color: themeColors.textSecondary }]}>
                    • External
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.incomingActions}>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={handleOpenDocument}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryActionText}>Open Document</Text>
              </TouchableOpacity>

              {isEditable(resolvedDoc.document.extension) && (
                <TouchableOpacity
                  style={[styles.secondaryActionButton, { borderColor: themeColors.border }]}
                  onPress={handleEditDocument}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.secondaryActionText, { color: themeColors.primary }]}>
                    Edit Text
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Quick Search Shortcut Bar */}
        <TouchableOpacity
          style={[styles.searchBarShortcut, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'SearchTab' })}
          activeOpacity={0.8}
        >
          <Text style={styles.searchBarIcon}>🔍</Text>
          <Text style={[styles.searchBarPlaceholder, { color: themeColors.textSecondary }]}>
            Search documents, notes, folders...
          </Text>
        </TouchableOpacity>

        {/* Quick Actions Grid (2x2) */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            Quick Actions
          </Text>
        </View>

        <View style={styles.quickGrid}>
          {/* Action 1: Browse Storage */}
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}
            onPress={() => navigation.navigate('FileBrowser')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#EFF6FF' }]}>
              <Text style={styles.actionIcon}>📁</Text>
            </View>
            <Text style={[styles.gridTitle, { color: themeColors.textPrimary }]}>
              Browse Storage
            </Text>
            <Text style={[styles.gridSubtitle, { color: themeColors.textSecondary }]}>
              Device files & folders
            </Text>
          </TouchableOpacity>

          {/* Action 2: Open File */}
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}
            onPress={handlePickDocument}
            disabled={isPicking}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#F0FDF4' }]}>
              {isPicking ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text style={styles.actionIcon}>📑</Text>
              )}
            </View>
            <Text style={[styles.gridTitle, { color: themeColors.textPrimary }]}>
              Open Document
            </Text>
            <Text style={[styles.gridSubtitle, { color: themeColors.textSecondary }]}>
              Pick from any app
            </Text>
          </TouchableOpacity>

          {/* Action 3: Scan Document */}
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'ScannerTab' })}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.actionIcon}>📷</Text>
            </View>
            <Text style={[styles.gridTitle, { color: themeColors.textPrimary }]}>
              Scan Document
            </Text>
            <Text style={[styles.gridSubtitle, { color: themeColors.textSecondary }]}>
              Camera scanner
            </Text>
          </TouchableOpacity>

          {/* Action 4: Create Note */}
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}
            onPress={() => navigation.navigate('Editor', { title: 'New Document' })}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Text style={styles.actionIcon}>📝</Text>
            </View>
            <Text style={[styles.gridTitle, { color: themeColors.textPrimary }]}>
              Create Note
            </Text>
            <Text style={[styles.gridSubtitle, { color: themeColors.textSecondary }]}>
              Text & Markdown
            </Text>
          </TouchableOpacity>
        </View>

        {/* Storage Shortcuts */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            Storage Shortcuts
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcutsRow}
        >
          {/* Downloads */}
          <TouchableOpacity
            style={[styles.shortcutChip, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}
            onPress={() =>
              navigation.navigate('FileBrowser', {
                initialLocation: {
                  name: 'Download',
                  path: defaultDirs.download || '/storage/emulated/0/Download',
                  isContentUri: false,
                },
              })
            }
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutEmoji}>📥</Text>
            <Text style={[styles.shortcutText, { color: themeColors.textPrimary }]}>
              Downloads
            </Text>
          </TouchableOpacity>

          {/* Documents */}
          <TouchableOpacity
            style={[styles.shortcutChip, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}
            onPress={() =>
              navigation.navigate('FileBrowser', {
                initialLocation: {
                  name: 'Documents',
                  path: defaultDirs.documents || '/storage/emulated/0/Documents',
                  isContentUri: false,
                },
              })
            }
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutEmoji}>📁</Text>
            <Text style={[styles.shortcutText, { color: themeColors.textPrimary }]}>
              Documents
            </Text>
          </TouchableOpacity>

          {/* Secure Vault */}
          <TouchableOpacity
            style={[styles.shortcutChip, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'SecurityTab' })}
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutEmoji}>🔒</Text>
            <Text style={[styles.shortcutText, { color: themeColors.textPrimary }]}>
              Secure Vault
            </Text>
          </TouchableOpacity>

          {/* All Library */}
          <TouchableOpacity
            style={[styles.shortcutChip, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'DocumentsTab' })}
            activeOpacity={0.7}
          >
            <Text style={styles.shortcutEmoji}>📚</Text>
            <Text style={[styles.shortcutText, { color: themeColors.textPrimary }]}>
              My Library
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Recent Documents Section */}
        <View style={styles.sectionHeaderWithAction}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            Recent Documents
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('FileBrowser')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.sectionActionText, { color: themeColors.primary }]}>
              Browse all →
            </Text>
          </TouchableOpacity>
        </View>

        {recentDocs.length > 0 ? (
          <View style={[styles.recentListCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}>
            {recentDocs.map((item, index) => {
              const badge = getFormatBadge(item.extension);
              const isLast = index === recentDocs.length - 1;
              return (
                <TouchableOpacity
                  key={item.id || index}
                  style={[
                    styles.recentItemRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: themeColors.divider },
                  ]}
                  onPress={() => handleOpenRecent(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.recentBadgeBox, { backgroundColor: badge.bg }]}>
                    <Text style={styles.recentBadgeEmoji}>{badge.icon}</Text>
                  </View>

                  <View style={styles.recentItemContent}>
                    <Text
                      style={[styles.recentItemName, { color: themeColors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <View style={styles.recentItemMeta}>
                      <Text style={[styles.recentItemSize, { color: themeColors.textSecondary }]}>
                        {formatFileSize(item.size)}
                      </Text>
                      <Text style={[styles.recentItemDot, { color: themeColors.textSecondary }]}>
                        •
                      </Text>
                      <Text style={[styles.recentItemDate, { color: themeColors.textSecondary }]}>
                        {formatDate(item.updatedAt || item.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.chevronArrow, { color: themeColors.textSecondary }]}>
                    ›
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyRecentCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}>
            <Text style={styles.emptyRecentEmoji}>📂</Text>
            <Text style={[styles.emptyRecentTitle, { color: themeColors.textPrimary }]}>
              No recent documents yet
            </Text>
            <Text style={[styles.emptyRecentSubtitle, { color: themeColors.textSecondary }]}>
              Documents you open, scan, or create will appear here for fast offline access.
            </Text>
            <TouchableOpacity
              style={styles.emptyBrowseButton}
              onPress={() => navigation.navigate('FileBrowser')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyBrowseButtonText}>Open File Browser</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Supported Formats Banner */}
        <View style={[styles.formatsCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: themeColors.border }]}>
          <Text style={styles.formatsTitle}>SUPPORTED FORMATS</Text>
          <View style={styles.formatPillsRow}>
            {['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'CSV', 'MD'].map((fmt) => (
              <View
                key={fmt}
                style={[
                  styles.formatPill,
                  { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: themeColors.border },
                ]}
              >
                <Text style={[styles.formatPillText, { color: themeColors.textPrimary }]}>
                  {fmt}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Quick Dock */}
      <View style={[styles.bottomDock, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderTopColor: themeColors.border }]}>
        <TouchableOpacity
          style={styles.dockItem}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <Text style={styles.dockActiveEmoji}>🏠</Text>
          <Text style={[styles.dockLabel, styles.dockActiveLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dockItem}
          onPress={() => navigation.navigate('FileBrowser')}
          activeOpacity={0.7}
        >
          <Text style={styles.dockEmoji}>📁</Text>
          <Text style={[styles.dockLabel, { color: themeColors.textSecondary }]}>Files</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dockItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'SearchTab' })}
          activeOpacity={0.7}
        >
          <Text style={styles.dockEmoji}>🔍</Text>
          <Text style={[styles.dockLabel, { color: themeColors.textSecondary }]}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dockItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'ScannerTab' })}
          activeOpacity={0.7}
        >
          <Text style={styles.dockEmoji}>📷</Text>
          <Text style={[styles.dockLabel, { color: themeColors.textSecondary }]}>Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dockItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'SecurityTab' })}
          activeOpacity={0.7}
        >
          <Text style={styles.dockEmoji}>🔒</Text>
          <Text style={[styles.dockLabel, { color: themeColors.textSecondary }]}>Vault</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  logoBadgeEmoji: {
    fontSize: 22,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  offlinePillText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconEmoji: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  searchBarShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchBarIcon: {
    fontSize: 16,
  },
  searchBarPlaceholder: {
    fontSize: 14,
    fontWeight: '500',
  },
  incomingCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  incomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  incomingPill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  incomingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  closeEmoji: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  incomingBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  incomingIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingDocEmoji: {
    fontSize: 26,
  },
  incomingDetails: {
    flex: 1,
  },
  incomingDocName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  incomingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formatChip: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  incomingMetaText: {
    fontSize: 12,
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 22,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  gridSubtitle: {
    fontSize: 12,
  },
  shortcutsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  shortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  shortcutEmoji: {
    fontSize: 16,
  },
  shortcutText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recentListCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  recentBadgeBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentBadgeEmoji: {
    fontSize: 20,
  },
  recentItemContent: {
    flex: 1,
  },
  recentItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  recentItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentItemSize: {
    fontSize: 12,
  },
  recentItemDot: {
    fontSize: 12,
  },
  recentItemDate: {
    fontSize: 12,
  },
  chevronArrow: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyRecentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyRecentEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyRecentTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyRecentSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  emptyBrowseButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emptyBrowseButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  formatsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  formatsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  formatPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  formatPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  formatPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomDock: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dockEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  dockActiveEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  dockLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  dockActiveLabel: {
    color: '#2563EB',
    fontWeight: '700',
  },
});

export default InitialDocumentScreen;
