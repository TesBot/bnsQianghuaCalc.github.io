/**
 * 剑灵怀旧服装备强化计算器 - 核心算法
 */

function calcMaterialNeeds(equipKey, fromLevel, toLevel) {
  const equip = EQUIPMENT[equipKey];
  const costTable = COST_TABLE[equip.category];
  const needs = { green: 0, blue: 0, purple: 0, orange: 0 };
  let totalGold = 0;
  let totalDiscountGold = 0;

  for (let level = fromLevel; level < toLevel; level++) {
    const step = costTable[level];
    needs[step.tier] += step.count;
    totalGold += step.gold;
    totalDiscountGold += step.discount;
  }

  return { needs, totalGold, totalDiscountGold };
}

function calcAttributeGains(equipKey, quality, fromLevel, toLevel) {
  const equipAttrs = ATTRIBUTES[equipKey];
  const qualityAttrs = equipAttrs[quality];
  const gains = {};

  // 计算攻击收益
  const baseAttack = qualityAttrs.base;
  const attackValues = qualityAttrs.attack;

  // fromLevel=0时用base，否则用attack数组
  const fromAttack = fromLevel === 0 ? baseAttack : attackValues[fromLevel - 1];
  const toAttack = toLevel === 0 ? baseAttack : attackValues[toLevel - 1];
  gains.attack = toAttack - fromAttack;

  // 红字属性（按最小值计算）
  let redTextAttack = 0;
  const redTexts = RED_TEXT_ATTRIBUTES[equipKey];
  if (redTexts) {
    for (const level in redTexts) {
      const levelNum = parseInt(level);
      if (fromLevel < levelNum && toLevel >= levelNum) {
        redTextAttack += redTexts[levelNum].min;
      }
    }
  }

  gains.redTextAttack = redTextAttack;
  gains.totalAttack = gains.attack + redTextAttack;
  return gains;
}

/**
 * 核心计算函数 - 先计算总需求，再分配资源
 */
function calculateUpgrade(equipKey, fromLevel, targetLevel, ownedStones, ownedBoxes, strategy) {
  const equip = EQUIPMENT[equipKey];
  const boxNumber = equip.box;
  const costTable = COST_TABLE[equip.category];
  const quality = QUALITY_CONFIG[appState.selectedQuality];
  const maxPossible = Math.min(targetLevel, quality.maxLevel);

  // 逐级尝试，找到最大可达等级
  let maxReached = fromLevel;

  for (let testLevel = maxPossible; testLevel > fromLevel; testLevel--) {
    const { needs } = calcMaterialNeeds(equipKey, fromLevel, testLevel);

    // 检查总资源是否足够（含转换）
    if (canFulfill(needs, ownedStones, ownedBoxes, strategy)) {
      maxReached = testLevel;
      break;
    }
  }

  // 为最大可达等级生成详细方案
  const { needs: finalNeeds } = calcMaterialNeeds(equipKey, fromLevel, maxReached);
  const result = generatePlan(equipKey, fromLevel, maxReached, finalNeeds, ownedStones, ownedBoxes, strategy, boxNumber);

  // 计算剩余可用资源（用于显示缺少多少）
  const remainingResources = { green: 0, blue: 0, purple: 0, orange: 0 };
  for (const tier of TIER_ORDER) {
    remainingResources[tier] = (result.remainingPool[tier] || 0) + (result.remainingBoxes[tier] || 0);
  }

  // 生成升级结果
  const targetReached = maxReached >= targetLevel;
  const upgradeResults = [];

  for (let level = fromLevel; level < maxReached; level++) {
    const stepCost = costTable[level];
    upgradeResults.push({
      level: level + 1,
      tier: stepCost.tier,
      count: stepCost.count,
      gold: stepCost.gold,
      discount: stepCost.discount,
      method: 'converted'
    });
  }

  // 计算失败步骤的实际缺少数量
  const tempRemaining = { ...remainingResources };
  for (let level = maxReached; level < targetLevel; level++) {
    const stepCost = costTable[level];
    const tier = stepCost.tier;
    const tierIdx = TIER_ORDER.indexOf(tier);
    let need = stepCost.count;

    // 先用同品阶剩余
    const fromSame = Math.min(need, tempRemaining[tier]);
    tempRemaining[tier] -= fromSame;
    need -= fromSame;

    // 根据策略处理转换
    if (need > 0) {
      if (strategy === 'split') {
        // 分解高品阶资源
        for (let j = tierIdx + 1; j < 4 && need > 0; j++) {
          const highTier = TIER_ORDER[j];
          const ratio = Math.pow(2, j - tierIdx);
          const highNeed = Math.ceil(need / ratio);
          const useHigh = Math.min(highNeed, tempRemaining[highTier]);
          if (useHigh > 0) {
            tempRemaining[highTier] -= useHigh;
            need -= useHigh * ratio;
          }
        }
      } else {
        // 合成低品阶资源
        for (let j = tierIdx - 1; j >= 0 && need > 0; j--) {
          const lowTier = TIER_ORDER[j];
          const ratio = Math.pow(2, tierIdx - j);
          const canMerge = Math.floor(tempRemaining[lowTier] / ratio);
          const useMerge = Math.min(canMerge, need);
          if (useMerge > 0) {
            tempRemaining[lowTier] -= useMerge * ratio;
            need -= useMerge;
          }
        }
      }
    }

    upgradeResults.push({
      level: level + 1,
      tier: stepCost.tier,
      count: stepCost.count,
      gold: stepCost.gold,
      discount: stepCost.discount,
      method: 'failed',
      shortfall: Math.max(0, need)
    });
  }

  return {
    targetLevel,
    maxReached,
    targetReached,
    upgradeResults,
    conversionSteps: result.steps,
    totalNeeds: finalNeeds,
    totalGoldCost: upgradeResults.filter(r => r.method !== 'failed').reduce((sum, r) => sum + r.gold, 0),
    totalDiscountGoldCost: upgradeResults.filter(r => r.method !== 'failed').reduce((sum, r) => sum + r.discount, 0),
    totalSilverCost: result.silverCost,
    remainingPool: result.remainingPool,
    remainingBoxes: result.remainingBoxes
  };
}

