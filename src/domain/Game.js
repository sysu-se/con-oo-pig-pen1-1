/**
 * Game 类 - 游戏会话领域对象
 * 职责：管理游戏会话的整体流程，包括 Undo/Redo 历史记录
 * 依赖：Sudoku 类
 */
import Sudoku from './Sudoku.js'

class Game {
    /**
     * 构造函数 - 创建一个新的游戏会话
     * @param {Sudoku} sudoku - 一个 Sudoku 对象，作为初始局面
     */
    constructor(sudoku) {
        // 保存初始局面的副本（用于标记哪些格子是题目预设的）
        this.initialSudoku = sudoku.clone()

        // 当前局面
        this.sudoku = sudoku

        // history 数组：保存历史快照（用于 Undo）
        this.history = []

        // redoHistory 数组：保存被撤销的快照（用于 Redo）
        this.redoHistory = []
    }

    /**
     * 获取当前数独局面
     * @returns {Sudoku} 返回当前 sudoku 的副本（防御性拷贝）
     */
    getSudoku() {
        return this.sudoku.clone()
    }

    /**
     * 获取初始题目（标记不可修改的格子）
     * @returns {number[][]} 返回初始题目的 grid
     */
    getInitialGrid() {
        return this.initialSudoku.getGrid()
    }

    /**
     * 判断指定格子是否是题目预设的（不可修改）
     * @param {number} row - 行号
     * @param {number} col - 列号
     * @returns {boolean} 是预设格子返回 true，否则返回 false
     */
    isInitialCell(row, col) {
        return this.initialSudoku.getGrid()[row][col] !== 0
    }

    /**
     * 获取当前局面的冲突格子
     * @returns {Array<string>} 返回冲突格子坐标数组，格式为 ["row,col", ...]
     */
    getInvalidCells() {
        return this.sudoku.validate()
    }

    /**
     * 检查当前局面是否已完成
     * @returns {boolean} 完成返回 true，否则返回 false
     */
    isWon() {
        return this.sudoku.isComplete()
    }

    /**
     * 执行填数字操作（带历史记录）
     * @param {Object} move - 包含 row、col、value 的对象
     * @returns {boolean} 如果成功执行返回 true，如果输入非法或无改变返回 false
     */
    guess(move) {
        // 先保存操作前的盘面快照（用于后续 undo 恢复）
        const snapshotBefore = this.sudoku.clone()

        // 调用内部 sudoku 对象的 guess 方法，执行实际的填数字操作
        // Sudoku.guess 现在会返回布尔值表示是否成功
        const success = this.sudoku.guess(move)

        // 只有当操作真正成功时（即盘面状态发生了改变），才保存历史快照
        if (success) {
            // 将操作前的快照存入 history，用于 undo 恢复
            this.history.push(snapshotBefore)
            // 清空 redoHistory 数组（新操作后不能再 redo）
            this.redoHistory = []
        }

        return success
    }

    /**
     * 撤销最近一次操作
     * @returns {boolean} 撤销成功返回 true，无法撤销返回 false
     */
    undo() {
        // 如果无法撤销（history 为空），返回 false
        if (!this.canUndo()) return false

        // 把当前局面克隆一份，存入 redoHistory
        this.redoHistory.push(this.sudoku.clone())

        // 从 history 中取出上一个快照，赋值给 this.sudoku
        this.sudoku = this.history.pop()

        return true
    }

    /**
     * 重做被撤销的操作
     * @returns {boolean} 重做成功返回 true，无法重做返回 false
     */
    redo() {
        // 如果无法重做（redoHistory 为空），返回 false
        if (!this.canRedo()) return false

        // 把当前局面存入 history，为可能的后续 undo 做准备
        this.history.push(this.sudoku.clone())

        // 从 redoHistory 中取出快照，恢复成之前被撤销的局面
        this.sudoku = this.redoHistory.pop()

        return true
    }

    /**
     * 判断是否可以撤销
     * @returns {boolean} 可以撤销返回 true，否则返回 false
     */
    canUndo() {
        return this.history.length > 0
    }

    /**
     * 判断是否可以重做
     * @returns {boolean} 可以重做返回 true，否则返回 false
     */
    canRedo() {
        return this.redoHistory.length > 0
    }

    /**
     * 将当前游戏状态序列化为 JSON 格式
     * @returns {Object} 返回包含当前 sudoku 数据的对象
     */
    toJSON() {
        return {
            sudoku: this.sudoku.toJSON(),
            initialSudoku: this.initialSudoku.toJSON()
        }
    }

    /**
     * 静态方法：从 JSON 数据反序列化为 Game 对象
     * @param {Object} json - 包含 sudoku 和 initialSudoku 字段的对象
     * @returns {Game} 返回新创建的 Game 对象
     */
    static fromJSON(json) {
        if (!json.sudoku || !json.sudoku.grid) {
            throw new Error('Invalid game JSON: missing sudoku grid')
        }

        const game = new Game(Sudoku.fromJSON(json.sudoku))

        // 如果包含初始局面数据，恢复它
        if (json.initialSudoku && json.initialSudoku.grid) {
            game.initialSudoku = Sudoku.fromJSON(json.initialSudoku)
        }

        return game
    }
}

export default Game
