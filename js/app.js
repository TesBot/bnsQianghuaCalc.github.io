/**
 * 剑灵怀旧服装备强化计算器 - UI逻辑
 */

const appState = {
  selectedEquip: 'weapon',
  selectedQuality: 'orange',
  mode: 1,
  conversionStrategy: 'split',
  currentLevel: 0,
  targetLevel: 1,
  ownedStones: { green: 0, blue: 0, purple: 0, orange: 0 },
  ownedBoxes: { green: 0, blue: 0, purple: 0, orange: 0 }
};

let elements = {};
let saveTimer = null;

function initApp() {
  cacheElements();
  loadState();
  bindEvents();
  updateUI();
}

function cacheElements() {
  elements = {
    modeBtns: document.querySelectorAll('.mode-btn'),
    equipSelect: document.getElementById('equip-select'),
    equipSelectText: document.getElementById('equip-select-text'),
    equipPreviewImg: document.getElementById('equip-preview-img'),
    equipImage: document.getElementById('equip-image'),
    equipName: document.getElementById('equip-name'),
    qualitySelect: document.getElementById('quality-select'),
    currentLevel: document.getElementById('current-level'),
    targetLevel: document.getElementById('target-level'),
    levelArrow: document.getElementById('level-arrow'),
    targetLabel: document.getElementById('target-label'),
    stoneTypeName: document.getElementById('stone-type-name'),
    boxTypeInfo: document.getElementById('box-type-info'),
    strategySelect: document.getElementById('strategy-select'),
    ownedStones: {
      green: document.getElementById('stone-green'),
      blue: document.getElementById('stone-blue'),
      purple: document.getElementById('stone-purple'),
      orange: document.getElementById('stone-orange')
    },
    ownedBoxes: {
      green: document.getElementById('box-green'),
      blue: document.getElementById('box-blue'),
      purple: document.getElementById('box-purple'),
      orange: document.getElementById('box-orange')
    },
    calcBtn: document.getElementById('calc-btn'),
    resetInputBtn: document.getElementById('reset-input-btn'),
    resetInventoryBtn: document.getElementById('reset-inventory-btn'),
    outputSection: document.getElementById('output-section'),
    resultSteps: document.getElementById('result-steps'),
    resultNeeds: document.getElementById('result-needs'),
    resultGold: document.getElementById('result-gold'),
    resultAttrs: document.getElementById('result-attrs')
  };
}

function updateLevelOptions() {
  const maxLevel = QUALITY_CONFIG[appState.selectedQuality].maxLevel;

  // 更新当前等级选项
  let currentHtml = '<option value="0">无</option>';
  for (let i = 1; i <= maxLevel; i++) {
    currentHtml += `<option value="${i}">+${i}</option>`;
  }
  elements.currentLevel.innerHTML = currentHtml;

  // 更新目标等级选项
  let targetHtml = '';
  for (let i = 1; i <= maxLevel; i++) {
    targetHtml += `<option value="${i}">+${i}</option>`;
  }
  elements.targetLevel.innerHTML = targetHtml;

  // 恢复选中值
  if (appState.currentLevel <= maxLevel) {
    elements.currentLevel.value = appState.currentLevel;
  } else {
    elements.currentLevel.value = maxLevel;
    appState.currentLevel = maxLevel;
  }

  if (appState.targetLevel <= maxLevel && appState.targetLevel > appState.currentLevel) {
    elements.targetLevel.value = appState.targetLevel;
  } else {
    const newTarget = Math.min(appState.currentLevel + 1, maxLevel);
    elements.targetLevel.value = newTarget;
    appState.targetLevel = newTarget;
  }
}

