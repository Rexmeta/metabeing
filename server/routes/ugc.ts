import { Router, Request, Response } from "express";
import { eq, and, or, desc, asc, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import {
  characters,
  ugcScenarios,
  experiences,
  likes,
  bookmarks,
  reports,
  insertCharacterSchema,
  insertUgcScenarioSchema,
  insertExperienceSchema,
  insertLikeSchema,
  insertBookmarkSchema,
  insertReportSchema,
  type Character,
  type UgcScenario,
  type Experience,
} from "@shared/schema";
import { db } from "../storage";
import { isAuthenticated } from "../auth";
import { getAIServiceForFeature } from "../services/aiServiceFactory";

const router = Router();

// ===== Characters CRUD =====

// Create character
router.post("/characters", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const data = insertCharacterSchema.parse({ ...req.body, ownerId: userId });
    const [character] = await db.insert(characters).values(data as any).returning();
    res.status(201).json(character);
  } catch (error: any) {
    console.error("Character creation error:", error);
    res.status(400).json({ error: error.message || "캐릭터 생성 실패" });
  }
});

// Get character by ID
router.get("/characters/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    
    if (!character) {
      return res.status(404).json({ error: "캐릭터를 찾을 수 없습니다" });
    }

    // Private characters are only visible to owner
    if (character.visibility === "private" && character.ownerId !== userId) {
      return res.status(403).json({ error: "접근 권한이 없습니다" });
    }

    // Increment view count
    await db.update(characters)
      .set({ viewCount: sql`${characters.viewCount} + 1` })
      .where(eq(characters.id, id));

    res.json(character);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List characters (with search, filter, sort)
router.get("/characters", async (req: Request, res: Response) => {
  try {
    const { query, tags, sort = "new", visibility = "public", limit = 20, offset = 0 } = req.query;
    const userId = (req as any).user?.id;

    let conditions = [];

    // Visibility filter - Always require proper scoping
    if (visibility === "mine") {
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }
      conditions.push(eq(characters.ownerId, userId));
    } else {
      // Default to public only - always require published status
      conditions.push(eq(characters.visibility, "public"));
      conditions.push(eq(characters.status, "published"));
    }

    // Search query
    if (query && typeof query === "string") {
      conditions.push(
        or(
          ilike(characters.name, `%${query}%`),
          ilike(characters.tagline, `%${query}%`),
          ilike(characters.description, `%${query}%`)
        )
      );
    }

    // Sort
    let orderBy;
    switch (sort) {
      case "trending":
        orderBy = desc(characters.usageCount);
        break;
      case "top":
        orderBy = desc(characters.viewCount);
        break;
      case "new":
      default:
        orderBy = desc(characters.createdAt);
    }

    let result;
    try {
      result = await db
        .select()
        .from(characters)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderBy)
        .limit(Number(limit))
        .offset(Number(offset));
    } catch (dbError) {
      console.error("Characters DB query error:", dbError);
      result = [];
    }

    res.json(result ?? []);
  } catch (error: any) {
    console.error("Characters list error:", error);
    res.json([]);
  }
});

// Allowed fields for character update (whitelist)
const characterUpdateFields = [
  "name", "tagline", "description", "systemPrompt", "profileImage", "coverImage", 
  "tags", "safetyFlags", "gender", "mbti", "personalityTraits", "imageStyle", "expressionImagesGenerated",
  "communicationStyle", "motivation", "fears", "background", "communicationPatterns", "voice"
];

