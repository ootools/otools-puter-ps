/**
 * 逐条外科手术式改动（1~5 行的局部修改）。
 * ------------------------------------------------------------------
 * 每一条都必须能命中：`expect` 是硬约束。上游改了那段代码，构建会报
 * 「命中 N 次，期望 M 次」并打印是哪一条、为什么改。**不要为了让构建过而
 * 放宽 expect**，要去读上游的新代码，把 find/replace 更新到新的形状。
 *
 * 超过 5 行、或者涉及结构性改动，就别放这里——走 shell/overlay/ 整文件替换
 * （本项目的 `src/persistence/puter.ts` 就是这么换掉的）。
 *
 * 这批改动主要摘掉需要 Puter 登录的入口：登录、云端素材库、实时协作、云端脚本
 * 都要 Puter 账号；插件版一律让它们消失或停用，文件一律走本机
 * （见 shell/src/otools/local.js）。另有一类「路径适配」改动：插件页面由宿主用
 * file:// 加载（entry 是相对路径 dist/index.html），上游写死的绝对路径资源
 * 会被解析到磁盘根而 404，必须改成相对路径。
 */
export const edits = [
  {
    file: 'src/app/shell.ts',
    find: `    <button data-command="app.account" id="account" class="account" title="Puter account" aria-label="Puter account">\${svg('user-round', 16)}</button>\n`,
    replace: '',
    expect: 1,
    why: '顶栏的「Puter 账号」按钮：本地文件模型下没有账号可看，整个按钮去掉。',
  },
  {
    file: 'src/app/shell.ts',
    find: `title="Save to Puter"`,
    replace: `title="Save to this device"`,
    expect: 1,
    why: '保存按钮的悬停提示改成「保存到这台设备」，与新的保存行为一致。',
  },
  {
    file: 'src/ui/actions.ts',
    find: `      if (!p.auth.isSignedIn()) {`,
    replace: `      if (false) { // 移植：不再登录 Puter，文件一律存本机`,
    expect: 1,
    why: 'account 动作里的登录分支：插件里没有 Puter 登录，整支关掉。',
  },
  {
    file: 'src/ui/actions.ts',
    find: `'Puter account'`,
    replace: `'Account'`,
    expect: 2,
    why: '账号对话框标题：两处（登出确认 / 信息弹窗）都去掉 Puter 字样。',
  },
  {
    file: 'src/features/collab/index.ts',
    find: `enabled: (ed) => ed.hasDocument && owns(ed) && !sharedOf(ed.session)?.review,`,
    replace: `enabled: () => false, // 移植：实时协作要 Puter 账号，入口停用`,
    expect: 2,
    why: 'Invite to Edit / Share for Review 两个命令：都要云端协作服务器，停用。',
  },
  {
    file: 'src/features/collab/index.ts',
    find: `enabled: (ed) => sharedOf(ed.session)?.role === 'owner',`,
    replace: `enabled: () => false, // 移植：同上，Stop Sharing 也不会有共享可停`,
    expect: 1,
    why: 'Stop Sharing 命令：没有共享过，入口停用。',
  },
  {
    file: 'src/features/scripting/index.ts',
    find: `cmd({ id: 'file.scripts-browse-cloud',`,
    replace: `cmd({ id: 'file.scripts-browse-cloud', hidden: true,`,
    expect: 1,
    why: '「Browse Puter…」脚本命令：走云端脚本库，隐藏；本机那份 Browse… 保留。',
  },
  {
    file: 'src/app/shell.ts',
    find: `src="/app-icon.png"`,
    replace: `src="./app-icon.png"`,
    expect: 1,
    why: '插件页面走 file:// 加载，`/app-icon.png` 会解析到磁盘根（file:///app-icon.png）而 404，空白页与「关于」里的应用图标就成破图；改成相对 dist/ 的路径。',
  },
];
