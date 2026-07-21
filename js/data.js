/**
 * 剑灵怀旧服装备强化计算器 - 游戏数据
 */

// 装备类型
const EQUIPMENT = {
  weapon:   { name: '武器', category: 'weapon',  box: 1, icon: '武器' },
  ring:     { name: '戒指', category: 'jewelry', box: 1, icon: '戒指' },
  earring:  { name: '耳环', category: 'jewelry', box: 1, icon: '耳环' },
  necklace: { name: '项链', category: 'jewelry', box: 1, icon: '项链' },
  bracelet: { name: '手镯', category: 'jewelry', box: 2, icon: '手镯' },
  belt:     { name: '腰带', category: 'jewelry', box: 2, icon: '腰带' },
  gloves:   { name: '手套', category: 'jewelry', box: 2, icon: '手套' }
};

// 强化石品阶
const STONE_TIERS = {
  green:  { name: '普通', short: '绿', color: '#6D9B3A', order: 0 },
  blue:   { name: '耀眼', short: '蓝', color: '#3A7CBD', order: 1 },
  purple: { name: '觉醒', short: '紫', color: '#8B5CF6', order: 2 },
  orange: { name: '灿烂', short: '橙', color: '#E87E04', order: 3 }
};

// 品阶对应的图片前缀和最大等级
const QUALITY_CONFIG = {
  green:  { prefix: '仙幻',     maxLevel: 4,  name: '仙幻' },
  blue:   { prefix: '耀眼仙幻', maxLevel: 6,  name: '耀眼仙幻' },
  purple: { prefix: '觉醒仙幻', maxLevel: 8,  name: '觉醒仙幻' },
  orange: { prefix: '真仙幻',   maxLevel: 15, name: '真仙幻' }
};

// 品阶顺序（用于遍历）
const TIER_ORDER = ['green', 'blue', 'purple', 'orange'];

// 消耗数据（每升一级的消耗）
// index 0 = 从+0升到+1的消耗，index 1 = 从+1升到+2的消耗，以此类推
const COST_TABLE = {
  weapon: [
    { tier: 'green',  count: 90, gold: 30,  discount: 27 },   // +0 → +1
    { tier: 'green',  count: 90, gold: 30,  discount: 27 },   // +1 → +2
    { tier: 'blue',   count: 90, gold: 60,  discount: 54 },   // +2 → +3
    { tier: 'blue',   count: 90, gold: 60,  discount: 54 },   // +3 → +4
    { tier: 'purple', count: 70, gold: 180, discount: 135 },  // +4 → +5
    { tier: 'purple', count: 70, gold: 180, discount: 135 },  // +5 → +6
    { tier: 'orange', count: 45, gold: 240, discount: 216 },  // +6 → +7
    { tier: 'orange', count: 45, gold: 240, discount: 216 },  // +7 → +8
    { tier: 'orange', count: 90, gold: 360, discount: 324 },  // +8 → +9
    { tier: 'orange', count: 90, gold: 360, discount: 324 },  // +9 → +10
    { tier: 'orange', count: 100, gold: 500, discount: 450 }, // +10 → +11
    { tier: 'orange', count: 100, gold: 500, discount: 450 }, // +11 → +12
    { tier: 'orange', count: 100, gold: 500, discount: 450 }, // +12 → +13
    { tier: 'orange', count: 100, gold: 500, discount: 450 }, // +13 → +14
    { tier: 'orange', count: 100, gold: 500, discount: 450 }  // +14 → +15
  ],
  jewelry: [
    { tier: 'green',  count: 30, gold: 10,  discount: 9 },    // +0 → +1
    { tier: 'green',  count: 30, gold: 10,  discount: 9 },    // +1 → +2
    { tier: 'blue',   count: 30, gold: 20,  discount: 18 },   // +2 → +3
    { tier: 'blue',   count: 30, gold: 20,  discount: 18 },   // +3 → +4
    { tier: 'purple', count: 25, gold: 50,  discount: 45 },   // +4 → +5
    { tier: 'purple', count: 25, gold: 50,  discount: 45 },   // +5 → +6
    { tier: 'orange', count: 15, gold: 80,  discount: 72 },   // +6 → +7
    { tier: 'orange', count: 15, gold: 80,  discount: 72 },   // +7 → +8
    { tier: 'orange', count: 30, gold: 120, discount: 108 },  // +8 → +9
    { tier: 'orange', count: 30, gold: 120, discount: 108 },  // +9 → +10
    { tier: 'orange', count: 35, gold: 150, discount: 135 },  // +10 → +11
    { tier: 'orange', count: 35, gold: 150, discount: 135 },  // +11 → +12
    { tier: 'orange', count: 35, gold: 150, discount: 135 },  // +12 → +13
    { tier: 'orange', count: 35, gold: 150, discount: 135 },  // +13 → +14
    { tier: 'orange', count: 35, gold: 150, discount: 135 }   // +14 → +15
  ]
};

