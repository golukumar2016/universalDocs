import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../app/navigation/navigation.types';
import { DocumentRepository } from '../../core/database/repositories/documentRepository';
import { DocumentItem } from '../../shared/types';
import { formatFileSize, formatDate } from '../../shared/utils';
import { useAppTheme } from '../../shared/hooks';
import { EditorRouter } from '../editor/services/editorRouter';

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { themeColors, isDark } = useAppTheme();

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<DocumentItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'text' | 'pdf'>('all');

  const handleSearch = useCallback(async () => {
    try {
      let docs = await DocumentRepository.searchByName(query.trim());

      if (filterType === 'favorites') {
        docs = docs.filter((d) => d.isFavorite);
      } else if (filterType === 'text') {
        docs = docs.filter((d) => ['txt', 'md', 'csv', 'json', 'log'].includes(d.extension));
      } else if (filterType === 'pdf') {
        docs = docs.filter((d) => d.extension === 'pdf');
      }

      setResults(docs);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [query, filterType]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleOpenDoc = (doc: DocumentItem) => {
    EditorRouter.openDocument(navigation, doc);
  };

  const renderItem = ({ item }: { item: DocumentItem }) => {
    const badgeColor =
      item.extension === 'pdf'
        ? '#EF4444'
        : item.extension === 'docx' || item.extension === 'doc'
        ? '#2563EB'
        : item.extension === 'xlsx' || item.extension === 'xls'
        ? '#10B981'
        : '#64748B';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
        onPress={() => handleOpenDoc(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{item.extension.toUpperCase()}</Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.meta, { color: themeColors.textMuted }]}>
            {formatFileSize(item.size)} • {formatDate(item.updatedAt)}
          </Text>
        </View>

        {item.isFavorite && <Text style={styles.star}>★</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
          Search Documents
        </Text>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder="Search documents by name..."
            placeholderTextColor={themeColors.textMuted}
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={[styles.clearBtn, { color: themeColors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All' },
            { key: 'favorites', label: '★ Starred' },
            { key: 'text', label: 'Text/MD' },
            { key: 'pdf', label: 'PDF' },
          ].map((pill) => {
            const isActive = filterType === pill.key;
            return (
              <TouchableOpacity
                key={pill.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? themeColors.primary : themeColors.cardSecondary,
                    borderColor: isActive ? themeColors.primary : themeColors.border,
                  },
                ]}
                onPress={() => setFilterType(pill.key as any)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? '#FFFFFF' : themeColors.textSecondary },
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={results.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                No matching documents
              </Text>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                {query ? `No files found matching "${query}"` : 'Your saved documents will show here'}
              </Text>
            </View>
          }
        />
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  clearBtn: {
    fontSize: 14,
    padding: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    marginTop: 4,
  },
  star: {
    fontSize: 18,
    color: '#F59E0B',
    marginLeft: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyView: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});

export default SearchScreen;