// Update character
router.put("/characters/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const [existing] = await db.select().from(characters).where(eq(characters.id, id));
    if (!existing) {
      return res.status(404).json({ error: "캐릭터를 찾을 수 없습니다" });
    }
    if (existing.ownerId !== userId) {
      return res.status(403).json({ error: "수정 권한이 없습니다" });
    }

    // Whitelist allowed fields only
    const updateData: Record<string, any> = {};
    for (const field of characterUpdateFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const [updated] = await db
      .update(characters)
      .set({ ...updateData, updatedAt: new Date(), version: existing.version + 1 })
      .where(eq(characters.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Publish character
router.post("/characters/:id/publish", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const [existing] = await db.select().from(characters).where(eq(characters.id, id));
    if (!existing || existing.ownerId !== userId) {
      return res.status(403).json({ error: "권한이 없습니다" });
    }

    const [updated] = await db
      .update(characters)
      .set({ status: "published", visibility: "public", updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete character
router.delete("/characters/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const [existing] = await db.select().from(characters).where(eq(characters.id, id));
    if (!existing || existing.ownerId !== userId) {
      return res.status(403).json({ error: "삭제 권한이 없습니다" });
    }

    await db.delete(characters).where(eq(characters.id, id));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Fork/Remix character
router.post("/characters/:id/fork", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const [original] = await db.select().from(characters).where(eq(characters.id, id));
    if (!original) {
      return res.status(404).json({ error: "원본 캐릭터를 찾을 수 없습니다" });
    }

    const forkedData = {
      ownerId: userId,
      name: `${original.name} (리믹스)`,
      tagline: original.tagline,
      description: original.description,
      systemPrompt: original.systemPrompt,
      profileImage: original.profileImage,
      coverImage: original.coverImage,
      tags: original.tags,
      visibility: "private" as const,
      status: "draft" as const,
      sourceCharacterId: id,
    };

    const [forked] = await db.insert(characters).values(forkedData).returning();
    res.status(201).json(forked);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===== Scenarios CRUD =====

router.post("/scenarios", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const data = insertUgcScenarioSchema.parse({ ...req.body, ownerId: userId });
    const [scenario] = await db.insert(ugcScenarios).values(data as any).returning();
    res.status(201).json(scenario);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/scenarios/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const [scenario] = await db.select().from(ugcScenarios).where(eq(ugcScenarios.id, id));
    
    if (!scenario) {
      return res.status(404).json({ error: "시나리오를 찾을 수 없습니다" });
    }

    if (scenario.visibility === "private" && scenario.ownerId !== userId) {
      return res.status(403).json({ error: "접근 권한이 없습니다" });
    }

    await db.update(ugcScenarios)
      .set({ viewCount: sql`${ugcScenarios.viewCount} + 1` })
      .where(eq(ugcScenarios.id, id));

    res.json(scenario);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/scenarios", async (req: Request, res: Response) => {
  try {
    const { query, tags, sort = "new", visibility = "public", limit = 20, offset = 0 } = req.query;
    const userId = (req as any).user?.id;

    let conditions = [];

    // Visibility filter - Always require proper scoping
    if (visibility === "mine") {
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }
      conditions.push(eq(ugcScenarios.ownerId, userId));
    } else {
      // Default to public only - always require published status
      conditions.push(eq(ugcScenarios.visibility, "public"));
      conditions.push(eq(ugcScenarios.status, "published"));
    }

    if (query && typeof query === "string") {
      conditions.push(
        or(
          ilike(ugcScenarios.name, `%${query}%`),
          ilike(ugcScenarios.tagline, `%${query}%`),
          ilike(ugcScenarios.description, `%${query}%`)
        )
      );
    }

    let orderBy;
    switch (sort) {
      case "trending":
        orderBy = desc(ugcScenarios.usageCount);
        break;
      case "top":
        orderBy = desc(ugcScenarios.viewCount);
        break;
      case "new":
      default:
        orderBy = desc(ugcScenarios.createdAt);
    }

    let result;
    try {
      result = await db
        .select()
        .from(ugcScenarios)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderBy)
        .limit(Number(limit))
        .offset(Number(offset));
    } catch (dbError) {
      console.error("Scenarios DB query error:", dbError);
      result = [];
    }

    res.json(result ?? []);
  } catch (error: any) {
    console.error("Scenarios list error:", error);
    res.json([]);
  }
});

// Allowed fields for scenario update (whitelist)
const scenarioUpdateFields = ["name", "tagline", "description", "background", "goal", "constraints", "openerMessage", "difficulty", "tags"];

router.put("/scenarios/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const [existing] = await db.select().from(ugcScenarios).where(eq(ugcScenarios.id, id));
    if (!existing) {
      return res.status(404).json({ error: "시나리오를 찾을 수 없습니다" });
    }
    if (existing.ownerId !== userId) {
      return res.status(403).json({ error: "수정 권한이 없습니다" });
    }

    // Whitelist allowed fields only
    const updateData: Record<string, any> = {};
    for (const field of scenarioUpdateFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const [updated] = await db
      .update(ugcScenarios)
      .set({ ...updateData, updatedAt: new Date(), version: existing.version + 1 })
      .where(eq(ugcScenarios.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/scenarios/:id/publish", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const [existing] = await db.select().from(ugcScenarios).where(eq(ugcScenarios.id, id));
    if (!existing || existing.ownerId !== userId) {
      return res.status(403).json({ error: "권한이 없습니다" });
    }

    const [updated] = await db
      .update(ugcScenarios)
      .set({ status: "published", visibility: "public", updatedAt: new Date() })
      .where(eq(ugcScenarios.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/scenarios/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const [existing] = await db.select().from(ugcScenarios).where(eq(ugcScenarios.id, id));
    if (!existing || existing.ownerId !== userId) {
      return res.status(403).json({ error: "삭제 권한이 없습니다" });
    }

    await db.delete(ugcScenarios).where(eq(ugcScenarios.id, id));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/scenarios/:id/fork", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const [original] = await db.select().from(ugcScenarios).where(eq(ugcScenarios.id, id));
    if (!original) {
      return res.status(404).json({ error: "원본 시나리오를 찾을 수 없습니다" });
    }

    const forkedData = {
      ownerId: userId,
      name: `${original.name} (리믹스)`,
      tagline: original.tagline,
      description: original.description,
      background: original.background,
      goal: original.goal,
      constraints: original.constraints,
      openerMessage: original.openerMessage,
      difficulty: original.difficulty,
      tags: original.tags,
      visibility: "private" as const,
      status: "draft" as const,
      sourceScenarioId: id,
    };

    const [forked] = await db.insert(ugcScenarios).values(forkedData).returning();
    res.status(201).json(forked);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===== Experiences (Character × Scenario) =====

router.post("/experiences", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { characterId, scenarioId } = req.body;

    // Validate character access - must be public or owned by user
    if (characterId) {
      const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
      if (!character) {
        return res.status(404).json({ error: "캐릭터를 찾을 수 없습니다" });
      }
      if (character.visibility !== "public" && character.ownerId !== userId) {
        return res.status(403).json({ error: "캐릭터에 접근할 권한이 없습니다" });
      }
    }

    // Validate scenario access - must be public or owned by user
    if (scenarioId) {
      const [scenario] = await db.select().from(ugcScenarios).where(eq(ugcScenarios.id, scenarioId));
      if (!scenario) {
        return res.status(404).json({ error: "시나리오를 찾을 수 없습니다" });
      }
      if (scenario.visibility !== "public" && scenario.ownerId !== userId) {
        return res.status(403).json({ error: "시나리오에 접근할 권한이 없습니다" });
      }
    }

    const data = insertExperienceSchema.parse({ ...req.body, ownerId: userId });
    const [experience] = await db.insert(experiences).values(data as any).returning();
    res.status(201).json(experience);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/experiences/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const [experience] = await db.select().from(experiences).where(eq(experiences.id, id));
    
    if (!experience) {
      return res.status(404).json({ error: "Experience를 찾을 수 없습니다" });
    }

    // Check access - must be public or owned by user
    if (experience.visibility !== "public" && experience.ownerId !== userId) {
      return res.status(403).json({ error: "접근 권한이 없습니다" });
    }

    // Get character and scenario details
    const [character] = await db.select().from(characters).where(eq(characters.id, experience.characterId));
    let scenario = null;
    if (experience.scenarioId) {
      const [s] = await db.select().from(ugcScenarios).where(eq(ugcScenarios.id, experience.scenarioId));
      scenario = s;
    }

    res.json({ ...experience, character, scenario });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/experiences", async (req: Request, res: Response) => {
  try {
    const { sort = "new", limit = 20, offset = 0 } = req.query;

    let orderBy;
    switch (sort) {
      case "trending":
        orderBy = desc(experiences.usageCount);
        break;
      case "top":
        orderBy = desc(experiences.viewCount);
        break;
      case "new":
      default:
        orderBy = desc(experiences.createdAt);
    }

    const result = await db
      .select()
      .from(experiences)
      .where(eq(experiences.visibility, "public"))
      .orderBy(orderBy)
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(result ?? []);
  } catch (error: any) {
    console.error("Experiences list error:", error);
    res.status(500).json({ error: error.message || "경험 목록 조회 실패" });
  }
});

// ===== Social Features =====

// Like
router.post("/likes", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { targetType, targetId } = req.body;

    // Check if already liked
    const [existing] = await db
      .select()
      .from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.targetType, targetType),
        eq(likes.targetId, targetId)
      ));

    if (existing) {
      // Unlike
      await db.delete(likes).where(eq(likes.id, existing.id));
      return res.json({ liked: false });
    }

    // Like
    await db.insert(likes).values({ userId, targetType, targetId });
    res.json({ liked: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get likes count
router.get("/likes/:targetType/:targetId", async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    const userId = (req as any).user?.id;

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(likes)
      .where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId)));

    let userLiked = false;
    if (userId) {
      const [liked] = await db
        .select()
        .from(likes)
        .where(and(
          eq(likes.userId, userId),
          eq(likes.targetType, targetType),
          eq(likes.targetId, targetId)
        ));
      userLiked = !!liked;
    }

    res.json({ count: result[0]?.count || 0, userLiked });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bookmark
router.post("/bookmarks", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { targetType, targetId } = req.body;

    const [existing] = await db
      .select()
      .from(bookmarks)
      .where(and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.targetType, targetType),
        eq(bookmarks.targetId, targetId)
      ));

    if (existing) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
      return res.json({ bookmarked: false });
    }

    await db.insert(bookmarks).values({ userId, targetType, targetId });
    res.json({ bookmarked: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user bookmarks
router.get("/bookmarks", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { targetType } = req.query;

    let conditions = [eq(bookmarks.userId, userId)];
    if (targetType && typeof targetType === "string") {
      conditions.push(eq(bookmarks.targetType, targetType));
    }

    const result = await db
      .select()
      .from(bookmarks)
      .where(and(...conditions))
      .orderBy(desc(bookmarks.createdAt));

    res.json(result ?? []);
  } catch (error: any) {
    console.error("Bookmarks list error:", error);
    res.status(500).json({ error: error.message || "북마크 목록 조회 실패" });
  }
});

// Report
router.post("/reports", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const data = insertReportSchema.parse({ ...req.body, reporterId: userId, status: "pending" });
    const [report] = await db.insert(reports).values(data).returning();
    res.status(201).json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Character Chat - AI conversation with character
router.post("/characters/chat", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { characterId, message, history } = req.body;

    if (!characterId || !message) {
      return res.status(400).json({ error: "캐릭터 ID와 메시지가 필요합니다" });
    }

    // Validate history structure
    const historySchema = z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })).optional();
    
    const validatedHistory = historySchema.safeParse(history);
    if (!validatedHistory.success) {
      return res.status(400).json({ error: "대화 기록 형식이 올바르지 않습니다" });
    }

    // Get character
    const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
    if (!character) {
      return res.status(404).json({ error: "캐릭터를 찾을 수 없습니다" });
    }

    // Check access - must be public or owned by user
    if (character.visibility !== "public" && character.ownerId !== userId) {
      return res.status(403).json({ error: "캐릭터에 접근할 권한이 없습니다" });
    }

    // Build conversation context for AI
    const systemPrompt = character.systemPrompt || `당신은 "${character.name}"입니다. ${character.description || ""}`;
    
    // Format history for AI
    const formattedHistory = (validatedHistory.data || []).map((msg) => ({
      sender: msg.role === "user" ? "user" : "ai",
      message: msg.content,
      timestamp: new Date().toISOString(),
    }));

    // Get AI service
    const aiService = await getAIServiceForFeature("conversation");
    
    // Create a persona object for the AI service
    const persona = {
      id: character.id,
      name: character.name,
      role: character.tagline || "대화 상대",
      department: "",
      personality: systemPrompt,
      responseStyle: "자연스럽고 친근한 대화",
      goals: ["대화를 통해 사용자와 소통"],
    };

    // Generate response
    const aiResult = await aiService.generateResponse(
      systemPrompt, // scenario context (use systemPrompt as context)
      formattedHistory,
      persona,
      message
    );

    // Update usage count
    await db.update(characters)
      .set({ usageCount: sql`${characters.usageCount} + 1` })
      .where(eq(characters.id, characterId));

    res.json({
      response: aiResult.content,
      emotion: aiResult.emotion,
      emotionReason: aiResult.emotionReason,
    });
  } catch (error: any) {
    console.error("Character chat error:", error);
    res.status(500).json({ error: error.message || "대화 처리 중 오류가 발생했습니다" });
  }
});

export default router;
