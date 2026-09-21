// In-memory / file-based local storage implementation
// Can be backed by MMKV, AsyncStorage, or local file storage

class LocalStorage {
  private memoryCache: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    this.memoryCache.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.memoryCache.has(key) ? this.memoryCache.get(key)! : null;
  }

  async removeItem(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  }

  async getObject<T>(key: string): Promise<T | null> {
    const raw = await this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

export const localStorage = new LocalStorage();
export default localStorage;
