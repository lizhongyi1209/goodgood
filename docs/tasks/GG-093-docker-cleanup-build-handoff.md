# GG-093 — 废弃Docker清理与构建版本交接

- 日期：2026-09-15；状态：已完成（本地交付，未发布）；分支chore/GG-093-docker-cleanup-build-handoff / F:/goodgood，基线bc0e053包含f68ba81及a73835f。
- 用户授权：清理Docker中废弃不再使用的资源，提交构建产物等交接说明，保证无上下文接续。
- 范围：只删除确认历史的goodgood-gg025/gg029-style/gg031/gg033-real/o1key-local容器、无剩余容器引用的旧GoodGood应用镜像、闲置构建缓存与相应空网络。保留goodgood-gg052三个现用依赖、gg044 Mailpit、new-api栈及全部数据库/素材卷，不触碰生产或主机用户文件。
- 依据：当前累计服务为根目录Node、PG54449/Valkey56449/RustFS58049与Mailpit58045/58046；被替代的旧Web端口3010/3030/32029/32133容易误开，其中旧真实Worker已处于重启失败，停止删除不触发provider调用。
- 清理前Docker：44容器/33运行，20镜像报告24.32GB，34卷914.3MB，buildcache20.83GB。镜像/cache可能共享存储，不将相加值宣称主机物理回收。
- 已执行结果：删除37个确认废弃容器、9个旧GoodGood应用镜像、5个空项目网络，另删除确认无引用的postgres:16-alpine与node:24.12.0-bookworm-slim；`docker builder prune --all --force`回收构建缓存21.92GB。34个卷全部保留；清理后Docker为7个容器、9个镜像/2.464GB、构建缓存0，未删除new-api/redis/postgres或现用gg052/gg044依赖。
- 门禁修复：根目录类型检查此前递归读入被`.gitignore`排除的`work/`和`.sites-runtime/`旧预览产物；将两者加入`tsconfig.json`排除项，未修改业务代码或用户数据。
- 决策：产品规则不变，无新产品ADR；补本地构建来源/启动保护与交接，旧样式用户手验状态保持。
- 验证：构建来源定向测试5/5通过；清理后仅保留gg052依赖、gg044 Mailpit及三个无关项目容器；旧GoodGood端口3010/3030/32029/32133无监听。`npm run build:checkpoint`写入提交、源码和dist指纹，`npm run verify:checkpoint`拒绝缺失/过期/篡改产物；`/api/health/version`用于核对运行进程的verified revision。未fixture原goodgood，不发真实邮件/生成。
- 下一步：从本任务最终提交和`goodgood-local-2026-09-15-gg093`标签继续；新窗口先执行交接页的Git、构建指纹和端口核验，再从GG-094分配新需求。生产仍未部署。
