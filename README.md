# 中大工业地产：淡蓝 GEO 前后端演示

## 启动
Node.js >=18，无第三方依赖。`npm start`，默认仅监听 `127.0.0.1:18766`。
对正式托管平台：`HOST=0.0.0.0 PORT=8080 SITE_URL=https://你的公开域名 DATA_DIR=/持久化磁盘/leads npm start`。
`SITE_URL` 会在输出 HTML、robots、sitemap 和 llms 时替换 PUBLIC_SITE_URL 占位符。静态复制部署时须先替换这些占位符。

## 接口
- GET `/api/health`：健康检查。
- POST `/api/contact`，Content-Type: application/json。
  字段：company、person、phone、note、consent:true。前三项必填，phone 为11位中国手机号；note 可选。
  成功 HTTP 201，返回 ok、id、message。错误 HTTP 400/403/413/415/429/500。
- 不开放线索列表、下载或管理接口，避免公开个人资料。
- 前端测试：打开 `/#contact`，填写虚构测试信息，勾选同意，提交。只有保存成功才显示成功编号；失败不清空输入。

## 存储和注意事项
默认线索保存到站点目录外 `../zhongda-private-data/<UUID>.json`；私有目录和文件分别为 0700/0600。生产必须设置 DATA_DIR 指向持久化磁盘，备份和删除由管理员管理。本项目不实现登录后台或消息通知。
这是演示系统，请不要收集真实敏感资料。表单已明确提示测试存储、不自动通知；正式上线前需确认隐私政策、留存期限、访问权限、反垃圾策略、企业资料与客户回访流程。

## GEO
中文 title、description、keywords；Open Graph、canonical；Organization + RealEstateAgent + PostalAddress + FAQPage JSON-LD；首页可见公司全称、地址电话、5条自然语言常见问题；robots.txt、sitemap.xml、llms.txt；noscript回退显示静态正文，统计数字有静态值。
不保证任何AI或搜索引擎收录。llms.txt是辅助说明，非主流平台的收录承诺。正式域名、稳定HTTPS、中文可达性、可抓取性、搜索引擎索引与外部可信引用仍需独立验证。
原站的项目数量、入驻数量、周期和宣传性表述未新增、未核验；没有编造注册号、坐标、成立日期、客户评价、资质或价格。公司全称、电话、地址来自原演示站。

## 当前公开部署状态
已尝试 Cloudflare Quick Tunnel，环境出站 7844 的 QUIC 和 HTTP2 均不可达，生成的 trycloudflare 地址返回 HTTP 530，不能作为已交付外链。未绕过网络限制。
当前 Node 前后端可通过 box 本机 `http://127.0.0.1:18766` 测试；尚无可用公网 URL。

## 色彩
深墨黑背景 -> #EEF5FB；次级 #F5F9FC；分区 #E5EFF8；米白 -> #F8FBFE / #E8F1F9；正文 #243B53；次正文 #52677D；分隔线 #CEDDEB / #D9E5EF。金色点缀调整为 #A78146 / #8A672D。导航和图片遮罩改为淡蓝半透明；原响应注入的黑底开机广告遮罩已移除，业务文案及原图片保留。
