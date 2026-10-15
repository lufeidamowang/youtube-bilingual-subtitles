# v0.3.0 验证记录

2026-10-15。

- PASS：本地 npm run check，11 项字幕行为测试。测试运行环境为模拟 Shadowrocket，不代表所有设备。
- PASS：GitHub Actions 在 Linux / Node 22 重新构建和测试，dist 一致性检查通过。
- PASS：从 GitHub Release 下载两个发行文件，SHA-256 与发行清单一致。
- PASS：GitHub Pages 实际 HTTP 200，iPhone Safari 页面显示及安装入口可见。
- PASS：iPhone 14 Plus 从 GitHub Release 导入 v0.3.0；模块列表确认新模块已启用、旧局域网模块已禁用。重新打开官方 YouTube 的 RKK7wGAYP6k，原文和简体中文同时显示。
- NOT_RUN：全新手机从零安装证书、更多源语言、长期运行、所有全屏/倍速操作、清缓存/重启后的恢复。
- 不将设备截图方向变化视作横屏全屏验收。

已验证设备上此前安装过证书；本次不声称完成全新设备的完整安装验收。
