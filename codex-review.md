# con-oo-pig-pen1-1 - Review

## Review 结论

方向是对的：主盘面、输入、撤销/重做已经开始通过领域对象和 store adapter 驱动，说明你确实在做“接入真实 Svelte 流程”。但接入还不彻底，几个关键业务约束和附属状态仍然散落在 UI/旧 store 里，导致领域模型没有成为唯一真相源，设计质量目前更接近“部分完成、可继续收敛”。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | fair |

## 缺点

### 1. 固定题面不可修改的约束没有落在领域层

- 严重程度：core
- 位置：src/domain/Game.js:74-90
- 原因：Game.guess 直接委托 Sudoku.guess 并记录历史，没有检查 initialSudoku；当前只有 Keyboard 组件在调用前用 isInitialCell 做 UI 级拦截。这意味着业务不变量依赖入口组件而不是 Game/Sudoku 本身，封装一旦被绕过就能改写题目给定数字。

### 2. 提示流程接入后丢失了 hints 计数业务

- 严重程度：core
- 位置：src/stores/gameStore.js:181-200
- 原因：applyHint 直接求解并写入 Game，但没有调用 hints.useHint()。与此同时 UI 仍用 $hints 限制提示次数，GameOver 仍读取 usedHints，因此“提示次数减少/已用提示统计”这条数独业务链已经断开。

### 3. 键盘可编辑状态仍依赖旧 grid store，出现双重数据源

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/keyboard.js:6-10
- 原因：keyboardDisabled 不是从 gameStore.grid 推导，而是继续订阅旧的 grid store；但真实盘面已经改为 gameStore 管理。结果是按钮禁用逻辑和真实棋盘状态可能不一致，说明 Svelte 接入还没有完全收敛到单一 source of truth。

### 4. 候选数状态游离在领域对象之外，和新游戏/Undo/Redo 不一致

- 严重程度：major
- 位置：src/components/Controls/Keyboard.svelte:17-40
- 原因：笔记模式只写 candidates store，不进入 Game 历史；普通输入也只在当前格清空 candidates。gameStore.startNew/undo/redo 没有重置或回放 candidates，因此候选数可能跨局残留，也不会随撤销/重做回退。

### 5. 序列化接口泄露内部可变数组

- 严重程度：minor
- 位置：src/domain/Sudoku.js:204-206
- 原因：toJSON 直接返回 this.grid 的原始引用，调用方可以绕过 guess/getGrid 直接改写局面，和前面做的防御性拷贝策略相矛盾，也削弱了对象边界。

### 6. validate 的返回协议带有 UI 形状且文档与实现不一致

- 严重程度：minor
- 位置：src/domain/Sudoku.js:98-143
- 原因：注释把结果写成 row,col，但实现实际组装的是 x,y 字符串。领域对象直接暴露字符串坐标，既耦合了 View 层查找方式，也让 API 语义不够稳定清晰。

## 优点

### 1. Sudoku 与 Game 的基础职责边界是清楚的

- 位置：src/domain/Sudoku.js:6-224
- 原因：Sudoku 主要负责盘面与校验，Game 主要负责会话与历史，这比把 undo/redo 和盘面操作混在一个对象里更符合 OOP 分层。

### 2. 采用 Store Adapter 把领域对象桥接到 Svelte 是正确方向

- 位置：src/stores/gameStore.js:19-245
- 原因：gameStore 持有 Game，并通过 subscribe/grid/invalidCells/won/canUndo/canRedo 暴露响应式视图状态，同时把 guess/undo/redo/startNew/startCustom 收口成统一入口，符合题目推荐方案。

### 3. 棋盘渲染已经真正消费领域对象导出的状态

- 位置：src/components/Board/index.svelte:31-57
- 原因：Board 不再从旧 userGrid/invalidCells 读数据，而是直接使用 $gameStore.grid、$gameStore.initialGrid 和 $gameStore.invalidCells 来渲染当前局面、给定数和冲突态。

### 4. Undo/Redo 已从组件侧切到 Game 入口

- 位置：src/components/Controls/ActionBar/Actions.svelte:26-35
- 原因：操作栏不再自己维护历史，而是直接调用 gameStore.undo()/redo()，这符合“UI 只发命令，领域对象负责状态演进”的职责分配。

## 补充说明

- 本次结论只基于静态阅读；未运行测试、未启动 Svelte 应用，交互正确性和运行时异常未做验证。
- 关于“键盘禁用状态来自旧 store”“候选数会跨局/跨 undo-redo 漂移”“提示次数不会减少”等判断，均来自对源码调用链的静态追踪，而非实际点击验证。
- 审查范围限制在 src/domain/*、src/stores/gameStore.js 以及直接消费这些对象的 Svelte 组件/相关接入代码，没有扩展到无关目录。
