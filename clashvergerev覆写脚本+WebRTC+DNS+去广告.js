/**
 * mihomo配置覆写脚本（增强版：强力去广告 + 防DNS/WebRTC泄露）
 * 基于 AIsouler 原版脚本增强修改
 */

// --- 静态配置区域 ---

// 适配 Bettbox 自定义配置参数
const Compatible_With_Bettbox = { ruleOptionsEnable: true };

/**
 * 自定义配置选项
 */
const ruleOptionsEnable = {
  // 基础策略组
  手动选择: true,
  自动选择: true,
  负载均衡: true,

  // 分流策略配置
  FCM: true,
  YouTube: true,
  Google: true,
  AI: true,
  Microsoft: true,
  Apple: true,
  Telegram: true,
  Steam: true,
  TikTok: true,
  Twitter: true,
  Instagram: true,
  Netflix: true,
  Emby: true,
  PikPak: true,
  Spotify: true,
  Crypto: true,
  EHentai: true,
  AdBlock: true, // 广告拦截

  // 功能配置
  生成地区自动选择组: true,
  隐藏地区手动选择组: false,
  生成倍率组: true,
  分流组添加所有节点: false,
  过滤高倍率节点: false,
  过滤非地区节点: true,
  屏蔽国外QUIC: true, // 建议保持开启，防止 HTTP/3 绕过代理及 WebRTC/UDP 泄漏
  代理IPV4优先: false,
  代理IPV6优先: false,
  链式代理: false,
};

// 定义前置规则（加入防止 WebRTC 泄露及精准直连）
const prefixRules = [
  // 1. 【防 WebRTC 泄露】直接拦截 WebRTC 专用的 STUN/TURN 协议端口及常见 STUN 域名
  'AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT',
  'AND,((NETWORK,UDP),(DST-PORT,19302)),REJECT',
  'DOMAIN-KEYWORD,stun,REJECT',
  'DOMAIN-KEYWORD,turn,REJECT',

  // 私有网络直连
  'RULE-SET,private,直连',

  // 国内直连
  'RULE-SET,games_cn,直连',
  'RULE-SET,epicgames,直连',
  'RULE-SET,nvidia_cn,直连',
  'RULE-SET,apple_cn,直连',
  'RULE-SET,microsoft_cn,直连',
  'DOMAIN,fsend.cn,直连',
  'DOMAIN,international-gfe.download.nvidia.com,直连',
];

const customizeProxies = [];
const dialerProxyName = '链式中转';

// 全局排除非地区节点正则
const excludeFilter =
  /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;

// 屏蔽国外QUIC（也是防止 WebRTC/UDP 流量绕过代理的重要手段）
const blockForeignQuic = [
  'AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((OR,((RULE-SET,cn_additional),(RULE-SET,cn_ip,no-resolve)))))),REJECT',
];

// 直连节点
const directProxies = [
  { name: '🇨🇳 直连 | 双栈', type: 'direct' },
  { name: '🇨🇳 直连 | IPv4优先', type: 'direct', 'ip-version': 'ipv4-prefer' },
  { name: '🇨🇳 直连 | IPv6优先', type: 'direct', 'ip-version': 'ipv6-prefer' },
  { name: '🇨🇳 直连 | 仅IPv4', type: 'direct', 'ip-version': 'ipv4' },
  { name: '🇨🇳 直连 | 仅IPv6', type: 'direct', 'ip-version': 'ipv6' },
];

