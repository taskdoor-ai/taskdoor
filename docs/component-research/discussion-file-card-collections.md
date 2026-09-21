# 讨论附件：File Card Collections

2026-09-15，产品负责人指定使用 Faisal Amir（urmauur）的 File Card Collections，替换上一轮 InputBar 风格的附件草稿卡片。

## 来源与接入

- 指定组件：[21st.dev / File Card Collections](https://21st.dev/@urmauur/components/file-card-collections)。
- 作者说明：[File Card Collections](https://www.urmauur.com/interfaces/file-card-collections)。
- 实际源码：[作者 shadcn registry](https://urmauur.com/r/file-card.json)，源路径 `components/ui/file-card/index.tsx`。本轮读取 registry 后适配到 `src/components/ui/file-card-collections.tsx`，保留作者和来源注释。没有运行远程脚本，registry 未声明额外依赖；继续使用现有 React、Tailwind 和 cn。
- 安装方式由作者提供为 `npx shadcn@latest add https://urmauur.com/r/file-card.json`；本项目采用源码适配，避免覆盖现有共享配置。

## 保留与适配

保留原组件 56 × 72px 纸张卡、文档／表格／压缩包／代码等类型示意和右下角彩色格式标识。统一使用项目背景与边框语义；类型色标保留指定组件的配色。

增加可选实际图片、格式标签、className、compact 尺寸和 actions 插槽；装饰区域单独 aria-hidden，内部动作仍可被键盘与读屏访问。DOCX 等别名复用对应类型，未知格式使用通用文档示意并保留实际扩展名。类型示意不是正文解析结果。图片来自草稿 File、已有 IndexedDB 二进制或文件已有预览数据，加载失败时回到类型示意，不丢弃附件。

`DiscussionComposer` 统一使用该组件。按产品负责人后续反馈，每个附件占位缩至 80px 宽，使用约 48 × 60px 的 compact 纸张卡；下方只保留单行文件名，移除大小及“待发布”等常驻状态。18px 叉号位于纸张卡内部右上角，使用组件 actions 插槽；长文件名省略并保留完整名称提示，无障碍名称保留在文字及操作按钮。添加中只显示卡内小型加载图标，失败才显示完整错误及卡内重试。多个文件并排换行，触屏用透明命中区将操作目标扩至 44px，不放大可见按钮。

适用动态、回复和文件讨论的草稿附件，包括本地上传与选择已有文件。发布后的附件引用、File ID、固定版本、文件入库与移除语义沿用现有合同。

## 验证

前端 TypeScript 检查通过。独立浏览器验证 HTML、MD、XLSX、PDF、ZIP、PNG 的原组件预览与格式色标，实际图片读取、桌面并排、390px 窄屏换行、键盘移除、超限错误及重试入口，正文草稿保持不变；无页面运行错误。未运行全量测试或双重审查。

紧凑版另行验证了 80px 附件占位、48 × 60px 卡片、18px 叉号的卡内位置、键盘移除、就绪时无大小或状态行，以及窄屏换行。模拟本地存储失败后，错误完整可读；恢复存储并使用卡内重试可回到就绪状态，错误行随之移除。