/**
 * 检查总资源是否能满足需求
 */
function canFulfill(needs, ownedStones, ownedBoxes, strategy) {
  const netNeeds = {};
  const pool = { green: 0, blue: 0, purple: 0, orange: 0 };

  // 计算净需求，多余强化石加入转换池
  for (const tier of TIER_ORDER) {
    const need = needs[tier] || 0;
    const owned = ownedStones[tier] || 0;
    if (owned >= need) {
      netNeeds[tier] = 0;
      pool[tier] += owned - need; // 多余的加入池中
    } else {
      netNeeds[tier] = need - owned;
    }
  }

  const boxes = { ...ownedBoxes };
  const remaining = { ...netNeeds };

  // 循环处理，直到没有进展或全部满足
  for (let round = 0; round < 20; round++) {
    let progress = false;

    const order = strategy === 'split' ? [3, 2, 1, 0] : [0, 1, 2, 3];

    for (const idx of order) {
      const tier = TIER_ORDER[idx];
      let need = remaining[tier];
      if (need <= 0) continue;

      // 用pool中的本品阶
      const fromPool = Math.min(need, pool[tier]);
      if (fromPool > 0) {
        pool[tier] -= fromPool;
        need -= fromPool;
        progress = true;
      }

      // 用同品阶箱子
      const fromSame = Math.min(need, boxes[tier] || 0);
      if (fromSame > 0) {
        boxes[tier] -= fromSame;
        need -= fromSame;
        progress = true;
      }

      if (need <= 0) {
        if (need < 0) pool[tier] += -need;
        remaining[tier] = 0;
        continue;
      }

      // 转换
      if (strategy === 'split') {
        // 分解高阶
        for (let j = idx + 1; j < 4 && need > 0; j++) {
          const highTier = TIER_ORDER[j];
          const ratio = Math.pow(2, j - idx);
          const use = Math.min(pool[highTier], Math.ceil(need / ratio));
          if (use > 0) {
            pool[highTier] -= use;
            need -= use * ratio;
            progress = true;
          }
          const needBoxes = Math.ceil(need / ratio);
          const useBoxes = Math.min(needBoxes, boxes[highTier] || 0);
          if (useBoxes > 0) {
            boxes[highTier] -= useBoxes;
            need -= useBoxes * ratio;
            progress = true;
          }
        }
        // 合成低阶
        for (let j = idx - 1; j >= 0 && need > 0; j--) {
          const lowTier = TIER_ORDER[j];
          const ratio = Math.pow(2, idx - j);
          const maxFromPool = Math.floor(pool[lowTier] / ratio);
          const usePool = Math.min(maxFromPool, need);
          if (usePool > 0) {
            pool[lowTier] -= usePool * ratio;
            need -= usePool;
            progress = true;
          }
          if (need > 0 && boxes[lowTier] >= 2) {
            const needBoxes = Math.min(boxes[lowTier], need * ratio);
            if (needBoxes >= 2) {
              boxes[lowTier] -= needBoxes;
              const actualOutput = Math.floor(needBoxes / ratio);
              const remainder = needBoxes - actualOutput * ratio;
              need -= actualOutput;
              if (remainder > 0) pool[lowTier] += remainder;
              progress = true;
            }
          }
        }
      } else {
        // 合成低阶
        for (let j = idx - 1; j >= 0 && need > 0; j--) {
          const lowTier = TIER_ORDER[j];
          const ratio = Math.pow(2, idx - j);
          const maxFromPool = Math.floor(pool[lowTier] / ratio);
          const usePool = Math.min(maxFromPool, need);
          if (usePool > 0) {
            pool[lowTier] -= usePool * ratio;
            need -= usePool;
            progress = true;
          }
          if (need > 0 && boxes[lowTier] >= 2) {
            const needBoxes = Math.min(boxes[lowTier], need * ratio);
            if (needBoxes >= 2) {
              boxes[lowTier] -= needBoxes;
              const actualOutput = Math.floor(needBoxes / ratio);
              const remainder = needBoxes - actualOutput * ratio;
              need -= actualOutput;
              if (remainder > 0) pool[lowTier] += remainder;
              progress = true;
            }
          }
        }
        // 分解高阶
        for (let j = idx + 1; j < 4 && need > 0; j++) {
          const highTier = TIER_ORDER[j];
          const ratio = Math.pow(2, j - idx);
          const use = Math.min(pool[highTier], Math.ceil(need / ratio));
          if (use > 0) {
            pool[highTier] -= use;
            need -= use * ratio;
            progress = true;
          }
          const needBoxes = Math.ceil(need / ratio);
          const useBoxes = Math.min(needBoxes, boxes[highTier] || 0);
          if (useBoxes > 0) {
            boxes[highTier] -= useBoxes;
            need -= useBoxes * ratio;
            progress = true;
          }
        }
      }

      if (need < 0) pool[tier] += -need;
      remaining[tier] = Math.max(0, need);
    }

    // 将pool中低阶资源向上合并
    for (let i = 0; i < TIER_ORDER.length - 1; i++) {
      const lowTier = TIER_ORDER[i];
      const highTier = TIER_ORDER[i + 1];
      if (pool[lowTier] >= 2) {
        const merges = Math.floor(pool[lowTier] / 2);
        pool[lowTier] -= merges * 2;
        pool[highTier] += merges;
        progress = true;
      }
    }

    if (!progress) break;
    if (TIER_ORDER.every(tier => remaining[tier] <= 0)) return true;
  }

  return TIER_ORDER.every(tier => remaining[tier] <= 0);
}