function bindEvents() {
  // 模式选择按钮
  elements.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      appState.mode = parseInt(btn.dataset.mode);
      elements.modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateModeDisplay();
      saveState();
    });
  });

  // 装备选择
  elements.equipSelect.addEventListener('change', () => {
    appState.selectedEquip = elements.equipSelect.value;
    updateEquipImage();
    updateStoneAndBoxInfo();
    saveState();
  });

  // 品阶选择
  elements.qualitySelect.addEventListener('change', () => {
    appState.selectedQuality = elements.qualitySelect.value;
    updateLevelOptions();
    updateEquipImage();
    updateStoneAndBoxInfo();
    saveState();
  });

  // 等级选择
  elements.currentLevel.addEventListener('change', () => {
    appState.currentLevel = parseInt(elements.currentLevel.value) || 0;
    // 确保目标等级大于当前等级
    if (appState.mode === 1) {
      const maxLevel = QUALITY_CONFIG[appState.selectedQuality].maxLevel;
      const currentVal = parseInt(elements.currentLevel.value);
      const targetVal = parseInt(elements.targetLevel.value);
      if (targetVal <= currentVal) {
        const newTarget = Math.min(currentVal + 1, maxLevel);
        elements.targetLevel.value = newTarget;
        appState.targetLevel = newTarget;
      }
    }
    saveState();
  });

  elements.targetLevel.addEventListener('change', () => {
    appState.targetLevel = parseInt(elements.targetLevel.value) || 1;
    saveState();
  });

  // 转换策略
  elements.strategySelect.addEventListener('change', () => {
    appState.conversionStrategy = elements.strategySelect.value;
    saveState();
  });

  // 材料输入
  for (const tier of TIER_ORDER) {
    elements.ownedStones[tier].addEventListener('change', () => {
      appState.ownedStones[tier] = parseInt(elements.ownedStones[tier].value) || 0;
      saveState();
    });
    elements.ownedBoxes[tier].addEventListener('change', () => {
      appState.ownedBoxes[tier] = parseInt(elements.ownedBoxes[tier].value) || 0;
      saveState();
    });
  }

  // 按钮
  elements.calcBtn.addEventListener('click', calculate);
  elements.resetInputBtn.addEventListener('click', resetInput);
  elements.resetInventoryBtn.addEventListener('click', resetInventory);
}

function updateEquipImage() {
  const equip = EQUIPMENT[appState.selectedEquip];
  const quality = QUALITY_CONFIG[appState.selectedQuality];
  const imgPath = `images/${quality.prefix}${equip.icon}.png`;
  const timestamp = new Date().getTime();

  // 更新下拉框旁边的小图
  if (elements.equipPreviewImg) {
    elements.equipPreviewImg.src = `${imgPath}?t=${timestamp}`;
    elements.equipPreviewImg.alt = `${quality.name}${equip.name}`;
  }

  // 更新大预览图
  if (elements.equipImage) {
    elements.equipImage.src = `${imgPath}?t=${timestamp}`;
    elements.equipImage.alt = `${quality.name}${equip.name}`;
  }

  // 更新装备名称（根据品阶显示不同颜色）
  if (elements.equipName) {
    elements.equipName.textContent = `${quality.name}${equip.name}`;
    // 根据品阶设置颜色
    const tierColors = {
      green: '#6D9B3A',
      blue: '#3A7CBD',
      purple: '#8B5CF6',
      orange: '#D4940A'
    };
    elements.equipName.style.color = tierColors[appState.selectedQuality] || '#3D2B1F';
  }

  // 更新下拉框显示文本
  if (elements.equipSelectText) {
    elements.equipSelectText.textContent = equip.name;
  }

  // 更新品阶选项文本
  updateQualityOptions();
}

function updateQualityOptions() {
  const equip = EQUIPMENT[appState.selectedEquip];
  const options = elements.qualitySelect.options;

  for (let i = 0; i < options.length; i++) {
    const qualityKey = options[i].value;
    const quality = QUALITY_CONFIG[qualityKey];
    options[i].textContent = `${quality.name}${equip.name}`;
  }
}

function updateStoneAndBoxInfo() {
  const equip = EQUIPMENT[appState.selectedEquip];
  const quality = QUALITY_CONFIG[appState.selectedQuality];

  // 更新强化石类型名称 - 统一显示"仙幻XX强化石"
  elements.stoneTypeName.textContent = `(仙幻${equip.name}强化石)`;

  // 更新箱子类型信息
  const boxNumber = equip.box;
  let boxInfo = '';
  if (boxNumber === 1) {
    boxInfo = '(1号箱:武器/戒指/耳环/项链)';
  } else {
    boxInfo = '(2号箱:手镯/腰带/手套)';
  }
  elements.boxTypeInfo.textContent = boxInfo;
}

