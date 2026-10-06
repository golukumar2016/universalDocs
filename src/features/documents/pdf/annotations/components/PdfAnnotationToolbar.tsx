/**
 * UniversalDocs - PDF Annotation Toolbar
 * Interactive toolbar for selecting annotation tools, colors, undo/redo, and Save As.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../../../shared/hooks';
import { AnnotationTool } from '../annotation.types';

export interface PdfAnnotationToolbarProps {
  activeTool: AnnotationTool;
  activeColor: string;
  canUndo: boolean;
  canRedo: boolean;
  onSelectTool: (tool: AnnotationTool) => void;
  onSelectColor: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveAs: () => void;
  onClose: () => void;
}

const TOOLS: { id: AnnotationTool; label: string; icon: string }[] = [
  { id: 'highlight', label: 'Highlight', icon: '🖍️' },
  { id: 'underline', label: 'Underline', icon: '＿' },
  { id: 'strikethrough', label: 'Strike', icon: '̶S̶' },
  { id: 'ink', label: 'Pen', icon: '✏️' },
  { id: 'note', label: 'Note', icon: '📝' },
  { id: 'eraser', label: 'Eraser', icon: '🧹' },
];

const COLORS: string[] = [
  '#FACC15', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#A855F7', // Purple
  '#0F172A', // Dark / Ink
];

export const PdfAnnotationToolbar: React.FC<PdfAnnotationToolbarProps> = ({
  activeTool,
  activeColor,
  canUndo,
  canRedo,
  onSelectTool,
  onSelectColor,
  onUndo,
  onRedo,
  onSaveAs,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { themeColors, isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderBottomColor: themeColors.border,
          paddingTop: Math.max(insets.top, 20) + 6,
        },
      ]}
    >
      {/* Top Action Row */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.actionBtn, { backgroundColor: themeColors.cardSecondary }]}
          activeOpacity={0.7}
          accessibilityLabel="Exit annotation mode"
        >
          <Text style={[styles.actionBtnText, { color: themeColors.textPrimary }]}>
            ✓ Done
          </Text>
        </TouchableOpacity>

        {/* Undo & Redo */}
        <View style={styles.undoRedoGroup}>
          <TouchableOpacity
            onPress={onUndo}
            disabled={!canUndo}
            style={[
              styles.iconCircleBtn,
              !canUndo && styles.btnDisabled,
              { backgroundColor: themeColors.cardSecondary },
            ]}
            accessibilityLabel="Undo annotation"
          >
            <Text style={[styles.undoText, { color: canUndo ? themeColors.textPrimary : themeColors.textMuted }]}>
              ↶
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRedo}
            disabled={!canRedo}
            style={[
              styles.iconCircleBtn,
              !canRedo && styles.btnDisabled,
              { backgroundColor: themeColors.cardSecondary },
            ]}
            accessibilityLabel="Redo annotation"
          >
            <Text style={[styles.undoText, { color: canRedo ? themeColors.textPrimary : themeColors.textMuted }]}>
              ↷
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save As Button */}
        <TouchableOpacity
          onPress={onSaveAs}
          style={[styles.saveBtn, { backgroundColor: themeColors.primary }]}
          activeOpacity={0.8}
          accessibilityLabel="Save annotated PDF as new file"
        >
          <Text style={styles.saveBtnText}>💾 Save As</Text>
        </TouchableOpacity>
      </View>

      {/* Tool Selector Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolsScroll}
      >
        {TOOLS.map(tool => {
          const isSelected = activeTool === tool.id;
          return (
            <TouchableOpacity
              key={tool.id}
              onPress={() => onSelectTool(tool.id)}
              style={[
                styles.toolPill,
                isSelected && {
                  backgroundColor: themeColors.primary,
                  borderColor: themeColors.primary,
                },
                !isSelected && {
                  backgroundColor: themeColors.cardSecondary,
                  borderColor: themeColors.border,
                },
              ]}
              activeOpacity={0.7}
              accessibilityLabel={`Select ${tool.label} tool`}
            >
              <Text style={styles.toolIcon}>{tool.icon}</Text>
              <Text
                style={[
                  styles.toolLabel,
                  {
                    color: isSelected ? '#FFFFFF' : themeColors.textPrimary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {tool.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Color Palette (Visible for drawing/highlighting tools) */}
      {activeTool !== 'eraser' && (
        <View style={styles.colorRow}>
          {COLORS.map(color => {
            const isSelected = activeColor.toLowerCase() === color.toLowerCase();
            return (
              <TouchableOpacity
                key={color}
                onPress={() => onSelectColor(color)}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  isSelected && styles.colorDotSelected,
                ]}
                activeOpacity={0.8}
                accessibilityLabel={`Select color ${color}`}
              >
                {isSelected && (
                  <View style={[styles.colorInnerDot, { backgroundColor: color === '#FACC15' ? '#000000' : '#FFFFFF' }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  undoRedoGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  undoText: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  toolsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  toolIcon: {
    fontSize: 14,
  },
  toolLabel: {
    fontSize: 12,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    paddingTop: 6,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderColor: '#3B82F6',
    transform: [{ scale: 1.15 }],
  },
  colorInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
