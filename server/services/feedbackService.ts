/**
 * Feedback Service
 *
 * Handles feedback generation and scoring for conversations.
 * Refactored from routes.ts for better separation of concerns and testability.
 */

import { generateFeedback } from './geminiService';
import { storage } from '../storage';

// Constants
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes - considered as conversation pause
const MIN_CONVERSATION_TIME_SECONDS = 60; // Minimum 1 minute

/**
 * Calculates actual conversation time by excluding idle gaps.
 * Messages separated by more than 5 minutes are considered separate conversation sessions.
 *
 * @param messages - Array of conversation messages with timestamps
 * @returns Total active conversation time in seconds
 */
export function calculateConversationTime(messages: any[]): number {
  if (messages.length < 2) {
    return messages.length > 0 ? MIN_CONVERSATION_TIME_SECONDS : 0;
  }

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) =>
    new Date(a.timestamp || a.createdAt).getTime() -
    new Date(b.timestamp || b.createdAt).getTime()
  );

  let totalActiveTime = 0;

  for (let i = 1; i < sortedMessages.length; i++) {
    const prevTime = new Date(sortedMessages[i - 1].timestamp || sortedMessages[i - 1].createdAt).getTime();
    const currTime = new Date(sortedMessages[i].timestamp || sortedMessages[i].createdAt).getTime();
    const gap = currTime - prevTime;

    // Only include gaps of 5 minutes or less
    if (gap <= IDLE_THRESHOLD_MS) {
      totalActiveTime += gap;
    } else {
      console.log(`⏸️ Conversation pause detected: ${Math.floor(gap / 1000 / 60)} minutes (excluded)`);
    }
  }

  return Math.floor(totalActiveTime / 1000); // Return in seconds
}

/**
 * Metrics calculated from conversation data
 */
interface ConversationMetrics {
  conversationDurationSeconds: number;
  conversationDurationMinutes: number;
  userMessageCount: number;
  totalUserWords: number;
  averageResponseTime: number;
  speechDensity: number;
  avgMessageLength: number;
}

/**
 * Calculates various conversation metrics from messages
 *
 * @param messages - Array of conversation messages
 * @returns Calculated metrics
 */
export function calculateConversationMetrics(messages: any[]): ConversationMetrics {
  const conversationDurationSeconds = calculateConversationTime(messages);
  const conversationDurationMinutes = Math.floor(conversationDurationSeconds / 60);

  const userMessages = messages.filter((m: any) => m.sender === 'user');
  const totalUserWords = userMessages.reduce((sum: number, msg: any) => sum + msg.message.length, 0);
  const averageResponseTime = userMessages.length > 0
    ? Math.round(conversationDurationSeconds / userMessages.length)
    : 0;

  const speechDensity = conversationDurationMinutes > 0
    ? totalUserWords / conversationDurationMinutes
    : 0;

  const avgMessageLength = userMessages.length > 0
    ? totalUserWords / userMessages.length
    : 0;

  return {
    conversationDurationSeconds,
    conversationDurationMinutes,
    userMessageCount: userMessages.length,
    totalUserWords,
    averageResponseTime,
    speechDensity,
    avgMessageLength,
  };
}

/**
 * Time performance rating and feedback
 */
interface TimePerformance {
  rating: 'excellent' | 'good' | 'average' | 'slow';
  feedback: string;
}

/**
 * Evaluates conversation time performance based on speech density and message length.
 *
 * @param metrics - Conversation metrics
 * @returns Performance rating and feedback message
 */
export function evaluateTimePerformance(metrics: ConversationMetrics): TimePerformance {
  const {
    userMessageCount,
    totalUserWords,
    conversationDurationMinutes,
    speechDensity,
    avgMessageLength
  } = metrics;

  // No participation case
  if (userMessageCount === 0 || totalUserWords === 0) {
    return {
      rating: 'slow',
      feedback: '대화 참여 없음 - 시간 평가 불가'
    };
  }

  // Evaluate based on speech density and message length
  let rating: 'excellent' | 'good' | 'average' | 'slow';
  let feedback: string;

  if (speechDensity >= 30 && avgMessageLength >= 20) {
    rating = conversationDurationMinutes <= 10 ? 'excellent' : 'good';
    feedback = `활발한 대화 참여 (밀도: ${speechDensity.toFixed(1)}자/분, 평균: ${avgMessageLength.toFixed(0)}자/발언)`;
  } else if (speechDensity >= 15 && avgMessageLength >= 10) {
    rating = conversationDurationMinutes <= 15 ? 'good' : 'average';
    feedback = `적절한 대화 참여 (밀도: ${speechDensity.toFixed(1)}자/분, 평균: ${avgMessageLength.toFixed(0)}자/발언)`;
  } else if (speechDensity >= 5 && avgMessageLength >= 5) {
    rating = 'average';
    feedback = `소극적 참여 (밀도: ${speechDensity.toFixed(1)}자/분, 평균: ${avgMessageLength.toFixed(0)}자/발언)`;
  } else {
    rating = 'slow';
    feedback = `매우 소극적 참여 (밀도: ${speechDensity.toFixed(1)}자/분, 평균: ${avgMessageLength.toFixed(0)}자/발언)`;
  }

  return { rating, feedback };
}

