# Homework 1.1 设计文档

## 一、领域对象设计

### 1.1 Sudoku 类

**职责边界**：管理 9x9 数独网格的数据与操作，不关心游戏历史和 Undo/Redo。

**核心接口**：

| 方法 | 说明 |
|------|------|
| `getGrid()` | 返回当前局面的防御性副本（深拷贝） |
| `guess(move)` | 在指定位置填入数字，包含位置和值的合法性校验 |
| `validate()` | 校验当前局面，返回所有冲突格子的坐标数组 |
| `hasConflict(row, col)` | 检查指定格子是否与已填数字冲突 |
| `isComplete()` | 检查局面是否已完成（全部填满且无冲突） |
| `clone()` | 创建独立的副本，用于 Undo/Redo 快照 |
| `toJSON()` / `fromJSON()` | 序列化和反序列化 |
| `toString()` | 转换为人类可读的文本格式 |

**设计说明**：

Sudoku 持有内部的 `grid` 属性（9x9 二维数组）。所有返回网格数据的方法都返回深拷贝，防止外部代码通过引用直接修改内部状态。`guess()` 方法在填入数字前会校验位置和值的合法性，如果输入非法或没有实际改变盘面（如填入与当前相同的数字），会返回 `false` 且不修改状态。

**构造函数中的输入校验**：Sudoku 构造函数会对传入的初始数据进行严格校验，包括：检查是否为 9x9 的二维数组、每个元素是否为 0-9 的整数。如果输入不符合数独网格的不变量，会抛出明确的错误。这防止了非法结构进入领域层，保证对象始终处于合法状态。

`validate()` 的实现逻辑是遍历所有已填数字，分别检查行、列和 3x3 宫内是否存在重复数字。发现冲突时，冲突的双方都会被标记。

### 1.2 Game 类

**职责边界**：管理游戏会话的整体流程，包括历史记录和 Undo/Redo。

**核心接口**：

| 方法 | 说明 |
|------|------|
| `getSudoku()` | 获取当前局面的副本 |
| `getInitialGrid()` | 获取初始题目，用于标记不可修改的格子 |
| `isInitialCell(row, col)` | 判断指定格子是否是题目预设的 |
| `getInvalidCells()` | 获取当前局面的冲突格子 |
| `isWon()` | 检查是否胜利 |
| `guess(move)` | 执行填数字操作，自动保存历史快照 |
| `undo()` | 撤销最近一次操作 |
| `redo()` | 重做被撤销的操作 |
| `canUndo()` / `canRedo()` | 判断是否可以撤销/重做 |

**设计说明**：

Game 依赖 Sudoku 类。构造时传入一个 Sudoku 对象作为初始局面，同时保存初始局面的副本（`initialSudoku`），用于后续判断哪些格子是题目预设的不可修改。

Undo/Redo 的实现基于快照机制。`history` 数组保存每次操作前的局面快照，用于撤销；`redoHistory` 数组保存被撤销的快照，用于重做。执行新的 `guess()` 操作时会清空 `redoHistory`，这符合常见编辑器（如 Word、VSCode）的行为：新操作之后不能再 redo。

**改进的历史记录策略**：`Game.guess()` 会先检查 `Sudoku.guess()` 的返回值，只有当操作真正成功（即盘面状态实际发生了改变）时，才会保存历史快照。如果用户尝试填入非法值或填入与当前相同的数字，`guess()` 会返回 `false`，不会增加历史记录。这确保了 Undo/Redo 的语义与真实的业务状态变化一致，避免了"空操作"也被记录的问题。

---

## 二、领域对象如何被消费

### 2.1 View 层直接消费的是什么

View 层直接消费的是 **gameStore**，这是一个 Store Adapter（桥接层），内部持有 Game 和 Sudoku 领域对象。

View 层不直接 import 或调用 Game / Sudoku 类，而是通过 gameStore 暴露的响应式状态和方法进行操作。这样做的目的是将领域层和 UI 层解耦，符合单一职责原则。

### 2.2 View 层拿到的数据

| 数据 | 来源 | 用途 |
|------|------|------|
| `grid` | `$gameStore.grid` | 渲染 9x9 数独棋盘 |
| `initialGrid` | `$gameStore.initialGrid` | 标记题目预设格子（不可修改） |
| `invalidCells` | `$gameStore.invalidCells` | 高亮显示冲突的数字（红色） |
| `won` | `$gameStore.won` | 检测胜利，弹出游戏结束窗口 |
| `canUndo` / `canRedo` | `$gameStore.canUndo` / `$gameStore.canRedo` | 控制撤销/重做按钮的禁用状态 |

### 2.3 用户操作如何进入领域对象

**用户输入数字**：
```
用户点击数字键盘
  -> Keyboard.svelte 的 handleKeyButton()
    -> 检查 gameStore.isInitialCell() 确认不是题目预设格子
      -> 调用 gameStore.guess({ row, col, value })
        -> 调用 Game.guess(move)
          -> 保存快照到 history
          -> 调用 Sudoku.guess(move) 填入数字
        -> gameStore.syncToStores() 同步所有响应式状态
```

**撤销/重做**：
```
用户点击撤销/重做按钮
  -> Actions.svelte 的 handleUndo() / handleRedo()
    -> 调用 gameStore.undo() / gameStore.redo()
      -> 调用 Game.undo() / Game.redo()
        -> 操作 history / redoHistory 数组
        -> 恢复对应的快照到 this.sudoku
      -> gameStore.syncToStores() 同步所有响应式状态
```