/**
 * 生成详细的开箱和转换方案
 */
function generatePlan(equipKey, fromLevel, toLevel, needs, ownedStones, ownedBoxes, strategy, boxNumber) {
  const netNeeds = {};
  const pool = { green: 0, blue: 0, purple: 0, orange: 0 };
  const stonesUsed = { green: 0, blue: 0, purple: 0, orange: 0 };

  // 计算净需求，多余强化石加入转换池
  for (const tier of TIER_ORDER) {
    const need = needs[tier] || 0;
    const owned = ownedStones[tier] || 0;
    if (owned >= need) {
      netNeeds[tier] = 0;
      stonesUsed[tier] = need;
      pool[tier] += owned - need; // 多余的加入池中
    } else {
      netNeeds[tier] = need - owned;
      stonesUsed[tier] = owned;
    }
  }

  const boxesLeft = { ...ownedBoxes };
  const boxesToOpen = { green: 0, blue: 0, purple: 0, orange: 0 };
  const conversions = [];
  let silverCost = 0;
  const remaining = { ...netNeeds };

  for (let round = 0; round < 20; round++) {
    let progress = false;
    const order = strategy === 'split' ? [3, 2, 1, 0] : [0, 1, 2, 3];

    for (const idx of order) {
      const tier = TIER_ORDER[idx];
      let need = remaining[tier];
      if (need <= 0) continue;

      // 用pool中的本品阶
      const fromPool = Math.min(need, pool[tier]);
      if (fromPool > 0) {
        pool[tier] -= fromPool;
        need -= fromPool;
        progress = true;
      }

      // 用同品阶箱子
      const fromSame = Math.min(need, boxesLeft[tier] || 0);
      if (fromSame > 0) {
        boxesLeft[tier] -= fromSame;
        boxesToOpen[tier] += fromSame;
        need -= fromSame;
        progress = true;
      }

      if (need <= 0) {
        if (need < 0) pool[tier] += -need;
        remaining[tier] = 0;
        continue;
      }

      if (strategy === 'split') {
        // 分解高阶
        for (let j = idx + 1; j < 4 && need > 0; j++) {
          const highTier = TIER_ORDER[j];
          const ratio = Math.pow(2, j - idx);

          // 用pool中的高阶
          while (pool[highTier] > 0 && need > 0) {
            const use = Math.min(pool[highTier], Math.ceil(need / ratio));
            pool[highTier] -= use;
            let count = use;
            for (let k = j; k > idx; k--) {
              conversions.push({ type: 'split', from: TIER_ORDER[k], to: TIER_ORDER[k-1], count, result: count * 2, cost: 0 });
              count *= 2;
            }
            need -= use * ratio;
            progress = true;
          }

          // 用高阶箱子
          while (boxesLeft[highTier] > 0 && need > 0) {
            const needBoxes = Math.ceil(need / ratio);
            const useBoxes = Math.min(needBoxes, boxesLeft[highTier]);
            boxesLeft[highTier] -= useBoxes;
            boxesToOpen[highTier] += useBoxes;
            let count = useBoxes;
            for (let k = j; k > idx; k--) {
              conversions.push({ type: 'split', from: TIER_ORDER[k], to: TIER_ORDER[k-1], count, result: count * 2, cost: 0 });
              count *= 2;
            }
            need -= useBoxes * ratio;
            progress = true;
          }
        }

        // 合成低阶
        for (let j = idx - 1; j >= 0 && need > 0; j--) {
          const lowTier = TIER_ORDER[j];
          const ratio = Math.pow(2, idx - j);
          const rule = CONVERSION_RULES.merge.find(r => r.from === lowTier);

          // 用pool中的低阶
          while (pool[lowTier] >= ratio && need > 0) {
            const maxOutput = Math.floor(pool[lowTier] / ratio);
            const actualOutput = Math.min(maxOutput, need);
            if (actualOutput <= 0) break;
            const consumed = actualOutput * ratio;
            pool[lowTier] -= consumed;
            need -= actualOutput;
            progress = true;

            let chainCount = consumed;
            for (let k = j; k < idx; k++) {
              const chainResult = Math.floor(chainCount / 2);
              const r = CONVERSION_RULES.merge.find(r => r.from === TIER_ORDER[k]);
              conversions.push({ type: 'merge', from: TIER_ORDER[k], to: TIER_ORDER[k+1], count: chainCount, result: chainResult, cost: chainResult * r.costSilver });
              silverCost += chainResult * r.costSilver;
              chainCount = chainResult;
            }
          }

          // 用低阶箱子
          while (need > 0 && boxesLeft[lowTier] >= 2) {
            const needBoxes = Math.min(boxesLeft[lowTier], need * ratio);
            if (needBoxes < 2) break;
            boxesLeft[lowTier] -= needBoxes;
            boxesToOpen[lowTier] += needBoxes;
            const actualOutput = Math.floor(needBoxes / ratio);
            const remainder = needBoxes - actualOutput * ratio;
            need -= actualOutput;
            progress = true;

            let chainCount = needBoxes;
            for (let k = j; k < idx; k++) {
              const chainResult = Math.floor(chainCount / 2);
              const r = CONVERSION_RULES.merge.find(r => r.from === TIER_ORDER[k]);
              conversions.push({ type: 'merge', from: TIER_ORDER[k], to: TIER_ORDER[k+1], count: chainCount, result: chainResult, cost: chainResult * r.costSilver });
              silverCost += chainResult * r.costSilver;
              chainCount = chainResult;
            }
            if (remainder > 0) pool[lowTier] += remainder;
          }
        }
      } else {
        // 优先合成
        for (let j = idx - 1; j >= 0 && need > 0; j--) {
          const lowTier = TIER_ORDER[j];
          const ratio = Math.pow(2, idx - j);
          const rule = CONVERSION_RULES.merge.find(r => r.from === lowTier);

          while (pool[lowTier] >= ratio && need > 0) {
            const maxOutput = Math.floor(pool[lowTier] / ratio);
            const actualOutput = Math.min(maxOutput, need);
            if (actualOutput <= 0) break;
            const consumed = actualOutput * ratio;
            pool[lowTier] -= consumed;
            need -= actualOutput;
            progress = true;

            let chainCount = consumed;
            for (let k = j; k < idx; k++) {
              const chainResult = Math.floor(chainCount / 2);
              const r = CONVERSION_RULES.merge.find(r => r.from === TIER_ORDER[k]);
              conversions.push({ type: 'merge', from: TIER_ORDER[k], to: TIER_ORDER[k+1], count: chainCount, result: chainResult, cost: chainResult * r.costSilver });
              silverCost += chainResult * r.costSilver;
              chainCount = chainResult;
            }
          }

          while (need > 0 && boxesLeft[lowTier] >= 2) {
            const needBoxes = Math.min(boxesLeft[lowTier], need * ratio);
            if (needBoxes < 2) break;
            boxesLeft[lowTier] -= needBoxes;
            boxesToOpen[lowTier] += needBoxes;
            const actualOutput = Math.floor(needBoxes / ratio);
            const remainder = needBoxes - actualOutput * ratio;
            need -= actualOutput;
            progress = true;

            let chainCount = needBoxes;
            for (let k = j; k < idx; k++) {
              const chainResult = Math.floor(chainCount / 2);
              const r = CONVERSION_RULES.merge.find(r => r.from === TIER_ORDER[k]);
              conversions.push({ type: 'merge', from: TIER_ORDER[k], to: TIER_ORDER[k+1], count: chainCount, result: chainResult, cost: chainResult * r.costSilver });
              silverCost += chainResult * r.costSilver;
              chainCount = chainResult;
            }
            if (remainder > 0) pool[lowTier] += remainder;
          }
        }

        // 分解高阶
        for (let j = idx + 1; j < 4 && need > 0; j++) {
          const highTier = TIER_ORDER[j];
          const ratio = Math.pow(2, j - idx);

          while (pool[highTier] > 0 && need > 0) {
            const use = Math.min(pool[highTier], Math.ceil(need / ratio));
            pool[highTier] -= use;
            let count = use;
            for (let k = j; k > idx; k--) {
              conversions.push({ type: 'split', from: TIER_ORDER[k], to: TIER_ORDER[k-1], count, result: count * 2, cost: 0 });
              count *= 2;
            }
            need -= use * ratio;
            progress = true;
          }

          while (boxesLeft[highTier] > 0 && need > 0) {
            const needBoxes = Math.ceil(need / ratio);
            const useBoxes = Math.min(needBoxes, boxesLeft[highTier]);
            boxesLeft[highTier] -= useBoxes;
            boxesToOpen[highTier] += useBoxes;
            let count = useBoxes;
            for (let k = j; k > idx; k--) {
              conversions.push({ type: 'split', from: TIER_ORDER[k], to: TIER_ORDER[k-1], count, result: count * 2, cost: 0 });
              count *= 2;
            }
            need -= useBoxes * ratio;
            progress = true;
          }
        }
      }

      if (need < 0) pool[tier] += -need;
      remaining[tier] = Math.max(0, need);
    }

    // 将pool中低阶资源向上合并
    for (let i = 0; i < TIER_ORDER.length - 1; i++) {
      const lowTier = TIER_ORDER[i];
      const highTier = TIER_ORDER[i + 1];
      if (pool[lowTier] >= 2) {
        const merges = Math.floor(pool[lowTier] / 2);
        pool[lowTier] -= merges * 2;
        pool[highTier] += merges;
        progress = true;
      }
    }

    if (!progress) break;
    if (TIER_ORDER.every(tier => remaining[tier] <= 0)) break;
  }

  // 生成开箱步骤
  const steps = [];
  for (const tier of TIER_ORDER) {
    if (boxesToOpen[tier] > 0) {
      steps.push({ type: 'open', tier, count: boxesToOpen[tier], boxNumber });
    }
  }
  steps.push(...conversions);

  return { steps, silverCost, remainingPool: pool, remainingBoxes: boxesLeft };
}
