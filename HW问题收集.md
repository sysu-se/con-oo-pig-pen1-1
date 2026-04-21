## HW 问题收集

列举在HW 1、HW1.1过程里，你所遇到的2~3个通过自己学习已经解决的问题，和2~3个尚未解决的问题与挑战

### 已解决

1. 如何实现数独的撤销与重做功能？
   1. **上下文**：需要实现数独游戏的撤销与重做功能，以便用户可以回退到之前的操作状态。
   2. **解决手段**：问AI得知通过在 `Game` 类中引入历史记录栈，记录每次操作的状态，并实现 `undo` 和 `redo` 方法，分别用于回退和恢复操作。

2. 如何解决 Sudoku.validate() 的逻辑错误？
   1. **上下文**：在实现数独校验功能时，发现 Sudoku.validate() 方法在检测宫内冲突时存在逻辑错误，导致部分冲突未被正确识别。
   2. **解决手段**：通过分析 validate 方法的实现，发现问题出在 box 冲突检测的逻辑上。修复了相关代码，确保每个宫内的冲突都能被正确检测到。

### 未解决

1. 提示按键次数不会消耗

   1. **上下文**：`src/stores/gameStore.js:181-200`
      - applyHint 直接求解并写入 Game，但没有调用 hints.useHint()。与此同时 UI 仍用 $hints 限制提示次数，GameOver 仍读取 usedHints，因此“提示次数减少/已用提示统计”这条数独业务链已经断开。
   2. **尝试解决手段**：尝试将 hints.useHint() 集成到 applyHint 的逻辑中，但目前尚未完全解决提示按键次数的消耗问题。

2. 键盘可编辑状态仍依赖旧 grid store，出现双重数据源
   1. **上下文**：`src/node_modules/@sudoku/stores/keyboard.js:6-10`
      - keyboardDisabled 不是从 gameStore.grid 推导，而是继续订阅旧的 grid store；但真实盘面已经改为 gameStore 管理。结果是按钮禁用逻辑和真实棋盘状态可能不一致，说明 Svelte 接入还没有完全收敛到单一 source of truth。
   2. **尝试解决手段**：尝试将 keyboardDisabled 的逻辑改为从 gameStore.grid 推导，但未能完全解决数据源不一致的问题。

3. 候选数状态游离在领域对象之外，和新游戏/Undo/Redo 不一致
   1. **上下文**：`src/components/Controls/Keyboard.svelte:17-40`
      - 笔记模式只写 candidates store，不进入 Game 历史；普通输入也只在当前格清空 candidates。gameStore.startNew/undo/redo 没有重置或回放 candidates，因此候选数可能跨局残留，也不会随撤销/重做回退。
   2. **尝试解决手段**：尝试将候选数状态集成到 Game 的历史记录中，但目前尚未完全实现与新游戏/Undo/Redo 的一致性。