# GG-023 — Sharp 安全更新

- 状态：本地完整门禁通过；等待 CI，线上镜像尚未变更
- 来源：累计发布记录合并后的 main 镜像安全扫描
- 最后更新：2026-09-09
- 分支：`fix/GG-023-sharp-security`
- 基线：`572a3b7c6f8ec7f7193a99799921d9387e58c9fd`

## 范围与验收

- 将直接运行时依赖 Sharp 从 0.35.0 升级到修复版 0.35.4，更新锁文件与精确版本契约。
- 保持参考图校验、provider 图片解码、运行时打包和产品行为不变。
- 完整本地门禁与 GitHub CI 通过；Trivy 的 HIGH/CRITICAL 镜像扫描恢复绿色。
- 不改数据库、迁移、价格、账户或生产数据；不发起真实 provider 请求。
- 这是已锁定依赖的安全修复，不改变产品决策，无需新 ADR。

## 实现与证据

- main run `34302821815` 的源码/依赖/构建检查通过；发布镜像的 Trivy 扫描唯一失败项为
  Sharp 0.35.0 的 `GHSA-rgj7-g3m4-5g8c`，严重度 HIGH，扫描器给出的修复版为 0.35.4。
- `npm view sharp@0.35.4 version` 确认固定版本可用；manifest、override 和锁文件现统一
  固定 0.35.4，Sharp 运行时依赖的 libvips 从 1.3.0 更新为 1.3.3。
- 定向 CI/资产/参考图测试 16/16 通过；真实图片解码校验通过，`npm ls` 只解析出
  `sharp@0.35.4`。
- `npm run check:local` 通过：252 项中 246 通过、6 个 opt-in 跳过、0 失败；lint、
  typecheck 和本地构建通过。`git diff --check` 通过。
- official npm audit 另列出 Next 16.2.11 的 Windows-hosted RCE 和 Next AVIF optimizer
  advisories：生产运行于 Linux，且 GoodGood 使用 vinext 自有运行时而非 Next 图片优化 API；
  AVIF 的底层 libheif 风险由本次直接 Sharp 更新处理。是否升级 Next 不扩入本次最小修复，
  仍由实际 runtime 镜像 Trivy 门禁 fail-closed 判定。
- 待记录：PR/main CI 与最终安全镜像摘要。

## 恢复工作

- 尚未完成：CI 与最终安全镜像；新镜像尚未形成或部署。
- 阻塞/风险：当前线上仍运行 0.35.0。新的精确生产候选需要重新生成发布证据；此前仅一次
  真实生图授权已经使用，不得擅自再次发起计费请求。
- 下一步：完成最小依赖升级和 CI；在请求新的生产发布/冒烟授权前保持线上身份不变。
