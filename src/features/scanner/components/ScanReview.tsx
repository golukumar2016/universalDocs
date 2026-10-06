import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../shared/hooks';
import { ScanPage } from '../types/scanner.types';

export interface ScanReviewProps {
  pages: ScanPage[];
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onMovePage: (pageId: string, direction: 'UP' | 'DOWN') => void;
  onEditPage: (page: ScanPage) => void;
  onGeneratePdf: () => void;
  onDiscardScan: () => void;
}

export const ScanReview: React.FC<ScanReviewProps> = ({
  pages,
  onAddPage,
  onDeletePage,
  onMovePage,
  onEditPage,
  onGeneratePdf,
  onDiscardScan,
}) => {
  const insets = useSafeAreaInsets();
  const { themeColors, isDark } = useAppTheme();
  const screen = Dimensions.get('window');

  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const safeIndex = Math.min(selectedIndex, Math.max(0, pages.length - 1));
  const currentPage = pages[safeIndex];

  const handleDeleteCurrent = () => {
    if (!currentPage) return;
    Alert.alert(
      'Delete Page',
      `Are you sure you want to delete Page ${safeIndex + 1}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeletePage(currentPage.id);
            if (safeIndex > 0) {
              setSelectedIndex(safeIndex - 1);
            }
          },
        },
      ]
    );
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Scan Session',
      'All scanned pages in this session will be permanently discarded. Are you sure?',
      [
        { text: 'Keep Scanning', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onDiscardScan },
      ]
    );
  };

  if (!currentPage || pages.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
          No Pages Scanned
        </Text>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: themeColors.primary }]}
          onPress={onAddPage}
        >
          <Text style={styles.actionBtnText}>📸 Capture First Page</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFirst = safeIndex === 0;
  const isLast = safeIndex === pages.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
            paddingTop: Math.max(insets.top, 20) + 4,
          },
        ]}
      >
        <TouchableOpacity onPress={handleDiscard} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: '#EF4444' }]}>✕ Cancel</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
            Review Pages
          </Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            Page {safeIndex + 1} of {pages.length}
          </Text>
        </View>

        <TouchableOpacity onPress={onAddPage} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: themeColors.primary }]}>
            ＋ Add Page
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Preview Area */}
      <View style={styles.previewContainer}>
        <Image
          source={{
            uri:
              currentPage.enhancedImagePath ||
              currentPage.croppedImagePath ||
              currentPage.originalImagePath,
          }}
          style={styles.previewImage}
          resizeMode="contain"
        />

        {/* Page Badge */}
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>
            {safeIndex + 1} / {pages.length}
          </Text>
        </View>
      </View>

      {/* Per-Page Controls (Reorder & Delete) */}
      <View
        style={[
          styles.pageControlsRow,
          {
            backgroundColor: themeColors.surface,
            borderTopColor: themeColors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.pageCtrlBtn, isFirst && styles.disabledBtn]}
          disabled={isFirst}
          onPress={() => onMovePage(currentPage.id, 'UP')}
        >
          <Text style={[styles.ctrlEmoji, isFirst && styles.disabledText]}>⬅️</Text>
          <Text
            style={[
              styles.ctrlLabel,
              { color: isFirst ? themeColors.textMuted : themeColors.textPrimary },
            ]}
          >
            Move Earlier
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pageCtrlBtn}
          onPress={() => onEditPage(currentPage)}
        >
          <Text style={styles.ctrlEmoji}>✂️</Text>
          <Text style={[styles.ctrlLabel, { color: themeColors.textPrimary }]}>
            Re-Crop
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pageCtrlBtn}
          onPress={handleDeleteCurrent}
        >
          <Text style={styles.ctrlEmoji}>🗑️</Text>
          <Text style={[styles.ctrlLabel, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pageCtrlBtn, isLast && styles.disabledBtn]}
          disabled={isLast}
          onPress={() => onMovePage(currentPage.id, 'DOWN')}
        >
          <Text style={[styles.ctrlEmoji, isLast && styles.disabledText]}>➡️</Text>
          <Text
            style={[
              styles.ctrlLabel,
              { color: isLast ? themeColors.textMuted : themeColors.textPrimary },
            ]}
          >
            Move Later
          </Text>
        </TouchableOpacity>
      </View>

      {/* Thumbnails Strip */}
      <View
        style={[
          styles.stripContainer,
          {
            backgroundColor: themeColors.cardSecondary,
            borderTopColor: themeColors.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripScroll}
        >
          {pages.map((p, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedIndex(idx)}
                style={[
                  styles.thumbBox,
                  {
                    borderColor: isSelected
                      ? themeColors.primary
                      : themeColors.border,
                    borderWidth: isSelected ? 2.5 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Image
                  source={{
                    uri: p.enhancedImagePath || p.croppedImagePath || p.originalImagePath,
                  }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                />
                <View
                  style={[
                    styles.thumbBadge,
                    {
                      backgroundColor: isSelected
                        ? themeColors.primary
                        : 'rgba(0, 0, 0, 0.65)',
                    },
                  ]}
                >
                  <Text style={styles.thumbBadgeText}>{idx + 1}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bottom Generate PDF Action */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: themeColors.surface,
            borderTopColor: themeColors.border,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: themeColors.primary }]}
          onPress={onGeneratePdf}
          activeOpacity={0.8}
        >
          <Text style={styles.generateBtnText}>
            📄 Generate PDF ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'}) →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  previewContainer: {
    flex: 1,
    margin: 14,
    borderRadius: 12,
    backgroundColor: '#000000',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  pageBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pageControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  pageCtrlBtn: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
  },
  ctrlEmoji: {
    fontSize: 18,
  },
  ctrlLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.35,
  },
  disabledText: {
    opacity: 0.35,
  },
  stripContainer: {
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  stripScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  thumbBox: {
    width: 60,
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  generateBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ScanReview;
