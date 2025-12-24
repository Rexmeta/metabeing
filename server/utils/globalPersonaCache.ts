import { join } from 'path';
import { readFileSync, readdirSync } from 'fs';
import type { PersonaData } from './personaLoader';

/**
 * 글로벌 페르소나 캐시 시스템
 * 서버 시작 시 모든 페르소나 데이터를 메모리에 로드하여 성능 향상
 */
export class GlobalPersonaCache {
  private static instance: GlobalPersonaCache | null = null;
  private cache: Map<string, PersonaData> = new Map();
  private enrichedPersonaCache: Map<string, any> = new Map();
  private isLoaded = false;

  private constructor() {}

  static getInstance(): GlobalPersonaCache {
    if (!this.instance) {
      this.instance = new GlobalPersonaCache();
    }
    return this.instance;
  }

  /**
   * 서버 시작 시 모든 페르소나 데이터를 프리로드
   */
  async preloadAllPersonaData(): Promise<void> {
    if (this.isLoaded) return;

    console.log('🚀 Preloading all personas for optimal performance...');
    const startTime = Date.now();

    try {
      const personasDir = join(process.cwd(), 'personas');
      const files = readdirSync(personasDir).filter(file => file.endsWith('.json'));
      
      // 병렬로 모든 페르소나 파일 로드
      const loadPromises = files.map(async (file) => {
        try {
          const filePath = join(personasDir, file);
          const fileContent = readFileSync(filePath, 'utf-8');
          const rawPersona = JSON.parse(fileContent);
          
          // mbti 필드를 personaKey로 변환
          const personaData: PersonaData = {
            ...rawPersona,
            personaKey: rawPersona.mbti || rawPersona.personaKey
          };
          
          const key = file; // e.g., 'infj.json'
          this.cache.set(key, personaData);
          
          return { file, success: true };
        } catch (error) {
          console.error(`❌ Failed to load ${file}:`, error);
          return { file, success: false };
        }
      });

      const results = await Promise.all(loadPromises);
      const successCount = results.filter(r => r.success).length;
      const loadTime = Date.now() - startTime;

      console.log(`✅ Persona Cache preloaded: ${successCount}/${files.length} personas in ${loadTime}ms`);
      this.isLoaded = true;

    } catch (error) {
      console.error('❌ Failed to preload persona data:', error);
      throw error;
    }
  }

  /**
   * 캐시된 페르소나 데이터 반환 (즉시 반환)
   */
  getPersonaData(personaRef: string): PersonaData | null {
    return this._getPersonaData(personaRef);
  }

  /**
   * 하위 호환성을 위한 별칭
   */
  getMBTIPersona(personaRef: string): PersonaData | null {
    return this._getPersonaData(personaRef);
  }

  private _getPersonaData(personaRef: string): PersonaData | null {
    // 보안 검증
    if (personaRef.includes('..') || personaRef.includes('/')) {
      console.error(`❌ Invalid personaRef: ${personaRef}`);
      return null;
    }

    // .json 확장자 정규화
    const normalizedRef = personaRef.endsWith('.json') ? personaRef : `${personaRef}.json`;
    
    const persona = this.cache.get(normalizedRef);
    if (!persona) {
      console.warn(`⚠️ Persona not found in cache: ${normalizedRef}`);
      return null;
    }

    return persona;
  }

  /**
   * enriched persona 캐시 관리
   */
  setEnrichedPersona(key: string, persona: any): void {
    this.enrichedPersonaCache.set(key, persona);
  }

  getEnrichedPersona(key: string): any | null {
    return this.enrichedPersonaCache.get(key) || null;
  }

  /**
   * 캐시 상태 정보 반환
   */
  getCacheStats(): {
    personaCount: number;
    enrichedCount: number;
    isLoaded: boolean;
    availableTypes: string[];
  } {
    return {
      personaCount: this.cache.size,
      enrichedCount: this.enrichedPersonaCache.size,
      isLoaded: this.isLoaded,
      availableTypes: Array.from(this.cache.keys()).map(key => key.replace('.json', ''))
    };
  }

  /**
   * 사용 가능한 페르소나 타입 목록 반환
   */
  getAvailableTypes(): string[] {
    return Array.from(this.cache.keys()).map(key => key.replace('.json', ''));
  }

  /**
   * 캐시 리셋 (개발/테스트용)
   */
  clearCache(): void {
    this.cache.clear();
    this.enrichedPersonaCache.clear();
    this.isLoaded = false;
    console.log('🗑️ Persona cache cleared');
  }

  /**
   * 캐시 워밍업 체크
   */
  isWarmUp(): boolean {
    return this.isLoaded && this.cache.size > 0;
  }
}

// 하위 호환성을 위한 별칭
export const GlobalMBTICache = GlobalPersonaCache;
