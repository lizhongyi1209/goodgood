# GG-337 · 画布与资产列表右键下载原图

- 日期：2026-10-03；用户手验清理副本后缺少下载入口，要求画布图片及画布内资产列表右键提供下载，文件不额外压缩；之后会发送下载文件核验元数据。
- 基线：当前GG-116/5173干净c09d623，已核验4f686a1为祖先；负责人为当前元数据窗口。隔离分支codex/GG-337-original-download，工作区C:/Users/Admin/.codex/worktrees/gg-337-original-download/goodgood，关联组/大厅窗口idle。
- 决策：补ADR0034右键下载范围。只下载当前图片的原始文件字节，保留尺寸/格式/元数据状态；新清理副本下载自身，不取旧源图或512/2K预览。支持本地保留File Blob和已保存私有图片。批次按实际右键输出定位，不默认下载其他位置。
- 文件边界：共享image-download Blob保存出口、canvas-image-download目标/读取与取消状态、workspace和asset-panel既有右键菜单、必要合成回归来源与当前产品/交互/架构/错误/交接说明。原清理算法/素材持久/API/生成/积分/上传与运行不变。
- 验收：上传/拖入/生成结果及展开批次中右键图片可下载；本地清理副本上传中/失败仍有原始Blob可下载；资产列表生成/参考图片可下载，文件夹/其他媒介不误显示图片入口。空白创建菜单、编辑器原生菜单、原重命名/删除保持。下载中禁用重复，错误/空文件可重试且不生成文件，换页/身份/卸载取消读取，下载文件名扩展名按实际MIME。
- 验证边界：沿GG-276用户约定只开发代码/精确接入，必要回归源码只写，不运行编译、lint/typecheck、代码/diff检查、测试或浏览器验收。不安装依赖或执行应用HTTP/SQL/Provider/服务/生产操作。用户随后明确提交本地下载副本并要求分析，只读实际文件检查已完成，见下方receipt；这不等于运行应用回归或全功能验收。
- 生命周期：创建1/退役1；辅助工作区已managed归档并确认，提交保留，无子agent或依赖/构建缓存。
- 实现：两处既有Radix菜单新增下载原图，画布全局浏览器菜单拦截允许图片目标。稳定ID读取受权原图，本地上传中/失败保留File可直接下载；批次按实际点击ID。共享Blob保存不改文件字节，名称按MIME修正，取消旧读取与toast，失败可重试。新增纯合成回归来源覆盖原始字节/目标/失败/取消，只写未运行。
- 接入：隔离18cb9aa精确接入GG-116为33525ab，接入前当前分支干净且仍c09d623，保留GG-336/335/334及其他窗口源码。没有冲突或额外合并。
- 状态：已实现并接入当前5173源码；未验证、未部署，无后台更新。GG-330 verified94bee535及原Web/唯一Worker/Vite/数据/SMTP receipt保持，本轮未重查运行。
- 实际文件核验（2026-10-03）：用户提交GoodGood_20261002_223418_01_无元数据.jpg，3,120,501字节，SHA256 32430ff11999f55188b12f81949bf9173c1aa0d39ad54e742e976cac0bdf169c。独立二进制解析完整JPEG容器及扫描后区域：APP0/JFIF一段14字节，其余仅DQT/SOF0/DHT/SOS/EOI，APP11/APP1/APP13/COM均0、EOI后尾部0；全文件C2PA/JUMBF/Manifest Store UUID及XMP/EXIF/IPTC标识未发现。另以Pillow只读独立解码成功，RGB 1792×2390、EXIF标签0、仅JFIF/dpi信息。当前副本不含内嵌C2PA或EXIF/XMP/IPTC/注释；没有清理前原文件，不能据此证明原图此前含凭证或验证前后像素/压缩流一致，不检查像素水印或外部凭证。未修改/上传用户文件，未把图片加入Git。
- 第二份实际文件分析（2026-10-03）：用户提交GoodGood_20261003_114712_01.jpg并要求查看原始C2PA。文件3,037,805字节，SHA256 4a583bd8baddf74d7fed32ebc14ab0e025be4f3de239f79258ce023792985889，RGB 1792×2390正常解码；APP11一段，文件offset20、完整6347字节、载荷6343字节、JUMBF Manifest Store6335字节。Manifest urn:c2pa:d8709677-cbb0-7c6f-260d-44d1d8952bcc，claim.v2、actions.v2、hash.data、ingredient.v3及COSE Sign1均完整读取。
- 原始声明：claim_generator_info为Google C2PA Core Generator Library，version 991556641:992032171；actions记录Created by Google Generative AI.与Applied imperceptible SynthID watermark.，digitalSourceType均为trainedAlgorithmicMedia。ingredient仅Input ingredient 0/inputTo，没有具体模型名或提示词。签名证书主体Google Media Processing Services，颁发者Google C2PA Media Services 1P ICA G3。
- 本地完整性核验：图片hash.data排除offset20/length6347后的SHA256匹配；依C2PA规范8.4.2.3对各JUMBF superbox内容（不含外层header）核验三条声明hash均匹配；用随附叶证书公钥核验ES256 detached claim签名匹配。未执行根信任链、撤销/时间戳或完整C2PA规范验证，也未检测像素SynthID水印；不能仅据字段宣布完整受信。
- 原始数据交付：仓库外C:/Users/Admin/.codex/visualizations/2026/10/03/01a0ffe9-10ca-7f40-bac7-dd96f8167df7/c2pa-114712导出original-c2pa.jumbf（原始6335字节）、original-app11.bin（原始6347字节）、decoded-c2pa.json（完整解码，二进制为带长度base64）及original-actions.json。原图片未修改/外传/入Git，公开规范只读。与上一文件不是已确认的清理前后配对，不据二者验证像素/压缩流前后一致。
- 下一步：第二份文件已提取并提供完整原始C2PA；前一副本当前无内嵌C2PA。若需要证明同一图片清理前后变化，需配对原文件/副本再只读对比。应用回归/浏览器全流程仍未运行，不扩大本轮授权。