### 2.4 领域对象变化后，Svelte 为什么会更新

gameStore 内部使用 Svelte 的 `writable` store 保存各个响应式状态（grid、initialGrid、invalidCells 等），并通过 `derived` store 将它们组合成一个统一的状态对象。

当领域对象发生变化时（如执行了 `guess()`），gameStore 的 `syncToStores()` 方法会被调用，它会从 Game 对象中读取最新数据并更新所有 writable store。由于 Svelte 的 `$store` 语法会自动订阅 store 的变化，UI 组件中的 `$gameStore.grid` 等表达式会自动重新计算，触发组件的响应式更新。

---

## 三、响应式机制说明

### 3.1 依赖的机制

本项目使用的是 Svelte 3 的 **writable store** 和 **derived store** 机制。

- `writable` store 用于保存可变的响应式状态（如 grid、invalidCells 等）
- `derived` store 用于从多个 writable store 派生出一个统一的状态对象
- 组件中使用 `$store` 语法自动订阅 store 的变化
- `$:` 响应式语句用于在组件内部计算派生值（如 `currentGrid`、`invalidCells` 等）

### 3.2 响应式暴露给 UI 的数据

通过 `derived` store 暴露的状态包括：

- `grid`：当前数独网格（9x9 二维数组）
- `initialGrid`：初始题目网格
- `invalidCells`：冲突格子数组
- `won`：是否胜利
- `canUndo`：是否可撤销
- `canRedo`：是否可重做

这些状态通过 `syncToStores()` 方法从领域对象同步到 store，任何一次对领域对象的修改都会触发这个方法。

### 3.3 留在领域对象内部的状态

以下状态**不暴露**给 UI，只保留在领域对象内部：

- `Game.history` 和 `Game.redoHistory`：历史记录数组，UI 只需要 canUndo/canRedo 布尔值
- `Game.initialSudoku`：初始题目，只通过 `getInitialGrid()` 和 `isInitialCell()` 间接访问
- `Sudoku.grid`：底层网格数据，只通过 `getGrid()` 返回副本

### 3.4 直接 mutate 内部对象的问题

如果不用当前方案，而是直接 mutate 领域对象的内部数组，会出现以下问题：

1. **Svelte 不会检测到变化**。Svelte 的响应式机制依赖于对象引用的变化。如果直接修改二维数组的元素（如 `this.grid[row][col] = value`），数组的引用没有变，Svelte 不会认为数据变了，UI 不会刷新。

2. **Undo/Redo 无法正确工作**。如果快照保存的是同一个数组的引用，而不是独立的副本，那么撤销时恢复的也是被修改过的数据，导致撤销无效。

3. **难以调试和维护**。直接 mutate 内部状态会破坏封装性，让状态变化难以追踪。

这就是为什么需要在 `syncToStores()` 中使用 `grid.set()` 和 `initialGrid.set()` 等方法显式地更新 store，而不是直接修改内部数组。

---

## 四、相比 HW1 的改进

### 4.1 改进了什么

1. **将领域对象真正接入 Svelte 游戏流程**。HW1 中 Sudoku 和 Game 类只在单元测试中使用，UI 层使用的是旧的 grid store 直接操作数组。本次作业创建了 gameStore 作为桥接层，让 UI 完全通过领域对象的接口进行操作。

2. **使用 derived store 统一管理响应式状态**。HW1 中各个状态（grid、invalidCells 等）是独立的 store，UI 组件需要分别订阅多个 store。现在通过 `derived` store 将它们组合成一个统一的状态对象，UI 只需订阅 `$gameStore` 即可获取所有需要的数据。

3. **修复了冲突检测的 bug**。HW1 中宫冲突检测的条件有误（使用 `&&` 而非 `||`），导致同一行或同一列但在同一宫内的冲突无法被检测到。本次作业修复了这个问题，并确保冲突时两个格子都会被标记。

4. **添加了题目预设格子的保护**。在 Keyboard 组件中添加了 `isInitialCell()` 检查，防止用户修改题目预设的数字。

### 4.2 为什么 HW1 的做法不足以支撑真实接入

HW1 的主要问题在于领域对象和 UI 层是割裂的。Sudoku 和 Game 类只在测试中被创建和调用，而真实的 Svelte 组件使用的是旧的 grid store，直接操作二维数组。这意味着：

- 领域对象的 `guess()`、`validate()`、`undo()`、`redo()` 等方法在真实游戏中完全没有被调用
- UI 的撤销/重做按钮如果存在，也是操作旧的状态，与领域对象无关
- 冲突检测、胜利检测等功能只在测试中生效

这种设计不符合领域驱动设计的原则，领域对象失去了存在的意义。

### 4.3 新设计的 trade-off

**优点**：
- 领域对象成为游戏流程的核心，所有操作都通过它进行
- UI 层与领域层解耦，职责清晰
- 响应式更新机制正确，数据变化后 UI 能自动刷新
- Undo/Redo 基于快照，逻辑简单可靠

**缺点**：
- 每次操作都需要调用 `syncToStores()` 手动同步状态，如果忘记调用会导致 UI 不更新
- 使用深拷贝创建快照在大型数独局面上可能有性能开销（但 9x9 数独通常不会成为瓶颈）
- gameStore 作为单例，不便于多游戏实例的场景（但对于当前需求不是问题）
