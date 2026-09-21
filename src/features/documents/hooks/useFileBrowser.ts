import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileBrowserService,
  BrowserItem,
  FolderLocation,
  SortOption,
  SortDirection,
} from '../services/fileBrowserService';

export interface UseFileBrowserOptions {
  initialLocation?: FolderLocation;
}

export function useFileBrowser(options?: UseFileBrowserOptions) {
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [currentLocation, setCurrentLocation] = useState<FolderLocation>(
    options?.initialLocation || {
      name: 'Download',
      path: '/storage/emulated/0/Download',
      isContentUri: false,
    }
  );

  const [locationStack, setLocationStack] = useState<FolderLocation[]>([
    currentLocation,
  ]);

  const [items, setItems] = useState<BrowserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [error, setError] = useState<string | null>(null);

  // Check storage permissions
  const checkPermissions = useCallback(async () => {
    const granted = await FileBrowserService.hasStoragePermission();
    setHasPermission(granted);
    return granted;
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    const requested = await FileBrowserService.requestStoragePermission();
    if (requested) {
      setTimeout(async () => {
        await checkPermissions();
        loadCurrentFolder();
      }, 1000);
    }
  }, [checkPermissions]);

  // Load contents of a given folder
  const loadFolder = useCallback(
    async (location: FolderLocation, isRefresh: boolean = false) => {
      try {
        setError(null);
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const rawItems = await FileBrowserService.readFolder(location);
        const sorted = FileBrowserService.sortItems(rawItems, sortBy, sortDirection);
        setItems(sorted);
      } catch (err: any) {
        console.warn('useFileBrowser: Error loading folder:', err);
        setError(
          err?.message ||
            `Cannot read contents of "${location.name}". The folder might be restricted, moved, or deleted.`
        );
        setItems([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [sortBy, sortDirection]
  );

  // Load current folder helper
  const loadCurrentFolder = useCallback(() => {
    loadFolder(currentLocation);
  }, [loadFolder, currentLocation]);

  // Initial load
  useEffect(() => {
    checkPermissions().then(() => {
      loadFolder(currentLocation);
    });
  }, []);

  // Re-sort when sorting preferences change
  useEffect(() => {
    setItems((prev) => FileBrowserService.sortItems([...prev], sortBy, sortDirection));
  }, [sortBy, sortDirection]);

  // Refresh handler
  const refresh = useCallback(() => {
    loadFolder(currentLocation, true);
  }, [loadFolder, currentLocation]);

  // Navigate deeper into a subfolder
  const navigateToFolder = useCallback(
    (folderItem: BrowserItem) => {
      const isContent =
        folderItem.uri.startsWith('content://') || currentLocation.isContentUri;

      const nextLocation: FolderLocation = {
        name: folderItem.name,
        path: folderItem.path || folderItem.uri,
        isContentUri: isContent,
        documentId: isContent ? folderItem.id : undefined,
      };

      setCurrentLocation(nextLocation);
      setLocationStack((prev) => [...prev, nextLocation]);
      setSearchQuery('');
      loadFolder(nextLocation);
    },
    [currentLocation, loadFolder]
  );

  // Navigate back to previous directory
  const navigateBack = useCallback(() => {
    if (locationStack.length <= 1) {
      return false; // Cannot navigate further back in browser
    }

    const nextStack = [...locationStack];
    nextStack.pop(); // Remove current
    const parentLocation = nextStack[nextStack.length - 1];

    setCurrentLocation(parentLocation);
    setLocationStack(nextStack);
    setSearchQuery('');
    loadFolder(parentLocation);
    return true;
  }, [locationStack, loadFolder]);

  // Navigate to a specific breadcrumb index
  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      if (index < 0 || index >= locationStack.length || index === locationStack.length - 1) {
        return;
      }

      const nextStack = locationStack.slice(0, index + 1);
      const targetLocation = nextStack[nextStack.length - 1];

      setCurrentLocation(targetLocation);
      setLocationStack(nextStack);
      setSearchQuery('');
      loadFolder(targetLocation);
    },
    [locationStack, loadFolder]
  );

  // Prompt user to pick a folder using SAF
  const pickAndOpenFolder = useCallback(async () => {
    const picked = await FileBrowserService.pickFolderViaSAF();
    if (picked) {
      setCurrentLocation(picked);
      setLocationStack([picked]);
      setSearchQuery('');
      loadFolder(picked);
    }
  }, [loadFolder]);

  // Change location directly (e.g. from preset roots)
  const setLocation = useCallback(
    (newLocation: FolderLocation) => {
      setCurrentLocation(newLocation);
      setLocationStack([newLocation]);
      setSearchQuery('');
      loadFolder(newLocation);
    },
    [loadFolder]
  );

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  return {
    currentLocation,
    locationStack,
    items,
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
  };
}

export default useFileBrowser;
