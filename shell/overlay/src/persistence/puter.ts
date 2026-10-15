/**
 * 本地文件版的 Puter 适配层（覆盖上游同名文件）。
 * ------------------------------------------------------------------
 * 上游把「工程存到哪」收敛在这一个模块里（`PuterStorage` + `download`），
 * 所以整个移植只需要换掉这一个文件：其余代码照旧 import 它，行为变成
 * 「存到这台机器上的普通文件」。
 *
 * 与上游的差别：
 *   - `PuterStorage.save()`：有记住的路径就直接写回去；没有就弹**宿主的另存
 *     对话框**，落到本机磁盘。宿主不在时退回浏览器下载。
 *   - `PuterStorage.open()`：弹**宿主的打开对话框**读本机文件。
 *   - `puter()` 返回一个只走本地文件的对象。它**不**被挂到 `window.puter` 上——
 *     上游有几处是 `window.puter?.auth?.isSignedIn()` 的形状（比如素材库的
 *     云端副本 `features/libraries/service.ts`），让 `window.puter` 保持缺失，
 *     那些分支就会自然走本地实现，这正是「本地文件优先」想要的。
 *   - `canSignOut()` 恒为 false：本地文件模型下没有「退出登录」这回事。
 *     上游 `ui/actions.ts` 里那个 `account` 动作由 `shell/edits.mjs` 摘掉。
 *   - AI / 协作这类需要 Puter 登录的能力在别处自己检查 `window.puter`，
 *     缺失时它们会报「不可用」，符合要求——不在这里假装它们能用。
 */

import { exportFile, importFiles, localAuth, saveToLibrary, usingHost, writeToPath } from '../otools/local.js';

interface FSItem {
  path: string;
  name: string;
  read(): Promise<Blob>;
}

interface Puter {
  env: string;
  auth: {
    isSignedIn(): boolean;
    signIn(): Promise<unknown>;
    signOut(): void;
    getUser(): Promise<{ username: string }>;
  };
  fs: {
    write(path: string, data: Blob, options?: { createMissingParents?: boolean }): Promise<FSItem>;
    read(path: string): Promise<Blob>;
  };
  ui: {
    showOpenFilePicker(options: { accept: string; multiple: boolean }): Promise<FSItem>;
    showSaveFilePicker(content: Blob, name: string): Promise<FSItem>;
  };
}

/**
 * 一个只走本地文件的 Puter 形状对象。
 *
 * 保留 `puter()` 这个导出是因为上游有几处直接调它；它的 `fs` / `ui` 全部落在
 * `local.js` 上，与云无关。
 */
export function puter(): Puter {
  return {
    // 'app' 让上游知道「这是宿主里跑的实例」（影响是否显示某些入口）。
    env: 'app',
    auth: {
      isSignedIn: () => localAuth.isSignedIn(),
      signIn: () => localAuth.signIn(),
      signOut: () => localAuth.signOut(),
      getUser: () => localAuth.getUser(),
    },
    fs: {
      async write(path, data) {
        await writeToPath(path, data);
        return { path, name: path.split(/[\\/]/).pop() || path, async read() { return data; } };
      },
      async read(path) {
        const { readPath } = await import('../otools/local.js');
        const blob = await readPath(path);
        if (!blob) throw new Error(`File not found: ${path}`);
        return blob;
      },
    },
    ui: {
      async showOpenFilePicker({ accept, multiple }) {
        const files = await importFiles({ accept, multiple });
        const first = files[0];
        if (!first) throw new Error('No file selected');
        return { path: first.path, name: first.name, read: () => first.read() };
      },
      async showSaveFilePicker(content, name) {
        const saved = await exportFile(content, name);
        if (!saved.path) throw new Error('Save cancelled');
        return { path: saved.path, name: saved.name, async read() { return content; } };
      },
    },
  };
}

/** 本地文件模型下没有「退出登录」，恒为 false。 */
export function canSignOut(_env: string) {
  return false;
}

/**
 * 一个文档的保存位置。
 *
 * `path` 为空串表示「还没存过」（宿主不在 / 用户取消了对话框），此时下一次
 * `save()` 会再弹一次对话框——与上游「未登录时每次都弹」的行为一致。
 */
export class PuterStorage {
  path?: string;
  private generation = 0;

  async save(blob: Blob, name: string) {
    const generation = this.generation;
    if (this.path && usingHost()) {
      const item = await writeToPath(this.path, blob);
      if (generation === this.generation) this.path = item.path;
      return item;
    }
    const saved = await exportFile(blob, `${name}.photo`);
    if (!saved.path) throw new Error('Save cancelled');
    if (generation === this.generation) this.path = saved.path;
    return { path: saved.path, name: saved.name, async read() { return blob; } };
  }

  async open() {
    const files = await importFiles({ accept: '.photo,.psd,.psb,image/*', multiple: false });
    const file = files[0];
    if (!file) throw new Error('No file selected');
    this.path = file.path || undefined;
    return { blob: await file.read(), name: file.name, path: file.path };
  }

  reset() {
    this.generation += 1;
    this.path = undefined;
  }

  /** 不弹对话框，直接落到本机库目录（自动保存走这条）。 */
  async saveToLibrary(blob: Blob, name: string) {
    const path = await saveToLibrary(blob, `${name}.photo`);
    this.path = path;
    return path;
  }
}

// Preferences → File Handling → Append file extension (set by the editor).
export const fileNaming = { extensionCase: 'lower' as 'lower' | 'upper' };

/** A file name with its extension in the preferred case. */
export function preferredFileName(name: string) {
  const m = /^(.*\.)([A-Za-z0-9]{1,8})$/.exec(name);
  if (!m) return name;
  return m[1] + (fileNaming.extensionCase === 'upper' ? m[2].toUpperCase() : m[2].toLowerCase());
}

/**
 * 导出/下载。
 *
 * 上游这里是无条件的浏览器下载；插件版改成「宿主在就落本机文件，不在才下载」——
 * 在 OTools 的 webview 里浏览器下载通常是被禁的，走宿主才真的能把文件交给用户。
 */
export function download(blob: Blob, name: string) {
  void exportFile(blob, preferredFileName(name));
}
