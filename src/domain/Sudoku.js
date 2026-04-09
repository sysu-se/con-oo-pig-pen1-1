/**
 * Sudoku 类 - 数独局面领域对象
 * 职责：管理 9×9 数独网格的数据与操作
 * 不关心：游戏历史、Undo/Redo
 */
class Sudoku {
    /**
     * 构造函数 - 创建一个新的数独局面
     * @param {number[][]} input - 9×9 的二维数组，0 表示空格
     */
    constructor(input) {
        // 如果没有传入初始数据，创建一个 9×9 的空网格（全部填 0）
        if (!input) {
            this.grid = Array.from({ length: 9 }, () => Array(9).fill(0))
        } else {
            // 深拷贝输入的 grid 数据
            this.grid = JSON.parse(JSON.stringify(input))
        }
    }

    /**
     * 获取当前数独局面
     * @returns {number[][]} 返回 grid 的防御性副本（深拷贝）
     */
    getGrid() {
        return JSON.parse(JSON.stringify(this.grid))
    }

    /**
     * 在指定位置填入一个数字
     * @param {Object} move - 包含 row（行号）、col（列号）、value（数字）的对象
     */
    guess(move) {
        const { row, col, value } = move

        // 校验位置是否合法
        if (!this.isValidPosition(row, col)) return

        // 校验值的合法性
        if (typeof value !== 'number' || value < 0 || value > 9) return

        // 将数字填入 grid 的指定位置
        this.grid[row][col] = value
    }

    /**
     * 判断指定位置是否合法（行列是否都在 0-8 范围内）
     * @param {number} row - 行号
     * @param {number} col - 列号
     * @returns {boolean} 位置合法返回 true，否则返回 false
     */
    isValidPosition(row, col) {
        return row >= 0 && row < 9 && col >= 0 && col < 9
    }

    /**
     * 校验当前局面是否符合数独规则
     * 检查所有已填数字是否存在行/列/宫冲突
     * @returns {Array<string>} 返回冲突格子的坐标数组，格式为 ["row,col", ...]
     */
    validate() {
        const invalidCells = new Set()

        // 检查所有行
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const value = this.grid[row][col]
                if (value === 0) continue

                // 检查该行右侧是否有相同数字
                for (let c = col + 1; c < 9; c++) {
                    if (this.grid[row][c] === value) {
                        invalidCells.add(`${row},${col}`)
                        invalidCells.add(`${row},${c}`)
                    }
                }
            }
        }

        // 检查所有列
        for (let col = 0; col < 9; col++) {
            for (let row = 0; row < 9; row++) {
                const value = this.grid[row][col]
                if (value === 0) continue

                // 检查该列下方是否有相同数字
                for (let r = row + 1; r < 9; r++) {
                    if (this.grid[r][col] === value) {
                        invalidCells.add(`${row},${col}`)
                        invalidCells.add(`${r},${col}`)
                    }
                }
            }
        }

        // 检查所有 3×3 宫
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const startRow = boxRow * 3
                const startCol = boxCol * 3
                
                // 收集宫内所有已填数字
                const cells = []
                for (let r = startRow; r < startRow + 3; r++) {
                    for (let c = startCol; c < startCol + 3; c++) {
                        if (this.grid[r][c] !== 0) {
                            cells.push({ row: r, col: c, value: this.grid[r][c] })
                        }
                    }
                }
                
                // 检查宫内是否有重复
                for (let i = 0; i < cells.length; i++) {
                    for (let j = i + 1; j < cells.length; j++) {
                        if (cells[i].value === cells[j].value) {
                            invalidCells.add(`${cells[i].row},${cells[i].col}`)
                            invalidCells.add(`${cells[j].row},${cells[j].col}`)
                        }
                    }
                }
            }
        }

        return Array.from(invalidCells)
    }

    /**
     * 检查指定格子是否与已填数字冲突
     * @param {number} row - 行号
     * @param {number} col - 列号
     * @returns {boolean} 冲突返回 true，否则返回 false
     */
    hasConflict(row, col) {
        const value = this.grid[row][col]
        if (value === 0) return false

        // 检查行
        for (let c = 0; c < 9; c++) {
            if (c !== col && this.grid[row][c] === value) return true
        }

        // 检查列
        for (let r = 0; r < 9; r++) {
            if (r !== row && this.grid[r][col] === value) return true
        }

        // 检查宫
        const boxStartRow = Math.floor(row / 3) * 3
        const boxStartCol = Math.floor(col / 3) * 3
        for (let r = boxStartRow; r < boxStartRow + 3; r++) {
            for (let c = boxStartCol; c < boxStartCol + 3; c++) {
                // 只要不是同一个格子，就应该检查
                if ((r !== row || c !== col) && this.grid[r][c] === value) return true
            }
        }

        return false
    }

    /**
     * 检查局面是否已完成（全部填满且无冲突）
     * @returns {boolean} 完成返回 true，否则返回 false
     */
    isComplete() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) return false
            }
        }
        return this.validate().length === 0
    }

    /**
     * 克隆当前数独局面（创建一个完全独立的副本）
     * @returns {Sudoku} 返回一个新的 Sudoku 对象
     */
    clone() {
        return new Sudoku(this.grid)
    }

    /**
     * 将当前局面序列化为 JSON 格式（机器可读）
     * @returns {Object} 返回包含 grid 数据的普通对象
     */
    toJSON() {
        return { grid: this.grid }
    }

    /**
     * 将当前局面转换为人类可读的文本字符串（用于调试）
     * @returns {string} 返回类似 "5 3 0 0 7 0 0 0 0\n6 0 0 1 9 5 0 0 0\n..." 的字符串
     */
    toString() {
        return this.grid.map(row => row.join(' ')).join('\n')
    }

    /**
     * 静态方法：从 JSON 数据反序列化为 Sudoku 对象
     * @param {Object} json - 包含 grid 字段的对象
     * @returns {Sudoku} 返回新创建的 Sudoku 对象
     */
    static fromJSON(json) {
        return new Sudoku(json.grid)
    }
}

export default Sudoku
