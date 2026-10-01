# ADR 0122 — 受鉴权的公开图片链接读取

- Status: Accepted
- Date: 2026-10-01
- Task: [GG-245](../tasks/GG-245-canvas-image-link-read.md)

## Context

GG-233 在浏览器以 CORS 读取图片直链，再复用现有 File 上传。用户提供的 cafe24 链接返回正常 JPEG，却不返回跨域授权头，因而无法添加。用户明确要求子 agent 修复该链接添加问题。

## Decision

以 `POST /api/references/read-link` 接收有界 JSON 图片 URL；使用现有真实会话、owner 和 workspace 授权，授权完成后才访问远端。仅返回验证后的 JPEG/PNG 字节，不建立 ready 记录或保存素材。客户端取得 File 后继续原上传、完成验证、文件夹归档和重试流程。

远端只允许不含凭据的 HTTP(S) 公开地址。检查所有 DNS 结果，阻止环回、私网、链路本地、元数据、保留及其他非公开地址；将连接固定到已验证地址，保留原 Host、TLS 主机名与证书验证。每次重定向重新检查并固定地址，有界跳转；不转发 Cookie、Authorization 或 Referer。

整体读取有超时和取消，声明长度及实际流量均受现有 20 MiB 图片上限约束，复用真实图片解码及尺寸验证。响应为私有、禁止缓存的二进制，错误沿现有 reference API 契约返回并留在链接表单。请求中断须终止远端读取。

## Consequences

替代 ADR 0108 GG-233 的 browser-only/no server URL fetcher 约束，仅增加受鉴权、只读、有界的公开图片读取边界。没有 provider 请求、数据库/对象写入、新素材模型或 Worker/迁移变更。需同步实际本地 Web，生产发布仍独立授权。

自动验证覆盖公开地址解析与连接固定、重定向、格式/大小/超时/取消、授权及既有上传衔接。所给公开 URL 允许只读内存验证；真实资产导入、浏览器效果及是否满足预期由用户验收。
