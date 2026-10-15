/**
 * OTools 插件版入口（覆盖上游同名文件）。
 *
 * 与上游 `src/main.ts` 唯一的差别是第一行：装 OTools 的语言 / 主题 / 本地文件
 * 三件套（`shell/src/otools/boot.js`）。必须在 `new Editor()` **之前**装好，
 * 否则界面会先按英文画一遍再被翻译层翻一遍，看得见闪一下。
 *
 * 其余启动流程一行未改。
 */
import './otools/boot.js';
import './style.css';
import { Editor } from './editor';
import { emitAppEvent } from './app/app-events';
const root = document.querySelector<HTMLElement>('#app')!;
const editor = new Editor(root);
if (import.meta.env.DEV) (window as unknown as { photoStudio: Editor }).photoStudio = editor;
void editor.start().then(() => emitAppEvent('start'), (error) => {
  console.error(error);
  editor.el('#engine-status').textContent = 'Graphics unavailable';
  editor.message(error instanceof Error ? error.message : String(error));
});
