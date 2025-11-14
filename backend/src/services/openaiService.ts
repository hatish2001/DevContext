import OpenAI from 'openai';
import { cacheService } from './cacheService';

// Lazy-load OpenAI client to ensure .env is loaded first
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        '❌ OPENAI_API_KEY not found in environment variables!\n' +
        '💡 Add it to backend/.env:\n' +
        '   OPENAI_API_KEY=sk-your-key-here'
      );
    }
    
    // Debug: Show key format (first 10 chars only for security)
    console.log(`🔑 API Key loaded: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);
    
    // Check if it's still the placeholder
    if (apiKey.includes('your_openai') || apiKey.includes('your-key')) {
      throw new Error(
        '❌ OPENAI_API_KEY still has placeholder value!\n' +
        `   Current value starts with: "${apiKey.substring(0, 20)}..."\n` +
        '💡 Replace with real key from https://platform.openai.com/api-keys\n' +
        '   Should start with: sk-proj-... or sk-...'
      );
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey.trim() // Remove any accidental whitespace
    });
    console.log('✅ OpenAI client initialized successfully');
  }
  return openaiClient;
}

/**
 * OpenAI Service with aggressive cost optimizations:
 * - text-embedding-3-small with 512 dimensions (70% cheaper than 1536)
 * - GPT-3.5-turbo for titles (20x cheaper than GPT-4)
 * - 7-day cache for embeddings
 * - Batch processing
 * 
 * Cost per 100 contexts:
 * - Embeddings: ~$0.0004 (100 contexts × 100 tokens × $0.00002/1K tokens ÷ 3)
 * - Titles: ~$0.005 (5 groups × 200 tokens × $0.0005/1K tokens)
 * Total: ~$0.006 per grouping operation (0.6 cents!)
 */
export class OpenAIService {
  /**
   * Generate embedding for text with cost optimizations
   * Uses 512 dimensions instead of 1536 (70% cost reduction)
   * Uses Redis for persistent caching across restarts
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check Redis cache first
    const cached = await cacheService.getEmbedding(text);
    
    if (cached) {
      return cached;
    }

    try {
      console.log('🔄 Generating new embedding...');
      const openai = getOpenAIClient();
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 512 // Reduced from 1536 for 70% cost savings
      });
      
      const embedding = response.data[0].embedding;
      
      // Cache in Redis
      await cacheService.setEmbedding(text, embedding);
      console.log('✅ Embedding generated and cached');
      
      return embedding;
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches of 100 (OpenAI limit)
    const BATCH_SIZE = 100;
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.generateEmbedding(text))
      );
      embeddings.push(...batchEmbeddings);
      
      // Rate limiting: small delay between batches
      if (i + BATCH_SIZE < texts.length) {
        await this.sleep(100);
      }
    }
    
    return embeddings;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Generate meaningful title for a group using GPT-3.5-turbo (cheap!)
   * Cost: ~$0.001 per title (20x cheaper than GPT-4)
   */
  async generateGroupTitle(contexts: any[]): Promise<string> {
    // Create concise description for GPT
    const contextDescriptions = contexts
      .slice(0, 5) // Only send first 5 to save tokens
      .map(c => `${c.source}: ${c.title}`)
      .join('\n');

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // 20x cheaper than GPT-4!
        messages: [{
          role: 'system',
          content: 'Generate a brief feature title (max 40 chars) for this related work. Be specific and technical.'
        }, {
          role: 'user',
          content: contextDescriptions
        }],
        temperature: 0.3,
        max_tokens: 30 // Minimize output tokens
      });

      const title = response.choices[0].message.content?.trim() || 'Related Changes';
      console.log(`✅ Generated title: ${title}`);
      return title.substring(0, 50); // Ensure max length
      
    } catch (error) {
      console.error('❌ Failed to generate title:', error);
      return 'Related Changes'; // Fallback
    }
  }

  /**
   * Generate titles for multiple groups in one batch
   */
  async generateGroupTitles(groups: any[][]): Promise<string[]> {
    return Promise.all(groups.map(group => this.generateGroupTitle(group)));
  }

  /**
   * Generate concise text using Chat Completions
   */
  async generateText(prompt: string, options?: { model?: string; maxTokens?: number; temperature?: number }): Promise<string> {
    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: options?.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a concise assistant for developer productivity summaries.' },
          { role: 'user', content: prompt }
        ],
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 300
      });
      return response.choices[0].message.content?.trim() || '';
    } catch (error) {
      console.error('❌ Failed to generate text:', error);
      throw error;
    }
  }

  /**
   * Simple text hash for cache keys
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 16);
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await cacheService.getCacheStats();
  }
}

export const openaiService = new OpenAIService();

