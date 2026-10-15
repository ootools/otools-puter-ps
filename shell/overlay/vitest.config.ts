/**
 * OTools 插件版的 vitest 配置（覆盖上游同名文件）。
 *
 * 上游的这份只收 `tests/*.test.ts`（它自己的测试全是 TS）。我们多了移植层
 * 自己的测试（`shell/tests/*.test.js`，合成后进 `.build/tests/`），所以这里
 * 把两种后缀都收进来——上游的回归与移植层的回归跑在同一个 vitest 进程里，
 * `node scripts/test.mjs` 一次跑完两边。
 *
 * 环境默认是 node（文档/图像引擎的测试不依赖 DOM）；移植层那两个 DOM 测试
 * 用文件头的 `// @vitest-environment jsdom` 单独声明。
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/*.test.ts', 'tests/**/*.test.js'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
