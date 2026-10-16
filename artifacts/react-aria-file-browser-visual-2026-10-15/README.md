# 文件浏览界面视觉重做

用户指出前轮只替换底层交互，外观差异不足。本轮在当前 PM demo 中重做文件浏览的可见层级，记录为 PRD-0220。

- 文件夹以卡片分组，文件列表使用格式图形、名称及版本辅助行；名称列获得更大空间。
- 文件树改为彩色格式图形及双行名称；只有当前聚焦行的更多菜单进入Tab顺序。
- 无具体文件定位的首次会话显示根目录；显式文件定位优先；切换页签保留当前位置。
- 原生当前629px页签、1280px宽屏与390px同运行时iframe均核对；未改任务列表、预览引擎或标注业务。

## 证据

1. 三个既有定向文件共15／15通过，[日志](targeted-tests.log)。
2. 真实Explorer静态渲染验证默认根目录及显式文件直达两种入口，[日志](initial-location-check.log)。仅Node渲染略过样式及图形资产，不修改公共测试配置。
3. 应用TypeScript、[结构门](structure-check.log)与[Vite生产打包](frontend-build.log)通过。未运行全量测试、双重审查或重跑此前受既有服务端测试类型错误阻挡的标准构建。
4. 浏览器实测卡片菜单隔离、横向方向键／回车、文件打开、切页签保持、当前树行唯一菜单Tab停靠点。629px与390px均无横向溢出；390px更新列隐藏。

## 当前图像

- [宽屏根目录](../../docs/prd/assets/files-local-commits/file-browser-visual-directory-zh.jpg)
- [宽屏文件预览与树](../../docs/prd/assets/files-local-commits/file-browser-visual-preview-zh.jpg)
- [用户当前窗口629×804](../../docs/prd/assets/files-local-commits/file-browser-visual-compact-zh.jpg)
- [390×700 iframe文件列表](../../docs/prd/assets/files-local-commits/file-browser-visual-mobile-zh.jpg)

旧图050～053保留历史，不当作新外观证据。没有真机触屏、软键盘、真实上传／移动／删除／标注提交验收；不提交或发布远程变更。