// 地区策略组定义
const regionDefinitions = [
  { name: '香港', flag: '🇭🇰', regex: /🇭🇰|香港|(?<![A-Za-z])HKG?(?![A-Za-z])|hong\s*kong/i, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png' },
  { name: '日本', flag: '🇯🇵', regex: /🇯🇵|日本|东京|大阪|京都|(?<![A-Za-z])JPN?(?![A-Za-z])|japan/i, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png' },
  { name: '美国', flag: '🇺🇸', regex: /🇺🇸|美国|纽约|洛杉矶|旧金山|芝加哥|休斯顿|迈阿密|西雅图|波士顿|华盛顿|拉斯维加斯|圣何塞|圣地亚哥|(?<![A-Za-z])USA?(?![A-Za-z])|america|united\s*states/i, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png' },
  { name: '新加坡', flag: '🇸🇬', regex: /🇸🇬|新加坡|狮城|(?<![A-Za-z])SGP?(?![A-Za-z])|singapore/i, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png' },
  { name: '台湾省', flag: '🇹🇼', regex: /🇹🇼|台湾|台北|高雄|(?<![A-Za-z])TWN?(?![A-Za-z])|taiwan/i, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png' },
];

const lowRateRegionName = '低倍率节点';
const highRateRegionName = '高倍率节点';

const rateRegionDefinitions = [
  { name: lowRateRegionName, regex: /^(?!.*(?:剩|期|客户端|软件)).*(?:(?<!\d)0\.[0-5]|下载|低倍)/, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Available_1.png' },
  { name: highRateRegionName, regex: /(?:[*×xX✕✖⨉]\s*(?:[2-9]\d*|[1-9]\d+)(?:\.\d+)?)|(?:(?<![\d.])(?:[2-9]\d*|[1-9]\d+)(?:\.\d+)?\s*(?:倍|[*×xX✕✖⨉]))/u, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Airport.png' },
];

const allRegionDefinitions = [...regionDefinitions, ...rateRegionDefinitions];

// Rule Providers 通用配置
const ruleProviderCommonDomain = { type: 'http', format: 'mrs', interval: 86400, behavior: 'domain' };
const ruleProviderCommonIpcidr = { type: 'http', format: 'mrs', interval: 86400, behavior: 'ipcidr' };

// 基础 Rule Providers
const baseRuleProviders = {
  private: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/private.mrs', path: './ruleset/private.mrs', 'path-in-bundle': 'geo/geosite/private.mrs' },
  private_ip: { ...ruleProviderCommonIpcidr, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/private.mrs', path: './ruleset/private_ip.mrs', 'path-in-bundle': 'geo/geoip/private.mrs' },
  games_cn: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/category-games@cn.mrs', path: './ruleset/category-games@cn.mrs', 'path-in-bundle': 'geo/geosite/category-games@cn.mrs' },
  epicgames: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/epicgames.mrs', path: './ruleset/epicgames.mrs', 'path-in-bundle': 'geo/geosite/epicgames.mrs' },
  nvidia_cn: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/nvidia@cn.mrs', path: './ruleset/nvidia@cn.mrs', 'path-in-bundle': 'geo/geosite/nvidia@cn.mrs' },
  apple_cn: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/apple@cn.mrs', path: './ruleset/apple@cn.mrs', 'path-in-bundle': 'geo/geosite/apple@cn.mrs' },
  microsoft_cn: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/microsoft@cn.mrs', path: './ruleset/microsoft@cn.mrs', 'path-in-bundle': 'geo/geosite/microsoft@cn.mrs' },
  'geolocation-cn': { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/geolocation-cn.mrs', path: './ruleset/geolocation-cn.mrs', 'path-in-bundle': 'geo/geosite/geolocation-cn.mrs' },
  cn_ip: { ...ruleProviderCommonIpcidr, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/cn.mrs', path: './ruleset/cn_ip.mrs', 'path-in-bundle': 'geo/geoip/cn.mrs' },
  'geolocation-!cn': { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/geolocation-!cn.mrs', path: './ruleset/geolocation-!cn.mrs', 'path-in-bundle': 'geo/geosite/geolocation-!cn.mrs' },
  fakeip_filter: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/wwqgtxx/clash-rules@release/fakeip-filter.mrs', path: './ruleset/fakeip-filter.mrs', 'path-in-bundle': 'geo/geosite/private.mrs' },
  cn_additional: { ...ruleProviderCommonDomain, url: 'https://static-file-global.353355.xyz/rules/cn-additional-list.mrs', path: './ruleset/cn-additional-list.mrs', 'path-in-bundle': 'geo/geosite/cn.mrs' },
  cn: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/cn.mrs', path: './ruleset/cn.mrs', 'path-in-bundle': 'geo/geosite/cn.mrs' },
};

// 策略组通用配置
const groupBaseOption = { interval: 600, timeout: 3000, url: 'https://g.cn/generate_204', lazy: true, 'max-failed-times': 3, 'empty-fallback': 'REJECT' };
const selectBaseOption = { ...groupBaseOption, type: 'select' };
const urlTestBaseOption = { ...groupBaseOption, type: 'url-test', tolerance: 50, 'exclude-type': 'DIRECT', icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Auto.png', hidden: true };
const loadBalanceBaseOption = { ...groupBaseOption, type: 'load-balance', strategy: 'sticky-sessions', 'exclude-type': 'DIRECT', icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Round_Robin.png', hidden: true };

const baseGroups = [
  { name: '手动选择', baseOption: selectBaseOption, includeAll: true, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Static.png' },
  { name: '自动选择', baseOption: urlTestBaseOption, includeAll: true, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Auto.png' },
  { name: '负载均衡', baseOption: loadBalanceBaseOption, includeAll: true, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Round_Robin.png' },
];

// 定义分流策略组配置
const serviceConfigs = [
  ...baseGroups,
  {
    name: 'FCM',
    baseOption: selectBaseOption,
    direct: true,
    defaultSelected: '直连',
    providers: { googlefcm: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/googlefcm.mrs', path: './ruleset/googlefcm.mrs', 'path-in-bundle': 'geo/geosite/googlefcm.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/MiToverG422/Qure@master/IconSet/Color/fcm.png',
    rules: ['RULE-SET,googlefcm,FCM'],
  },
  {
    name: 'YouTube',
    baseOption: selectBaseOption,
    providers: { youtube: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/youtube.mrs', path: './ruleset/youtube.mrs', 'path-in-bundle': 'geo/geosite/youtube.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png',
    rules: ['RULE-SET,youtube,YouTube'],
  },
  {
    name: 'Google',
    baseOption: selectBaseOption,
    providers: {
      google: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/google.mrs', path: './ruleset/google.mrs', 'path-in-bundle': 'geo/geosite/google.mrs' },
      google_ip: { ...ruleProviderCommonIpcidr, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/google.mrs', path: './ruleset/google_ip.mrs', 'path-in-bundle': 'geo/geoip/google.mrs' },
    },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Google_Search.png',
    rules: ['RULE-SET,google,Google', 'RULE-SET,google_ip,Google,no-resolve'],
  },
  {
    name: 'AI',
    baseOption: selectBaseOption,
    defaultSelected: '美国',
    providers: { ai: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/category-ai-!cn.mrs', path: './ruleset/ai.mrs', 'path-in-bundle': 'geo/geosite/category-ai-!cn.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png',
    rules: ['RULE-SET,ai,AI'],
  },
  {
    name: 'Microsoft',
    baseOption: selectBaseOption,
    direct: true,
    providers: {
      github: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/github.mrs', path: './ruleset/github.mrs', 'path-in-bundle': 'geo/geosite/github.mrs' },
      microsoft: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/microsoft.mrs', path: './ruleset/microsoft.mrs', 'path-in-bundle': 'geo/geosite/microsoft.mrs' },
    },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png',
    rules: ['RULE-SET,github,默认代理', 'RULE-SET,microsoft,Microsoft'],
  },
  {
    name: 'Apple',
    baseOption: selectBaseOption,
    direct: true,
    providers: { apple: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/apple.mrs', path: './ruleset/apple.mrs', 'path-in-bundle': 'geo/geosite/apple.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Apple.png',
    rules: ['RULE-SET,apple,Apple'],
  },
  {
    name: 'Telegram',
    baseOption: selectBaseOption,
    providers: {
      telegram: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/telegram.mrs', path: './ruleset/telegram.mrs', 'path-in-bundle': 'geo/geosite/telegram.mrs' },
      telegram_ip: { ...ruleProviderCommonIpcidr, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/telegram.mrs', path: './ruleset/telegram_ip.mrs', 'path-in-bundle': 'geo/geoip/telegram.mrs' },
    },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Telegram.png',
    rules: ['RULE-SET,telegram,Telegram', 'RULE-SET,telegram_ip,Telegram,no-resolve'],
  },
  {
    name: 'Steam',
    baseOption: selectBaseOption,
    direct: true,
    providers: {
      steam: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/steam.mrs', path: './ruleset/steam.mrs', 'path-in-bundle': 'geo/geosite/steam.mrs' },
      steam_asn: { ...ruleProviderCommonIpcidr, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/asn/AS32590.mrs', path: './ruleset/steam_asn.mrs', 'path-in-bundle': 'asn/AS32590.mrs' },
    },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Steam.png',
    rules: ['RULE-SET,steam,Steam', 'RULE-SET,steam_asn,Steam,no-resolve'],
  },
  {
    name: 'TikTok',
    baseOption: selectBaseOption,
    defaultSelected: '日本',
    providers: { tiktok: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/tiktok.mrs', path: './ruleset/tiktok.mrs', 'path-in-bundle': 'geo/geosite/tiktok.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/TikTok.png',
    rules: ['RULE-SET,tiktok,TikTok'],
  },
  {
    name: 'Twitter',
    baseOption: selectBaseOption,
    providers: {
      twitter: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/twitter.mrs', path: './ruleset/twitter.mrs', 'path-in-bundle': 'geo/geosite/twitter.mrs' },
      twitter_ip: { ...ruleProviderCommonIpcidr, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/twitter.mrs', path: './ruleset/twitter_ip.mrs', 'path-in-bundle': 'geo/geoip/twitter.mrs' },
    },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Twitter.png',
    rules: ['RULE-SET,twitter,Twitter', 'RULE-SET,twitter_ip,Twitter,no-resolve'],
  },
  {
    name: 'Instagram',
    baseOption: selectBaseOption,
    providers: { instagram: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/instagram.mrs', path: './ruleset/instagram.mrs', 'path-in-bundle': 'geo/geosite/instagram.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Instagram.png',
    rules: ['RULE-SET,instagram,Instagram'],
  },
  {
    name: 'Netflix',
    baseOption: selectBaseOption,
    providers: {
      netflix: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/netflix.mrs', path: './ruleset/netflix.mrs', 'path-in-bundle': 'geo/geosite/netflix.mrs' },
      netflix_ip: { ...ruleProviderCommonIpcidr, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/netflix.mrs', path: './ruleset/netflix_ip.mrs', 'path-in-bundle': 'geo/geoip/netflix.mrs' },
    },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png',
    rules: ['RULE-SET,netflix,Netflix', 'RULE-SET,netflix_ip,Netflix,no-resolve'],
  },
  {
    name: 'Emby',
    baseOption: selectBaseOption,
    direct: true,
    providers: {
      emby: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/666OS/rules@release/mihomo/domain/Emby.mrs', path: './ruleset/emby.mrs', 'path-in-bundle': 'geo/geosite/category-emby.mrs' },
      emos: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/binaryu/emos-proxy-rule@main/rules/emos-mihomo.mrs', path: './ruleset/emos.mrs', 'path-in-bundle': 'geo/geosite/category-emby.mrs' },
    },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Emby.png',
    rules: [
      'RULE-SET,emby,Emby',
      'RULE-SET,emos,Emby',
      'DOMAIN-SUFFIX,mb3admin.com,Emby',
      'DOMAIN-SUFFIX,nubebelle.com,Emby',
      'DOMAIN-KEYWORD,emby,Emby',
      'PROCESS-NAME,com.mb.android,Emby',
      'PROCESS-NAME,tv.emby.embyatv,Emby',
      'PROCESS-NAME,com.hush.yamby,Emby',
      'PROCESS-NAME,com.jellycine.app,Emby',
      'PROCESS-NAME,com.mountains.hills,Emby',
      'PROCESS-NAME,RodelPlayer.App.exe,Emby',
      'PROCESS-NAME,com.feifeiduck.capyplayer,Emby',
    ],
  },
  {
    name: 'PikPak',
    baseOption: selectBaseOption,
    direct: true,
    providers: { pikpak: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/pikpak.mrs', path: './ruleset/pikpak.mrs', 'path-in-bundle': 'geo/geosite/pikpak.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/lige47/QuanX-icon-rule@main/icon/03CNSoft/pikpak.png',
    rules: ['RULE-SET,pikpak,PikPak'],
  },
  {
    name: 'Spotify',
    baseOption: selectBaseOption,
    direct: true,
    providers: { spotify: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/spotify.mrs', path: './ruleset/spotify.mrs', 'path-in-bundle': 'geo/geosite/spotify.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Spotify.png',
    rules: ['RULE-SET,spotify,Spotify'],
  },
  {
    name: 'Crypto',
    baseOption: selectBaseOption,
    defaultSelected: '日本',
    providers: { cryptocurrency: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/category-cryptocurrency.mrs', path: './ruleset/cryptocurrency.mrs', 'path-in-bundle': 'geo/geosite/category-cryptocurrency.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/lige47/QuanX-icon-rule@main/icon/04ProxySoft/Bitcoin.png',
    rules: ['RULE-SET,cryptocurrency,Crypto'],
  },
  {
    name: 'EHentai',
    baseOption: selectBaseOption,
    defaultSelected: '美国',
    providers: { ehentai: { ...ruleProviderCommonDomain, url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/ehentai.mrs', path: './ruleset/ehentai.mrs', 'path-in-bundle': 'geo/geosite/ehentai.mrs' } },
    icon: 'https://fastly.jsdelivr.net/gh/lige47/QuanX-icon-rule@main/icon/04ProxySoft/exhentai.png',
    rules: ['RULE-SET,ehentai,EHentai'],
  },

  // 1. 【去广告功能增强】扩展多重专业广告/追踪/隐私拦截规则库
  {
    name: 'AdBlock',
    baseOption: selectBaseOption,
    reject: true,
    providers: {
      // 基础全量广告拦截
      adblock_all: {
        ...ruleProviderCommonDomain,
        url: 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/category-ads-all.mrs',
        path: './ruleset/category-ads-all.mrs',
      },
      // Anti-AD 精准广告拦截
      anti_ad: {
        ...ruleProviderCommonDomain,
        url: 'https://raw.githubusercontent.com/privacy-protection-tools/anti-AD/master/anti-ad-clash.mrs',
        path: './ruleset/anti_ad.mrs',
      },
    },
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Advertising.png',
    rules: [
      'RULE-SET,adblock_all,AdBlock',
      'RULE-SET,anti_ad,AdBlock',
    ],
  },
];

// --- 节点处理逻辑 ---
const regionMatchCache = new Map();
function getMatchedRegions(proxyName) {
  if (regionMatchCache.has(proxyName)) return regionMatchCache.get(proxyName);
  const regions = allRegionDefinitions.filter((region) => region.regex.test(proxyName));
  regionMatchCache.set(proxyName, regions);
  return regions;
}

const flagRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
function normalizeProxyName(proxy) {
  const originalName = proxy.name;
  const flag = originalName.match(flagRegex)?.[0];
  const nameWithoutFlag = (flag ? originalName.replace(flag, '') : originalName).replace(/\s+/g, ' ').trim();
  const matchedRegions = getMatchedRegions(originalName);
  const regionFlag = flag || matchedRegions.find((region) => region.flag)?.flag;
  const normalizedName = regionFlag ? `${regionFlag} ${nameWithoutFlag}` : nameWithoutFlag;
  if (normalizedName !== originalName) regionMatchCache.set(normalizedName, matchedRegions);
  return normalizedName === originalName ? proxy : { ...proxy, name: normalizedName };
}

function fixDialerProxy(proxy, renameMap, normalizedProxyNames) {
  const target = proxy['dialer-proxy'];
  if (!target) return proxy;
  if (renameMap.has(target)) return { ...proxy, 'dialer-proxy': renameMap.get(target) };
  if (normalizedProxyNames.has(target)) return proxy;
  const copy = { ...proxy };
  delete copy['dialer-proxy'];
  return copy;
}

function getIpVersionPreference() {
  const ipv4PreferEnabled = ruleOptionsEnable.代理IPV4优先;
  const ipv6PreferEnabled = ruleOptionsEnable.代理IPV6优先;
  if (ipv4PreferEnabled && !ipv6PreferEnabled) return 'ipv4-prefer';
  if (ipv6PreferEnabled && !ipv4PreferEnabled) return 'ipv6-prefer';
  return null;
}

function filterAndNormalizeProxies(config) {
  regionMatchCache.clear();
  const filterHighRateProxiesEnabled = ruleOptionsEnable.过滤高倍率节点;
  const filterNonRegionProxiesEnabled = ruleOptionsEnable.过滤非地区节点;
  const highRateRegex = filterHighRateProxiesEnabled ? rateRegionDefinitions.find((r) => r.name === highRateRegionName)?.regex : null;
  const originalProxies = config.proxies || [];

  const filteredRawProxies = originalProxies.filter((proxy) => {
    const type = String(proxy.type ?? '').toLowerCase();
    if (type === 'direct' || type === 'reject' || type === 'rematch') return false;
    if (highRateRegex?.test(proxy.name)) return false;
    if (!filterNonRegionProxiesEnabled) return true;
    const isRegionProxy = getMatchedRegions(proxy.name).some((region) => regionDefinitions.includes(region));
    return isRegionProxy || !excludeFilter.test(proxy.name);
  });

  const renameMap = new Map();
  const normalizedProxies = [];
  const uniqueNames = new Set();

  for (const rawProxy of filteredRawProxies) {
    const normalized = normalizeProxyName(rawProxy);
    if (normalized.name !== rawProxy.name) renameMap.set(rawProxy.name, normalized.name);
    if (!uniqueNames.has(normalized.name)) {
      uniqueNames.add(normalized.name);
      normalizedProxies.push(normalized);
    }
  }

  const normalizedProxyNames = new Set(normalizedProxies.map((p) => p.name));
  const filteredProxies = normalizedProxies.map((proxy) => fixDialerProxy(proxy, renameMap, normalizedProxyNames));

  if (!filteredProxies.length) {
    throw new Error('配置文件中未找到任何代理节点，请使用机场提供的配置文件进行覆写');
  }

  const ipVersionPreference = getIpVersionPreference();
  if (ipVersionPreference) {
    return filteredProxies.map((proxy) => (proxy['ip-version'] === ipVersionPreference ? proxy : { ...proxy, 'ip-version': ipVersionPreference }));
  }

  return filteredProxies;
}

// 构建策略组
function createRegionGroup(name, icon, proxies) {
  const generateRegionAutoSelectEnabled = ruleOptionsEnable.生成地区自动选择组;
  const hideManualSelectGroupEnabled = ruleOptionsEnable.隐藏地区手动选择组;

  if (generateRegionAutoSelectEnabled) {
    const urlTestName = `${name}-自动选择`;
    return [
      { ...urlTestBaseOption, name: urlTestName, proxies },
      { ...selectBaseOption, name, icon, proxies: [...proxies, urlTestName], hidden: hideManualSelectGroupEnabled },
    ];
  }
  return [{ ...selectBaseOption, name, icon, proxies, hidden: hideManualSelectGroupEnabled }];
}

function buildRegionGroups(filteredProxies, customProxies) {
  const generateRateGroupEnabled = ruleOptionsEnable.生成倍率组;
  const regionGroups = Object.fromEntries(allRegionDefinitions.map(({ name }) => [name, []]));
  const otherProxies = [];

  for (const proxy of [...filteredProxies, ...customProxies]) {
    const matchedRegions = getMatchedRegions(proxy.name);
    const isRegionProxy = matchedRegions.some((region) => regionDefinitions.includes(region));
    for (const region of matchedRegions) regionGroups[region.name].push(proxy.name);
    if (!isRegionProxy) otherProxies.push(proxy.name);
  }

  const generatedRegionGroups = allRegionDefinitions
    .filter((r) => regionGroups[r.name].length > 0 && (generateRateGroupEnabled || !rateRegionDefinitions.includes(r)))
    .flatMap((r) => createRegionGroup(r.name, r.icon, regionGroups[r.name]));

  if (otherProxies.length > 0) {
    generatedRegionGroups.push(
      ...createRegionGroup('其他节点', 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/World_Map.png', otherProxies),
    );
  }

  return generatedRegionGroups;
}

function buildCustomizeGroups(filteredProxies, customizeList = customizeProxies) {
  const chainEnabled = ruleOptionsEnable.链式代理;

  if (!customizeList.length) {
    if (chainEnabled) throw new Error('启用失败，请在脚本中添加自定义节点后尝试');
    return { customProxies: [], customProxyNames: [], customGroup: null };
  }

  const usedNames = new Set(filteredProxies.map((p) => p.name));
  const customPrefix = '自建-';
  const customProxies = [];

  for (const proxy of customizeList) {
    const normalized = normalizeProxyName(proxy);
    let name = normalized.name;
    while (usedNames.has(name)) {
      name = normalizeProxyName({ name: `${customPrefix}${name}` }).name.replace(`${customPrefix} `, customPrefix);
    }
    usedNames.add(name);

    let customProxy = name === normalized.name ? normalized : { ...normalized, name };
    if (chainEnabled && customProxy['dialer-proxy'] !== dialerProxyName) {
      customProxy = { ...customProxy, 'dialer-proxy': dialerProxyName };
    }
    customProxies.push(customProxy);
  }

  const customProxyNames = customProxies.map((p) => p.name);
  const customGroup = {
    ...selectBaseOption,
    name: chainEnabled ? '链式落地' : '自建节点',
    proxies: customProxyNames,
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Server.png',
  };

  return { customProxies, customProxyNames, customGroup };
}

function buildFunctionalGroups(filteredProxies, generatedRegionGroups, customizeInfo) {
  const blockForeignQuicEnabled = ruleOptionsEnable.屏蔽国外QUIC;
  const addAllNodesToServiceGroupsEnabled = ruleOptionsEnable.分流组添加所有节点;
  const chainEnabled = ruleOptionsEnable.链式代理;
  const hideManualSelectGroupEnabled = ruleOptionsEnable.隐藏地区手动选择组;

  const functionalGroups = [];
  const functionalRules = [];
  const finalRuleProviders = { ...baseRuleProviders };

  if (!blockForeignQuicEnabled) delete finalRuleProviders.cn_additional;

  const { customProxyNames = [], customGroup = null } = customizeInfo || {};
  const filteredProxyNames = filteredProxies.map((p) => p.name);
  const allProxiesNames = [...customProxyNames, ...filteredProxyNames];
  const groupNamesOfSelect = generatedRegionGroups.filter((g) => g.type === 'select').map((g) => g.name);
  const baseGroupNames = baseGroups.filter((g) => ruleOptionsEnable[g.name]).map((g) => g.name);
  const customGroupNames = customGroup ? [customGroup.name] : [];

  functionalGroups.push({
    ...selectBaseOption,
    name: '默认代理',
    proxies: [...groupNamesOfSelect, ...baseGroupNames, ...customGroupNames],
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png',
  });

  const orderedServiceConfigs = [
    ...serviceConfigs.filter((svc) => svc.name === 'AdBlock'),
    ...serviceConfigs.filter((svc) => svc.name !== 'AdBlock'),
  ];
  for (const svc of orderedServiceConfigs) {
    if (!ruleOptionsEnable[svc.name]) continue;
    functionalRules.push(...(svc.rules || []));
    Object.assign(finalRuleProviders, svc.providers || {});
  }

  for (const svc of serviceConfigs) {
    if (!ruleOptionsEnable[svc.name]) continue;

    let groupProxies = [];
    if (svc.includeAll) {
      groupProxies = [...allProxiesNames];
    } else if (svc.reject) {
      groupProxies = ['REJECT', 'REJECT-DROP', 'PASS'];
    } else {
      groupProxies = !addAllNodesToServiceGroupsEnabled
        ? ['默认代理', ...customGroupNames, ...baseGroupNames, ...groupNamesOfSelect, ...(svc.direct ? ['直连'] : [])]
        : ['默认代理', ...customGroupNames, ...baseGroupNames, ...groupNamesOfSelect, ...allProxiesNames, ...(svc.direct ? ['直连'] : [])];
    }

    functionalGroups.push({
      ...svc.baseOption,
      name: svc.name,
      icon: svc.icon,
      proxies: groupProxies,
      ...(svc.defaultSelected !== undefined && { 'default-selected': svc.defaultSelected }),
    });
  }

  functionalGroups.push({
    ...selectBaseOption,
    name: '漏网之鱼',
    proxies: ['默认代理', '直连', ...groupNamesOfSelect],
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Stack.png',
  });

  if (customGroup) functionalGroups.push(customGroup);

  const chainGroup =
    chainEnabled && customGroup
      ? { ...selectBaseOption, name: dialerProxyName, proxies: filteredProxyNames, icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bypass.png' }
      : null;

  const directGroup = {
    ...selectBaseOption,
    name: '直连',
    proxies: [...directProxies.map((p) => p.name)],
    url: 'https://connectivitycheck.platform.hicloud.com/generate_204',
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/China_Map.png',
    hidden: hideManualSelectGroupEnabled,
  };

  const globalGroup = {
    ...selectBaseOption,
    name: 'GLOBAL',
    proxies: [
      ...functionalGroups.map((g) => g.name),
      ...(chainGroup ? [chainGroup.name] : []),
      directGroup.name,
      ...generatedRegionGroups.map((g) => g.name),
    ],
    icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png',
  };

  return { globalGroup, functionalGroups, functionalRules, finalRuleProviders, chainGroup, directGroup };
}

// --- 2. 【防 DNS 泄露】重构 DNS 模块 ---
const chinaDNS = ['223.5.5.5', '119.29.29.29'];
// 采用加密 DoH 进行基础/国内解析，避免被运营商劫持
const chinaDohDNS = ['https://223.5.5.5/dns-query#DIRECT', 'https://1.12.12.12/dns-query#DIRECT'];
// 国外 DNS 必须走代理节点解析，防止 ISP 直连查询泄露
const foreignDNS = ['https://cloudflare-dns.com/dns-query#默认代理', 'https://dns.google/dns-query#默认代理'];

function buildDnsAndHostsConfig(config, filteredProxies) {
  const dns = {
    enable: true,
    ipv6: false, // 防 DNS 泄露重要一步：关闭内核 IPv6 解析（除非确定机场有完整 IPv6 策略且没有泄漏风险）
    'respect-rules': true, // 核心机制：让 DNS 解析严格遵循分流规则，规则是代理就走代理 DNS 解析！
    'use-hosts': true,
    'cache-algorithm': 'arc',
    'use-system-hosts': true,
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/15',
    'fake-ip-range6': '2001:2::1/48',
    'fake-ip-filter': ['rule-set:private', 'rule-set:fakeip_filter', 'rule-set:geolocation-cn', '*.lan', 'localhost.ptlogin2.qq.com'],
    'proxy-server-nameserver': chinaDohDNS,
    'default-nameserver': chinaDNS,
    nameserver: foreignDNS,
    'nameserver-policy': {
      'rule-set:geolocation-cn,cn': chinaDNS,
      'geosite:cn': chinaDNS,
    },
    'direct-nameserver': chinaDNS,
  };

  const hosts = {
    'cloudflare-dns.com': ['1.1.1.1', '1.0.0.1'],
    'dns.google': ['8.8.8.8', '8.8.4.4'],
    'services.googleapis.cn': 'services.googleapis.com',

    // 屏蔽 PCDN
    '+.mcdn.bilivideo.com': ['0.0.0.0'],
    '+.mcdn.bilivideo.cn': ['0.0.0.0'],
    '+.edge.mountaintoys.cn': ['0.0.0.0'],
    '+.h2.smtcdns.net': ['0.0.0.0'],
  };

  return { dns, hosts, proxies: filteredProxies };
}

// --- 主入口 ---
function main(config) {
  const newConfig = {};

  const filteredProxies = filterAndNormalizeProxies(config);
  const { customProxies, customProxyNames, customGroup } = buildCustomizeGroups(filteredProxies);
  const generatedRegionGroups = buildRegionGroups(filteredProxies, customProxies);
  const { globalGroup, functionalGroups, functionalRules, finalRuleProviders, chainGroup, directGroup } =
    buildFunctionalGroups(filteredProxies, generatedRegionGroups, { customProxyNames, customGroup });

  const { dns, hosts, proxies: mappedProxies } = buildDnsAndHostsConfig(config, filteredProxies);

  newConfig['dns'] = dns;
  newConfig['hosts'] = hosts;
  newConfig['mixed-port'] = 7890;
  newConfig['allow-lan'] = true;
  newConfig['ipv6'] = false; // 建议设置为 false 防 IPv6 DNS 泄露
  newConfig['mode'] = 'rule';
  newConfig['log-level'] = 'info';
  newConfig['bind-address'] = '*';
  newConfig['unified-delay'] = true;
  newConfig['tcp-concurrent'] = true;
  newConfig['keep-alive-interval'] = 60;
  newConfig['find-process-mode'] = 'strict';

  newConfig['external-controller'] = '127.0.0.1:9090';
  newConfig['external-ui'] = 'ui';
  newConfig['external-ui-url'] = 'https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip';

  newConfig['profile'] = {
    'store-selected': true,
    'store-fake-ip': true,
  };

  newConfig['ntp'] = {
    enable: true,
    'write-to-system': false,
    server: 'ntp.aliyun.com',
    port: 123,
    interval: 60,
  };

  newConfig['tun'] = {
    enable: true,
    stack: 'system',
    'auto-route': true,
    'strict-route': true,
    'auto-redirect': true,
    'auto-detect-interface': true,
    'dns-hijack': ['any:53', 'tcp://any:53'],
  };

  newConfig['proxies'] = [...customProxies, ...mappedProxies, ...directProxies];
  newConfig['proxy-groups'] = [
    globalGroup,
    ...functionalGroups,
    ...(chainGroup ? [chainGroup] : []),
    directGroup,
    ...generatedRegionGroups,
  ];
  newConfig['rule-providers'] = finalRuleProviders;

  newConfig['rules'] = [
    ...prefixRules,
    ...(ruleOptionsEnable.屏蔽国外QUIC ? blockForeignQuic : []),
    ...functionalRules,

    'RULE-SET,geolocation-!cn,默认代理',
    'RULE-SET,geolocation-cn,直连',
    'RULE-SET,cn_ip,直连',
    'RULE-SET,private_ip,直连',
    'MATCH,漏网之鱼',
  ];

  return newConfig;
}
