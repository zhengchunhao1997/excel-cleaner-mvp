import { defineManifest } from '@crxjs/vite-plugin';

const getHostPermissions = () => {
  const raw = process.env.VITE_API_BASE || 'http://localhost:3000';
  try {
    const origin = new URL(raw).origin;
    return [`${origin}/*`];
  } catch {
    return ['http://localhost:3000/*'];
  }
};

export default defineManifest(() => ({
  manifest_version: 3,
  name: 'execelMerge',
  version: '1.0.0',
  description: 'Auto-merge and clean Excel files with AI',
  side_panel: {
    default_path: 'index.html',
  },
  permissions: ['sidePanel', 'storage'],
  host_permissions: getHostPermissions(),
  action: {
    default_title: 'Click to open panel',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
}));

