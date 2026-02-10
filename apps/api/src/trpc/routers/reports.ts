import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { reportConfigSchema, PLAN_LIMITS, type PlanTier } from '@threadscope/shared';
import { reportGenerationQueue } from '../../lib/queue';

export const reportsRouter = router({
  /**
   * List all reports for the current user.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const reports = await ctx.prisma.report.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status.toLowerCase() as string,
      resultSummary: r.resultSummary,
      resultCount: r.resultCount,
      processingTime: r.processingTime,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    }));
  }),

  /**
   * Get a single report with full result data.
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!report) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
      }

      return {
        id: report.id,
        name: report.name,
        type: report.type,
        status: report.status.toLowerCase() as string,
        parameters: report.parameters,
        resultSummary: report.resultSummary,
        resultData: report.resultData,
        resultCount: report.resultCount,
        processingTime: report.processingTime,
        errorMessage: report.errorMessage,
        createdAt: report.createdAt.toISOString(),
        completedAt: report.completedAt?.toISOString() ?? null,
      };
    }),

  /**
   * Generate a new report.
   */
  generate: protectedProcedure
    .input(reportConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Enforce plan limits for custom reports
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { plan: true },
      });
      const limits = PLAN_LIMITS[user.plan as PlanTier];
      if (!limits) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unknown plan tier' });
      }

      if (!limits.customReports) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Custom reports are not available on the ${user.plan} plan. Please upgrade to PRO or higher.`,
        });
      }

      // Generate a readable name
      const typeLabels: Record<string, string> = {
        ACCOUNT_PERFORMANCE: 'Account Performance',
        POST_PERFORMANCE: 'Post Performance',
        KEYWORD_TREND: 'Keyword Trend',
        CREATOR_DISCOVERY: 'Creator Discovery',
        COMPETITOR_BENCHMARK: 'Competitor Benchmark',
        CONTENT_ANALYSIS: 'Content Analysis',
        AUDIENCE_INSIGHTS: 'Audience Insights',
        TOPIC_LANDSCAPE: 'Topic Landscape',
      };

      const report = await ctx.prisma.report.create({
        data: {
          userId: ctx.userId,
          name: `${typeLabels[input.type] ?? input.type} Report`,
          type: input.type,
          parameters: input.parameters ?? {},
          status: 'QUEUED',
        },
      });

      // Enqueue report generation job
      await reportGenerationQueue.add(
        'report-generation',
        { reportId: report.id, userId: ctx.userId },
      );

      return {
        id: report.id,
        name: report.name,
        status: 'queued',
      };
    }),

  /**
   * Cancel a queued report.
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findFirst({
        where: { id: input.id, userId: ctx.userId, status: 'QUEUED' },
      });

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found or cannot be cancelled',
        });
      }

      await ctx.prisma.report.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      });

      return { success: true };
    }),

  /**
   * Export a completed report as CSV or JSON.
   */
  export: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        format: z.enum(['CSV', 'JSON']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Enforce export plan limit
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { plan: true },
      });
      const limits = PLAN_LIMITS[user.plan as PlanTier];
      if (!limits?.exportEnabled) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Data export is not available on the ${user.plan} plan. Please upgrade.`,
        });
      }

      const report = await ctx.prisma.report.findFirst({
        where: { id: input.reportId, userId: ctx.userId, status: 'COMPLETED' },
      });

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Completed report not found',
        });
      }

      // Create ExportJob record
      const exportJob = await ctx.prisma.exportJob.create({
        data: {
          userId: ctx.userId,
          reportId: report.id,
          format: input.format,
          status: 'COMPLETED',
        },
      });

      // Generate inline export data
      const resultData = report.resultData as Record<string, unknown>[] | null;

      if (input.format === 'JSON') {
        return {
          exportId: exportJob.id,
          format: 'JSON' as const,
          data: JSON.stringify(resultData ?? report.resultSummary ?? {}, null, 2),
          filename: `${report.name.replace(/\s+/g, '_')}.json`,
        };
      }

      // CSV format
      const rows = Array.isArray(resultData) ? resultData : [resultData ?? {}];
      const headers = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
      const csvLines = [
        headers.join(','),
        ...rows.map((row) =>
          headers.map((h) => {
            const val = (row as Record<string, unknown>)[h];
            const str = String(val ?? '');
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          }).join(','),
        ),
      ];

      return {
        exportId: exportJob.id,
        format: 'CSV' as const,
        data: csvLines.join('\n'),
        filename: `${report.name.replace(/\s+/g, '_')}.csv`,
      };
    }),
});