/**
 * Score category configuration
 */
interface ScoreCategory {
  category: string;
  name: string;
  score: number;
  feedback: string;
  icon: string;
  color: string;
}

/**
 * Transforms raw scores into formatted evaluation score objects.
 *
 * @param scores - Raw scores from feedback data
 * @returns Array of formatted score categories
 */
export function transformToEvaluationScores(scores: any): ScoreCategory[] {
  return [
    {
      category: "clarityLogic",
      name: "명확성 & 논리성",
      score: scores.clarityLogic,
      feedback: "발언의 구조화, 핵심 전달, 모호성 최소화",
      icon: "🎯",
      color: "blue"
    },
    {
      category: "listeningEmpathy",
      name: "경청 & 공감",
      score: scores.listeningEmpathy,
      feedback: "재진술·요약, 감정 인식, 우려 존중",
      icon: "👂",
      color: "green"
    },
    {
      category: "appropriatenessAdaptability",
      name: "적절성 & 상황 대응",
      score: scores.appropriatenessAdaptability,
      feedback: "맥락 적합한 표현, 유연한 갈등 대응",
      icon: "⚡",
      color: "yellow"
    },
    {
      category: "persuasivenessImpact",
      name: "설득력 & 영향력",
      score: scores.persuasivenessImpact,
      feedback: "논리적 근거, 사례 활용, 행동 변화 유도",
      icon: "🎪",
      color: "purple"
    },
    {
      category: "strategicCommunication",
      name: "전략적 커뮤니케이션",
      score: scores.strategicCommunication,
      feedback: "목표 지향적 대화, 협상·조율, 주도성",
      icon: "🎲",
      color: "red"
    }
  ];
}

/**
 * Generates and saves feedback for a conversation.
 * Orchestrates the entire feedback generation process.
 *
 * @param conversationId - Unique conversation identifier
 * @param conversation - Conversation data with messages
 * @param scenarioObj - Scenario configuration
 * @param persona - Persona data
 * @param performStrategicAnalysisFn - Optional function to perform strategic analysis in background
 * @returns Created feedback object
 */
export async function generateAndSaveFeedback(
  conversationId: string,
  conversation: any,
  scenarioObj: any,
  persona: any,
  performStrategicAnalysisFn?: (conversationId: string, conversation: any, scenarioObj: any) => Promise<void>
) {
  // Check if feedback already exists
  const existingFeedback = await storage.getFeedbackByConversationId(conversationId);
  if (existingFeedback) {
    console.log(`피드백이 이미 존재함: ${conversationId}`);
    return existingFeedback;
  }

  console.log(`피드백 생성 중: ${conversationId}`);

  // Calculate conversation metrics
  const metrics = calculateConversationMetrics(conversation.messages);

  // Evaluate time performance
  const timePerformance = evaluateTimePerformance(metrics);

  // Generate AI feedback
  const feedbackData = await generateFeedback(
    scenarioObj,
    conversation.messages,
    persona,
    conversation
  );

  // Add time information to feedback
  feedbackData.conversationDuration = metrics.conversationDurationSeconds;
  feedbackData.averageResponseTime = metrics.averageResponseTime;
  feedbackData.timePerformance = timePerformance;

  // Transform scores to evaluation format
  const evaluationScores = transformToEvaluationScores(feedbackData.scores);

  // Save feedback to database
  const feedback = await storage.createFeedback({
    conversationId,
    personaRunId: conversationId,
    overallScore: feedbackData.overallScore,
    scores: evaluationScores,
    detailedFeedback: feedbackData,
  });

  // Update personaRun score
  try {
    const personaRun = await storage.getPersonaRun(conversationId);
    if (personaRun) {
      await storage.updatePersonaRun(conversationId, {
        score: feedbackData.overallScore
      });
      console.log(`✅ PersonaRun ${conversationId} score 업데이트: ${feedbackData.overallScore}`);
    }
  } catch (error) {
    console.warn(`PersonaRun score 업데이트 실패: ${error}`);
  }

  console.log(`피드백 자동 생성 완료: ${conversationId}`);

  // Trigger strategic analysis in background (if provided)
  if (performStrategicAnalysisFn) {
    performStrategicAnalysisFn(conversationId, conversation, scenarioObj)
      .catch(error => {
        console.error("전략 분석 오류 (무시):", error);
      });
  }

  return feedback;
}
