import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useAppTheme } from '../../../../shared/hooks';

export interface PdfToolbarProps {
  title: string;
  currentPage: number;
  pageCount: number;
  isFavorite: boolean;
  zoomScale: number;
  onBack: () => void;
  onOpenJump: () => void;
  onOpenInfo: () => void;
  onToggleFavorite: () => void;
  onSearchPress: () => void;
  onAnnotatePress?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  title,
  currentPage,
  pageCount,
  isFavorite,
  zoomScale,
  onBack,
  onOpenJump,
  onOpenInfo,
  onToggleFavorite,
  onSearchPress,
  onAnnotatePress,
  onZoomReset,
}) => {
  const { themeColors } = useAppTheme();

  const zoomPercent = Math.round(zoomScale * 100);
  const statusBarOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderBottomColor: themeColors.border,
          paddingTop: 10 + statusBarOffset,
        },
      ]}
    >
      <View style={styles.leftRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
        >
          <Text style={[styles.backIcon, { color: themeColors.textPrimary }]}>
            ←
          </Text>
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text
            style={[styles.title, { color: themeColors.textPrimary }]}
            numberOfLines={1}
          >
            {title || 'Document.pdf'}
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            PDF • Offline Reader
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Page Jump / Indicator Pill */}
        {pageCount > 0 && (
          <TouchableOpacity
            style={[
              styles.pagePill,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.border,
              },
            ]}
            onPress={onOpenJump}
            activeOpacity={0.7}
            accessibilityLabel={`Page ${currentPage} of ${pageCount}. Tap to jump.`}
          >
            <Text
              style={[styles.pagePillText, { color: themeColors.textPrimary }]}
            >
              {currentPage} / {pageCount}
            </Text>
            <Text style={[styles.pageJumpIcon, { color: themeColors.primary }]}>
              ↗
            </Text>
          </TouchableOpacity>
        )}

        {/* Zoom Reset Pill if zoomed */}
        {zoomScale > 1.05 && (
          <TouchableOpacity
            style={[
              styles.zoomPill,
              {
                backgroundColor: themeColors.badgeBg,
                borderColor: themeColors.primary,
              },
            ]}
            onPress={onZoomReset}
            activeOpacity={0.7}
            accessibilityLabel="Reset zoom to 100%"
          >
            <Text style={[styles.zoomText, { color: themeColors.primary }]}>
              {zoomPercent}%
            </Text>
          </TouchableOpacity>
        )}

        {/* Favorite Star */}
        <TouchableOpacity
          onPress={onToggleFavorite}
          style={[
            styles.iconButton,
            {
              backgroundColor: themeColors.cardSecondary,
              borderColor: themeColors.border,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Text
            style={[
              styles.starIcon,
              { color: isFavorite ? '#EAB308' : themeColors.textMuted },
            ]}
          >
            {isFavorite ? '★' : '☆'}
          </Text>
        </TouchableOpacity>

        {/* Search Action */}
        <TouchableOpacity
          onPress={onSearchPress}
          style={[
            styles.iconButton,
            {
              backgroundColor: themeColors.cardSecondary,
              borderColor: themeColors.border,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          accessibilityLabel="PDF Search"
        >
          <Text style={styles.actionEmoji}>🔍</Text>
        </TouchableOpacity>

        {/* Annotate / Edit Action */}
        {onAnnotatePress && (
          <TouchableOpacity
            onPress={onAnnotatePress}
            style={[
              styles.iconButton,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.border,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityLabel="Annotate and edit PDF"
          >
            <Text style={styles.actionEmoji}>✏️</Text>
          </TouchableOpacity>
        )}

        {/* Document Info */}
        <TouchableOpacity
          onPress={onOpenInfo}
          style={[
            styles.iconButton,
            {
              backgroundColor: themeColors.cardSecondary,
              borderColor: themeColors.border,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          accessibilityLabel="Document info"
        >
          <Text style={styles.actionEmoji}>ℹ️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backButton: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  pagePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pageJumpIcon: {
    fontSize: 11,
    fontWeight: '800',
  },
  zoomPill: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  zoomText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: {
    fontSize: 15,
  },
  starIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
});

export default PdfToolbar;
