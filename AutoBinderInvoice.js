// ==UserScript==
// @name         自动点击绑定按钮 (悬浮面板完整版) 很可靠
// @namespace    http://tampermonkey.net/
// @version      10.4
// @description  针对ASP.NET页面的手动触发绑定按钮点击，悬浮控制面板设计
// @author       XANA
// @match        http://wsyy.cw.scut.edu.cn/hnlgwsyy60/ifpCheckNew_WX.aspx*
// @match        https://wsyy.cw.scut.edu.cn/hnlgwsyy60/ifpCheckNew_WX.aspx*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // 添加CSS样式（来自第二个脚本）
    GM_addStyle(`
        #auto-bind-control-panel {
            position: fixed;
            top: 200px;
            left: 25%;
            z-index: 9999;
            background-color: rgba(255, 255, 255, 0.95);
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 250px;
            max-width: 500px;
            max-height: 80vh;
            overflow: auto;
            font-family: 'Microsoft YaHei', sans-serif;
        }
        .btn-toggle {
            background-color: #9C27B0;
            color: white;
        }
        #detail-section {
            transition: all 0.3s ease;
            max-height: 500px; /* 初始高度 */
            overflow: hidden;
        }
        #detail-section.collapsed {
            max-height: 0;
            opacity: 0;
            padding: 0;
        }
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
        }
        .panel-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        .control-buttons {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 8px 16px;
            font-size: 14px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: all 0.3s;
        }
        .btn:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }
        .btn-start {
            background-color: #4CAF50;
            color: white;
        }
        .btn-stop {
            background-color: #f44336;
            color: white;
        }
        .btn-clear {
            background-color: #2196F3;
            color: white;
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            margin-top: 10px;
            padding: 8px;
            background: #f9f9f9;
            border-radius: 4px;
        }
        .status-item {
            flex: 1;
            text-align: center;
        }
        .status-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
        }
        .status-value {
            font-size: 16px;
            font-weight: bold;
            color: #333;
        }
        .task-list {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 5px;
        }
        /* 固定列宽设置 */
        .task-header, .task-item {
            display: flex;
            padding: 5px 10px;
            align-items: center;
            height: 20px;
        }
        .invoice-no {
            width: 130px; /* 发票号列宽度 */
            font-size: 10px;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 5px;
        }
        .invoice-date {
            width: 60px; /* 开票日期列宽度 */
            font-size: 12px;
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 5px;
        }
        .button-id {
            width: 140px; /* 按钮ID列宽度 */
            font-size: 11px;
            color: #444;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 5px;
        }
        .total-amount {
            width: 60px; /* 合计列宽度 */
            font-size: 12px;
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 5px;
        }
        .task-status {
            width: 40px; /* 状态列宽度 */
            text-align: center;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            flex-shrink: 0; /* 防止被压缩 */
        }
        .task-item:last-child {
            border-bottom: none;
        }
        .task-info {
            flex: 1;
            min-width: 0;
        }
        .status-pending {
            background-color: #e0e0e0;
            color: #333;
        }
        .status-processing {
            background-color: #2196F3;
            color: white;
        }
        .status-success {
            background-color: #4CAF50;
            color: white;
        }
        .status-failed {
            background-color: #f44336;
            color: white;
        }
        .status-skipped {
            background-color: #FF9800;
            color: white;
        }
        .collapse-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 18px;
            color: #666;
            padding: 0;
            margin-left: 10px;
        }
    `);

    // 配置参数（来自第一个脚本）
    const CONFIG = {
        CHECK_INTERVAL: 500,      // 检查间隔
        MAX_WAIT_TIME: 5000,     // 最大等待时间
        BATCH_DELAY: 3000,        // 批次间延迟
        PAGE_REFRESH_CHECK: 5000, // 页面刷新检查间隔
        CLICK_RETRY_LIMIT: 3      // 点击重试次数
    };

    // 日志工具（来自第一个脚本）
    const Logger = {
        log: (...args) => console.log('[AutoClicker]', ...args),
        warn: (...args) => console.warn('[AutoClicker]', ...args),
        error: (...args) => console.error('[AutoClicker]', ...args),
        debug: (...args) => console.debug('[AutoClicker]', ...args)
    };

    // 存储状态（保留第一个脚本的核心变量，添加任务列表相关变量）
    let isRunning = false;
    let controlPanel = null;
    let taskList = [];
    let currentTaskIndex = 0;

    // 添加悬浮控制面板（来自第二个脚本）
    function addFloatingControlPanel() {
        if (document.getElementById('auto-bind-control-panel')) {
            return;
        }

        controlPanel = document.createElement('div');
        controlPanel.id = 'auto-bind-control-panel';
        controlPanel.innerHTML = `
            <div class="panel-header">
                <div class="control-buttons">
                    <button id="start-auto-bind-btn" class="btn btn-start">
                        一键[绑定]本页所有发票
                    </button>
                    <button id="start-auto-unbind-btn" class="btn btn-clear">
                        一键[解绑]本页所有发票
                    </button>
                    <button id="stop-auto-bind-btn" class="btn btn-stop" style="display: none;">
                        <span style="margin-right: 5px;">⏹️</span> 停止任务
                    </button>
                    <button id="clear-tasks-btn" class="btn btn-clear" style="display: none;">
                        <span style="margin-right: 5px;">🧹</span> 清除列表
                    </button>
                    <button id="toggle-detail-btn" class="btn btn-toggle">
                    <span id="toggle-icon">►</span> 展开详情
                    </button>
                </div>
            </div>
            <div id="detail-section" class="collapsed">
            <div class="status-bar">
                <div class="status-item">
                    <div class="status-label">可绑定/解绑数</div>
                    <div id="total-tasks" class="status-value">0</div>
                </div>
                <div class="status-item">
                    <div class="status-label">已完成</div>
                    <div id="completed-tasks" class="status-value">0</div>
                </div>
                <div class="status-item">
                    <div class="status-label">失败</div>
                    <div id="failed-tasks" class="status-value">0</div>
                </div>
            </div>
            <div id="task-list-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-weight: bold; color: #333;">任务列表</div>
                    <div id="current-task-info" style="font-size: 12px; color: #666;">当前任务: -</div>
                </div>
                <div id="task-list" class="task-list">
                    <!-- 任务列表将在这里动态添加 -->
                </div>
            </div>
            </div>
        `;

        document.body.appendChild(controlPanel);
        bindControlEvents();
        Logger.log("悬浮控制面板已添加");
    }

    // 更新任务状态显示（来自第二个脚本）
    function updateTaskStatus() {
        const totalTasks = taskList.length;
        const completedTasks = taskList.filter(t => t.status === 'success').length;
        const failedTasks = taskList.filter(t => t.status === 'failed').length;

        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('failed-tasks').textContent = failedTasks;
    }

    // 更新任务列表显示（修改添加合计列）
    function updateTaskListDisplay() {
        const taskListContainer = document.getElementById('task-list');
        if (!taskListContainer) return;

        taskListContainer.innerHTML = '';

        // 添加标题行
        const header = document.createElement('div');
        header.className = 'task-header';
        header.innerHTML = `
            <div class="task-column invoice-no">发票号</div>
            <div class="task-column invoice-date">开票日期</div>
            <div class="task-column total-amount">合计</div>
            <div class="task-column button-id">按钮ID</div>
            <div class="task-column task-status">状态</div>
        `;
        taskListContainer.appendChild(header);

        // 添加任务行
        taskList.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <div class="task-column invoice-no" title="${task.invoiceNo}">${task.invoiceNo}</div>
                <div class="task-column invoice-date">${task.invoiceDate}</div>
                <div class="task-column total-amount">${task.totalAmount}</div>
                <div class="task-column button-id">${task.buttonId}</div>
                <div class="task-column task-status status-${task.status}">
                    ${getStatusText(task.status)}
                </div>
            `;
            taskListContainer.appendChild(taskItem);
        });

        updateTaskStatus();
    }

    // 获取状态文本（来自第二个脚本）
    function getStatusText(status) {
        switch (status) {
            case 'pending': return '待执行';
            case 'processing': return '执行中';
            case 'success': return '成功';
            case 'failed': return '失败';
            case 'skipped': return '已跳过';
            default: return status;
        }
    }

    // 扫描表格并创建【绑定】任务列表 ===更新好===
    function scanTableAndCreateBoundTasks() {
        const table = getTable('GV_ZDFPPL');
        if (!table) return [];

        const tasks = [];
        const rows = table.querySelectorAll('tr:not(.header)');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 9) return;

            const invoiceNo = cells[1].textContent.trim(); //发票号
            const invoiceDate = cells[2].textContent.trim(); //发票日期
            const issuerName = cells[3].textContent.trim(); // 开票方名称
            const invoiceContent = row.querySelector('span[id$="LBL_FPNR"]')?.textContent.trim() || '';// 提取发票内容
            const payer = row.querySelector('span[id$="LBL_FKDWMC"]')?.textContent.trim() || '';// 提取付款单位
            const amount = cells[5].textContent.trim(); // 金额
            const taxAmount = cells[6].textContent.trim(); // 税额
            const totalAmount = cells[7].textContent.trim(); // 提取发票合计金额
            const businessNo = cells[8].textContent.trim(); // 业务编号

            // 提取[删除]按钮信息
            const deleteButton = row.querySelector('input[type="image"][src*="del.png"]');
            const deleteButtonId = deleteButton?.id || '';
            const deleteButtonElement = deleteButton || null;

            // 提取[绑定]按钮信息
            const button = row.querySelector('input[type="submit"][value="绑定"]'); //[绑定]按钮 --老方法--
            const BoundButton = row.querySelector('input[type="submit"][value="绑定"]'); //[绑定]按钮
            const BoundButtonId = BoundButton?.id || '';
            const BoundButtonElement = BoundButton || null;


            const invoiceType = row.querySelector('span[id$="LBL_FPLX"]')?.textContent.trim() || '';// 提取发票类型
            const entryDate = cells[13].textContent.trim(); // 录入日期


            if (invoiceNo && invoiceDate && button) {
                const existingTask = taskList.find(t => t.buttonId === button.id);

                tasks.push({
                    invoiceNo, //发票号
                    invoiceDate, //发票日期
                    issuerName, // 开票方名称
                    invoiceContent, // 发票内容
                    payer, // 付款单位
                    amount, // 金额
                    taxAmount, // 税额
                    totalAmount, //发票合计金额
                    businessNo, // 业务编号
                    deleteButtonId: deleteButtonId, // 删除按钮的id
                    deleteButtonElement: deleteButtonElement, // 删除按钮的Element

                    buttonId: button.id, //绑定按钮id --老方法--
                    buttonElement: button, //绑定按钮Element --老方法--

                    BoundButtonId: BoundButtonId, //绑定按钮id
                    BoundButtonElement: BoundButtonElement, //绑定按钮Element

                    invoiceType, // 发票类型
                    entryDate, // 录入日期

                    status: existingTask ? existingTask.status : 'pending'
                });
            }
        });

        return tasks;
    }


    // 扫描表格并创建【取消绑定】任务列表 ===更新好===
    function scanTableAndCreateUnboundTasks() {
        const table = getTable('GV_ZDFPPL');
        if (!table) return [];

        const tasks = [];
        const rows = table.querySelectorAll('tr:not(.header)');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 9) return;

            const invoiceNo = cells[1].textContent.trim(); //发票号
            const invoiceDate = cells[2].textContent.trim(); //发票日期
            const issuerName = cells[3].textContent.trim(); // 开票方名称
            const invoiceContent = row.querySelector('span[id$="LBL_FPNR"]')?.textContent.trim() || '';// 提取发票内容
            const payer = row.querySelector('span[id$="LBL_FKDWMC"]')?.textContent.trim() || '';// 提取付款单位
            const amount = cells[5].textContent.trim(); // 金额
            const taxAmount = cells[6].textContent.trim(); // 税额
            const totalAmount = cells[7].textContent.trim(); // 提取发票合计金额
            const businessNo = cells[8].textContent.trim(); // 业务编号

            // 提取[删除]按钮信息
            const deleteButton = row.querySelector('input[type="image"][src*="del.png"]');
            const deleteButtonId = deleteButton?.id || '';
            const deleteButtonElement = deleteButton || null;

            // 提取[绑定]按钮信息
            const button = row.querySelector('input[type="submit"][value="绑定"]'); //[绑定]按钮 --老方法--
            const BoundButton = row.querySelector('input[type="submit"][value="绑定"]'); //[绑定]按钮
            const BoundButtonId = BoundButton?.id || '';
            const BoundButtonElement = BoundButton || null;


            const invoiceType = row.querySelector('span[id$="LBL_FPLX"]')?.textContent.trim() || '';// 提取发票类型
            const entryDate = cells[13].textContent.trim(); // 录入日期


            if (invoiceNo && invoiceDate && button) {
                const existingTask = taskList.find(t => t.buttonId === button.id);

                tasks.push({
                    invoiceNo, //发票号
                    invoiceDate, //发票日期
                    issuerName, // 开票方名称
                    invoiceContent, // 发票内容
                    payer, // 付款单位
                    amount, // 金额
                    taxAmount, // 税额
                    totalAmount, //发票合计金额
                    businessNo, // 业务编号
                    deleteButtonId: deleteButtonId, // 删除按钮的id
                    deleteButtonElement: deleteButtonElement, // 删除按钮的Element

                    buttonId: button.id, //绑定按钮id --老方法--
                    buttonElement: button, //绑定按钮Element --老方法--

                    BoundButtonId: BoundButtonId, //绑定按钮id
                    BoundButtonElement: BoundButtonElement, //绑定按钮Element

                    invoiceType, // 发票类型
                    entryDate, // 录入日期

                    status: existingTask ? existingTask.status : 'pending'
                });
            }
        });

        return tasks;
    }


    // 替换confirm函数（来自第一个脚本）
    function setupAutoConfirm() {
        const originalConfirm = window.confirm;
        window.confirm = function (message) {
            Logger.log(`自动确认弹窗: "${message}"`);
            return true; // 自动点击 "确定"
        };
    }

    // 获取目标表格--参数化目标表格id ===更新好===
    function getTable(ElementId = 'GV_ZDFPPL') {
        const table = document.getElementById(ElementId);
        if (!table) {
            Logger.error("未找到 ID 为 " + ElementId + " 的表格。");
        }
        return table;
    }

    // 查找所有可以按下的[绑定]的按钮 ===更新好===
    function findAllBoundButtons(table) {
        if (!table) return [];

        const allButtons = table.querySelectorAll('input[type="submit"]');
        const boundButtonsList = Array.from(allButtons).filter(button =>
            button.id &&
            button.id.includes('BT_BD0') &&
            button.value === '绑定' &&
            !button.disabled &&
            button.offsetParent !== null // 检查是否可见
        );

        Logger.log(`找到 ${boundButtonsList.length} 个可以按下的[绑定]按钮`);
        Logger.log(`[绑定]按钮List= ${boundButtonsList} `);
        return boundButtonsList;
    }

    // 查找所有可以按下的[取消绑定]的按钮 ===更新好===
    function findAllUnboundButtons(table) {
        if (!table) return [];

        const allButtons = table.querySelectorAll('input[type="submit"]');
        const unboundButtonsList = Array.from(allButtons).filter(button =>
            button.id &&
            button.id.includes('BT_QXBD') &&
            button.value === '取消绑定' &&
            !button.disabled &&
            button.offsetParent !== null // 检查是否可见
        );

        Logger.log(`找到 ${unboundButtonsList.length} 个可以按下的[取消绑定]按钮`);
        Logger.log(`[取消绑定]按钮List= ${unboundButtonsList} `);
        return unboundButtonsList;
    }

    // 检查页面是否忙碌（来自第一个脚本）
    function isPageBusy() {
        // 检查是否有正在进行的异步回发
        if (typeof Sys !== 'undefined' &&
            Sys.WebForms &&
            Sys.WebForms.PageRequestManager &&
            Sys.WebForms.PageRequestManager.getInstance()) {
            const prm = Sys.WebForms.PageRequestManager.getInstance();
            if (prm.get_isInAsyncPostBack && prm.get_isInAsyncPostBack()) {
                return true;
            }
        }

        // 检查页面是否在加载中
        return document.readyState !== 'complete';
    }

    // 等待页面状态稳定（来自第一个脚本）
    function waitForPageStable(timeout = CONFIG.MAX_WAIT_TIME) {
        return new Promise((resolve) => {
            const startTime = Date.now();

            function checkPageStatus() {
                if (!isPageBusy()) {
                    resolve(true);
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    Logger.warn('等待页面稳定超时');
                    resolve(false);
                    return;
                }

                setTimeout(checkPageStatus, CONFIG.CHECK_INTERVAL);
            }

            checkPageStatus();
        });
    }

    // 等待[绑定]按钮状态变化 ===更新好===
    function waitForBoundButtonStateChange(buttonId, timeout = CONFIG.MAX_WAIT_TIME) {
        return new Promise((resolve) => {
            const startTime = Date.now();

            function checkState() {
                const button = document.getElementById(buttonId);

                if (!button) {
                    // 按钮消失了（成功绑定）
                    Logger.log(`按钮 ${buttonId} 已消失（成功）`);
                    resolve({ success: true, reason: 'button_disappeared' });
                    return;
                }

                if (button.disabled || button.value !== '绑定') {
                    // 按钮状态改变了（变灰或文字改变）
                    Logger.log(`按钮 ${buttonId} 状态已改变`);
                    resolve({ success: true, reason: 'state_changed' });
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    Logger.log(`按钮 ${buttonId} 等待超时`);
                    resolve({ success: false, reason: 'timeout' });
                    return;
                }

                setTimeout(checkState, CONFIG.CHECK_INTERVAL);
            }

            checkState();
        });
    }

    // 等待[取消绑定]按钮状态变化 ===更新好===
    function waitForUnboundButtonStateChange(buttonId, timeout = CONFIG.MAX_WAIT_TIME) {
        return new Promise((resolve) => {
            const startTime = Date.now();

            function checkState() {
                const button = document.getElementById(buttonId);

                if (!button) {
                    // 按钮消失了（成功绑定）
                    Logger.log(`按钮 ${buttonId} 已消失（成功）`);
                    resolve({ success: true, reason: 'button_disappeared' });
                    return;
                }

                if (button.disabled || button.value !== '取消绑定') {
                    // 按钮状态改变了（变灰或文字改变）
                    Logger.log(`按钮 ${buttonId} 状态已改变`);
                    resolve({ success: true, reason: 'state_changed' });
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    Logger.log(`按钮 ${buttonId} 等待超时`);
                    resolve({ success: false, reason: 'timeout' });
                    return;
                }

                setTimeout(checkState, CONFIG.CHECK_INTERVAL);
            }

            checkState();
        });
    }

    // 更新当前任务信息（来自第二个脚本）
    function updateCurrentTaskInfo(task) {
        const taskInfoElement = document.getElementById('current-task-info');
        if (taskInfoElement) {
            taskInfoElement.textContent = `当前任务: ${task.invoiceNo} (${task.invoiceDate})`;
        }
    }

    // 安全点击[绑定]按钮 ===更新好===
    async function safeClickBoundButton(button) {
        if (!isRunning) return { success: false, reason: 'stopped' };

        try {
            const currentButton = document.getElementById(button.id);

            if (!currentButton || currentButton.disabled || currentButton.value !== '绑定') {
                Logger.log(`按钮 ${button.id} 不再可用`);
                return { success: false, reason: 'button_unavailable' };
            }

            // 使用postback
            if (typeof (__doPostBack) !== 'undefined' && currentButton.name) {
                Logger.log(`触发 postback: ${currentButton.name}`);
                __doPostBack(currentButton.name, '');
            } else {
                Logger.log(`直接点击按钮: ${currentButton.id}`);
                currentButton.click();
            }

            return { success: true };
        } catch (error) {
            Logger.error(`点击按钮${button.id}失败:`, error);
            return { success: false, reason: 'click_failed' };
        }
    }

    // 安全点击[取消绑定]按钮 ===更新好===
    async function safeClickUnoundButton(button) {
        if (!isRunning) return { success: false, reason: 'stopped' };

        try {
            const currentButton = document.getElementById(button.id);

            if (!currentButton || currentButton.disabled || currentButton.value !== '取消绑定') {
                Logger.log(`按钮 ${button.id} 不再可用`);
                return { success: false, reason: 'button_unavailable' };
            }

            // 使用postback
            if (typeof (__doPostBack) !== 'undefined' && currentButton.name) {
                Logger.log(`触发 postback: ${currentButton.name}`);
                __doPostBack(currentButton.name, '');
            } else {
                Logger.log(`直接点击按钮: ${currentButton.id}`);
                currentButton.click();
            }

            return { success: true };
        } catch (error) {
            Logger.error(`点击按钮${button.id}失败:`, error);
            return { success: false, reason: 'click_failed' };
        }
    }

    // 串行处理函数（保留第一个脚本的核心逻辑，添加任务状态更新）
    async function processButtonsSerially() {
        isRunning = true;
        toggleButtonState(true);
        taskList = scanTableAndCreateBoundTasks();
        updateTaskListDisplay();
        Logger.log("开始串行处理流程...");

        while (isRunning) {
            const table = getTable('GV_ZDFPPL');
            if (!table) {
                Logger.error("找不到表格，退出处理");
                break;
            }

            // 重新扫描未绑定按钮
            const unboundButtons = findAllBoundButtons(table);
            const totalButtons = unboundButtons.length;

            if (totalButtons === 0) {
                Logger.log("所有按钮已处理完毕！");
                updateStatus('已完成', `总数量: ${totalButtons}`);
                break;
            }

            // 更新进度
            updateStatus('处理中', `剩余: ${unboundButtons.length}`);

            // 只处理第一个按钮
            const firstButton = unboundButtons[0];
            const buttonId = firstButton.id;

            // 查找对应的任务
            const task = taskList.find(t => t.buttonId === buttonId);
            if (task) {
                task.status = 'processing';
                updateTaskListDisplay();
                updateCurrentTaskInfo(task);
            }

            Logger.log(`准备处理按钮: ${buttonId} (${unboundButtons.length} 个剩余)`);

            try {
                // 等待页面稳定
                await waitForPageStable();

                // 检查是否停止
                if (!isRunning) break;

                // 安全点击按钮
                const clickResult = await safeClickBoundButton(firstButton);

                if (!clickResult.success) {
                    Logger.warn(`按钮 ${buttonId} 点击失败: ${clickResult.reason}`);

                    if (clickResult.reason === 'stopped') {
                        break;
                    }

                    // 更新任务状态
                    if (task) {
                        if (clickResult.reason === 'button_unavailable') {
                            task.status = 'skipped';
                        } else {
                            task.status = 'failed';
                        }
                        updateTaskListDisplay();
                    }

                    // 如果按钮不可用，继续处理下一个
                    continue;
                }

                // 等待按钮状态变化
                const result = await waitForBoundButtonStateChange(buttonId);
                Logger.log(`按钮 ${buttonId} 处理结果:`, result);

                // 更新任务状态
                if (task) {
                    if (result.success) {
                        task.status = 'success';
                    } else {
                        task.status = 'failed';
                    }
                    updateTaskListDisplay();
                }

                // 根据结果决定等待时间
                const waitTime = result.success ? 2000 : 3000;

                // 等待期间检查是否停止
                for (let i = 0; i < waitTime / 100 && isRunning; i++) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                if (!isRunning) break;
            } catch (error) {
                Logger.error(`处理按钮 ${buttonId} 时出错:`, error);

                // 更新任务状态
                if (task) {
                    task.status = 'failed';
                    updateTaskListDisplay();
                }

                // 等待期间检查是否停止
                for (let i = 0; i < 20 && isRunning; i++) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                if (!isRunning) break;
            }
        }

        isRunning = false;
        toggleButtonState(false);
        updateStatus('已停止');

        if (!isRunning) {
            updateStatus('已完成');
        }

        Logger.log("处理流程结束");
    }

    // 更新状态显示（来自第一个脚本）
    function updateStatus(status, progress = '') {
        const statusElement = document.getElementById('bind-status');
        const progressElement = document.getElementById('bind-progress');

        if (statusElement) {
            statusElement.textContent = `状态: ${status}`;
        }

        if (progressElement) {
            progressElement.textContent = progress;
        }
    }

    // 切换按钮状态（来自第一个脚本）
    function toggleButtonState(isRunning) {
        const startBtn = document.getElementById('start-auto-bind-btn');
        const stopBtn = document.getElementById('stop-auto-bind-btn');
        const clearBtn = document.getElementById('clear-tasks-btn');

        if (startBtn) {
            startBtn.style.display = isRunning ? 'none' : 'flex';
        }

        if (stopBtn) {
            stopBtn.style.display = isRunning ? 'flex' : 'none';
        }

        if (clearBtn) {
            clearBtn.style.display = isRunning ? 'none' : 'flex';
        }
    }

    // 绑定按钮事件（合并两个脚本的事件处理）
    function bindControlEvents() {
        const startBtn = document.getElementById('start-auto-bind-btn');
        const stopBtn = document.getElementById('stop-auto-bind-btn');
        const clearBtn = document.getElementById('clear-tasks-btn');
        const toggleBtn = document.getElementById('toggle-detail-btn');
        const unbindBtn = document.getElementById('start-auto-unbind-btn');

        if (startBtn) {
            startBtn.addEventListener('click', async function () {
                if (!isRunning) {
                    Logger.log("开始自动绑定流程...");
                    setupAutoConfirm();
                    await processButtonsSerially();
                }
            });
        }

        if (unbindBtn) {
            unbindBtn.addEventListener('click', async function () {
                if (!isRunning) {
                    Logger.log("开始自动解绑流程...");
                    //await processUnbindButtonsSerially();//============待修改========
                }
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', function () {
                Logger.log("用户手动停止绑定流程");
                isRunning = false;
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                taskList = [];
                updateTaskListDisplay();
                document.getElementById('current-task-info').textContent = '当前任务: -';
            });
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                const detailSection = document.getElementById('detail-section');
                const toggleIcon = document.getElementById('toggle-icon');

                if (detailSection.classList.contains('collapsed')) {
                    // 展开详情
                    detailSection.classList.remove('collapsed');
                    toggleIcon.textContent = '▼';
                    toggleBtn.innerHTML = `<span id="toggle-icon">▼</span> 收起详情`;
                } else {
                    // 折叠详情
                    detailSection.classList.add('collapsed');
                    toggleIcon.textContent = '►';
                    toggleBtn.innerHTML = `<span id="toggle-icon">►</span> 展开详情`;
                }
            });
        }
    }

    // 初始化函数（保留第一个脚本的核心逻辑）
    function initialize() {
        try {
            // 添加悬浮控制面板
            addFloatingControlPanel();

            // 监听ASP.NET异步回发完成事件
            if (typeof Sys !== 'undefined' && Sys.WebForms && Sys.WebForms.PageRequestManager) {
                const prm = Sys.WebForms.PageRequestManager.getInstance();
                prm.add_endRequest(function (sender, args) {
                    // 重新绑定事件
                    bindControlEvents();
                    Logger.log("ASP.NET异步回发完成，重新绑定事件");
                });
            }

            Logger.log("自动绑定系统已初始化完成");
        } catch (error) {
            Logger.error("初始化失败:", error);
        }
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
