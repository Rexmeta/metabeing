import { storage } from "../storage";
import type { ChatMessage, InsertPersonaMemory, InsertPersonaRunSummary } from "@shared/schema";
import { GoogleGenAI } from "@google/genai";
import { trackUsage } from "./aiUsageTracker";

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "" });
const MEMORY_MODEL = "gemini-2.5-flash";

interface MemoryExtractionResult {
  memories: Array<{
    content: string;
    memoryType: "fact" | "preference" | "relationship" | "event" | "personality";
    importanceScore: number;
  }>;
  summary: string;
  keyTopics: string[];
  emotionalTone: string;
}

interface SummaryGenerationResult {
  summary: string;
  keyTopics: string[];
  emotionalTone?: string;
  turnCount?: number;
}

const MEMORY_EXTRACTION_PROMPT = `당신은 대화 분석 전문가입니다. 사용자와 AI 캐릭터 간의 대화에서 장기적으로 기억할 가치가 있는 핵심 정보를 추출합니다.

대화를 분석하여 다음 형식의 JSON으로 응답하세요:

{
  "memories": [
    {
      "content": "기억할 정보 (간결하게 한 문장)",
      "memoryType": "fact" | "preference" | "relationship" | "event" | "personality",
      "importanceScore": 1-10 (10이 가장 중요)
    }
  ],
  "summary": "대화 전체 요약 (2-3문장)",
  "keyTopics": ["주요 화제1", "주요 화제2"],
  "emotionalTone": "전반적인 감정 톤 (예: 친근함, 긴장, 호기심)"
}

메모리 유형 설명:
- fact: 사용자의 객관적 정보 (직업, 취미, 가족 등)
- preference: 사용자의 선호도와 좋아하는/싫어하는 것
- relationship: 사용자와 AI 캐릭터 간의 관계 발전
- event: 대화 중 언급된 중요한 사건이나 경험
- personality: 사용자의 성격 특성이나 가치관

중요도 점수 기준:
- 9-10: 사용자의 핵심 정체성 정보 (이름, 직업, 중요한 관계)
- 7-8: 반복적으로 참조될 수 있는 정보 (취미, 관심사)
- 5-6: 맥락에 유용한 정보
- 3-4: 일시적이거나 덜 중요한 정보
- 1-2: 거의 참조되지 않을 정보

주의사항:
- 실제 새로운 정보만 추출 (일반적인 인사말 제외)
- 사용자 관련 정보만 추출 (AI의 정보는 제외)
- 최대 5개의 메모리만 추출
- 한국어로 응답`;

const SUMMARY_GENERATION_PROMPT = `당신은 대화 요약 전문가입니다. 사용자와 AI 캐릭터 간의 대화를 간결하게 요약합니다.

대화를 분석하여 다음 형식의 JSON으로 응답하세요:

{
  "summary": "대화 전체 요약 (핵심 내용 2-3문장)",
  "keyTopics": ["주요 화제1", "주요 화제2", "주요 화제3"],
  "emotionalTone": "전반적인 감정 톤",
  "turnCount": 대화 턴 수
}

요약 지침:
- 대화의 시작부터 끝까지 흐름을 포착
- 핵심 결론이나 합의된 내용 강조
- 다음 대화에서 참조할 수 있는 맥락 포함
- 한국어로 응답`;

export class MemoryService {
  
