import { getRedis } from '../config/redis';
import crypto from 'crypto';

/**
 * Redis Caching Service
 * Caches embeddings and search results to reduce API costs and improve performance
 */
export class CacheService {
  private static instance: CacheService;
  private readonly EMBEDDING_TTL = 86400 * 7; // 7 days in seconds
  private readonly SEARCH_TTL = 300; // 5 minutes in seconds

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generate cache key from text hash
   */
  private getCacheKey(text: string, prefix: string = 'emb'): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return `${prefix}:${hash.substring(0, 16)}`;
  }

  /**
   * Cache embedding
   */
  async setEmbedding(text: string, embedding: number[]): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return; // Redis not available, skip caching
      
      const key = this.getCacheKey(text);
      await redis.setEx(key, this.EMBEDDING_TTL, JSON.stringify(embedding));
      console.log('✅ Embedding cached');
    } catch (error) {
      console.error('⚠️  Failed to cache embedding:', error);
      // Don't throw - caching failure shouldn't break the app
    }
  }

  /**
   * Get cached embedding
   */
  async getEmbedding(text: string): Promise<number[] | null> {
    try {
      const redis = getRedis();
      if (!redis) return null; // Redis not available
      
      const key = this.getCacheKey(text);
      const cached = await redis.get(key);
      
      if (cached) {
        console.log('✅ Cache hit for embedding');
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('⚠️  Failed to get cached embedding:', error);
      return null;
    }
  }

  /**
   * Cache search results
   */
  async setSearchResults(
    query: string,
    results: any[],
    userId: string
  ): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return; // Redis not available, skip caching
      
      const key = `search:${userId}:${this.getCacheKey(query, '')}`;
      await redis.setEx(key, this.SEARCH_TTL, JSON.stringify(results));
      console.log('✅ Search results cached');
    } catch (error) {
      console.error('⚠️  Failed to cache search results:', error);
    }
  }

  /**
   * Get cached search results
   */
  async getSearchResults(query: string, userId: string): Promise<any[] | null> {
    try {
      const redis = getRedis();
      if (!redis) return null; // Redis not available
      
      const key = `search:${userId}:${this.getCacheKey(query, '')}`;
      const cached = await redis.get(key);
      
      if (cached) {
        console.log('✅ Cache hit for search results');
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('⚠️  Failed to get cached search results:', error);
      return null;
    }
  }

  /**
   * Clear user cache (call on sync to ensure fresh data)
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return; // Redis not available
      
      const keys = await redis.keys(`*:${userId}:*`);
      
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`✅ Cleared ${keys.length} cache entries for user ${userId}`);
      }
    } catch (error) {
      console.error('⚠️  Failed to clear user cache:', error);
    }
  }

  /**
   * Cache warming for popular searches
   * Call this after sync to pre-populate cache
   */
  async warmCache(userId: string, popularSearches: string[] = []): Promise<void> {
    const defaultSearches = ['today', 'yesterday', 'this week', 'pr', 'issue'];
    const searches = popularSearches.length > 0 ? popularSearches : defaultSearches;

    console.log(`🔥 Warming cache for user ${userId}...`);
    
    for (const query of searches) {
      try {
        // This would trigger the search and cache the results
        // In production, you'd call your search service here
        console.log(`  - Pre-caching: "${query}"`);
      } catch (error) {
        console.error(`  - Failed to warm cache for "${query}":`, error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    embeddingKeys: number;
    searchKeys: number;
    memoryUsage: string;
  }> {
    try {
      const redis = getRedis();
      if (!redis) {
        return {
          totalKeys: 0,
          embeddingKeys: 0,
          searchKeys: 0,
          memoryUsage: 'Redis not available',
        };
      }
      
      const allKeys = await redis.keys('*');
      const embeddingKeys = await redis.keys('emb:*');
      const searchKeys = await redis.keys('search:*');
      
      // Get memory info
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        totalKeys: allKeys.length,
        embeddingKeys: embeddingKeys.length,
        searchKeys: searchKeys.length,
        memoryUsage,
      };
    } catch (error) {
      console.error('⚠️  Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        embeddingKeys: 0,
        searchKeys: 0,
        memoryUsage: 'unknown',
      };
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  async clearAllCache(): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return; // Redis not available
      
      await redis.flushDb();
      console.log('✅ All cache cleared');
    } catch (error) {
      console.error('⚠️  Failed to clear all cache:', error);
    }
  }
}

export const cacheService = CacheService.getInstance();



