import { Router, Request, Response } from 'express';
import { authenticateApiKey, ApiKeyRequest } from '../middleware/auth';
import { extensionRateLimit } from '../middleware/rate-limit';
import { prisma } from '../lib/db';

const router = Router();

// All extension routes require API key auth
router.use(authenticateApiKey);
router.use(extensionRateLimit);

/**
 * GET /api/v1/ext/me — Validate key + user info + plan
 */
router.get('/me', async (req: ApiKeyRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        threadsConnection: {
          select: { username: true, isVerified: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/ext/post/:threadsMediaId — Post data + analytics
 */
router.get('/post/:threadsMediaId', async (req: ApiKeyRequest, res: Response) => {
  try {
    const { threadsMediaId } = req.params;

    // Check if it's the user's own post (full insights)
    const ownPost = await prisma.postInsight.findUnique({
      where: { threadsMediaId },
    });

    if (ownPost) {
      res.json({ type: 'own', data: ownPost });
      return;
    }

    // Check if it's a tracked public post
    const publicPost = await prisma.publicPost.findUnique({
      where: { threadsMediaId },
    });

    if (publicPost) {
      res.json({ type: 'public', data: publicPost });
      return;
    }

    res.json({ type: 'unknown', data: null });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/ext/post/batch — Batch lookup for multiple posts
 */
router.post('/post/batch', async (req: ApiKeyRequest, res: Response) => {
  try {
    const { mediaIds } = req.body as { mediaIds?: string[] };
    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length > 50) {
      res.status(400).json({ error: 'Provide an array of up to 50 mediaIds' });
      return;
    }

    const [ownPosts, publicPosts] = await Promise.all([
      prisma.postInsight.findMany({
        where: { threadsMediaId: { in: mediaIds } },
      }),
      prisma.publicPost.findMany({
        where: { threadsMediaId: { in: mediaIds } },
      }),
    ]);

    const results: Record<string, { type: string; data: unknown }> = {};

    for (const post of ownPosts) {
      results[post.threadsMediaId] = { type: 'own', data: post };
    }
    for (const post of publicPosts) {
      if (!results[post.threadsMediaId]) {
        results[post.threadsMediaId] = { type: 'public', data: post };
      }
    }

    res.json({ results });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/ext/creator/:username — Creator metrics
 */
router.get('/creator/:username', async (req: ApiKeyRequest, res: Response) => {
  try {
    const creator = await prisma.creator.findFirst({
      where: { username: req.params.username },
      select: {
        id: true,
        username: true,
        profilePictureUrl: true,
        biography: true,
        isVerified: true,
        observedPostCount: true,
        avgLikes: true,
        avgReplies: true,
        avgReposts: true,
        avgEngagement: true,
        primaryTopics: true,
        postFrequency: true,
        lastPostAt: true,
      },
    });

    if (!creator) {
      res.json({ found: false, data: null });
      return;
    }

    res.json({ found: true, data: creator });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/ext/keyword/:keyword/trend — Quick trend summary
 */
router.get('/keyword/:keyword/trend', async (req: ApiKeyRequest, res: Response) => {
  try {
    const { keyword } = req.params;

    const tracked = await prisma.trackedKeyword.findFirst({
      where: { userId: req.userId!, keyword, isActive: true },
      include: {
        dataPoints: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    if (!tracked) {
      res.json({ tracked: false, data: null });
      return;
    }

    res.json({ tracked: true, data: tracked.dataPoints });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/ext/notifications — Pending alerts/notifications
 */
router.get('/notifications', async (req: ApiKeyRequest, res: Response) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        userId: req.userId!,
        isActive: true,
        lastTriggered: { not: null },
      },
      orderBy: { lastTriggered: 'desc' },
      take: 20,
    });

    res.json({ alerts });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/ext/track/creator — Track a creator
 */
router.post('/track/creator', async (req: ApiKeyRequest, res: Response) => {
  try {
    const { creatorId, notes } = req.body as {
      creatorId?: string;
      notes?: string;
    };

    if (!creatorId) {
      res.status(400).json({ error: 'creatorId is required' });
      return;
    }

    const tracked = await prisma.trackedCreator.upsert({
      where: {
        userId_creatorId: { userId: req.userId!, creatorId },
      },
      create: { userId: req.userId!, creatorId, notes },
      update: { notes },
    });

    res.json({ tracked });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/ext/track/post — Track a post
 */
router.post('/track/post', async (req: ApiKeyRequest, res: Response) => {
  try {
    const { publicPostId, notes } = req.body as {
      publicPostId?: string;
      notes?: string;
    };

    if (!publicPostId) {
      res.status(400).json({ error: 'publicPostId is required' });
      return;
    }

    const tracked = await prisma.trackedPost.upsert({
      where: {
        userId_publicPostId: { userId: req.userId!, publicPostId },
      },
      create: { userId: req.userId!, publicPostId, notes },
      update: { notes },
    });

    res.json({ tracked });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/ext/scheduled — Upcoming scheduled posts
 */
router.get('/scheduled', async (req: ApiKeyRequest, res: Response) => {
  try {
    const posts = await prisma.scheduledPost.findMany({
      where: {
        userId: req.userId!,
        status: 'PENDING',
        scheduledFor: { gte: new Date() },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 10,
    });

    res.json({ posts });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as extensionRouter };
