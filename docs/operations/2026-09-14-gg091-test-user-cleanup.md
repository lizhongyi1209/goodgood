# GG-091 线上测试用户清理记录

- 授权：2026-09-14用户明确“线上的测试用户，删除所有”；清理现存全部10平台测试账户，含1站长。仅数据清理，未部署GG090/GG091或累计候选。
- 生产身份：现有blue Web/唯一blue Worker，镜像40ebfc40ced1963f02250bd8518823567e25692f82c31793817760cdb58db2cb，迁移0019_gg021_nano_banana_pro_prices.sql不变。
- 事前：10 active/15资产/13参考素材/37终态job/冻结0/支付订单0；R2当前29对象全部关联这些测试用户，两个generation列表均0，无未识别对象。用户集合SHA256 3458c15ab1d4de8f7388fb02954dfeea79eaa4a1bbe52c03c4da9d8bdafefab0。
- 备份：自动加密异机快照9be63aec；事前备份144660字节，SHA256 827f923343f490bb7ff0ab6a281f43994beacf17964d3baf99d168b298d23550。另服务器临时演练dump144660字节、20662f091e59b8b3907719d73dc94a4a1e185eea2d64d8405f00e268d9d4e856。
- 演练：现有还原工具要求维护标记，未执行生产还原；服务器上新建goodgood_gg091_cleanup_drill_20260914、完整还原事前备份，在明确无Worker临时库执行同一清理事务，19用户/测试表为空，三个全局配置表完全一致，未接触R2或Redis。演练库已删除。
- 执行：2026-09-14T15:27:14.055Z完成。短暂暂停现有blue Web/Worker，以unused green容器仅运行凭据不外泄的一次性operator；5秒锁超时、固定0019/22表契约、精确10用户集合/15资产/13素材/37终态任务/冻结0/支付0和配置哈希校验后，事务清空19测试用户相关表（RESTRICT处理循环FK，不禁用任何触发器），保留price_versions27条、payment_product_versions1条、migration19条。仅删除清单内29个R2对象并核对0残留；两个generation列表无未授权成员。不是执行历史转换或全库重置。
- 事后：用户0、资产0、素材0、job0、当前R2对象0；配置摘要前后均ddc444c35664e69bbcfbb45e382b1d00b61deb07ec8e2a3b7dd3bf321ab6e46e。Web/Worker自动恢复，均running/not-paused/healthy；公网首页200、/api/health/ready200、未登录/api/auth/session401。
- 审计：服务器/var/lib/goodgood/production/gg091-test-user-cleanup保存root0600前后清单与operator。身份ID、对象Key、凭据、备份内容未复制回本地；清单仅在服务器保存。
- 结果：原站长测试账户已删除，线上无站长；重新注册及配置新站长属于后续明确操作。线上仍原Authing模式，邀请码功能仅本地候选，不能将本次清理当功能上线。

- 清理后加密异机备份已通过，快照dd8f7ce6，93354字节、SHA256 a3caa492c456506967834c2ec46bf6c9fb30289ee77f00d848396151f4ca911b；最新恢复点是用户已清空状态。

临时明文备份按精确路径校验SHA256后已移除；事前9be63aec与事后dd8f7ce6加密异地快照及服务器0600审计记录保留。
