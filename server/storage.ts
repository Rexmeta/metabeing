import { type Conversation, type InsertConversation, type Feedback, type InsertFeedback, type PersonaSelection, type StrategyChoice, type SequenceAnalysis, type User, type UpsertUser, type ScenarioRun, type InsertScenarioRun, type PersonaRun, type InsertPersonaRun, type ChatMessage, type InsertChatMessage, type Category, type InsertCategory, type SystemSetting, type AiUsageLog, type InsertAiUsageLog, type AiUsageSummary, type AiUsageByFeature, type AiUsageByModel, type AiUsageDaily, conversations, feedbacks, users, scenarioRuns, personaRuns, chatMessages, categories, systemSettings, aiUsageLogs } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, asc, desc, inArray, and, gte, lte, sql as sqlBuilder, count, sum, isNotNull, isNull, or, gt } from "drizzle-orm";
const sql = sqlBuilder;

// Initialize database connection
const neonClient = neon(process.env.DATABASE_URL!);
export const db = drizzle(neonClient);

// Neon HTTP 드라이버 재시도 유틸리티 - null/TypeError 대응 강화
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 150): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await fn();
      // Neon serverless가 가끔 null을 반환하는 문제 대응
      if (result !== null && result !== undefined) {
        return result;
      }
      // 결과가 null/undefined면 다시 시도
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
    } catch (error: any) {
      lastError = error;
      // TypeError (null.map 등)는 Neon의 일시적 오류로 간주하고 재시도
      const isRetryable = 
        error?.message?.includes('Cannot read properties of null') ||
        error?.message?.includes('Cannot read properties of undefined') ||
        error?.name === 'TypeError';
      
      if (!isRetryable && i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  // 마지막 시도
  try {
    return await fn();
  } catch (error) {
    throw lastError || error;
  }
}

export interface IStorage {
  // Conversations (레거시)
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  getAllConversations(): Promise<Conversation[]>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  
  // Feedback
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByConversationId(conversationId: string): Promise<Feedback | undefined>;
  getAllFeedbacks(): Promise<Feedback[]>;
  getUserFeedbacks(userId: string): Promise<Feedback[]>;
  
  // Strategic Selection - Persona Selections
  addPersonaSelection(conversationId: string, selection: PersonaSelection): Promise<Conversation>;
  getPersonaSelections(conversationId: string): Promise<PersonaSelection[]>;
  
  // Strategic Selection - Strategy Choices  
  addStrategyChoice(conversationId: string, choice: StrategyChoice): Promise<Conversation>;
  getStrategyChoices(conversationId: string): Promise<StrategyChoice[]>;
  
  // Strategic Selection - Sequence Analysis
  saveSequenceAnalysis(conversationId: string, analysis: SequenceAnalysis): Promise<Conversation>;
  getSequenceAnalysis(conversationId: string): Promise<SequenceAnalysis | undefined>;
  
  // Strategy Reflection
  saveStrategyReflection(conversationId: string, reflection: string, conversationOrder: string[]): Promise<Conversation>;

  // 새로운 데이터 구조: Scenario Runs
  createScenarioRun(scenarioRun: InsertScenarioRun): Promise<ScenarioRun>;
  getScenarioRun(id: string): Promise<ScenarioRun | undefined>;
  updateScenarioRun(id: string, updates: Partial<ScenarioRun>): Promise<ScenarioRun>;
  getUserScenarioRuns(userId: string): Promise<ScenarioRun[]>;
  getAllScenarioRuns(): Promise<ScenarioRun[]>; // Admin analytics
  findActiveScenarioRun(userId: string, scenarioId: string): Promise<ScenarioRun | undefined>;
  getUserScenarioRunsWithPersonaRuns(userId: string): Promise<(ScenarioRun & { personaRuns: PersonaRun[] })[]>;
  getScenarioRunWithPersonaRuns(id: string): Promise<(ScenarioRun & { personaRuns: PersonaRun[] }) | undefined>;
  
  // Persona Runs
  createPersonaRun(personaRun: InsertPersonaRun): Promise<PersonaRun>;
  getPersonaRun(id: string): Promise<PersonaRun | undefined>;
  getPersonaRunByConversationId(conversationId: string): Promise<PersonaRun | undefined>;
  updatePersonaRun(id: string, updates: Partial<PersonaRun>): Promise<PersonaRun>;
  getPersonaRunsByScenarioRun(scenarioRunId: string): Promise<PersonaRun[]>;
  getAllPersonaRuns(): Promise<PersonaRun[]>; // Admin analytics
  
  // Chat Messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByPersonaRun(personaRunId: string): Promise<ChatMessage[]>;
  
  // Active Conversations (진행 중인 대화)
  getActivePersonaRunsWithLastMessage(userId: string): Promise<(PersonaRun & { lastMessage?: ChatMessage; scenarioRun?: ScenarioRun })[]>;
  findExistingPersonaDirectChat(userId: string, personaId: string): Promise<(PersonaRun & { scenarioRun: ScenarioRun; messages: ChatMessage[] }) | null>;
  getAllEmotionStats(scenarioIds?: string[]): Promise<{ emotion: string; count: number }[]>; // Admin analytics - 감정 빈도
  getEmotionStatsByScenario(scenarioIds?: string[]): Promise<{ scenarioId: string; scenarioName: string; emotions: { emotion: string; count: number }[]; totalCount: number }[]>;
  getEmotionStatsByMbti(scenarioIds?: string[]): Promise<{ mbti: string; emotions: { emotion: string; count: number }[]; totalCount: number }[]>;
  getEmotionStatsByDifficulty(scenarioIds?: string[]): Promise<{ difficulty: number; emotions: { emotion: string; count: number }[]; totalCount: number }[]>;
  getEmotionTimelineByPersonaRun(personaRunId: string): Promise<{ turnIndex: number; emotion: string | null; message: string }[]>;

  // User operations - 이메일 기반 인증 시스템
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; password: string; name: string; assignedCategoryId?: string | null }): Promise<User>;
  updateUser(id: string, updates: { name?: string; password?: string; profileImage?: string; tier?: string }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  
  // System Admin operations - 시스템 관리자 전용
  getAllUsers(): Promise<User[]>;
  adminUpdateUser(id: string, updates: { role?: string; tier?: string; isActive?: boolean; assignedCategoryId?: string | null }): Promise<User>;
  
  // Category operations - 카테고리 관리
  createCategory(category: InsertCategory): Promise<Category>;
  getCategory(id: string): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // System Settings operations - 시스템 설정 관리
  getSystemSettings(): Promise<SystemSetting[]>;
  getSystemSettingsByCategory(category: string): Promise<SystemSetting[]>;
  getSystemSetting(category: string, key: string): Promise<SystemSetting | undefined>;
  upsertSystemSetting(setting: { category: string; key: string; value: string; description?: string; updatedBy?: string }): Promise<SystemSetting>;
  deleteSystemSetting(category: string, key: string): Promise<void>;
  
  // AI Usage Logs operations - AI 사용량 추적
  createAiUsageLog(log: InsertAiUsageLog): Promise<AiUsageLog>;
  getAiUsageSummary(startDate: Date, endDate: Date): Promise<AiUsageSummary>;
  getAiUsageByFeature(startDate: Date, endDate: Date): Promise<AiUsageByFeature[]>;
  getAiUsageByModel(startDate: Date, endDate: Date): Promise<AiUsageByModel[]>;
  getAiUsageDaily(startDate: Date, endDate: Date): Promise<AiUsageDaily[]>;
  getAiUsageLogs(startDate: Date, endDate: Date, limit?: number): Promise<AiUsageLog[]>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private feedbacks: Map<string, Feedback>;
  private users: Map<string, User>; // Auth storage

  constructor() {
    this.conversations = new Map();
    this.feedbacks = new Map();
    this.users = new Map(); // Auth storage
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      id,
      mode: insertConversation.mode || "text",
      userId: insertConversation.userId || null,
      scenarioId: insertConversation.scenarioId,
      personaId: insertConversation.personaId || null,
      personaSnapshot: insertConversation.personaSnapshot || null,
      scenarioName: insertConversation.scenarioName,
      messages: insertConversation.messages as any,
      turnCount: insertConversation.turnCount || 0,
      status: insertConversation.status || "active",
      difficulty: insertConversation.difficulty || 2,
      createdAt: new Date(),
      completedAt: null,
      conversationType: insertConversation.conversationType || "single",
      currentPhase: insertConversation.currentPhase || 1,
      totalPhases: insertConversation.totalPhases || 1,
      personaSelections: (insertConversation.personaSelections as PersonaSelection[]) || [],
      strategyChoices: (insertConversation.strategyChoices as StrategyChoice[]) || [],
      sequenceAnalysis: (insertConversation.sequenceAnalysis as SequenceAnalysis) || null,
      strategyReflection: null,
      conversationOrder: null,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const existing = this.conversations.get(id);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    const updated = { ...existing, ...updates };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    this.conversations.delete(id);
    const feedbackToDelete = Array.from(this.feedbacks.entries()).find(
      ([_, feedback]) => feedback.conversationId === id
    );
    if (feedbackToDelete) {
      this.feedbacks.delete(feedbackToDelete[0]);
    }
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const id = randomUUID();
    const feedback: Feedback = {
      id,
      conversationId: insertFeedback.conversationId || null,
      personaRunId: insertFeedback.personaRunId || null,
      overallScore: insertFeedback.overallScore,
      scores: insertFeedback.scores as any,
      detailedFeedback: insertFeedback.detailedFeedback as any,
      createdAt: new Date(),
    };
    this.feedbacks.set(id, feedback);
    return feedback;
  }

  async getFeedbackByConversationId(conversationId: string): Promise<Feedback | undefined> {
    return Array.from(this.feedbacks.values()).find(
      (feedback) => feedback.conversationId === conversationId
    );
  }

  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (conversation) => conversation.userId === userId
    );
  }

  async getAllFeedbacks(): Promise<Feedback[]> {
    return Array.from(this.feedbacks.values());
  }

  async getUserFeedbacks(userId: string): Promise<Feedback[]> {
    const userConversationIds = Array.from(this.conversations.values())
      .filter((conversation) => conversation.userId === userId)
      .map((conversation) => conversation.id);
    
    return Array.from(this.feedbacks.values()).filter(
      (feedback) => feedback.conversationId && userConversationIds.includes(feedback.conversationId)
    );
  }

  // Strategic Selection - Persona Selections
  async addPersonaSelection(conversationId: string, selection: PersonaSelection): Promise<Conversation> {
    const existing = this.conversations.get(conversationId);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    
    const currentSelections = existing.personaSelections || [];
    const updatedSelections = [...currentSelections, selection];
    
    const updated = { ...existing, personaSelections: updatedSelections };
    this.conversations.set(conversationId, updated);
    return updated;
  }

  async getPersonaSelections(conversationId: string): Promise<PersonaSelection[]> {
    const conversation = this.conversations.get(conversationId);
    return conversation?.personaSelections || [];
  }

  // Strategic Selection - Strategy Choices
  async addStrategyChoice(conversationId: string, choice: StrategyChoice): Promise<Conversation> {
    const existing = this.conversations.get(conversationId);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    
    const currentChoices = existing.strategyChoices || [];
    const updatedChoices = [...currentChoices, choice];
    
    const updated = { ...existing, strategyChoices: updatedChoices };
    this.conversations.set(conversationId, updated);
    return updated;
  }

  async getStrategyChoices(conversationId: string): Promise<StrategyChoice[]> {
    const conversation = this.conversations.get(conversationId);
    return conversation?.strategyChoices || [];
  }

  // Strategic Selection - Sequence Analysis
  async saveSequenceAnalysis(conversationId: string, analysis: SequenceAnalysis): Promise<Conversation> {
    const existing = this.conversations.get(conversationId);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    
    const updated = { 
      ...existing, 
      sequenceAnalysis: analysis 
    };
    this.conversations.set(conversationId, updated);
    return updated;
  }

  async getSequenceAnalysis(conversationId: string): Promise<SequenceAnalysis | undefined> {
    const conversation = this.conversations.get(conversationId);
    return conversation?.sequenceAnalysis || undefined;
  }

  // Strategy Reflection
  async saveStrategyReflection(conversationId: string, reflection: string, conversationOrder: string[]): Promise<Conversation> {
    const existing = this.conversations.get(conversationId);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    
    const updated = { 
      ...existing, 
      strategyReflection: reflection,
      conversationOrder: conversationOrder
    };
    this.conversations.set(conversationId, updated);
    return updated;
  }

  // 새로운 데이터 구조: Scenario Runs (stub implementations - MemStorage not used)
  async createScenarioRun(scenarioRun: InsertScenarioRun): Promise<ScenarioRun> {
    throw new Error("MemStorage does not support Scenario Runs");
  }

  async getScenarioRun(id: string): Promise<ScenarioRun | undefined> {
    throw new Error("MemStorage does not support Scenario Runs");
  }

  async updateScenarioRun(id: string, updates: Partial<ScenarioRun>): Promise<ScenarioRun> {
    throw new Error("MemStorage does not support Scenario Runs");
  }

  async getUserScenarioRuns(userId: string): Promise<ScenarioRun[]> {
    throw new Error("MemStorage does not support Scenario Runs");
  }

  async getAllScenarioRuns(): Promise<ScenarioRun[]> {
    throw new Error("MemStorage does not support Scenario Runs");
  }

  async findActiveScenarioRun(userId: string, scenarioId: string): Promise<ScenarioRun | undefined> {
    throw new Error("MemStorage does not support Scenario Runs");
  }

  async getUserScenarioRunsWithPersonaRuns(userId: string): Promise<(ScenarioRun & { personaRuns: PersonaRun[] })[]> {
    throw new Error("MemStorage does not support Scenario Runs");
  }

  async getScenarioRunWithPersonaRuns(id: string): Promise<(ScenarioRun & { personaRuns: PersonaRun[] }) | undefined> {
    throw new Error("MemStorage does not support Scenario Runs");
  }

  async createPersonaRun(personaRun: InsertPersonaRun): Promise<PersonaRun> {
    throw new Error("MemStorage does not support Persona Runs");
  }

  async getPersonaRun(id: string): Promise<PersonaRun | undefined> {
    throw new Error("MemStorage does not support Persona Runs");
  }

  async getPersonaRunByConversationId(conversationId: string): Promise<PersonaRun | undefined> {
    throw new Error("MemStorage does not support Persona Runs");
  }

  async updatePersonaRun(id: string, updates: Partial<PersonaRun>): Promise<PersonaRun> {
    throw new Error("MemStorage does not support Persona Runs");
  }

  async getPersonaRunsByScenarioRun(scenarioRunId: string): Promise<PersonaRun[]> {
    throw new Error("MemStorage does not support Persona Runs");
  }

  async getAllPersonaRuns(): Promise<PersonaRun[]> {
    throw new Error("MemStorage does not support Persona Runs");
  }

  async getActivePersonaRunsWithLastMessage(userId: string): Promise<(PersonaRun & { lastMessage?: ChatMessage; scenarioRun?: ScenarioRun })[]> {
    throw new Error("MemStorage does not support Active Persona Runs");
  }

  async findExistingPersonaDirectChat(userId: string, personaId: string): Promise<(PersonaRun & { scenarioRun: ScenarioRun; messages: ChatMessage[] }) | null> {
    throw new Error("MemStorage does not support findExistingPersonaDirectChat");
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    throw new Error("MemStorage does not support Chat Messages");
  }

  async getChatMessagesByPersonaRun(personaRunId: string): Promise<ChatMessage[]> {
    throw new Error("MemStorage does not support Chat Messages");
  }

  async getAllEmotionStats(scenarioIds?: string[]): Promise<{ emotion: string; count: number }[]> {
    throw new Error("MemStorage does not support emotion stats");
  }

  async getEmotionStatsByScenario(scenarioIds?: string[]): Promise<{ scenarioId: string; scenarioName: string; emotions: { emotion: string; count: number }[]; totalCount: number }[]> {
    throw new Error("MemStorage does not support emotion stats by scenario");
  }

  async getEmotionStatsByMbti(scenarioIds?: string[]): Promise<{ mbti: string; emotions: { emotion: string; count: number }[]; totalCount: number }[]> {
    throw new Error("MemStorage does not support emotion stats by MBTI");
  }

  async getEmotionStatsByDifficulty(scenarioIds?: string[]): Promise<{ difficulty: number; emotions: { emotion: string; count: number }[]; totalCount: number }[]> {
    throw new Error("MemStorage does not support emotion stats by difficulty");
  }

  async getEmotionTimelineByPersonaRun(personaRunId: string): Promise<{ turnIndex: number; emotion: string | null; message: string }[]> {
    throw new Error("MemStorage does not support emotion timeline");
  }

  // User operations - 이메일 기반 인증 시스템
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(userData: { email: string; password: string; name: string; assignedCategoryId?: string | null }): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: 'user',
      profileImage: null,
      tier: 'bronze',
      isActive: true,
      lastLoginAt: null,
      assignedCategoryId: userData.assignedCategoryId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: { name?: string; password?: string; profileImage?: string; tier?: string }): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...(updates.name && { name: updates.name }),
      ...(updates.password && { password: updates.password }),
      ...(updates.profileImage !== undefined && { profileImage: updates.profileImage }),
      ...(updates.tier && { tier: updates.tier }),
      updatedAt: new Date(),
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id as string);
    
    const user: User = {
      id: userData.id as string,
      email: userData.email || '',
      password: existingUser?.password || '',
      name: userData.name || '',
      role: existingUser?.role || 'user',
      profileImage: existingUser?.profileImage || null,
      tier: existingUser?.tier || 'bronze',
      isActive: existingUser?.isActive ?? true,
      lastLoginAt: existingUser?.lastLoginAt || null,
      assignedCategoryId: existingUser?.assignedCategoryId || null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(user.id, user);
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLoginAt = new Date();
      this.users.set(id, user);
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async adminUpdateUser(id: string, updates: { role?: string; tier?: string; isActive?: boolean; assignedCategoryId?: string | null }): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Category operations - not implemented for MemStorage
  async createCategory(_category: InsertCategory): Promise<Category> {
    throw new Error("Not implemented in MemStorage");
  }
  async getCategory(_id: string): Promise<Category | undefined> {
    throw new Error("Not implemented in MemStorage");
  }
  async getAllCategories(): Promise<Category[]> {
    throw new Error("Not implemented in MemStorage");
  }
  async updateCategory(_id: string, _updates: Partial<InsertCategory>): Promise<Category> {
    throw new Error("Not implemented in MemStorage");
  }
  async deleteCategory(_id: string): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }
  
  // System Settings operations - not implemented for MemStorage
  async getSystemSettings(): Promise<SystemSetting[]> {
    throw new Error("Not implemented in MemStorage");
  }
  async getSystemSettingsByCategory(_category: string): Promise<SystemSetting[]> {
    throw new Error("Not implemented in MemStorage");
  }
  async getSystemSetting(_category: string, _key: string): Promise<SystemSetting | undefined> {
    throw new Error("Not implemented in MemStorage");
  }
  async upsertSystemSetting(_setting: { category: string; key: string; value: string; description?: string; updatedBy?: string }): Promise<SystemSetting> {
    throw new Error("Not implemented in MemStorage");
  }
  async deleteSystemSetting(_category: string, _key: string): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }
  
  // AI Usage Logs - MemStorage stubs
  async createAiUsageLog(_log: InsertAiUsageLog): Promise<AiUsageLog> {
    throw new Error("Not implemented in MemStorage");
  }
  
  async getAiUsageSummary(_startDate: Date, _endDate: Date): Promise<AiUsageSummary> {
    return { totalTokens: 0, promptTokens: 0, completionTokens: 0, totalCostUsd: 0, requestCount: 0 };
  }
  
  async getAiUsageByFeature(_startDate: Date, _endDate: Date): Promise<AiUsageByFeature[]> {
    return [];
  }
  
  async getAiUsageByModel(_startDate: Date, _endDate: Date): Promise<AiUsageByModel[]> {
    return [];
  }
  
  async getAiUsageDaily(_startDate: Date, _endDate: Date): Promise<AiUsageDaily[]> {
    return [];
  }
  
  async getAiUsageLogs(_startDate: Date, _endDate: Date, _limit?: number): Promise<AiUsageLog[]> {
    return [];
  }
}