function updateModeDisplay() {
  if (appState.mode === 2) {
    elements.levelArrow.style.display = 'none';
    elements.targetLabel.style.display = 'none';
    elements.targetLevel.style.display = 'none';
  } else {
    elements.levelArrow.style.display = 'inline';
    elements.targetLabel.style.display = 'inline';
    elements.targetLevel.style.display = 'inline';
  }
}

function updateUI() {
  // 模式按钮
  elements.modeBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.mode) === appState.mode);
  });

  elements.equipSelect.value = appState.selectedEquip;
  elements.qualitySelect.value = appState.selectedQuality;
  elements.strategySelect.value = appState.conversionStrategy;

  // 更新等级选项
  updateLevelOptions();

  for (const tier of TIER_ORDER) {
    elements.ownedStones[tier].value = appState.ownedStones[tier] || '';
    elements.ownedBoxes[tier].value = appState.ownedBoxes[tier] || '';
  }

  updateEquipImage();
  updateStoneAndBoxInfo();
  updateModeDisplay();
}

function calculate() {
  const equip = EQUIPMENT[appState.selectedEquip];
  const quality = QUALITY_CONFIG[appState.selectedQuality];

  const result = calculateUpgrade(
    appState.selectedEquip,
    appState.currentLevel,
    appState.mode === 1 ? appState.targetLevel : quality.maxLevel,
    { ...appState.ownedStones },
    { ...appState.ownedBoxes },
    appState.conversionStrategy
  );

  result.mode = appState.mode;
  result.equipName = `${quality.name}${equip.name}`;
  result.fromLevel = appState.currentLevel;

  // 计算属性收益
  result.gains = calcAttributeGains(
    appState.selectedEquip,
    appState.selectedQuality,
    appState.currentLevel,
    result.maxReached
  );

  renderResult(result);
  saveState();
}

