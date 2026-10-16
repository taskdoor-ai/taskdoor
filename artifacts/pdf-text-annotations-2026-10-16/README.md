# PDF 原版式选文标注验证

日期：2026-10-16。范围：当前 PM demo，不涉及正式仓库或远程 issue。

PDF 改为浅色内嵌阅读器，原分页版式上叠加可选择的文字层，接入既有临时标注。页码、当前文件版本、页内原文快照与准确偏移共同定位；缩放后重新计算高亮。PDF 运行库按需加载，worker、字体、字符映射及 WASM 随本地构建提供。

## 实际页面核验

- 主工作区 5173，1280×720：原版式 PDF、页码和缩放、选择“执行”后出现标注入口、输入修改意见、编号与蓝色高亮、意见定位、全屏及退出。
- 发现并修复同一标注重复定位问题。翻到第 5 页后，再次点击同一条意见来源，回到第 1 页对应文字；缩放 74% → 85% 后高亮仍对应原文。
- 用户现有 629×804 页面：原生键盘 Shift+Down 扩展两行选区，打开标注浮层后有两条准确高亮及完整局部截图，页面没有横向溢出。最终调整 keyup 监听后重新验证。
- 独立 4173 构建预览实际上传原始 PDF（没有预先提取的预览数据），可选择文字并添加编号标注。
- 独立 4173 上传单页扫描件：保留真实图片版面，文字层为零，显示无可选文字提示。上传损坏 PDF：显示失败与重试；重试仍失败，不生成替代正文，错误状态不显示全屏入口。

## 最小验证结果

- `server/pdfTextSelection.test.ts`、`server/taskFileAnnotations.test.ts`、`server/taskFileTextAnnotation.test.ts`、`server/taskFileFullscreenDownload.test.ts` 共 **29/29** 通过，见 `targeted-tests.log`。
- 最初直接运行相关测试遇到 Node 不认识 CSS 导入，见 `targeted-tests-initial.log`。使用本目录的验证专用 `node-assets.mjs` 适配 CSS/SVG 导入后全部通过，未修改共享测试配置；浏览器继续加载真实样式。
- 应用 TypeScript、结构门通过。最终键盘监听微调后，应用 TypeScript 与 Vite 前端构建再次通过，见 `typecheck.log`、`structure-check.log`、`frontend-build.log`。
- 未执行全量测试或双重审查。Vite 仍有既存配置兼容和大 chunk 提醒；不把前端构建表述为完整 `npm run build` 已通过。
- PRD 构建成功生成 25 个模块，已核验 PRD-0223、064／066 内嵌 JPEG、索引及截图清单 JSON；本轮范围格式检查通过，见 `validation.json`、`prd-build.log`、`diff-check.log`。

## 页面证据

正式截图均来自主工作区 5173 当前实际页面，保存在 `docs/prd/assets/files-local-commits/`：

- `pdf-light-reader-zh.jpg`：浅色原版式阅读器。
- `pdf-text-annotation-composer-zh.jpg`：选文、页码、局部截图与意见输入。
- `pdf-text-annotation-highlight-zh.jpg`：已添加意见、编号、高亮与来源预览。
- `pdf-text-annotation-compact-zh.jpg`：629×804 原生页面跨行选择后的标注浮层。

异常证据 `scanned-page-message.jpg`、`invalid-pdf-message.jpg` 来自独立构建预览；测试夹具及 PDF 文字检测结果保留在本目录。

## 边界

只接受同页选文，可跨行；跨页选区提示在同一页重新选择。扫描件未接 OCR。保留既有文本编辑版本的实际正文，不将其称为新的 PDF 二进制文件；不直接改写原始 PDF 或写回 PDF 批注。未验证加密 PDF、外部 AI 发送、正式服务权限及跨端共享。

本次记录 PRD-0223、本地待提交汇总第 57 项。PR 待补，未创建、更新或评论远程 issue。
