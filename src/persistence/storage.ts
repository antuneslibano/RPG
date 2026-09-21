/** Storage abstraction so the domain never imports a native module. */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private readonly map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return [...this.map.keys()];
  }

  /** Test hook: corrupts a partition to exercise the recovery path. */
  corrupt(key: string, value = '{not json'): void {
    this.map.set(key, value);
  }

  size(): number {
    return this.map.size;
  }
}
