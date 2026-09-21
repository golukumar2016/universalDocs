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
import { colors } from '../../shared/theme';

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

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
    navigation.navigate('Editor', {
      documentId: doc.id,
      filePath: doc.path,
      title: doc.name,
    });
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
        style={styles.card}
        onPress={() => handleOpenDoc(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{item.extension.toUpperCase()}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.meta}>
            {formatFileSize(item.size)} • {formatDate(item.updatedAt)}
          </Text>
        </View>

        {item.isFavorite && <Text style={styles.star}>★</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Search Documents</Text>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents by name..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
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
          ].map((pill) => (
            <TouchableOpacity
              key={pill.key}
              style={[
                styles.filterPill,
                filterType === pill.key && styles.filterPillActive,
              ]}
              onPress={() => setFilterType(pill.key as any)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterType === pill.key && styles.filterPillTextActive,
                ]}
              >
                {pill.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={results.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text style={styles.emptyTitle}>No matching documents</Text>
              <Text style={styles.emptyText}>
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
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  clearBtn: {
    fontSize: 14,
    color: colors.textMuted,
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
    backgroundColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default SearchScreen;