// 属性数据
// 结构：{ base: +0基础值, attack: [+1,+2,...,+max] }
// 每个品阶有不同的基础攻击值
const ATTRIBUTES = {
  weapon: {
    green:  { base: 375, attack: [388, 401, 418, 434] },
    blue:   { base: 382, attack: [395, 408, 424, 440, 456, 472] },
    purple: { base: 388, attack: [401, 414, 431, 447, 463, 476, 491, 506] },
    orange: { base: 395, attack: [408, 421, 437, 453, 470, 487, 502, 518, 535, 551, 560, 569, 578, 587, 596] }
  },
  necklace: {
    green:  { base: 36, attack: [38, 39, 41, 42] },
    blue:   { base: 37, attack: [38, 39, 41, 42, 44, 45] },
    purple: { base: 38, attack: [39, 40, 42, 43, 45, 46, 47, 48] },
    orange: { base: 38, attack: [39, 41, 42, 44, 45, 47, 48, 50, 51, 53, 54, 55, 56, 57, 58] }
  },
  ring: {
    green:  { base: 41, attack: [43, 44, 46, 48] },
    blue:   { base: 42, attack: [44, 45, 46, 48, 50, 52] },
    purple: { base: 43, attack: [44, 46, 47, 49, 51, 52, 54, 55] },
    orange: { base: 44, attack: [45, 46, 48, 50, 52, 53, 55, 57, 58, 60, 61, 62, 63, 64, 65] }
  },
  earring: {
    green:  { base: 46, attack: [48, 50, 52, 54] },
    blue:   { base: 47, attack: [49, 51, 52, 54, 56, 58] },
    purple: { base: 48, attack: [50, 51, 53, 55, 57, 58, 60, 62] },
    orange: { base: 49, attack: [51, 52, 54, 56, 58, 60, 62, 63, 65, 68, 69, 70, 71, 72, 73] }
  },
  bracelet: {
    green:  { base: 49, attack: [50, 53, 55, 57] },
    blue:   { base: 50, attack: [52, 54, 55, 57, 59, 61] },
    purple: { base: 50, attack: [53, 54, 56, 58, 60, 61, 63, 65] },
    orange: { base: 52, attack: [54, 55, 57, 59, 61, 63, 65, 67, 69, 71, 72, 73, 75, 76, 77] }
  },
  belt: {
    green:  { base: 34, attack: [35, 36, 38, 39] },
    blue:   { base: 34, attack: [36, 37, 38, 39, 41, 42] },
    purple: { base: 35, attack: [36, 37, 39, 40, 42, 43, 44, 45] },
    orange: { base: 36, attack: [37, 38, 39, 41, 42, 43, 45, 46, 48, 49, 50, 51, 52, 53, 54] }
  },
  gloves: {
    green:  { base: 44, attack: [45, 47, 49, 51] },
    blue:   { base: 45, attack: [46, 47, 49, 51, 53, 55] },
    purple: { base: 45, attack: [47, 48, 50, 52, 54, 55, 57, 59] },
    orange: { base: 46, attack: [47, 49, 51, 53, 55, 56, 58, 60, 62, 64, 65, 66, 67, 68, 69] }
  }
};

// 红字属性（在特定等级触发，按最小值计算）
// level 是强化等级（1-15）
const RED_TEXT_ATTRIBUTES = {
  weapon: {
    4: { stat: 'attack', min: 4, max: 22, desc: '攻击' },
    8: { stat: 'attack', min: 10, max: 53, desc: '攻击' }
  },
  belt: {
    2: { stat: 'attack', min: 2, max: 16, desc: '攻击' },
    8: { stat: 'attack', min: 10, max: 53, desc: '攻击' }
  }
};

// 强化石转换规则
const CONVERSION_RULES = {
  // 合成（低阶 → 高阶）
  merge: [
    { from: 'green',  to: 'blue',   ratio: 2, costSilver: 10 },   // 2绿 → 1蓝，10银
    { from: 'blue',   to: 'purple', ratio: 2, costSilver: 30 },   // 2蓝 → 1紫，30银
    { from: 'purple', to: 'orange', ratio: 2, costSilver: 80 }    // 2紫 → 1橙，80银
  ],
  // 分解（高阶 → 低阶）
  split: [
    { from: 'orange', to: 'purple', ratio: 2, costSilver: 0 },    // 1橙 → 2紫，免费
    { from: 'purple', to: 'blue',   ratio: 2, costSilver: 0 },    // 1紫 → 2蓝，免费
    { from: 'blue',   to: 'green',  ratio: 2, costSilver: 0 }     // 1蓝 → 2绿，免费
  ]
};

// 货币转换
const CURRENCY = {
  copperPerSilver: 100,
  silverPerGold: 100
};

// localStorage 键名
const STORAGE_KEY = 'bns_enhance_calc';
