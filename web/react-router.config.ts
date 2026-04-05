import type { Config } from '@react-router/dev/config';
import { vercelPreset } from '@resolid/react-router-hono/vercel-preset';

export default {
	presets: [vercelPreset()],
	appDirectory: './src/app',
	ssr: true,
} satisfies Config;
