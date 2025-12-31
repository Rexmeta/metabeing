import { readFileSync } from 'fs';
import { join } from 'path';

// 페르소나 데이터 타입 정의
export interface PersonaData {
  id: string;
  ownerId?: string; // 생성자 ID (소유권)
  personaKey: string; // 고유 페르소나 키 (이전 mbti 필드)
  mbti?: string; // 하위 호환성을 위한 별칭
  personality_traits: string[];
  communication_style: string;
  motivation: string;
  fears: string[];
  speech_style?: {
    formality: string;
    sentence_endings: string[];
    filler_words: string[];
    characteristic_expressions: string[];
  };
  reaction_phrases?: {
    agreement: string[];
    disagreement: string[];
    surprise: string[];
    thinking: string[];
    empathy: string[];
  };
  background: {
    personal_values: string[];
    hobbies: string[];
    social: {
      preference: string;
      behavior: string;
    };
  };
  communication_patterns: {
    opening_style: string;
    key_phrases: string[];
    response_to_arguments: {
      [key: string]: string;
    };
    win_conditions: string[];
  };
  voice: {
    tone: string;
    pace: string;
    emotion: string;
  };
  images: {
    base: string;
    style: string;
    expressions: {
      중립: string;
      기쁨: string;
      슬픔: string;
      분노: string;
      놀람: string;
      호기심: string;
      불안: string;
      피로: string;
      실망: string;
      당혹: string;
    };
  };
}

// 페르소나 데이터 캐시 (메모리 최적화)
const personaCache = new Map<string, PersonaData>();

/**
 * personas 폴더에서 페르소나 JSON 파일을 로드하는 함수
 * @param personaRef - 예: "istj.json" 또는 "entj.json"
 * @returns PersonaData 객체 또는 null
 */
export async function loadPersonaData(personaRef: string): Promise<PersonaData | null> {
  try {
    // 보안: personaRef 검증 (path traversal 방지)
    const allowedTypes = getAvailablePersonaTypes();
    const baseFileName = personaRef.replace('.json', '');
    
    if (!allowedTypes.includes(baseFileName) || personaRef.includes('..') || personaRef.includes('/')) {
      console.error(`❌ Invalid personaRef: ${personaRef}`);
      return null;
    }
    
    // 캐시에서 먼저 확인
    if (personaCache.has(personaRef)) {
      return personaCache.get(personaRef)!;
    }

    // personas 폴더 경로 설정 (정규화된 파일명 사용)
    const normalizedRef = `${baseFileName}.json`;
    const personasPath = join(process.cwd(), 'personas', normalizedRef);
    
    // JSON 파일 읽기
    const fileContent = readFileSync(personasPath, 'utf-8');
    const rawPersona = JSON.parse(fileContent);
    
    // mbti 필드를 personaKey로 변환
    const personaData: PersonaData = {
      ...rawPersona,
      personaKey: rawPersona.mbti || rawPersona.personaKey
    };
    
    // 캐시에 저장 (정규화된 키 사용)
    personaCache.set(normalizedRef, personaData);

    // 로그 제거: GlobalPersonaCache에서 이미 프리로드 완료 메시지 출력
    return personaData;
    
  } catch (error) {
    console.error(`❌ Failed to load persona from ${personaRef}:`, error);
    return null;
  }
}

/**
 * 시나리오 페르소나와 페르소나 데이터를 결합하는 함수
 * @param scenarioPersona - 시나리오에서 가져온 페르소나 정보
 * @param personaRef - 페르소나 JSON 파일 참조 (예: "istj.json")
 * @returns 결합된 페르소나 정보
 */
export async function enrichPersonaWithData(scenarioPersona: any, personaRef?: string): Promise<any> {
  if (!personaRef) {
    console.warn(`⚠️ No personaRef provided for persona ${scenarioPersona.name}`);
    return scenarioPersona;
  }

  const personaData = await loadPersonaData(personaRef);
  
  if (!personaData) {
    console.warn(`⚠️ Could not load persona data for ${personaRef}, using scenario data only`);
    return scenarioPersona;
  }

  // 페르소나 상세 정보로 시나리오 페르소나 보강
  const enrichedPersona = {
    ...scenarioPersona,
    personaKey: personaData.personaKey,
    mbti: personaData.personaKey, // 하위 호환성을 위해 mbti도 유지
    personality_traits: personaData.personality_traits,
    communication_style: personaData.communication_style,
    motivation: personaData.motivation,
    fears: personaData.fears,
    background: personaData.background,
    communication_patterns: personaData.communication_patterns,
    voice: personaData.voice,
    images: personaData.images
  };

  // 로그 제거: 서버 시작 시 불필요한 로그 방지
  return enrichedPersona;
}

