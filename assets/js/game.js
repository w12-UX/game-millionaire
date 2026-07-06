/**
 * game.js — 游戏核心逻辑
 * 纯逻辑层，不涉及任何 DOM 操作
 * 与 ui.js 完全解耦
 */

class DealOrNoDeal {
  constructor() {
    this.reset();
  }

  /** 重置游戏到初始状态 */
  reset() {
    // 生成 26 个箱子并随机分配金额
    const shuffled = [...AMOUNTS].sort(() => Math.random() - 0.5);
    this.boxes = shuffled.map((amount, i) => ({
      id: i + 1,
      amount,
      state: BOX_STATE.UNOPENED
    }));

    this.selectedBoxIndex = -1;
    this.currentRound = 1;
    this.openedThisRound = 0;
    this.phase = GAME_PHASE.SELECTING;
    this.offerHistory = [];
    this.finalResult = null;
    this.gameOver = false;
  }

  /** 获取当前轮次需要开箱的数量 */
  getRoundOpenCount() {
    if (this.currentRound <= ROUND_OPEN_COUNTS.length) {
      return ROUND_OPEN_COUNTS[this.currentRound - 1];
    }
    return LATER_ROUNDS_OPEN_COUNT;
  }

  /** 玩家选择专属箱子 */
  selectBox(index) {
    if (this.phase !== GAME_PHASE.SELECTING) return false;
    if (index < 0 || index >= this.boxes.length) return false;
    if (this.boxes[index].state !== BOX_STATE.UNOPENED) return false;

    this.selectedBoxIndex = index;
    this.boxes[index].state = BOX_STATE.SELECTED;
    this.phase = GAME_PHASE.OPENING;
    return true;
  }

  /** 开箱（点击淘汰箱子） */
  openBox(index) {
    if (this.phase !== GAME_PHASE.OPENING) return null;
    if (index === this.selectedBoxIndex) return null;
    if (index < 0 || index >= this.boxes.length) return null;
    if (this.boxes[index].state !== BOX_STATE.UNOPENED) return null;

    // 检查本轮是否已开够
    if (this.openedThisRound >= this.getRoundOpenCount()) return null;

    // 执行开箱
    this.boxes[index].state = BOX_STATE.ELIMINATED;
    this.openedThisRound++;
    const amount = this.boxes[index].amount;

    // 检查本轮是否开完 → 触发银行家报价
    const roundComplete = this.openedThisRound >= this.getRoundOpenCount();
    if (roundComplete) {
      this.phase = GAME_PHASE.BANKER_OFFER;
    }

    return {
      boxId: this.boxes[index].id,
      amount,
      roundComplete,
      openedThisRound: this.openedThisRound,
      roundTotal: this.getRoundOpenCount()
    };
  }

  /** 获取剩余未开箱子的金额列表（含玩家专属箱） */
  getRemainingAmounts() {
    return this.boxes
      .filter(b => b.state !== BOX_STATE.ELIMINATED)
      .map(b => b.amount);
  }

  /** 计算银行家报价（按综艺原版规则） */
  calculateOffer() {
    const remaining = this.getRemainingAmounts();
    if (remaining.length === 0) return 0;

    const avg = remaining.reduce((a, b) => a + b, 0) / remaining.length;

    // === 1. 轮次基础系数 ===
    let coeffMin, coeffMax;
    if (this.currentRound <= 3) {
      coeffMin = 0.10; coeffMax = 0.30;     // 前期：均值 10%-30%
    } else if (this.currentRound <= 6) {
      coeffMin = 0.40; coeffMax = 0.60;     // 中期：均值 40%-60%
    } else {
      coeffMin = 0.70; coeffMax = 0.90;     // 后期（≤4箱）：均值 70%-90%
    }
    let coeff = coeffMin + Math.random() * (coeffMax - coeffMin);

    // === 2. 大额淘汰修正：已开出大额（≥$100k）越多，系数压得越低 ===
    const eliminatedAmounts = this.boxes
      .filter(b => b.state === BOX_STATE.ELIMINATED)
      .map(b => b.amount);
    const bigEliminated = eliminatedAmounts.filter(a => a >= 100000).length;
    if (bigEliminated > 0) {
      coeff *= (1 - bigEliminated * 0.12);
    }

    // === 3. 专属箱兜底修正 ===
    const playerBox = this.boxes[this.selectedBoxIndex];
    if (playerBox && playerBox.state === BOX_STATE.SELECTED) {
      if (playerBox.amount >= 100000) {
        coeff *= 1.1;   // 专属箱是大额 → 小幅抬升
      } else if (playerBox.amount <= 1000) {
        coeff *= 0.8;   // 专属箱是小额 → 进一步压价
      }
    }

    // 系数安全钳位
    coeff = Math.max(0.05, Math.min(0.95, coeff));

    // === 4. 微幅随机浮动 ±5%（仅节目效果，不突破安全区间） ===
    const fluctuation = 1 + (Math.random() * 0.10 - 0.05);

    let offer = avg * coeff * fluctuation;

    // 兜底
    if (offer < 1) offer = 1;

    // 取整
    if (offer >= 1000) {
      offer = Math.round(offer / 1000) * 1000;
    } else {
      offer = Math.round(offer);
    }

    return offer;
  }

