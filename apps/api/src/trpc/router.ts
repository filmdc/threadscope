import { router } from './trpc';
import { dashboardRouter } from './routers/dashboard';
import { analyticsRouter } from './routers/analytics';
import { trendsRouter } from './routers/trends';
import { composeRouter } from './routers/compose';
import { discoverRouter } from './routers/discover';
import { competitorsRouter } from './routers/competitors';
import { alertsRouter } from './routers/alerts';
import { reportsRouter } from './routers/reports';
import { settingsRouter } from './routers/settings';

export const appRouter = router({
  dashboard: dashboardRouter,
  analytics: analyticsRouter,
  trends: trendsRouter,
  compose: composeRouter,
  discover: discoverRouter,
  competitors: competitorsRouter,
  alerts: alertsRouter,
  reports: reportsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