/**
 * 사용 가능한 모든 페르소나 유형 목록을 반환
 * @returns 페르소나 유형 문자열 배열
 */
export function getAvailablePersonaTypes(): string[] {
  return [
    'istj', 'isfj', 'infj', 'intj',
    'istp', 'isfp', 'infp', 'intp', 
    'estp', 'esfp', 'enfp', 'entp',
    'estj', 'esfj', 'enfj', 'entj'
  ];
}

/**
 * 시나리오 페르소나에 가벼운 페르소나 정보만 추가 (목록 표시용)
 * @param scenarioPersona - 시나리오에서 가져온 페르소나 정보
 * @param personaRef - 페르소나 JSON 파일 참조
 * @returns personaKey만 포함된 페르소나
 */
export async function enrichPersonaWithBasicData(scenarioPersona: any, personaRef?: string): Promise<any> {
  if (!personaRef) {
    return scenarioPersona;
  }

  const personaData = await loadPersonaData(personaRef);
  
  if (!personaData) {
    return scenarioPersona;
  }

  // 가벼운 정보만 추가 (목록 표시용)
  return {
    ...scenarioPersona,
    personaKey: personaData.personaKey,
    mbti: personaData.personaKey // 하위 호환성
  };
}

/**
 * 이미지 경로를 성별별 폴더 구조로 변환 (구 형식 → 새 형식)
 * @param persona - 페르소나 객체
 * @param gender - 성별 ('male' | 'female')
 * @returns 변환된 페르소나 객체
 */
export function transformImagePathsByGender(persona: any, gender: 'male' | 'female' = 'male'): any {
  if (!persona.images || !persona.images.expressions) {
    return persona;
  }

  // 이미지 경로 변환: /personas/enfj/neutral.png → /personas/enfj/male/neutral.png
  const transformPath = (path: string, gender: string): string => {
    if (!path) return path;
    
    // 이미 성별 폴더가 있으면 그대로 반환
    if (path.includes('/male/') || path.includes('/female/')) {
      return path;
    }
    
    // /personas/{id}/{emotion}.png → /personas/{id}/{gender}/{emotion}.png
    const regex = /^(\/personas\/[^/]+)\/([^/]+\.png)$/;
    const match = path.match(regex);
    
    if (match) {
      return `${match[1]}/${gender}/${match[2]}`;
    }
    
    return path;
  };

  // 이미지 경로 변환
  const transformedPersona = {
    ...persona,
    images: {
      ...persona.images,
      expressions: Object.entries(persona.images.expressions).reduce((acc, [key, path]) => {
        acc[key as keyof typeof persona.images.expressions] = transformPath(path as string, gender);
        return acc;
      }, {} as typeof persona.images.expressions)
    }
  };

  return transformedPersona;
}

/**
 * 페르소나 캐시를 초기화하는 함수 (개발/테스트용)
 */
export function clearPersonaCache(): void {
  personaCache.clear();
  console.log('🗑️ Persona cache cleared');
}

/**
 * 특정 페르소나의 캐시를 업데이트하는 함수
 * @param personaRef - 예: "istj.json" 또는 "istj"
 * @param data - 업데이트된 페르소나 데이터
 */
export function updatePersonaCache(personaRef: string, data: PersonaData): void {
  const normalizedRef = personaRef.endsWith('.json') ? personaRef : `${personaRef}.json`;
  personaCache.set(normalizedRef, data);
  console.log(`🔄 Persona cache updated: ${data.personaKey} (${data.id})`);
}

/**
 * 특정 페르소나의 캐시를 삭제하는 함수
 * @param personaRef - 예: "istj.json" 또는 "istj"
 */
export function invalidatePersonaCache(personaRef: string): void {
  const normalizedRef = personaRef.endsWith('.json') ? personaRef : `${personaRef}.json`;
  personaCache.delete(normalizedRef);
  console.log(`🗑️ Persona cache invalidated: ${personaRef}`);
}

// 하위 호환성을 위한 별칭
export type MBTIPersona = PersonaData;
export const loadMBTIPersona = loadPersonaData;
export const enrichPersonaWithMBTI = enrichPersonaWithData;
export const getAvailableMBTITypes = getAvailablePersonaTypes;
export const enrichPersonaWithBasicMBTI = enrichPersonaWithBasicData;
export const clearMBTICache = clearPersonaCache;
export const updateMBTICache = updatePersonaCache;
export const invalidateMBTICache = invalidatePersonaCache;
