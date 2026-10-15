# YouTube 双语字幕 · iPhone 测试版

在官方 YouTube App 中显示 **原文＋简体中文**。无需另装播放器、登录本项目或配置 AI API Key。译文由 YouTube 提供。

**当前支持 iPhone + Shadowrocket。Android 尚未实现。** Shadowrocket 是独立的第三方付费应用，不包含在本项目内。此项目不提供代理节点，也不保证所在网络可访问 YouTube。

## 手机安装

[打开手机安装页](https://lufeidamowang.github.io/youtube-bilingual-subtitles/) · [下载 v0.3.0 模块](https://github.com/lufeidamowang/youtube-bilingual-subtitles/releases/download/v0.3.0/YouTube.Bilingual.srmodule)

1. 已安装 Shadowrocket，并确认官方 YouTube 能正常播放。
2. 在 Shadowrocket 的「配置 → 模块」添加下面的模块地址；也可从安装页点击导入按钮。
3. 在当前配置的「HTTPS 解密」中生成自己的 CA，按提示安装描述文件，再到 iOS「设置 → 通用 → 关于本机 → 证书信任设置」信任自己生成的证书，并启用 HTTPS 解密。界面名称可能随版本变化。[Apple 证书信任说明](https://support.apple.com/en-us/102390)。
4. 保持 Shadowrocket 连接，回到 YouTube，点击播放器 **CC**，选择**原语言字幕**。原文下面会追加简体中文。

```text
https://github.com/lufeidamowang/youtube-bilingual-subtitles/releases/download/v0.3.0/YouTube.Bilingual.srmodule
```

从早期局域网测试版迁移时，请先停用旧的「YTB 双语字幕 M0」模块，避免两个字幕模块同时运行。

**每条新视频先检查 CC 是否开启。** 本模块不会替 YouTube 自动打开 CC。选择 YouTube 自带“自动翻译”时，当前版本保持该轨道原样。

模块和脚本使用固定版本 HTTPS 地址，不依赖开发者电脑或局域网。更新时从 Releases 选择新版本重新导入；不会静默跟随 main 分支升级。GitHub 无法访问时，首次安装、下载或更新可能失败。

## 隐私与证书

字幕在手机上合并，只向 YouTube 请求译文；没有本项目后台、遥测、广告或 API Key。安装和下载文件会连接 GitHub。请求中已有的 Cookie 仅用于同一 YouTube 站点的字幕请求，不写入本项目日志或存储。

CA 信任是设备级权限，请先理解再开启。本模块仅增加 `www.youtube.com` 和 `m.youtube.com` 两个解密域名；域名级解密范围比字幕路径更广，脚本处理范围则只限 `/api/timedtext`。既有配置可能还有其他解密域名，请自行检查。**不要导入别人提供的 CA、私钥或完整代理配置。**

## 没有字幕时

- 没有任何字幕：先打开 CC，确认视频有原语言字幕。无字幕视频不支持自动语音识别。
- 只有原文：确认模块开启、证书受信任、HTTPS 解密开启及脚本下载成功；重新打开视频。上游翻译失败时会保留原文。
- 只有中文：切回原语言字幕，不要选“自动翻译”。
- 时序、断句不自然：自动字幕和机器翻译可能存在断句/时间轴误差；欢迎提交不含隐私的复现信息。

## 验证范围

此前 0.2.6 在 iPhone 14 Plus、iOS 26.4.2、YouTube 21.41.5、Shadowrocket 2.2.92 上验证过两条英文 TED 视频，以及一条 Andrew Ng 访谈。0.3.0 是删除诊断回传、改为公共下载地址的开源发行版，验收结果见 Release notes。

日语 XML、韩语 JSON、自动字幕分段和失败回退有自动测试；**不等于这些语言都经过真机验证**。未保证所有视频、地区、帐号、YouTube 版本、后台/画中画或清缓存后的行为。字幕获取接口属于非公开稳定接口，上游更新可能使模块失效。

## 卸载

禁用或删除本模块即可停止字幕改写，原节点和路由无需更改。如果不再需要 HTTPS 解密，可关闭它，并在 iOS 撤销本次 CA 信任、移除对应描述文件；若其他模块也在使用此 CA，先检查影响。

## 开发

Node.js 22 或更新版本：

```sh
npm ci --ignore-scripts
npm run check
```

`dist/` 提供可审查、带 SHA-256 的发行文件；CI 会重新构建、测试并检查构建产物是否与提交一致。修改发布版本时，同步构建脚本、package 文件和安装页地址。

流程：字幕响应 → 请求同一视频 `tlang=zh-Hans` → 按时间轴合并 XML/JSON → 交回官方播放器。翻译失败保留原字幕。没有修改 YouTube 安装包。

## 反馈与贡献

Issue 请提供视频公开链接、系统/应用版本、原字幕语言、CC 状态和脱敏截图。不要上传完整代理配置、Cookie、请求签名、证书、私钥或含帐号信息的日志。

当前优先项：更多语种真机测试、自动字幕排版、播放操作回归、Android 可行性。欢迎提交小范围 PR，并附复现和验证结果。

## 许可证与致谢

Apache-2.0。字幕合并代码来自 [DualSubs/Universal](https://github.com/DualSubs/Universal)，感谢原作者及贡献者；详见 [第三方说明](THIRD-PARTY.md)。本项目与 YouTube、Google、Shadowrocket、DualSubs 无官方关联。
