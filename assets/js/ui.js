/**
 * ui.js — 视图渲染与交互控制
 * 只负责 DOM 操作和事件绑定，不涉及游戏业务逻辑
 */

const UI = {
  /** DOM 缓存 */
  els: {},

  /** 初始化 UI */
  init() {
    this.cacheElements();
    this.renderPrizeList();
    this.renderBoxes();
    this.updateStatus();
    this.updateGuide('请选择你的专属箱子');
    this.bindEvents();
  },

  /** 缓存 DOM 元素 */
  cacheElements() {
    this.els = {
      mainArea: document.querySelector('.main-area'),
      boxesGrid: document.getElementById('boxesGrid'),
      selectedBoxArea: document.getElementById('selectedBoxArea'),
      selectedBoxSlot: document.getElementById('selectedBoxSlot'),
      prizeList: document.getElementById('prizeList'),
      statusRound: document.getElementById('statusRound'),
      statusOpened: document.getElementById('statusOpened'),
      statusOffer: document.getElementById('statusOffer'),
      offerPopup: document.getElementById('offerPopup'),
      offerAmount: document.getElementById('offerAmount'),
      dealBtn: document.getElementById('dealBtn'),
      noDealBtn: document.getElementById('noDealBtn'),
      finalPopup: document.getElementById('finalPopup'),
      finalAmount: document.getElementById('finalAmount'),
      swapBtn: document.getElementById('swapBtn'),
      keepBtn: document.getElementById('keepBtn'),
      resultOtherBoxRow: document.getElementById('resultOtherBoxRow'),
      resultPopup: document.getElementById('resultPopup'),
      resultTitle: document.getElementById('resultTitle'),
      resultEarned: document.getElementById('resultEarned'),
      resultPlayerBox: document.getElementById('resultPlayerBox'),
      resultOtherBox: document.getElementById('resultOtherBox'),
      resultCouldHave: document.getElementById('resultCouldHave'),
      restartBtn: document.getElementById('restartBtn'),
      restartBtn2: document.getElementById('restartBtn2'),
      guideText: document.getElementById('guideText')
    };
  },

  /** 绑定事件 */
  bindEvents() {
    // Deal / No Deal
    this.els.dealBtn.addEventListener('click', () => this.handleDeal());
    this.els.noDealBtn.addEventListener('click', () => this.handleNoDeal());
    // 终极抉择
    this.els.swapBtn.addEventListener('click', () => this.handleFinalChoice(true));
    this.els.keepBtn.addEventListener('click', () => this.handleFinalChoice(false));
    // 重新开始
    this.els.restartBtn.addEventListener('click', () => this.resetGame());
    this.els.restartBtn2.addEventListener('click', () => this.resetGame());
  },

  /** 处理 Deal（成交） */
  handleDeal() {
    const result = game.acceptDeal();
    if (!result) return;

    this.closeAllPopups();
    setTimeout(() => {
      this.updateBoxStates();
      this.updateStatus();
      this.showResult(result);
      this.updateGuide('游戏结束，点击「重新开始」再来一局');
    }, 300);
  },

  /** 处理 No Deal（继续） */
  handleNoDeal() {
    const ok = game.rejectDeal();
    if (!ok) return;

    this.closeAllPopups();
    const state = game.getState();
    if (state.phase === GAME_PHASE.FINAL_CHOICE) {
      setTimeout(() => this.showFinalChoice(), 300);
      this.updateGuide('只剩最后两箱，请做出终极抉择');
    } else {
      this.updateGuide('点击箱子完成本轮开箱');
    }
    this.updateStatus();
  },

  /** 处理终极抉择 */
  handleFinalChoice(shouldSwap) {
    const result = game.finalChoice(shouldSwap);
    if (!result) return;

    this.closeAllPopups();
    setTimeout(() => {
      this.updateBoxStates();
      this.updateStatus();
      this.showResult(result);
      this.updateGuide('游戏结束，点击「重新开始」再来一局');
    }, 300);
  },

  /** 重置游戏 */
  resetGame() {
    game.reset();
    // 还原布局：移回箱子、隐藏专属区
    this.els.mainArea.classList.remove('has-selected');
    this.els.selectedBoxArea.classList.add('hidden');
    this.els.selectedBoxSlot.innerHTML = '';
    this.init();
    this.closeAllPopups();
  },

  /** 渲染 26 个箱子 */
  renderBoxes() {
    const grid = this.els.boxesGrid;
    grid.innerHTML = '';
    game.boxes.forEach((box, index) => {
      const div = document.createElement('div');
      div.className = 'box';
      div.dataset.index = index;

      const inner = document.createElement('div');
      inner.className = 'box-inner';

      const front = document.createElement('div');
      front.className = 'box-front';
      front.innerHTML = `<span class="box-number">${box.id}</span>`;

      const back = document.createElement('div');
      back.className = 'box-back';
      back.textContent = this.formatAmount(box.amount);

      inner.appendChild(front);
      inner.appendChild(back);
      div.appendChild(inner);

      div.addEventListener('click', () => this.handleBoxClick(index));
      grid.appendChild(div);
    });
  },

  /** 处理箱子点击 */
  handleBoxClick(index) {
    const state = game.getState();

    if (state.phase === GAME_PHASE.SELECTING) {
      const ok = game.selectBox(index);
      if (ok) {
        // 把选中的箱子从网格移到专属展示区，并添加高亮样式
        const boxEl = this.els.boxesGrid.querySelector(`.box[data-index="${index}"]`);
        if (boxEl) {
          this.els.selectedBoxSlot.innerHTML = '';
          boxEl.classList.add('selected');
          this.els.selectedBoxSlot.appendChild(boxEl);
        }
        this.els.selectedBoxArea.classList.remove('hidden');
        this.els.mainArea.classList.add('has-selected');
        this.updateBoxStates();
        this.updateStatus();
        this.updateGuide('点击箱子完成本轮开箱');
      }
      return;
    }

    if (state.phase === GAME_PHASE.OPENING) {
      const result = game.openBox(index);
      if (result) {
        this.flipBox(index, result.amount);
        this.updateBoxStates();
        this.updatePrizeList();
        this.updateStatus();

        if (result.roundComplete) {
          this.updateGuide('等待银行家报价');
          setTimeout(() => this.showOffer(), 800);
        }
      }
    }
  },

  /** 打开箱子：在前脸显示金额（不用3D翻转，彻底避免偏移） */
  flipBox(index, amount) {
    const boxEl = this.els.boxesGrid.querySelector(`.box[data-index="${index}"]`);
    if (!boxEl) return;

    const front = boxEl.querySelector('.box-front');
    const numberEl = front.querySelector('.box-number');
    if (numberEl) numberEl.style.display = 'none';
    front.textContent = this.formatAmount(amount);
    front.classList.add('opened');

    front.classList.add('reveal-flash');
    setTimeout(() => front.classList.remove('reveal-flash'), 500);
    boxEl.classList.add('shake');
    setTimeout(() => boxEl.classList.remove('shake'), 350);
  },

  /** 更新箱子样式（用 dataset.index 匹配） */
  updateBoxStates() {
    const boxes = game.boxes;
    this.els.boxesGrid.querySelectorAll('.box').forEach((el) => {
      const idx = parseInt(el.dataset.index);
      if (isNaN(idx)) return;
      el.className = 'box';
      if (boxes[idx].state === BOX_STATE.SELECTED) {
        el.classList.add('selected');
      } else if (boxes[idx].state === BOX_STATE.ELIMINATED) {
        el.classList.add('eliminated');
      } else if (boxes[idx].state === BOX_STATE.FINAL) {
        el.classList.add('final');
      }
    });
  },

  /** 渲染奖金池侧边栏 */
  renderPrizeList() {
    const list = this.els.prizeList;
    list.innerHTML = '';
    AMOUNTS.forEach(amount => {
      const div = document.createElement('div');
      div.className = 'prize-item';
      div.dataset.amount = amount;
      div.textContent = this.formatAmount(amount);
      list.appendChild(div);
    });
  },

  /** 更新奖金池状态（已淘汰的划掉） */
  updatePrizeList() {
    const eliminated = game.boxes
      .filter(b => b.state === BOX_STATE.ELIMINATED)
      .map(b => b.amount);

    this.els.prizeList.querySelectorAll('.prize-item').forEach(el => {
      const amount = parseFloat(el.dataset.amount);
      if (eliminated.includes(amount)) {
        el.classList.add('eliminated');
      }
    });
  },

  /** 更新状态提示区 */
  updateStatus() {
    const state = game.getState();
    this.els.statusRound.textContent = `第 ${state.currentRound} 轮`;
    if (state.phase === GAME_PHASE.OPENING || state.phase === GAME_PHASE.BANKER_OFFER) {
      this.els.statusOpened.textContent = `已开 ${state.openedThisRound}/${state.roundTotal}`;
    } else if (state.phase === GAME_PHASE.SELECTING) {
      this.els.statusOpened.textContent = '等待选箱';
    } else {
      this.els.statusOpened.textContent = '';
    }

    // 更新最新报价显示
    if (state.offerHistory.length > 0) {
      const last = state.offerHistory[state.offerHistory.length - 1];
      this.els.statusOffer.textContent = `最新报价: ${this.formatAmount(last.offer)}`;
    } else {
      this.els.statusOffer.textContent = '';
    }
  },

  /** 更新新手引导文字 */
  updateGuide(text) {
    if (this.els.guideText) {
      this.els.guideText.textContent = text;
      this.els.guideText.classList.add('fade-in');
      setTimeout(() => this.els.guideText.classList.remove('fade-in'), 500);
    }
  },

  /** 显示银行家报价弹窗 */
  showOffer() {
    const offer = game.makeOffer();
    if (offer === null) return;

    this.els.offerAmount.textContent = this.formatAmount(offer);
    this.els.offerPopup.classList.remove('hidden');
    this.els.offerPopup.classList.add('pop-in');
    this.updateStatus();
  },

  /** 显示终极抉择弹窗 */
  showFinalChoice() {
    const remaining = game.getRemainingAmounts();
    this.els.finalAmount.textContent = `${this.formatAmount(remaining[0])} 或 ${this.formatAmount(remaining[1])}`;
    this.els.finalPopup.classList.remove('hidden');
    this.els.finalPopup.classList.add('pop-in');
  },

  /** 显示游戏结算弹窗 */
  showResult(result) {
    this.els.resultPopup.classList.remove('hidden');
    this.els.resultPopup.classList.add('pop-in');

    if (result.type === 'deal') {
      this.els.resultTitle.textContent = '✅ 成交！';
      this.els.resultEarned.textContent = `你获得了: ${this.formatAmount(result.earned)}`;
      this.els.resultPlayerBox.textContent = `你的箱子实际金额: ${this.formatAmount(result.playerBoxAmount)}`;
      this.els.resultOtherBoxRow.style.display = 'none';
      this.els.resultCouldHave.textContent = `最高可中: ${this.formatAmount(result.couldHaveWon)}`;
    } else {
      this.els.resultTitle.textContent = result.swapped ? '🔄 你选择了交换' : '📦 你选择了保留';
      this.els.resultEarned.textContent = `最终获得: ${this.formatAmount(result.earned)}`;
      this.els.resultPlayerBox.textContent = `你的箱子: ${this.formatAmount(result.playerBoxAmount)}`;
      this.els.resultOtherBoxRow.style.display = '';
      this.els.resultOtherBox.textContent = `另一箱子: ${this.formatAmount(result.otherBoxAmount)}`;
      this.els.resultCouldHave.textContent = `最高可中: ${this.formatAmount(result.couldHaveWon)}`;
    }
  },

  /** 关闭所有弹窗 */
  closeAllPopups() {
    document.querySelectorAll('.popup-overlay').forEach(p => {
      p.classList.add('hidden');
      p.classList.remove('pop-in');
    });
  },

  /** 格式化金额显示 — 全 $ 逗号统一格式 */
  formatAmount(amount) {
    // ≥ 1,000 → $1,000 或 $1,000,000
    if (amount >= 1000) return `$${amount.toLocaleString()}`;
    // 特殊小金额
    if (amount === 0.01) return '$0.01';
    if (amount < 1) return `$${amount}`;
    return `$${amount}`;
  }
};