function renderResult(result) {
  elements.outputSection.style.display = 'block';
  const equip = EQUIPMENT[appState.selectedEquip];

  let stepsHtml = '';

  // 标题
  if (result.mode === 2 || result.targetReached) {
    stepsHtml += `<div class="mode-info success">✅ ${result.equipName} +${result.fromLevel} → +${result.maxReached}</div>`;
  } else {
    stepsHtml += `<div class="mode-info warning">⚠️ 无法达成 +${result.targetLevel}，最多强化至 +${result.maxReached}</div>`;
  }

  // 开箱与转换明细（放在最前面）
  const openSteps = {};
  const convertSteps = [];
  result.conversionSteps.forEach(step => {
    if (step.type === 'open') {
      if (!openSteps[step.tier]) openSteps[step.tier] = step.count;
      else openSteps[step.tier] += step.count;
    } else {
      convertSteps.push(step);
    }
  });

  const hasBoxes = Object.keys(openSteps).length > 0;

  if (hasBoxes) {
    stepsHtml += '<div class="steps-group">';
    stepsHtml += '<div class="steps-group-title">📦 开箱计划</div>';
    stepsHtml += '<div class="compact-steps">';
    for (const tier of TIER_ORDER) {
      if (openSteps[tier]) {
        const boxNum = result.conversionSteps.find(s => s.type === 'open' && s.tier === tier)?.boxNumber || '';
        stepsHtml += `<div class="compact-step"><span class="compact-icon">📦</span><span>${STONE_TIERS[tier].name}仙幻强化石箱子${boxNum}号</span><span class="compact-count">×${openSteps[tier]}</span></div>`;
      }
    }
    stepsHtml += '</div></div>';
  }

  // 转换明细（合并同类操作，按顺序显示）
  if (convertSteps.length > 0) {
    // 分离开箱和转换操作
    const openOnly = convertSteps.filter(s => s.type === 'open');
    const convertOnly = convertSteps.filter(s => s.type !== 'open');

    // 合并开箱操作
    const mergedOpens = {};
    openOnly.forEach(step => {
      if (!mergedOpens[step.tier]) mergedOpens[step.tier] = 0;
      mergedOpens[step.tier] += step.count;
    });

    // 合并相邻的同类转换操作
    const mergedConverts = [];
    convertOnly.forEach(step => {
      const last = mergedConverts[mergedConverts.length - 1];
      if (last && last.type === step.type && last.from === step.from && last.to === step.to) {
        last.count += step.count;
        last.result += step.result;
        last.cost += step.cost;
      } else {
        mergedConverts.push({ ...step });
      }
    });

    stepsHtml += '<div class="steps-group">';
    stepsHtml += '<div class="steps-group-title">🔄 转换明细</div>';
    stepsHtml += '<div class="convert-steps">';

    let stepNum = 1;

    // 显示开箱汇总
    for (const tier of TIER_ORDER) {
      if (mergedOpens[tier]) {
        const boxNum = result.conversionSteps.find(s => s.type === 'open' && s.tier === tier)?.boxNumber || '';
        stepsHtml += `
          <div class="convert-step">
            <span class="convert-num">${stepNum++}</span>
            <span class="convert-action">📦 开箱</span>
            <span class="convert-from">${mergedOpens[tier]}个${STONE_TIERS[tier].name}仙幻强化石箱子${boxNum}号</span>
            <span class="convert-arrow">→</span>
            <span class="convert-to">获得${mergedOpens[tier]}个${STONE_TIERS[tier].name}仙幻${equip.name}强化石</span>
          </div>`;
      }
    }

    // 显示转换操作
    mergedConverts.forEach((step) => {
      const fromName = `${STONE_TIERS[step.from].name}仙幻${equip.name}强化石`;
      const toName = `${STONE_TIERS[step.to].name}仙幻${equip.name}强化石`;
      const action = step.type === 'split' ? '分解' : '合成';
      const actionIcon = step.type === 'split' ? '↓' : '↑';
      const costText = step.type === 'split' ? '免费' : `${step.cost}银`;
      const costClass = step.type === 'split' ? 'free' : '';

      stepsHtml += `
        <div class="convert-step">
          <span class="convert-num">${stepNum++}</span>
          <span class="convert-action">${actionIcon} ${action}</span>
          <span class="convert-from">${step.count}个${fromName}</span>
          <span class="convert-arrow">→</span>
          <span class="convert-to">${step.result}个${toName}</span>
          <span class="convert-cost ${costClass}">${costText}</span>
        </div>`;
    });
    stepsHtml += '</div></div>';
  }

  // 逐级升级步骤（可折叠）
  stepsHtml += '<div class="collapsible-section">';
  stepsHtml += '<div class="collapsible-header" onclick="toggleCollapsible(this)">';
  stepsHtml += '<span>📋 各等级升级消耗详情</span><span class="collapsible-status">（展开）</span><span class="collapsible-arrow">▼</span></div>';
  stepsHtml += '<div class="collapsible-body">';
  stepsHtml += '<div class="upgrade-steps">';
  result.upgradeResults.filter(ur => result.mode === 1 || ur.method !== 'failed').forEach((ur) => {
    const tierInfo = STONE_TIERS[ur.tier];
    const stoneName = `${tierInfo.name}仙幻${equip.name}强化石`;
    const isFailed = ur.method === 'failed';

    stepsHtml += `<div class="upgrade-step${isFailed ? ' upgrade-failed' : ''}">`;
    stepsHtml += `<div class="upgrade-header"><span class="upgrade-level">+${ur.level}</span>`;
    stepsHtml += `<span class="upgrade-need">需要 ${ur.count} 个${stoneName}</span>`;
    stepsHtml += `<span class="upgrade-gold">${ur.gold}金(优惠${ur.discount}金)</span></div>`;

    if (isFailed) {
      stepsHtml += `<div class="upgrade-body"><span class="fail-text">❌ 缺少 ${ur.shortfall} 个${stoneName}</span></div>`;
    }

    stepsHtml += '</div>';
  });
  stepsHtml += '</div></div></div>';

  // 剩余材料（只在目标达成时显示）
  if (result.targetReached) {
    const hasRemaining = TIER_ORDER.some(tier => (result.remainingPool[tier] || 0) > 0 || (result.remainingBoxes[tier] || 0) > 0);
    if (hasRemaining) {
      stepsHtml += '<div class="summary-box remaining">';
      stepsHtml += '<span class="summary-label">📦 剩余：</span>';
      const parts = [];
      for (const tier of TIER_ORDER) {
        if (result.remainingPool[tier] > 0) parts.push(`${STONE_TIERS[tier].name}石×${result.remainingPool[tier]}`);
        if (result.remainingBoxes[tier] > 0) parts.push(`${STONE_TIERS[tier].name}箱×${result.remainingBoxes[tier]}`);
      }
      stepsHtml += parts.join('、');
      stepsHtml += '</div>';
    }
  }

  elements.resultSteps.querySelector('.steps-content').innerHTML = stepsHtml;

  // 2. 材料需求汇总
  let needsHtml = '<div class="needs-grid">';
  for (const tier of TIER_ORDER) {
    if (result.totalNeeds[tier] > 0) {
      const tierInfo = STONE_TIERS[tier];
      needsHtml += `
        <div class="need-item">
          <span class="need-color" style="background:${tierInfo.color}"></span>
          <span class="need-name">${tierInfo.name}仙幻${equip.name}强化石</span>
          <span class="need-count">${result.totalNeeds[tier]}</span>
        </div>`;
    }
  }
  needsHtml += '</div>';
  elements.resultNeeds.querySelector('.needs-content').innerHTML = needsHtml;

  // 3. 金币消耗
  let goldHtml = '<div class="gold-info">';
  goldHtml += `
    <div class="gold-row">
      <span class="gold-label">强化石金币（原价/优惠）</span>
      <span class="gold-value">${result.totalGoldCost} 金 / ${result.totalDiscountGoldCost} 金</span>
    </div>`;

  if (result.totalSilverCost > 0) {
    const silver = result.totalSilverCost;
    const silverStr = silver >= 100 ? `${Math.floor(silver / 100)}金${silver % 100}银` : `${silver}银`;
    goldHtml += `
      <div class="gold-row">
        <span class="gold-label">转换费用</span>
        <span class="gold-value">${silverStr}</span>
      </div>`;

    const totalOriginal = result.totalGoldCost + Math.floor(silver / 100);
    const totalDiscount = result.totalDiscountGoldCost + Math.floor(silver / 100);
    goldHtml += `
      <div class="gold-row highlight">
        <span class="gold-label">总计</span>
        <span class="gold-value">${totalOriginal} 金 / ${totalDiscount} 金</span>
      </div>`;
  } else {
    goldHtml += `
      <div class="gold-row highlight">
        <span class="gold-label">总计</span>
        <span class="gold-value">${result.totalGoldCost} 金 / ${result.totalDiscountGoldCost} 金</span>
      </div>`;
  }

  goldHtml += '</div>';
  elements.resultGold.querySelector('.gold-content').innerHTML = goldHtml;

  // 4. 属性收益
  let attrsHtml = '<div class="attrs-grid">';

  if (result.gains.totalAttack > 0) {
    attrsHtml += `
      <div class="attr-item">
        <span class="attr-name">攻击</span>
        <span class="attr-value">+${result.gains.totalAttack}</span>
        ${result.gains.redTextAttack > 0 ? `<span class="attr-red">含红字+${result.gains.redTextAttack}</span>` : ''}
      </div>`;
  }

  if (result.gains.crit > 0) {
    attrsHtml += `
      <div class="attr-item">
        <span class="attr-name">暴击</span>
        <span class="attr-value">+${result.gains.crit}</span>
      </div>`;
  }

  if (result.gains.critDmg > 0) {
    attrsHtml += `
      <div class="attr-item">
        <span class="attr-name">爆伤</span>
        <span class="attr-value">+${result.gains.critDmg}</span>
      </div>`;
  }

  attrsHtml += '</div>';
  elements.resultAttrs.querySelector('.attrs-content').innerHTML = attrsHtml;

  elements.outputSection.scrollIntoView({ behavior: 'smooth' });
}

function resetInput() {
  appState.currentLevel = 0;
  appState.targetLevel = 1;
  elements.currentLevel.value = 0;
  elements.targetLevel.value = 1;
  saveState();
}

function resetInventory() {
  if (!confirm('确定要清空所有库存数据吗？')) return;

  for (const tier of TIER_ORDER) {
    appState.ownedStones[tier] = 0;
    appState.ownedBoxes[tier] = 0;
    elements.ownedStones[tier].value = '';
    elements.ownedBoxes[tier].value = '';
  }

  saveState();
}

function saveState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const state = { version: 1, ...appState };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, 300);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      if (state.version === 1) {
        Object.assign(appState, state);
      }
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

// 切换折叠状态
function toggleCollapsible(header) {
  const section = header.parentElement;
  const isOpen = section.classList.toggle('open');
  const status = header.querySelector('.collapsible-status');
  if (status) {
    status.textContent = isOpen ? '（收起）' : '（展开）';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
