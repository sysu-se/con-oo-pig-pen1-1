/**
 * gameStore.js - Store Adapter（领域对象与 Svelte 的桥接层）
 * 职责：
 * 1. 持有 Game 领域对象
 * 2. 对外暴露可被 Svelte 消费的响应式状态
 * 3. 对外暴露 UI 可调用的方法（guess, undo, redo 等）
 */

import { writable, derived } from 'svelte/store'
import { createSudoku, createGame } from '@sudoku/domain'
import { generateSudoku, solveSudoku } from '@sudoku/sudoku'
import { decodeSencode } from '@sudoku/sencode'
import { SUDOKU_SIZE, BOX_SIZE } from '@sudoku/constants'

/**
 * 创建游戏 Store
 * @returns {Object} gameStore 对象
 */
function createGameStore() {
    // ===== 内部状态（领域对象）=====
    let game = null  // Game 实例
    let sudoku = null // Sudoku 实例

    // ===== Svelte Stores（响应式状态）=====

    // grid: 当前数独网格（9x9 二维数组）
    const grid = writable(
        Array.from({ length: 9 }, () => Array(9).fill(0))
    )

    // initialGrid: 初始题目网格（0 表示空格，非 0 表示预设格子，不可修改）
    const initialGrid = writable(
        Array.from({ length: 9 }, () => Array(9).fill(0))
    )

    // invalidCells: 冲突格子数组，格式为 ["row,col", ...]
    const invalidCells = writable([])

    // won: 是否胜利
    const won = writable(false)

    // canUndo: 是否可撤销
    const canUndo = writable(false)

    // canRedo: 是否可重做
    const canRedo = writable(false)

    // ===== 派生 Stores（从多个 stores 派生）=====
    
    // 为 UI 组件提供一个统一的派生 store，包含所有需要的状态
    const state = derived(
        [grid, initialGrid, invalidCells, won, canUndo, canRedo],
        ([$grid, $initialGrid, $invalidCells, $won, $canUndo, $canRedo]) => ({
            grid: $grid,
            initialGrid: $initialGrid,
            invalidCells: $invalidCells,
            won: $won,
            canUndo: $canUndo,
            canRedo: $canRedo
        })
    )

    // ===== 内部方法：同步领域对象状态到 Stores =====
    function syncToStores() {
        if (!game) return

        // 获取当前局面
        const currentGrid = game.getSudoku().getGrid()
        grid.set(currentGrid)

        // 获取初始题目
        const initial = game.getInitialGrid()
        initialGrid.set(initial)

        // 获取冲突格子
        const invalid = game.getInvalidCells()
        invalidCells.set(invalid)

        // 检查是否胜利
        const isWon = game.isWon()
        won.set(isWon)

        // 更新 Undo/Redo 状态
        canUndo.set(game.canUndo())
        canRedo.set(game.canRedo())
    }

    // ===== 公开方法（UI 可调用）=====

    /**
     * 开始新游戏（通过难度生成）
     * @param {string} difficulty - 难度（'veryeasy' | 'easy' | 'medium' | 'hard'）
     */
    function startNew(difficulty) {
        // 生成数独题目
        const generatedGrid = generateSudoku(difficulty)

        // 创建 Sudoku 领域对象
        sudoku = createSudoku(generatedGrid)

        // 创建 Game 领域对象
        game = createGame({ sudoku })

        // 同步到 Svelte Stores
        syncToStores()
    }

    /**
     * 开始自定义游戏（通过 Sencode 编码）
     * @param {string} sencode - Sencode 编码字符串
     */
    function startCustom(sencode) {
        // 解码 Sencode 得到 grid
        const decodedGrid = decodeSencode(sencode)

        // 创建 Sudoku 领域对象
        sudoku = createSudoku(decodedGrid)

        // 创建 Game 领域对象
        game = createGame({ sudoku })

        // 同步到 Svelte Stores
        syncToStores()
    }

    /**
     * 填数字（用户输入）
     * @param {Object} move - { row: number, col: number, value: number }
     */
    function guess(move) {
        if (!game) return

        // 调用领域对象的 guess 方法
        game.guess(move)

        // 同步状态到 Stores（触发 Svelte 响应式更新）
        syncToStores()
    }

    /**
     * 撤销
     */
    function undo() {
        if (!game) return

        const success = game.undo()

        // 如果撤销成功，同步状态
        if (success) {
            syncToStores()
        }

        return success
    }

    /**
     * 重做
     */
    function redo() {
        if (!game) return

        const success = game.redo()

        // 如果重做成功，同步状态
        if (success) {
            syncToStores()
        }

        return success
    }

    /**
     * 提示功能：在指定位置填入正确答案
     * @param {Object} pos - { x: number, y: number }
     */
    function applyHint(pos) {
        if (!game) return

        const currentGrid = game.getSudoku().getGrid()

        // 如果该格子已经有用户填入的数字，不提示
        if (currentGrid[pos.y][pos.x] !== 0) return

        // 求解数独
        const solvedGrid = solveSudoku(currentGrid)

        // 调用 guess 填入正确答案
        game.guess({
            row: pos.y,
            col: pos.x,
            value: solvedGrid[pos.y][pos.x]
        })

        // 同步状态
        syncToStores()
    }

    /**
     * 判断指定格子是否是题目预设的（不可修改）
     * @param {number} row - 行号
     * @param {number} col - 列号
     * @returns {boolean} 是预设格子返回 true
     */
    function isInitialCell(row, col) {
        if (!game) return false
        return game.isInitialCell(row, col)
    }

    // ===== 返回 Store 对象 =====

    return {
        // 订阅接口（Svelte $store 语法必须）
        // $gameStore 将返回包含所有状态的派生对象
        subscribe: state.subscribe,

        // 响应式状态（Stores）
        // UI 组件也可以直接订阅这些单独的 stores
        grid,
        initialGrid,
        invalidCells,
        won,
        canUndo,
        canRedo,

        // 派生状态
        state,

        // 操作方法
        startNew,
        startCustom,
        guess,
        undo,
        redo,
        applyHint,
        isInitialCell,

        // 获取内部 Game 对象（用于测试或高级用途）
        getGame: () => game
    }
}

// ===== 导出单例 =====
export const gameStore = createGameStore()

// ===== 导出工厂函数（如需多实例）=====
export { createGameStore }
