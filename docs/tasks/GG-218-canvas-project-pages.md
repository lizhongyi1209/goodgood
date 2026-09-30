# GG-218 · 画布项目页面

- 日期：2026-09-30。
- 最新运行接续：GG-217已在ba9a947上叠加平台币退役并切换到verified05e90d2，Web25808/唯一Worker6240，5173/34440继续，0055/55条迁移保持。下文ba9a947/PID31576/29504为本任务当时交付证据；后续重启必须从05e90d2接续，勿恢复旧JCOIN Worker。见[GG-217](GG-217-remove-jcoin.md)。
- 状态：页面前端与后端本地运行已整合，删除弹框层级/样式修复已回放，待站长手验，未部署；不运行自动功能测试、浏览器复测、上传或生图请求。
- 来源：站长提供顶部页面标签参考，要求每项目默认页面1，最多10页，左上角加号新增页面，统一图标和文字上下视觉高度；已确认×删除页面需二次确认。
- 决策：先补ADR0114页面扩展。每页独立节点、连线、生成器草稿及参考图；至少保留一页；删页面只删项目内该页内容，不删资产库、不取消真实任务。上传/生成中或提交未确认的页面不允许删除。
- 范围：schemaVersion2多页JSON文档，兼容旧schemaVersion1无损作为页面1；新增/切换/删除、全部页面本地和云端保存、页内撤销/重做、逐页本地视角与激活页面、后台结果按原页更新。切换页面与视角仅本地偏好，不独立发内容云写；新增/删除属于内容更改。无新路由、页面重命名、页面间连线、全局资产删除或生产操作。
- 限制：1..10页，总项目1MB/1000节点/3000连线沿原限制；page IDs稳定、节点IDs全项目唯一、页内边有效；各页材料权限与CAS隔离保持；旧客户端不得将多页降为单页写覆盖。
- 分工：canvas_project_pages_backend独立runtime树做共享契约/后端；canvas_project_pages_ui独立UI树做前端并精确回放GG-116；根维护决策/文档与必要本地运行同步。GG-216同步状态修复继续并行且须保留。
- 来源基线：GG-116/efb72d9 dirty前端；后端verified29e566d。当时54迁移/Web25576/Worker30008已由下面GG-218运行记录替代；Vite34440保持。不从main或C6批量合并。
- 验收：旧画布内容进入页面1，切换不同页面内容/历史/参数独立，异步任务回原页；可加至10页，删除有确认且保留至少一页；刷新/断网恢复全部页面，云端无浏览器临时字段；图标文字同高、选中浅灰、hover删除、横向容纳紧凑。
- 下一步：站长手验页面切换/保存/后台任务归页与删除确认弹框；本会话不代测。GG-217另一窗口接续ba9a947串行替换运行时，沿用0055，不启动第二个Worker或回退服务。

## 前端与删除弹框修复

- 独立GG-218-ui从verified29e566d建立当前前端基线11bd25c，保留GG-216和v2契约于e929c91，页面实现提交3a45711d9cec14c7a3daba56c84bd1553a30703c。8文件精确patch回放到GG-116，未覆盖其它dirty变化；按换行归一化后源码相同。
- 一个ReactFlow实例按页替换节点/连线，草稿/参考图按全局唯一ID归属，上传及真实job结果定位原页；页历史/clipboard独立，本地viewport/激活页不进入云写签名。v1/v2 canonical signature避免仅打开旧项目产生格式保存；切页先等待已有IndexedDB队列。
- 删除只清所属页节点/边/草稿/失败恢复文件与同步失败标记，保留资产库；活动上传/转换/生成和SUBMISSION_UNKNOWN禁删。pendingCanvasProjectContent继续兼容GG-216，未知提交即使恢复为failed也仍dirty且显示生成待确认，普通failed/cancelled占位不再假报上传。
- 站长指出删除确认弹框样式异常。静态代码发现app/globals.css把alert-dialog遮罩提升至70，而新弹框仍沿用shadcn z50，内容被遮罩覆盖。本次局部修为遮罩70/内容71，浅灰遮罩、白底黑字、紧凑左对齐文案与右对齐按钮，保留Radix确认/取消和焦点语义、减少动态效果偏好。不改全局弹框或页面删除逻辑，不改变ADR0114决定。
- 弹框修复隔离提交2420c4a；CSS与页面bar精确回放当前GG-116，不改服务或数据库。静态diff check完成，未复测。
- 5条UI测试定义未执行；只作源码审阅与精确差异检查。隔离静态类型审阅仅报告本次未改的既有addEdge(pathOptions) TS2353；未运行check:local/浏览器复测/provider请求，未宣称功能验收通过。弹框补丁同样未复测。

## 后端与运行证据

- backend子agent完成v1/v2结构验证、1..10页/20码点页名、页内边和全项目节点/边ID唯一、1000/3000/1MB总上限，浏览器临时字段不进云端。保存维持project owner/workspace与CAS，对已有v2拒绝v1降级写；全部页新增资源批量鉴权，原项目已引用但后来不可用的ID仍可移动/升级，读取继续私有边界。新project校验全部资源；不重新鉴权整套旧快照以免页升级锁住用户内容。
- 独立GG-218-runtime从verified29e566d提取7个本任务文件（5源/迁移/定义及任务/决策），提交ba9a94777ab34d8b743bbdde47a7105d77b0833c。锁定依赖npm ci、启动必要build:checkpoint/verify:checkpoint完成；sourceHash1156727292163c2fb5085e751bebbd13d9d8a9ed2671837cb3b91f1c11e5f724，artifactHashfa52ab3347dfb41df2213304b2c0ca955aee4016bc27fda51f94ca8a4e06d92f。
- 两次zero active/outbox/personal+organization reserved/Valkey ready+processing后，替换旧Web25576/Worker30008，只对127.0.0.1:54449/goodgood执行0055至55条迁移，不启用fixtures。原2个项目version/content JSON前后fingerprint一致7100a7f6e3dc2882da37d53cabcbf939，证明迁移未重写用户数据。新Web32131 PID31576、唯一Worker32142 PID29504均五项ready ok；5173 Vite34440不变，代理同verified revision。外部cloud配置和忽略Valkey56549启动helper沿用，日志%TEMP%/goodgood-local-services/gg218-{web,worker}.{out,err}.log。
- tests/gg218-canvas-project-pages.test.mjs含11项结构/保存/权限/原引用保留/降级/迁移定义，未执行。必要编译和就绪来源核对不是功能验收；未浏览器复测、用户素材写改、真实provider请求或生产操作。