  /** 银行家出价（被 ui.js 调用） */
  makeOffer() {
    if (this.phase !== GAME_PHASE.BANKER_OFFER) return null;

    const offer = this.calculateOffer();
    this.offerHistory.push({
      round: this.currentRound,
      offer
    });

    return offer;
  }

  /** 接受报价（Deal） */
  acceptDeal() {
    if (this.phase !== GAME_PHASE.BANKER_OFFER) return null;

    const offer = this.offerHistory[this.offerHistory.length - 1].offer;
    const playerAmount = this.boxes[this.selectedBoxIndex].amount;

    this.phase = GAME_PHASE.GAME_OVER;
    this.gameOver = true;
    this.finalResult = {
      type: 'deal',
      earned: offer,
      playerBoxAmount: playerAmount,
      couldHaveWon: playerAmount > offer ? playerAmount : offer
    };

    return this.finalResult;
  }

  /** 拒绝报价（No Deal） → 进入下一轮 */
  rejectDeal() {
    if (this.phase !== GAME_PHASE.BANKER_OFFER) return false;

    this.currentRound++;
    this.openedThisRound = 0;

    // 检查是否只剩 2 箱（含玩家专属箱）
    const remainingCount = this.boxes.filter(b => b.state !== BOX_STATE.ELIMINATED).length;
    if (remainingCount <= 2) {
      this.phase = GAME_PHASE.FINAL_CHOICE;
    } else {
      this.phase = GAME_PHASE.OPENING;
    }

    return true;
  }

  /** 终极抉择：交换 / 不交换 */
  finalChoice(shouldSwap) {
    if (this.phase !== GAME_PHASE.FINAL_CHOICE) return null;

    // 找到最后一个未开的公共箱子
    const remainingBoxes = this.boxes.filter(b => b.state === BOX_STATE.UNOPENED);
    const publicBox = remainingBoxes.find(b => b.id !== this.boxes[this.selectedBoxIndex].id);
    const playerBox = this.boxes[this.selectedBoxIndex];

    let finalAmount;
    if (shouldSwap) {
      // 交换：玩家得到公共箱子的金额
      finalAmount = publicBox.amount;
      publicBox.state = BOX_STATE.FINAL;
      playerBox.state = BOX_STATE.FINAL;
    } else {
      // 不交换：保留自己的箱子
      finalAmount = playerBox.amount;
      playerBox.state = BOX_STATE.FINAL;
      publicBox.state = BOX_STATE.FINAL;
    }

    // 揭晓所有剩余箱子的金额
    playerBox.state = BOX_STATE.FINAL;
    publicBox.state = BOX_STATE.FINAL;

    this.phase = GAME_PHASE.GAME_OVER;
    this.gameOver = true;
    this.finalResult = {
      type: 'final',
      earned: finalAmount,
      playerBoxAmount: playerBox.amount,
      otherBoxAmount: publicBox.amount,
      swapped: shouldSwap,
      couldHaveWon: Math.max(playerBox.amount, publicBox.amount)
    };

    return this.finalResult;
  }

  /** 获取当前游戏状态的快照（供 UI 渲染） */
  getState() {
    return {
      phase: this.phase,
      currentRound: this.currentRound,
      openedThisRound: this.openedThisRound,
      roundTotal: this.getRoundOpenCount(),
      selectedBoxIndex: this.selectedBoxIndex,
      boxes: this.boxes.map(b => ({ ...b })),
      offerHistory: [...this.offerHistory],
      finalResult: this.finalResult,
      gameOver: this.gameOver
    };
  }
}