export class PostgreSQLStorage implements IStorage {
  // Conversations
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(insertConversation as any).returning();
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const [conversation] = await db.update(conversations).set(updates).where(eq(conversations.id, id)).returning();
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    return conversation;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(feedbacks).where(eq(feedbacks.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getAllConversations(): Promise<Conversation[]> {
    try {
      const result = await db.select().from(conversations);
      return result ?? [];
    } catch (error) {
      console.log("getAllConversations error:", error);
      return [];
    }
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  // Feedback
  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [feedback] = await db.insert(feedbacks).values(insertFeedback as any).returning();
    return feedback;
  }

  async getFeedbackByConversationId(conversationId: string): Promise<Feedback | undefined> {
    // ✨ 새 구조: personaRunId로 조회 (conversationId가 실제로는 personaRunId)
    // 먼저 personaRunId로 조회
    const [feedbackByPersonaRun] = await db.select().from(feedbacks).where(eq(feedbacks.personaRunId, conversationId));
    if (feedbackByPersonaRun) {
      return feedbackByPersonaRun;
    }
    
    // 레거시 지원: conversationId로도 조회
    const [feedbackByConversation] = await db.select().from(feedbacks).where(eq(feedbacks.conversationId, conversationId));
    return feedbackByConversation;
  }

  async getAllFeedbacks(): Promise<Feedback[]> {
    return await db.select().from(feedbacks);
  }

  async getUserFeedbacks(userId: string): Promise<Feedback[]> {
    // ✨ 새 구조: personaRunId를 통해 userId 필터링
    // 1) 유저의 모든 scenarioRun ID 가져오기
    const userScenarioRuns = await db.select().from(scenarioRuns).where(eq(scenarioRuns.userId, userId));
    
    if (userScenarioRuns.length === 0) {
      return [];
    }
    
    const scenarioRunIds = userScenarioRuns.map(sr => sr.id);
    
    // 2) 해당 scenarioRun들에 속한 모든 personaRun ID 가져오기
    const userPersonaRuns = await db
      .select()
      .from(personaRuns)
      .where(inArray(personaRuns.scenarioRunId, scenarioRunIds));
    
    const personaRunIds = userPersonaRuns.map(pr => pr.id);
    
    // 3) personaRunId로 피드백 조회 (새 구조)
    const newStructureFeedbacks = personaRunIds.length > 0 
      ? await db.select().from(feedbacks).where(inArray(feedbacks.personaRunId, personaRunIds))
      : [];
    
    // 4) conversationId로 피드백 조회 (레거시 지원)
    const legacyResults = await db
      .select()
      .from(feedbacks)
      .innerJoin(conversations, eq(feedbacks.conversationId, conversations.id))
      .where(eq(conversations.userId, userId));
    
    const legacyFeedbacks = legacyResults.map(r => r.feedbacks);
    
    // 5) 두 결과 병합하고 중복 제거 (ID 기준)
    const allFeedbacks = [...newStructureFeedbacks, ...legacyFeedbacks];
    const uniqueFeedbacks = Array.from(
      new Map(allFeedbacks.map(f => [f.id, f])).values()
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`✅ UserFeedbacks for ${userId}: ${uniqueFeedbacks.length} feedbacks from ${newStructureFeedbacks.length} new + ${legacyFeedbacks.length} legacy`);
    return uniqueFeedbacks;
  }

  // Strategic Selection - Persona Selections
  async addPersonaSelection(conversationId: string, selection: PersonaSelection): Promise<Conversation> {
    const existing = await this.getConversation(conversationId);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    
    const currentSelections = existing.personaSelections || [];
    const updatedSelections = [...currentSelections, selection];
    
    return await this.updateConversation(conversationId, { personaSelections: updatedSelections });
  }

  async getPersonaSelections(conversationId: string): Promise<PersonaSelection[]> {
    const conversation = await this.getConversation(conversationId);
    return conversation?.personaSelections || [];
  }

  // Strategic Selection - Strategy Choices
  async addStrategyChoice(conversationId: string, choice: StrategyChoice): Promise<Conversation> {
    const existing = await this.getConversation(conversationId);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    
    const currentChoices = existing.strategyChoices || [];
    const updatedChoices = [...currentChoices, choice];
    
    return await this.updateConversation(conversationId, { strategyChoices: updatedChoices });
  }

  async getStrategyChoices(conversationId: string): Promise<StrategyChoice[]> {
    const conversation = await this.getConversation(conversationId);
    return conversation?.strategyChoices || [];
  }

  // Strategic Selection - Sequence Analysis
  async saveSequenceAnalysis(conversationId: string, analysis: SequenceAnalysis): Promise<Conversation> {
    return await this.updateConversation(conversationId, { sequenceAnalysis: analysis });
  }

  async getSequenceAnalysis(conversationId: string): Promise<SequenceAnalysis | undefined> {
    const conversation = await this.getConversation(conversationId);
    return conversation?.sequenceAnalysis || undefined;
  }

  // Strategy Reflection
  async saveStrategyReflection(conversationId: string, reflection: string, conversationOrder: string[]): Promise<Conversation> {
    return await this.updateConversation(conversationId, { 
      strategyReflection: reflection,
      conversationOrder: conversationOrder
    });
  }

  // User operations - 이메일 기반 인증 시스템
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { email: string; password: string; name: string; assignedCategoryId?: string | null }): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, updates: { 
    name?: string; 
    password?: string; 
    profileImage?: string; 
    tier?: string;
    username?: string;
    displayName?: string;
    bio?: string;
    subscriptionPlan?: string;
    subscriptionBillingCycle?: string;
    subscriptionExpiresAt?: Date | null;
    mutedWords?: string[];
    preferences?: any;
  }): Promise<User> {
    const updateData: any = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.password !== undefined) updateData.password = updates.password;
    if (updates.profileImage !== undefined) updateData.profileImage = updates.profileImage;
    if (updates.tier !== undefined) updateData.tier = updates.tier;
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.subscriptionPlan !== undefined) updateData.subscriptionPlan = updates.subscriptionPlan;
    if (updates.subscriptionBillingCycle !== undefined) updateData.subscriptionBillingCycle = updates.subscriptionBillingCycle;
    if (updates.subscriptionExpiresAt !== undefined) updateData.subscriptionExpiresAt = updates.subscriptionExpiresAt;
    if (updates.mutedWords !== undefined) updateData.mutedWords = updates.mutedWords;
    if (updates.preferences !== undefined) updateData.preferences = updates.preferences;
    
    // 2-step approach: UPDATE then SELECT (workaround for Neon HTTP driver RETURNING issue)
    await db.update(users).set(updateData).where(eq(users.id, id));
    
    // Fetch the updated user
    const user = await this.getUser(id);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      const existing = await db.select({ id: users.id }).from(users).where(
        and(
          eq(users.username, username),
          isNotNull(users.username)
        )
      );
      if (!existing || existing.length === 0) return true;
      if (excludeUserId && existing[0].id === excludeUserId) return true;
      return false;
    } catch (error) {
      console.error("isUsernameAvailable error:", error);
      return true;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        email: userData.email,
        name: userData.name,
        updatedAt: new Date(),
      }
    }).returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async adminUpdateUser(id: string, updates: { role?: string; tier?: string; isActive?: boolean; assignedCategoryId?: string | null }): Promise<User> {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  // Category operations - 카테고리 관리
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getAllCategories(): Promise<Category[]> {
    try {
      const result = await db.select().from(categories).orderBy(asc(categories.order));
      return result || [];
    } catch (error) {
      console.error('getAllCategories error:', error);
      return [];
    }
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db.update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    if (!category) throw new Error("Category not found");
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // 새로운 데이터 구조: Scenario Runs
  async createScenarioRun(insertScenarioRun: InsertScenarioRun): Promise<ScenarioRun> {
    // UUID를 미리 생성해서 INSERT 후 SELECT로 조회 가능하도록 함
    const id = randomUUID();
    const insertData = { ...insertScenarioRun, id } as any;
    
    // INSERT 시도 (재시도 포함)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const rows = await db.insert(scenarioRuns).values(insertData).returning();
        if (rows && rows.length > 0 && rows[0]) {
          return rows[0];
        }
      } catch (error: any) {
        // Neon null 오류는 INSERT는 성공했지만 결과 반환이 실패한 것일 수 있음
        if (error?.message?.includes('Cannot read properties of null')) {
          console.log(`createScenarioRun: Neon null error on attempt ${attempt + 1}, checking if row was inserted...`);
        } else if (attempt === 2) {
          throw error;
        }
      }
      
      // INSERT 후 결과가 없으면 SELECT로 조회 시도
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        const [existing] = await db.select().from(scenarioRuns).where(eq(scenarioRuns.id, id));
        if (existing) {
          console.log(`createScenarioRun: Found row via SELECT after INSERT`);
          return existing;
        }
      } catch (selectError) {
        console.error('createScenarioRun: SELECT fallback failed:', selectError);
      }
    }
    
    throw new Error('createScenarioRun failed after all retries');
  }

  async getScenarioRun(id: string): Promise<ScenarioRun | undefined> {
    const [scenarioRun] = await db.select().from(scenarioRuns).where(eq(scenarioRuns.id, id));
    return scenarioRun;
  }

  async updateScenarioRun(id: string, updates: Partial<ScenarioRun>): Promise<ScenarioRun> {
    const [scenarioRun] = await db.update(scenarioRuns).set(updates).where(eq(scenarioRuns.id, id)).returning();
    if (!scenarioRun) {
      throw new Error("ScenarioRun not found");
    }
    return scenarioRun;
  }

  async getUserScenarioRuns(userId: string): Promise<ScenarioRun[]> {
    return await db.select().from(scenarioRuns).where(eq(scenarioRuns.userId, userId)).orderBy(desc(scenarioRuns.startedAt));
  }

  async getAllScenarioRuns(): Promise<ScenarioRun[]> {
    return await db.select().from(scenarioRuns).orderBy(desc(scenarioRuns.startedAt));
  }

  async findActiveScenarioRun(userId: string, scenarioId: string): Promise<ScenarioRun | undefined> {
    const [activeRun] = await db
      .select()
      .from(scenarioRuns)
      .where(and(
        eq(scenarioRuns.userId, userId),
        eq(scenarioRuns.scenarioId, scenarioId),
        eq(scenarioRuns.status, 'active')
      ))
      .orderBy(desc(scenarioRuns.startedAt))
      .limit(1);
    return activeRun;
  }

  async getUserScenarioRunsWithPersonaRuns(userId: string): Promise<(ScenarioRun & { personaRuns: PersonaRun[] })[]> {
    // 1) 유저의 모든 시나리오 실행 가져오기 (리스트의 "줄"이 되는 단위)
    const userScenarioRuns = await db
      .select()
      .from(scenarioRuns)
      .where(eq(scenarioRuns.userId, userId))
      .orderBy(desc(scenarioRuns.startedAt));

    if (userScenarioRuns.length === 0) {
      return [];
    }

    const scenarioRunIds = userScenarioRuns.map((sr) => sr.id);

    // 2) ✨ 한 번에 해당 시나리오 실행들에 속한 personaRuns 전체를 가져오기 (N+1 문제 해결)
    const allPersonaRuns = await db
      .select()
      .from(personaRuns)
      .where(inArray(personaRuns.scenarioRunId, scenarioRunIds))
      .orderBy(asc(personaRuns.phase));

    // 3) scenarioRunId 별로 personaRuns 그룹핑
    const personaRunsByScenarioId = new Map<string, PersonaRun[]>();

    for (const pr of allPersonaRuns) {
      const list = personaRunsByScenarioId.get(pr.scenarioRunId) ?? [];
      list.push(pr);
      personaRunsByScenarioId.set(pr.scenarioRunId, list);
    }

    // 4) 각 ScenarioRun에 personaRuns 배열 붙여서 반환
    return userScenarioRuns.map((sr) => ({
      ...sr,
      personaRuns: personaRunsByScenarioId.get(sr.id) ?? [],
    }));
  }

  async getScenarioRunWithPersonaRuns(id: string): Promise<(ScenarioRun & { personaRuns: PersonaRun[] }) | undefined> {
    const scenarioRun = await this.getScenarioRun(id);
    if (!scenarioRun) {
      return undefined;
    }
    const personas = await this.getPersonaRunsByScenarioRun(id);
    return { ...scenarioRun, personaRuns: personas };
  }

  // Persona Runs
  async createPersonaRun(insertPersonaRun: InsertPersonaRun): Promise<PersonaRun> {
    // UUID를 미리 생성하여 INSERT 후 SELECT 폴백이 가능하도록 함
    const personaRunId = crypto.randomUUID();
    
    const result = await withRetry(async () => {
      const rows = await db.insert(personaRuns).values({
        ...insertPersonaRun,
        id: personaRunId
      }).returning();
      
      // Neon HTTP 드라이버의 간헐적 null 반환 문제 처리
      if (!rows || rows.length === 0) {
        console.log('createPersonaRun: INSERT returned empty, trying SELECT fallback');
        // INSERT는 성공했지만 returning이 실패한 경우를 위한 폴백
        const [existingRow] = await db.select().from(personaRuns).where(eq(personaRuns.id, personaRunId));
        if (existingRow) {
          console.log('createPersonaRun: Found row via SELECT after INSERT');
          return existingRow;
        }
        throw new Error('createPersonaRun returned empty result and SELECT fallback failed');
      }
      return rows[0];
    }, 3);
    return result;
  }

  async getPersonaRun(id: string): Promise<PersonaRun | undefined> {
    try {
      const result = await withRetry(async () => {
        const [personaRun] = await db.select().from(personaRuns).where(eq(personaRuns.id, id));
        return personaRun;
      }, 3, 100);
      return result;
    } catch (error) {
      console.error('Error in getPersonaRun:', error);
      return undefined;
    }
  }

  async getPersonaRunByConversationId(conversationId: string): Promise<PersonaRun | undefined> {
    try {
      const result = await withRetry(async () => {
        return await db.select().from(personaRuns).where(eq(personaRuns.conversationId, conversationId));
      });
      if (!result || !Array.isArray(result) || result.length === 0) {
        return undefined;
      }
      return result[0];
    } catch (error) {
      console.error('Error in getPersonaRunByConversationId:', error);
      return undefined;
    }
  }

  async updatePersonaRun(id: string, updates: Partial<PersonaRun>): Promise<PersonaRun> {
    // Neon HTTP 드라이버 재시도 로직 적용
    const result = await withRetry(async () => {
      const [personaRun] = await db.update(personaRuns).set(updates).where(eq(personaRuns.id, id)).returning();
      return personaRun;
    }, 3, 100);
    
    // returning()이 실패해도 업데이트는 성공했을 수 있으므로 다시 조회
    if (!result) {
      const existing = await this.getPersonaRun(id);
      if (existing) {
        return existing;
      }
      throw new Error("PersonaRun not found");
    }
    return result;
  }

  async getPersonaRunsByScenarioRun(scenarioRunId: string): Promise<PersonaRun[]> {
    return await db.select().from(personaRuns).where(eq(personaRuns.scenarioRunId, scenarioRunId)).orderBy(asc(personaRuns.phase));
  }

  async getAllPersonaRuns(): Promise<PersonaRun[]> {
    return await db.select().from(personaRuns).orderBy(desc(personaRuns.startedAt));
  }

  async getActivePersonaRunsWithLastMessage(userId: string): Promise<(PersonaRun & { lastMessage?: ChatMessage; scenarioRun?: ScenarioRun })[]> {
    try {
      // 1. 해당 유저의 scenario runs 먼저 가져오기 (단순 쿼리로 Neon 안정성 확보)
      let userScenarioRuns: ScenarioRun[] = [];
      try {
        const result = await db
          .select()
          .from(scenarioRuns)
          .where(eq(scenarioRuns.userId, userId));
        userScenarioRuns = result || [];
      } catch (queryError) {
        console.error('Query error in getActivePersonaRunsWithLastMessage (step 1 - scenario runs):', queryError);
        return [];
      }

      if (userScenarioRuns.length === 0) {
        return [];
      }

      const scenarioRunIds = userScenarioRuns.map(sr => sr.id);
      const scenarioRunMap = new Map(userScenarioRuns.map(sr => [sr.id, sr]));

      // 2. 닫히지 않은 persona runs 가져오기 (closedAt IS NULL - 상태 무관)
      let activePersonaRuns: PersonaRun[] = [];
      
      for (const scenarioRunId of scenarioRunIds) {
        try {
          const result = await db
            .select()
            .from(personaRuns)
            .where(and(
              eq(personaRuns.scenarioRunId, scenarioRunId),
              // ✨ 사용자가 명시적으로 닫지 않은 대화만 (closedAt IS NULL)
              isNull(personaRuns.closedAt)
            ));
          if (result && Array.isArray(result)) {
            activePersonaRuns.push(...result);
          }
        } catch (queryError: any) {
          // Neon null 오류는 무시하고 계속 진행
          if (!queryError?.message?.includes('Cannot read properties of null')) {
            console.error('Query error in getActivePersonaRunsWithLastMessage (step 2):', queryError);
          }
        }
      }
      // lastActivityAt으로 정렬 (카카오톡 스타일 - 최신 메시지 순)
      activePersonaRuns.sort((a, b) => {
        const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 
                      (a.actualStartedAt ? new Date(a.actualStartedAt).getTime() : 0);
        const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 
                      (b.actualStartedAt ? new Date(b.actualStartedAt).getTime() : 0);
        return bTime - aTime;
      });

      if (activePersonaRuns.length === 0) {
        return [];
      }

      // 3. 모든 active persona run IDs 수집
      const personaRunIds = activePersonaRuns.map(pr => pr.id).filter(id => id != null) as string[];

      if (personaRunIds.length === 0) {
        return [];
      }

      // 4. 각 persona run의 마지막 메시지를 한 번의 쿼리로 가져오기
      let lastMessagesRaw: ChatMessage[] = [];
      try {
        const result = await db
          .select()
          .from(chatMessages)
          .where(inArray(chatMessages.personaRunId, personaRunIds))
          .orderBy(desc(chatMessages.turnIndex));
        lastMessagesRaw = result || [];
      } catch (queryError) {
        console.error('Query error in getActivePersonaRunsWithLastMessage (step 4 - messages):', queryError);
        // 메시지 로드 실패해도 대화 목록은 반환
      }

      // 5. personaRunId별로 가장 최신 메시지만 추출
      const lastMessageMap = new Map<string, ChatMessage>();
      if (lastMessagesRaw && Array.isArray(lastMessagesRaw)) {
        for (const msg of lastMessagesRaw) {
          if (msg && msg.personaRunId && !lastMessageMap.has(msg.personaRunId)) {
            lastMessageMap.set(msg.personaRunId, msg);
          }
        }
      }

      // 6. 결과 조합
      const allResults = activePersonaRuns.map(pr => ({
        ...pr,
        lastMessage: lastMessageMap.get(pr.id) || undefined,
        scenarioRun: scenarioRunMap.get(pr.scenarioRunId)
      }));
      
      // 7. 동일 페르소나의 대화방 중복 제거 - 가장 최신 것만 유지
      const seenPersonaIds = new Set<string>();
      const uniqueResults = allResults.filter(pr => {
        if (seenPersonaIds.has(pr.personaId)) {
          return false; // 이미 같은 페르소나 대화가 있으면 스킵
        }
        seenPersonaIds.add(pr.personaId);
        return true;
      });
      
      return uniqueResults;
    } catch (error) {
      console.error('Error in getActivePersonaRunsWithLastMessage:', error);
      return [];
    }
  }

  async findExistingPersonaDirectChat(userId: string, personaId: string): Promise<(PersonaRun & { scenarioRun: ScenarioRun; messages: ChatMessage[] }) | null> {
    try {
      // 1. 해당 유저의 persona_direct 대화 중 같은 personaId를 가진 활성 대화 찾기
      const userScenarioRuns = await db
        .select()
        .from(scenarioRuns)
        .where(and(
          eq(scenarioRuns.userId, userId),
          eq(scenarioRuns.conversationType, 'persona_direct'),
          eq(scenarioRuns.status, 'active')
        ))
        .orderBy(desc(scenarioRuns.startedAt));

      if (!userScenarioRuns || userScenarioRuns.length === 0) {
        return null;
      }

      // 2. 해당 scenarioRuns에서 personaId가 일치하는 personaRun 찾기
      for (const sr of userScenarioRuns) {
        const personaRunsResult = await db
          .select()
          .from(personaRuns)
          .where(and(
            eq(personaRuns.scenarioRunId, sr.id),
            eq(personaRuns.personaId, personaId),
            eq(personaRuns.status, 'active')
          ))
          .limit(1);

        if (personaRunsResult && personaRunsResult.length > 0) {
          const existingPersonaRun = personaRunsResult[0];
          
          // 3. 해당 대화의 메시지 가져오기
          const messages = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.personaRunId, existingPersonaRun.id))
            .orderBy(asc(chatMessages.turnIndex));

          return {
            ...existingPersonaRun,
            scenarioRun: sr,
            messages: messages || []
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error in findExistingPersonaDirectChat:', error);
      return null;
    }
  }

  // Chat Messages
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(insertMessage).returning();
    return message;
  }

  async getChatMessagesByPersonaRun(personaRunId: string): Promise<ChatMessage[]> {
    try {
      const result = await withRetry(async () => {
        try {
          const messages = await db.select().from(chatMessages).where(eq(chatMessages.personaRunId, personaRunId)).orderBy(asc(chatMessages.turnIndex));
          if (!messages || !Array.isArray(messages)) {
            console.log('getChatMessagesByPersonaRun: Neon returned null/invalid, returning empty array');
            return [];
          }
          return messages;
        } catch (queryError: any) {
          if (queryError?.message?.includes('Cannot read properties of null')) {
            console.log('getChatMessagesByPersonaRun: Neon null response, retrying...');
            throw queryError;
          }
          throw queryError;
        }
      }, 5, 200);
      return result || [];
    } catch (error) {
      console.error('getChatMessagesByPersonaRun failed:', error);
      return [];
    }
  }

  async getAllEmotionStats(scenarioIds?: string[]): Promise<{ emotion: string; count: number }[]> {
    // scenarioIds가 있으면 해당 시나리오만 필터링
    if (scenarioIds && scenarioIds.length > 0) {
      const result = await db.select({
        emotion: chatMessages.emotion,
        count: sql<number>`count(*)::int`
      })
      .from(chatMessages)
      .innerJoin(personaRuns, eq(chatMessages.personaRunId, personaRuns.id))
      .innerJoin(scenarioRuns, eq(personaRuns.scenarioRunId, scenarioRuns.id))
      .where(and(
        eq(chatMessages.sender, 'ai'),
        isNotNull(chatMessages.emotion),
        inArray(scenarioRuns.scenarioId, scenarioIds)
      ))
      .groupBy(chatMessages.emotion)
      .orderBy(desc(sql`count(*)`));
      
      return result.filter(r => r.emotion !== null) as { emotion: string; count: number }[];
    }
    
    // scenarioIds가 없으면 전체 조회
    const result = await db.select({
      emotion: chatMessages.emotion,
      count: sql<number>`count(*)::int`
    })
    .from(chatMessages)
    .where(and(
      eq(chatMessages.sender, 'ai'),
      isNotNull(chatMessages.emotion)
    ))
    .groupBy(chatMessages.emotion)
    .orderBy(desc(sql`count(*)`));
    
    return result.filter(r => r.emotion !== null) as { emotion: string; count: number }[];
  }

  async getEmotionStatsByScenario(scenarioIds?: string[]): Promise<{ scenarioId: string; scenarioName: string; emotions: { emotion: string; count: number }[]; totalCount: number }[]> {
    // 시나리오별 감정 통계: chat_messages -> persona_runs -> scenario_runs 조인
    const whereConditions = [
      eq(chatMessages.sender, 'ai'),
      isNotNull(chatMessages.emotion)
    ];
    
    if (scenarioIds && scenarioIds.length > 0) {
      whereConditions.push(inArray(scenarioRuns.scenarioId, scenarioIds));
    }
    
    const result = await db.select({
      scenarioId: scenarioRuns.scenarioId,
      scenarioName: scenarioRuns.scenarioName,
      emotion: chatMessages.emotion,
      count: sql<number>`count(*)::int`
    })
    .from(chatMessages)
    .innerJoin(personaRuns, eq(chatMessages.personaRunId, personaRuns.id))
    .innerJoin(scenarioRuns, eq(personaRuns.scenarioRunId, scenarioRuns.id))
    .where(and(...whereConditions))
    .groupBy(scenarioRuns.scenarioId, scenarioRuns.scenarioName, chatMessages.emotion)
    .orderBy(scenarioRuns.scenarioId, desc(sql`count(*)`));
    
    // 시나리오별로 그룹화
    const scenarioMap = new Map<string, { scenarioId: string; scenarioName: string; emotions: { emotion: string; count: number }[]; totalCount: number }>();
    
    for (const row of result) {
      if (!row.emotion || !row.scenarioId) continue;
      
      if (!scenarioMap.has(row.scenarioId)) {
        scenarioMap.set(row.scenarioId, {
          scenarioId: row.scenarioId,
          scenarioName: row.scenarioName,
          emotions: [],
          totalCount: 0
        });
      }
      
      const scenario = scenarioMap.get(row.scenarioId)!
      scenario.emotions.push({ emotion: row.emotion, count: row.count });
      scenario.totalCount += row.count;
    }
    
    return Array.from(scenarioMap.values()).sort((a, b) => b.totalCount - a.totalCount);
  }

  async getEmotionStatsByMbti(scenarioIds?: string[]): Promise<{ mbti: string; emotions: { emotion: string; count: number }[]; totalCount: number }[]> {
    // MBTI별 감정 통계: chat_messages -> persona_runs -> scenario_runs 조인
    const whereConditions = [
      eq(chatMessages.sender, 'ai'),
      isNotNull(chatMessages.emotion),
      isNotNull(personaRuns.mbtiType)
    ];
    
    if (scenarioIds && scenarioIds.length > 0) {
      whereConditions.push(inArray(scenarioRuns.scenarioId, scenarioIds));
    }
    
    const result = await db.select({
      mbti: personaRuns.mbtiType,
      emotion: chatMessages.emotion,
      count: sql<number>`count(*)::int`
    })
    .from(chatMessages)
    .innerJoin(personaRuns, eq(chatMessages.personaRunId, personaRuns.id))
    .innerJoin(scenarioRuns, eq(personaRuns.scenarioRunId, scenarioRuns.id))
    .where(and(...whereConditions))
    .groupBy(personaRuns.mbtiType, chatMessages.emotion)
    .orderBy(personaRuns.mbtiType, desc(sql`count(*)`));
    
    // MBTI별로 그룹화
    const mbtiMap = new Map<string, { mbti: string; emotions: { emotion: string; count: number }[]; totalCount: number }>();
    
    for (const row of result) {
      if (!row.emotion || !row.mbti) continue;
      
      if (!mbtiMap.has(row.mbti)) {
        mbtiMap.set(row.mbti, {
          mbti: row.mbti,
          emotions: [],
          totalCount: 0
        });
      }
      
      const mbtiData = mbtiMap.get(row.mbti)!;
      mbtiData.emotions.push({ emotion: row.emotion, count: row.count });
      mbtiData.totalCount += row.count;
    }
    
    return Array.from(mbtiMap.values()).sort((a, b) => b.totalCount - a.totalCount);
  }

  async getEmotionStatsByDifficulty(scenarioIds?: string[]): Promise<{ difficulty: number; emotions: { emotion: string; count: number }[]; totalCount: number }[]> {
    // 난이도별 감정 통계: chat_messages -> persona_runs -> scenario_runs 조인
    const whereConditions = [
      eq(chatMessages.sender, 'ai'),
      isNotNull(chatMessages.emotion),
      isNotNull(personaRuns.difficulty)
    ];
    
    if (scenarioIds && scenarioIds.length > 0) {
      whereConditions.push(inArray(scenarioRuns.scenarioId, scenarioIds));
    }
    
    const result = await db.select({
      difficulty: personaRuns.difficulty,
      emotion: chatMessages.emotion,
      count: sql<number>`count(*)::int`
    })
    .from(chatMessages)
    .innerJoin(personaRuns, eq(chatMessages.personaRunId, personaRuns.id))
    .innerJoin(scenarioRuns, eq(personaRuns.scenarioRunId, scenarioRuns.id))
    .where(and(...whereConditions))
    .groupBy(personaRuns.difficulty, chatMessages.emotion)
    .orderBy(personaRuns.difficulty, desc(sql`count(*)`));
    
    // 난이도별로 그룹화
    const difficultyMap = new Map<number, { difficulty: number; emotions: { emotion: string; count: number }[]; totalCount: number }>();
    
    for (const row of result) {
      if (!row.emotion || row.difficulty === null) continue;
      
      if (!difficultyMap.has(row.difficulty)) {
        difficultyMap.set(row.difficulty, {
          difficulty: row.difficulty,
          emotions: [],
          totalCount: 0
        });
      }
      
      const difficultyData = difficultyMap.get(row.difficulty)!;
      difficultyData.emotions.push({ emotion: row.emotion, count: row.count });
      difficultyData.totalCount += row.count;
    }
    
    // 난이도 순서대로 정렬 (1, 2, 3, 4)
    return Array.from(difficultyMap.values()).sort((a, b) => a.difficulty - b.difficulty);
  }

  async getEmotionTimelineByPersonaRun(personaRunId: string): Promise<{ turnIndex: number; emotion: string | null; message: string }[]> {
    // 특정 대화의 감정 타임라인 (AI 메시지만)
    const result = await db.select({
      turnIndex: chatMessages.turnIndex,
      emotion: chatMessages.emotion,
      message: chatMessages.message
    })
    .from(chatMessages)
    .where(and(
      eq(chatMessages.personaRunId, personaRunId),
      eq(chatMessages.sender, 'ai')
    ))
    .orderBy(asc(chatMessages.turnIndex));
    
    return result;
  }

  async deleteScenarioRun(id: string): Promise<void> {
    await db.delete(scenarioRuns).where(eq(scenarioRuns.id, id));
  }

  // System Settings
  async getSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).orderBy(asc(systemSettings.category), asc(systemSettings.key));
  }

  async getSystemSettingsByCategory(category: string): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).where(eq(systemSettings.category, category)).orderBy(asc(systemSettings.key));
  }

  async getSystemSetting(category: string, key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings)
      .where(and(eq(systemSettings.category, category), eq(systemSettings.key, key)));
    return setting;
  }

  async upsertSystemSetting(setting: { category: string; key: string; value: string; description?: string; updatedBy?: string }): Promise<SystemSetting> {
    // Check if setting exists
    const existing = await this.getSystemSetting(setting.category, setting.key);
    
    if (existing) {
      // Update existing
      const [updated] = await db.update(systemSettings)
        .set({ 
          value: setting.value, 
          description: setting.description,
          updatedBy: setting.updatedBy,
          updatedAt: new Date()
        })
        .where(and(eq(systemSettings.category, setting.category), eq(systemSettings.key, setting.key)))
        .returning();
      return updated;
    } else {
      // Insert new
      const [inserted] = await db.insert(systemSettings).values({
        category: setting.category,
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedBy: setting.updatedBy,
      }).returning();
      return inserted;
    }
  }

  async deleteSystemSetting(category: string, key: string): Promise<void> {
    await db.delete(systemSettings)
      .where(and(eq(systemSettings.category, category), eq(systemSettings.key, key)));
  }
  
  // AI Usage Logs
  async createAiUsageLog(log: InsertAiUsageLog): Promise<AiUsageLog> {
    const [inserted] = await db.insert(aiUsageLogs).values(log as any).returning();
    return inserted;
  }
  
  async getAiUsageSummary(startDate: Date, endDate: Date): Promise<AiUsageSummary> {
    const result = await db.select({
      totalTokens: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)::integer`,
      promptTokens: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.promptTokens}), 0)::integer`,
      completionTokens: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.completionTokens}), 0)::integer`,
      totalCostUsd: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.totalCostUsd}), 0)::float`,
      requestCount: sqlBuilder<number>`COUNT(*)::integer`,
    })
    .from(aiUsageLogs)
    .where(and(
      gte(aiUsageLogs.occurredAt, startDate),
      lte(aiUsageLogs.occurredAt, endDate)
    ));
    
    return result[0] || { totalTokens: 0, promptTokens: 0, completionTokens: 0, totalCostUsd: 0, requestCount: 0 };
  }
  
  async getAiUsageByFeature(startDate: Date, endDate: Date): Promise<AiUsageByFeature[]> {
    const result = await db.select({
      feature: aiUsageLogs.feature,
      totalTokens: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)::integer`,
      totalCostUsd: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.totalCostUsd}), 0)::float`,
      requestCount: sqlBuilder<number>`COUNT(*)::integer`,
    })
    .from(aiUsageLogs)
    .where(and(
      gte(aiUsageLogs.occurredAt, startDate),
      lte(aiUsageLogs.occurredAt, endDate)
    ))
    .groupBy(aiUsageLogs.feature)
    .orderBy(desc(sqlBuilder`SUM(${aiUsageLogs.totalTokens})`));
    
    return result;
  }
  
  async getAiUsageByModel(startDate: Date, endDate: Date): Promise<AiUsageByModel[]> {
    const result = await db.select({
      model: aiUsageLogs.model,
      provider: aiUsageLogs.provider,
      totalTokens: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)::integer`,
      totalCostUsd: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.totalCostUsd}), 0)::float`,
      requestCount: sqlBuilder<number>`COUNT(*)::integer`,
    })
    .from(aiUsageLogs)
    .where(and(
      gte(aiUsageLogs.occurredAt, startDate),
      lte(aiUsageLogs.occurredAt, endDate)
    ))
    .groupBy(aiUsageLogs.model, aiUsageLogs.provider)
    .orderBy(desc(sqlBuilder`SUM(${aiUsageLogs.totalTokens})`));
    
    return result;
  }
  
  async getAiUsageDaily(startDate: Date, endDate: Date): Promise<AiUsageDaily[]> {
    const result = await db.select({
      date: sqlBuilder<string>`TO_CHAR(${aiUsageLogs.occurredAt}, 'YYYY-MM-DD')`,
      totalTokens: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)::integer`,
      totalCostUsd: sqlBuilder<number>`COALESCE(SUM(${aiUsageLogs.totalCostUsd}), 0)::float`,
      requestCount: sqlBuilder<number>`COUNT(*)::integer`,
    })
    .from(aiUsageLogs)
    .where(and(
      gte(aiUsageLogs.occurredAt, startDate),
      lte(aiUsageLogs.occurredAt, endDate)
    ))
    .groupBy(sqlBuilder`TO_CHAR(${aiUsageLogs.occurredAt}, 'YYYY-MM-DD')`)
    .orderBy(asc(sqlBuilder`TO_CHAR(${aiUsageLogs.occurredAt}, 'YYYY-MM-DD')`));
    
    return result;
  }
  
  async getAiUsageLogs(startDate: Date, endDate: Date, limit: number = 100): Promise<AiUsageLog[]> {
    return await db.select()
      .from(aiUsageLogs)
      .where(and(
        gte(aiUsageLogs.occurredAt, startDate),
        lte(aiUsageLogs.occurredAt, endDate)
      ))
      .orderBy(desc(aiUsageLogs.occurredAt))
      .limit(limit);
  }
}

// Use PostgreSQL storage instead of memory storage
export const storage = new PostgreSQLStorage();
