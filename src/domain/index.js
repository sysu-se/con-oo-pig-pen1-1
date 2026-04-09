/**
 * domain/index.js - 领域对象统一入口
 * 职责：提供 4 个工厂函数，作为 UI 层与领域对象的统一接口
 */

import Sudoku from './Sudoku.js'
import Game from './Game.js'

/**
 * 工厂函数：创建一个 Sudoku 对象
 * @param {number[][]} input - 9×9 的二维数组，0 表示空格
 * @returns {Sudoku} 返回新创建的 Sudoku 对象
 */
export function createSudoku(input) {
    return new Sudoku(input)
}

/**
 * 工厂函数：从 JSON 数据恢复一个 Sudoku 对象
 * @param {Object} json - 包含 grid 字段的对象
 * @returns {Sudoku} 返回恢复的 Sudoku 对象
 */
export function createSudokuFromJSON(json) {
    return Sudoku.fromJSON(json)
}

/**
 * 工厂函数：创建一个 Game 对象
 * @param {Object} options - 包含 sudoku 属性的对象
 * @returns {Game} 返回新创建的 Game 对象
 */
export function createGame({ sudoku }) {
    return new Game(sudoku)
}

/**
 * 工厂函数：从 JSON 数据恢复一个 Game 对象
 * @param {Object} json - 包含 sudoku 字段的对象
 * @returns {Game} 返回恢复的 Game 对象
 */
export function createGameFromJSON(json) {
    return Game.fromJSON(json)
}
