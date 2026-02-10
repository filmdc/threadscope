import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ThreadScope - Threads Intelligence',
    description: 'Analytics, trends, and creator intelligence for Meta Threads',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://www.threads.net/*', 'https://threads.net/*'],
  },
});
