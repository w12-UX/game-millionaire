/**
 * data.js — 游戏数据与配置常量
 * 纯数据层，不含任何业务逻辑
 */

// 26 档标准金额（美版原版）
const AMOUNTS = [
  0.01, 1, 5, 10, 25, 50, 75, 100,
  200, 300, 400, 500, 750, 1000,
  5000, 10000, 25000, 50000, 75000,
  100000, 200000, 300000, 400000,
  500000, 750000, 1000000
];

// 开箱轮次规则：每轮开箱数量
const ROUND_OPEN_COUNTS = [6, 5, 4, 3, 2];

// 后续轮次（第 6 轮起）每轮开 1 个
const LATER_ROUNDS_OPEN_COUNT = 1;

// 银行家报价算法参数（供参考，实际逻辑在 game.js calculateOffer 中）
const BANKER_CONFIG = {
  earlyCoefficient: { min: 0.10, max: 0.30 },   // 前期 1-3 轮
  midCoefficient: { min: 0.40, max: 0.60 },      // 中期 4-6 轮
  lateCoefficient: { min: 0.70, max: 0.90 },     // 后期 ≤4 箱
  fluctuation: 0.05                               // 微幅浮动
};

// 箱子状态枚举
const BOX_STATE = {
  UNOPENED: 'unopened',
  SELECTED: 'selected',
  ELIMINATED: 'eliminated',
  FINAL: 'final'
};

// 游戏阶段枚举
const GAME_PHASE = {
  SELECTING: 'selecting',       // 选择专属箱子
  OPENING: 'opening',           // 开箱阶段
  BANKER_OFFER: 'banker_offer', // 银行家报价
  FINAL_CHOICE: 'final_choice', // 终极抉择
  GAME_OVER: 'game_over'        // 游戏结束
};