  async extractMemoriesFromConversation(
    userId: string,
    personaId: string,
    messages: ChatMessage[]
  ): Promise<MemoryExtractionResult | null> {
    if (messages.length < 3) {
      return null;
    }
    
    const conversationText = this.formatMessagesForPrompt(messages);
    
    try {
      const startTime = Date.now();
      const result = await genAI.models.generateContent({
        model: MEMORY_MODEL,
        contents: `${MEMORY_EXTRACTION_PROMPT}\n\n대화 내용:\n${conversationText}`
      });
      
      const responseText = result.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.error("Memory extraction: No JSON found in response");
        return null;
      }
      
      let parsed: MemoryExtractionResult;
      try {
        const raw = JSON.parse(jsonMatch[0]);
        if (!raw.memories || !Array.isArray(raw.memories)) {
          console.error("Memory extraction: Invalid structure - missing memories array");
          return null;
        }
        parsed = {
          memories: raw.memories.filter((m: any) => 
            typeof m.content === 'string' &&
            typeof m.memoryType === 'string' &&
            typeof m.importanceScore === 'number'
          ).slice(0, 5)
        };
      } catch (parseError) {
        console.error("Memory extraction: JSON parse error", parseError);
        return null;
      }
      
      await trackUsage({
        feature: "memory",
        model: MEMORY_MODEL,
        provider: "gemini",
        promptTokens: Math.ceil(conversationText.length / 4),
        completionTokens: Math.ceil(responseText.length / 4),
        metadata: { subtype: "extraction" }
      });
      
      return parsed;
    } catch (error) {
      console.error("Memory extraction error:", error);
      return null;
    }
  }
  
  async generateConversationSummary(
    messages: ChatMessage[]
  ): Promise<SummaryGenerationResult | null> {
    if (messages.length < 2) {
      return null;
    }
    
    const conversationText = this.formatMessagesForPrompt(messages);
    
    try {
      const startTime = Date.now();
      const result = await genAI.models.generateContent({
        model: MEMORY_MODEL,
        contents: `${SUMMARY_GENERATION_PROMPT}\n\n대화 내용:\n${conversationText}`
      });
      
      const responseText = result.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.error("Summary generation: No JSON found in response");
        return null;
      }
      
      let parsed: SummaryGenerationResult;
      try {
        const raw = JSON.parse(jsonMatch[0]);
        if (typeof raw.summary !== 'string') {
          console.error("Summary generation: Invalid structure - missing summary");
          return null;
        }
        parsed = {
          summary: raw.summary.substring(0, 2000),
          keyTopics: Array.isArray(raw.keyTopics) ? raw.keyTopics.slice(0, 5) : [],
          emotionalTone: typeof raw.emotionalTone === 'string' ? raw.emotionalTone : undefined,
          turnCount: typeof raw.turnCount === 'number' ? raw.turnCount : undefined
        };
      } catch (parseError) {
        console.error("Summary generation: JSON parse error", parseError);
        return null;
      }
      
      await trackUsage({
        feature: "memory",
        model: MEMORY_MODEL,
        provider: "gemini",
        promptTokens: Math.ceil(conversationText.length / 4),
        completionTokens: Math.ceil(responseText.length / 4),
        metadata: { subtype: "summary" }
      });
      
      return parsed;
    } catch (error) {
      console.error("Summary generation error:", error);
      return null;
    }
  }
  
  async processConversationMemory(
    userId: string,
    personaId: string,
    personaRunId: string,
    messages: ChatMessage[],
    isConversationEnd: boolean = false
  ): Promise<void> {
    try {
      const shouldProcess = isConversationEnd || messages.length % 10 === 0;
      
      if (!shouldProcess || messages.length < 3) {
        return;
      }
      
      console.log(`Processing memory for user=${userId}, persona=${personaId}, turns=${messages.length}`);
      
      const [extraction, summary] = await Promise.all([
        this.extractMemoriesFromConversation(userId, personaId, messages),
        this.generateConversationSummary(messages)
      ]);
      
      if (extraction?.memories?.length) {
        for (const mem of extraction.memories) {
          if (mem.importanceScore >= 5) {
            const existingMemories = await storage.getPersonaMemoriesByType(userId, personaId, mem.memoryType);
            const isDuplicate = existingMemories.some(existing => 
              this.isSimilarMemory(existing.content, mem.content)
            );
            
            if (!isDuplicate) {
              const memoryData: InsertPersonaMemory = {
                userId,
                personaId,
                content: mem.content,
                memoryType: mem.memoryType,
                importanceScore: mem.importanceScore,
                sourcePersonaRunId: personaRunId
              };
              
              await storage.createPersonaMemory(memoryData);
              console.log(`Created memory: ${mem.content.substring(0, 50)}...`);
            }
          }
        }
        
        await storage.deleteOldLowImportanceMemories(userId, personaId, 50);
      }
      
      if (summary && isConversationEnd) {
        const existingSummary = await storage.getPersonaRunSummary(personaRunId);
        
        const summaryData: InsertPersonaRunSummary = {
          personaRunId,
          userId,
          personaId,
          summary: summary.summary,
          keyTopics: summary.keyTopics,
          emotionalTone: summary.emotionalTone,
          turnCount: messages.length
        };
        
        if (existingSummary) {
          await storage.updatePersonaRunSummary(existingSummary.id, summaryData);
        } else {
          await storage.createPersonaRunSummary(summaryData);
        }
        console.log(`Saved conversation summary for personaRun=${personaRunId}`);
      }
      
    } catch (error) {
      console.error("Memory processing error:", error);
    }
  }
  
  async getMemoryContextForPrompt(userId: string, personaId: string): Promise<string> {
    const context = await storage.getMemoryContext(userId, personaId);
    
    if (context.totalConversationCount === 0) {
      return "";
    }
    
    let prompt = "\n\n[이전 대화 기억]\n";
    
    if (context.relationshipDuration !== "첫 대화") {
      prompt += `관계 기간: ${context.relationshipDuration} (총 ${context.totalConversationCount}회 대화)\n\n`;
    }
    
    if (context.longTermMemories.length > 0) {
      prompt += "사용자에 대해 알고 있는 정보:\n";
      for (const mem of context.longTermMemories) {
        prompt += `- ${mem.content}\n`;
      }
      prompt += "\n";
    }
    
    if (context.recentSummaries.length > 0) {
      prompt += "최근 대화 요약:\n";
      for (const summary of context.recentSummaries.slice(0, 2)) {
        const topics = summary.keyTopics?.join(", ") || "";
        prompt += `- ${summary.summary}${topics ? ` (주제: ${topics})` : ""}\n`;
      }
      prompt += "\n";
    }
    
    prompt += "위 정보를 자연스럽게 대화에 반영하되, 기억을 강조하거나 어색하게 언급하지 마세요.\n";
    
    return prompt;
  }
  
  private formatMessagesForPrompt(messages: ChatMessage[]): string {
    return messages
      .map(msg => `${msg.sender === "user" ? "사용자" : "AI"}: ${msg.message}`)
      .join("\n");
  }
  
  private isSimilarMemory(existing: string, newContent: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, "");
    const existingNorm = normalize(existing);
    const newNorm = normalize(newContent);
    
    if (existingNorm === newNorm) return true;
    if (existingNorm.includes(newNorm) || newNorm.includes(existingNorm)) return true;
    
    const existingWords = existingNorm.split(/\s+/).filter(w => w.length > 2);
    const newWordsArr = newNorm.split(/\s+/).filter(w => w.length > 2);
    const existingWordSet = new Set(existingWords);
    
    let overlap = 0;
    for (let i = 0; i < newWordsArr.length; i++) {
      if (existingWordSet.has(newWordsArr[i])) overlap++;
    }
    
    const similarity = overlap / Math.max(newWordsArr.length, 1);
    return similarity > 0.7;
  }
}

export const memoryService = new MemoryService();
