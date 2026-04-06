// ==UserScript==
// @name         SCUT财务系统UI优化-网上报账-一键绑定/解绑发票
// @namespace    http://tampermonkey.net/
// @version      12.0
// @description  在税票录入页面，增加一键绑定、一键解绑功能
// @author       XANA
// @match        http://wsyy.cw.scut.edu.cn/hnlgwsyy60/ifpCheckNew_WX.aspx*
// @match        https://wsyy.cw.scut.edu.cn/hnlgwsyy60/ifpCheckNew_WX.aspx*
// @match        http://wsyy-cw.webvpn.scut.edu.cn/hnlgwsyy60/ifpCheckNew_WX.aspx*
// @match        https://wsyy-cw.webvpn.scut.edu.cn/hnlgwsyy60/ifpCheckNew_WX.aspx*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // 配置参数（来自第一个脚本）
    const CONFIG = {
        CHECK_INTERVAL: 200,      // 检查间隔
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

    function addEmptyRowAfterTrBd() {
        // 定位目标行
        const targetRow = document.getElementById('tr_bd');
        if (!targetRow) {
            Logger.log("未找到 tr_bd 行");
            return;
        }

        // 检查是否已存在空行
        if (document.getElementById('tr_empty_row')) {
            Logger.log("空行已存在");
            return;
        }

        // 创建新行
        const newRow = document.createElement('tr');
        newRow.id = 'tr_empty_row';
        newRow.style.height = '60px';

        // // 创建单元格（覆盖所有列）
        // const cell = document.createElement('td');
        // cell.colSpan = 4; // 根据表格实际列数调整
        // cell.style.padding = '0';
        // cell.style.margin = '0';
        // cell.innerHTML = '&nbsp;'; // 添加空格确保行高

        // // 组装行结构
        // newRow.appendChild(cell);

        // 在目标行后插入新行
        targetRow.insertAdjacentElement('afterend', newRow);
        Logger.log("空白行添加成功");
    }


    /** ==== 构建 UI部分 ==== **/
    /** ==== 创建任务列表面板（包含按钮和折叠区） ==== **/
    function AutoBindInvoice_createTaskPanel() {
        if (document.getElementById('AutoBindInvoice_taskPanel')) return;

        GM_addStyle(`
            /* 面板整体 */
            .AutoBindInvoice_panel {
                position: fixed;
                top: 185px;
                left: 40%;
                transform: translateX(-50%);
                z-index: 99999;
                background-color: rgba(255, 255, 255, 0.95);
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 446px;
                max-width: 700px;
                font-family: 'Microsoft YaHei', sans-serif;
            }
            /* 公共按钮样式 */
            .AutoBindInvoice_Btn {
                padding: 8px 12px;
                font-size: 15px;
                font-weight: bold;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                color: white;
                margin-right: 8px;
            }
            .AutoBindInvoice_Btn:hover {
                opacity: 0.9;
                transform: translateY(-2px);
            }
            .AutoBindInvoice_Btn-bind { background-color: #2196F3; }
            .AutoBindInvoice_Btn-unbind { background-color: #4CAF50; }
            .AutoBindInvoice_Btn-stop { background-color: #f44336; }
            .AutoBindInvoice_Btn-clear { background-color: #FF9800; }
            .AutoBindInvoice_Btn-toggle { background-color: #9C27B0; }

            /* 顶部按钮区域 */
            .AutoBindInvoice_buttonRow {
                padding: 8px;
                border-bottom: 1px solid #ddd;
                display: flex;
                justify-content: flex-start;
                align-items: center;
            }

            /* 折叠内容区 */
            .AutoBindInvoice_content {
                padding: 8px;
                display: none; /* 默认折叠 */
            }

            /* 状态栏 */
            .AutoBindInvoice_statusBar {
                display: flex;
                gap: 20px;
                margin-bottom: 8px;
                justify-content: center; /* 居中 */
            }
            .AutoBindInvoice_statusItem {
                text-align: center;
                font-size: 12px;
            }
            .AutoBindInvoice_statusValue {
                font-size: 14px;
                font-weight: bold;
            }
            .AutoBindInvoice_statusValue.green { color: green; }
            .AutoBindInvoice_statusValue.orange { color: orange; }

            /* 当前任务信息 */
            #AutoBindInvoice_currentTask {
                font-size: 14px;
                color: #333;
                margin-bottom: 8px;
            }

            /* 任务表格 */
            .AutoBindInvoice_taskTable {
                min-width: 440px;
                border-collapse: collapse;
                table-layout: fixed;
            }
            .AutoBindInvoice_taskTable th, .AutoBindInvoice_taskTable td {
                border: 1px solid #ddd;
                padding: 2px 8px;
                font-size: 14px;
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .AutoBindInvoice_invoiceNo { width: 130px; }
            .AutoBindInvoice_invoiceDate { width: 50px; }
            .AutoBindInvoice_totalAmount { width: 60px; }
            .AutoBindInvoice_statusCol { width: 45px; }
            /* 状态颜色 */
            .AutoBindInvoice_statusPending { background-color: #e0e0e0; color: #333; }
            .AutoBindInvoice_statusProcessing { background-color: #2196F3; color: #fff; }
            .AutoBindInvoice_statusSuccess { background-color: #4CAF50; color: #fff; }
            .AutoBindInvoice_statusFailed { background-color: #f44336; color: #fff; }
            .AutoBindInvoice_statusSkipped { background-color: #FF9800; color: #fff; }
        `);

        const panelHTML = `
            <div id="AutoBindInvoice_taskPanel" class="AutoBindInvoice_panel">
                <!-- 顶部按钮栏 -->
                <div class="AutoBindInvoice_buttonRow">
                    <button id="AutoBindInvoice_btnBindAll" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-bind">
                        一键[绑定]</span><br>本页所有发票
                    </button>
                    <button id="AutoBindInvoice_btnUnbindAll" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-unbind">
                        一键[取消绑定]<br>本页所有发票
                    </button>
                    <button id="AutoBindInvoice_btnStopTask" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-stop" style="visibility:hidden;">
                        停止<br>任务
                    </button>
                    <button id="AutoBindInvoice_btnClearList" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-clear">
                        清除<br>列表
                    </button>
                    <button id="AutoBindInvoice_btnTogglePanel" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-toggle">
                        展开<br>列表
                    </button>
                </div>

                <!-- 折叠内容区 -->
                <div id="AutoBindInvoice_content" class="AutoBindInvoice_content">
                    <div class="AutoBindInvoice_statusBar">
                        <div class="AutoBindInvoice_statusItem">
                            总任务数 <span class="AutoBindInvoice_statusValue" id="AutoBindInvoice_totalTasks">0</span>
                        </div>
                        <div class="AutoBindInvoice_statusItem">
                            成功数 <span class="AutoBindInvoice_statusValue green" id="AutoBindInvoice_successTasks">0</span>
                        </div>
                        <div class="AutoBindInvoice_statusItem">
                            待执行数 <span class="AutoBindInvoice_statusValue orange" id="AutoBindInvoice_pendingTasks">0</span>
                        </div>
                    </div>
                    <div id="AutoBindInvoice_currentTask">当前任务：无</div>
                    <table class="AutoBindInvoice_taskTable">
                        <thead>
                            <tr>
                                <th class="AutoBindInvoice_invoiceNo">发票号</th>
                                <th class="AutoBindInvoice_invoiceDate">开票日期</th>
                                <th class="AutoBindInvoice_totalAmount">合计金额</th>
                                <th class="AutoBindInvoice_statusCol">状态</th>
                            </tr>
                        </thead>
                        <tbody id="AutoBindInvoice_taskTableBody"></tbody>
                    </table>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', panelHTML);

        // // 折叠开关逻辑
        // document.getElementById('AutoBindInvoice_btnTogglePanel').addEventListener('click', () => {
        //     const contentDiv = document.getElementById('AutoBindInvoice_content');
        //     if (contentDiv.style.display === 'none' || contentDiv.style.display === '') {
        //         contentDiv.style.display = 'block';
        //         document.getElementById('AutoBindInvoice_btnTogglePanel').value = '收起任务列表';
        //     } else {
        //         contentDiv.style.display = 'none';
        //         document.getElementById('AutoBindInvoice_btnTogglePanel').value = '展开任务列表';
        //     }
        // });

        console.log("[AutoBindInvoice] 任务面板已创建");
    }

    /**
     * 给面板按钮绑定事件
     */
    function AutoBindInvoice_bindButtonsEvents() {
        // 一键绑定
        const btnBind = document.getElementById('AutoBindInvoice_btnBindAll');
        if (btnBind) {
            btnBind.addEventListener('click', async () => {
                if (!isRunning) {
                    console.log('[AutoBindInvoice] 开始一键绑定流程...');
                    taskList = [];
                    // setupAutoConfirm(); // 你第一个脚本里的自动确认
                    await processAutoBoundButtonsSerially(); // 调用你的绑定逻辑
                }
            });
        }

        // 一键解绑
        const btnUnbind = document.getElementById('AutoBindInvoice_btnUnbindAll');
        if (btnUnbind) {
            btnUnbind.addEventListener('click', async () => {
                if (!isRunning) {
                    console.log('[AutoBindInvoice] 开始一键解绑流程...');
                    taskList = [];
                    setupAutoConfirm();
                    await processAutoUnoundButtonsSerially(); // 调用你的解绑逻辑
                }
            });
        }

        // 停止任务
        const btnStop = document.getElementById('AutoBindInvoice_btnStopTask');
        if (btnStop) {
            btnStop.addEventListener('click', () => {
                console.log('[AutoBindInvoice] 手动停止任务');
                isRunning = false;
            });
        }

        // 清除列表
        const btnClear = document.getElementById('AutoBindInvoice_btnClearList');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                console.log('[AutoBindInvoice] 清空任务列表');
                taskList = [];
                AutoBindInvoice_updateUiDisplay();
                document.getElementById('AutoBindInvoice_currentTask').textContent = '当前任务：无';
            });
        }

        // 展开/收起任务列表（折叠区切换）
        const btnToggle = document.getElementById('AutoBindInvoice_btnTogglePanel');
        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                const contentDiv = document.getElementById('AutoBindInvoice_content');
                if (contentDiv.style.display === 'none' || contentDiv.style.display === '') {
                    contentDiv.style.display = 'block';
                    btnToggle.value = '收起任务列表';
                    AutoBindInvoice_updateUiDisplay();
                } else {
                    contentDiv.style.display = 'none';
                    btnToggle.value = '展开任务列表';
                }
            });
        }
    }




    /** ==== 更新 UI内容部分 ==== **/
    /**
     * 刷新任务面板显示
     * 使用全局 taskList 数据
     */
    function AutoBindInvoice_updateUiDisplay() {
        const totalTasksEl = document.getElementById('AutoBindInvoice_totalTasks');
        const successTasksEl = document.getElementById('AutoBindInvoice_successTasks');
        const pendingTasksEl = document.getElementById('AutoBindInvoice_pendingTasks');
        const tbody = document.getElementById('AutoBindInvoice_taskTableBody');

        if (!totalTasksEl || !successTasksEl || !pendingTasksEl || !tbody) {
            console.warn('[AutoBindInvoice] 面板 DOM 不完整，无法刷新 UI');
            return;
        }

        // 统计数据
        const totalCount = taskList.length;
        const successCount = taskList.filter(t => t.status === 'success').length;
        const pendingCount = taskList.filter(t => t.status === 'pending').length;

        // 更新顶部统计数字
        totalTasksEl.textContent = totalCount;
        successTasksEl.textContent = successCount;
        pendingTasksEl.textContent = pendingCount;

        // 清空现有表格数据
        tbody.innerHTML = '';

        // 填充表格
        taskList.forEach(task => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td class="AutoBindInvoice_invoiceNo">${task.invoiceNo || ''}</td>
            <td class="AutoBindInvoice_invoiceDate">${task.invoiceDate || ''}</td>
            <td class="AutoBindInvoice_totalAmount">${task.totalAmount != null ? task.totalAmount : ''}</td>
            <td class="AutoBindInvoice_statusCol AutoBindInvoice_status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}">
                ${getStatusText(task.status)}
            </td>
        `;
            tbody.appendChild(row);
        });
    }

    /**
     * 更新当前任务信息
     * @param {Object} task - 当前任务对象
     */
    function AutoBindInvoice_updateCurrentTaskInfo(task) {
        const currentTaskEl = document.getElementById('AutoBindInvoice_currentTask');
        if (!currentTaskEl) {
            console.warn('[AutoBindInvoice] 当前任务信息元素不存在');
            return;
        }

        if (!task) {
            currentTaskEl.textContent = '当前任务：无';
            return;
        }

        currentTaskEl.textContent = `当前任务：${task.invoiceNo || ''} (${task.invoiceDate || ''}) ${task.totalAmount != null ? task.totalAmount : ''} 元`;
    }

    /**
     * 切换按钮显示状态（适配新UI）
     * @param {boolean} running - 是否正在执行任务
     */
    function AutoBindInvoice_toggleButtonState(running) {
        const btnBind = document.getElementById('AutoBindInvoice_btnBindAll');
        const btnUnbind = document.getElementById('AutoBindInvoice_btnUnbindAll');
        const btnStop = document.getElementById('AutoBindInvoice_btnStopTask');
        const btnClear = document.getElementById('AutoBindInvoice_btnClearList');
        const btnToggle = document.getElementById('AutoBindInvoice_btnTogglePanel');

        // 绑定按钮
        if (btnBind) {
            btnBind.style.visibility = running ? 'hidden' : 'visible';
        }
        // 解绑按钮
        if (btnUnbind) {
            btnUnbind.style.visibility = running ? 'hidden' : 'visible';
        }
        // 停止按钮
        if (btnStop) {
            btnStop.style.visibility = running ? 'visible' : 'hidden';
        }
        // 清除列表按钮（可选隐藏，建议不给隐藏）
        if (btnClear) {
            btnClear.disabled = running; //运行中禁用防止误操作
        }
        // 展开/收起按钮始终显示
        if (btnToggle) {
            btnToggle.disabled = false;
        }
    }

    
    /** ==== 公共函数  ==== **/
    // 获取状态文本（来自第二个脚本）
    /**
     * 根据状态码返回状态文本
     * @function
     * @param {'pending' | 'processing' | 'success' | 'failed' | 'skipped'} status - 任务状态代码
     * @returns {string} 对应的中文状态文本
     */
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

    // 检查页面是否忙碌（来自第一个脚本）
    /**
     * 检查页面是否忙碌（异步回发或未完全加载）
     * @function
     * @returns {boolean} 页面是否忙碌
     */
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
    /**
     * 等待页面状态稳定
     * @function
     * @param {number} [timeout=CONFIG.MAX_WAIT_TIME] - 最大等待时间（毫秒）
     * @returns {Promise<boolean>} 页面是否在超时前稳定
     */
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

    // 获取目标表格--参数化目标表格id ===更新好===
    /**
     * 获取表格元素
     * @function
     * @param {string} [ElementId='ctl00_ContentPlaceHolder1_TR_WDPJ0'] - 表格的 DOM 元素 ID
     * @returns {HTMLTableElement|null} 目标表格 DOM 元素
     */
    function getTable(ElementId = 'GV_ZDFPPL') {
        const table = document.getElementById(ElementId);
        if (!table) {
            Logger.error("未找到 ID 为 " + ElementId + " 的表格。");
        }
        return table;
    }




    // 替换confirm函数（来自第一个脚本）
    function setupAutoConfirm() {
        const originalConfirm = window.confirm;
        window.confirm = function (message) {
            Logger.log(`自动确认弹窗: "${message}"`);
            return true; // 自动点击 "确定"
        };
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


            if (invoiceNo && //必须包含发票号
                BoundButtonId.includes('BT_BD0') &&
                BoundButtonElement.value === '绑定' &&
                !BoundButtonElement.disabled &&
                BoundButtonElement.offsetParent !== null // 检查是否可见
            ) {
                const existingTask = taskList.find(t => t.invoiceNo === invoiceNo); //查重条件改为发票号

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

                    buttonId: button.id, //按钮id --老方法--
                    buttonElement: button, //按钮Element --老方法--

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

            // 提取[取消绑定]按钮信息
            const UnboundButton = row.querySelector('input[type="submit"][value="取消绑定"]'); //[取消绑定]按钮
            const UnboundButtonId = UnboundButton?.id || '';
            const UnboundButtonElement = UnboundButton || null;


            const invoiceType = row.querySelector('span[id$="LBL_FPLX"]')?.textContent.trim() || '';// 提取发票类型
            const entryDate = cells[13].textContent.trim(); // 录入日期


            if (invoiceNo && //必须包含发票号
                UnboundButtonId.includes('BT_QXBD') &&
                UnboundButtonElement.value === '取消绑定' &&
                !UnboundButtonElement.disabled &&
                UnboundButtonElement.offsetParent !== null // 检查是否可见
            ) {
                const existingTask = taskList.find(t => t.invoiceNo === invoiceNo); //查重条件改为发票号

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

                    buttonId: UnboundButtonId, //按钮id --老方法--
                    buttonElement: UnboundButtonElement, //按钮Element --老方法--

                    UnboundButtonId: UnboundButtonId, //绑定按钮id
                    UnboundButtonElement: UnboundButtonElement, //绑定按钮Element

                    invoiceType, // 发票类型
                    entryDate, // 录入日期

                    status: existingTask ? existingTask.status : 'pending'
                });
            }
        });

        return tasks;
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

    // 串行处理函数 一键绑定 功能
    async function processAutoBoundButtonsSerially() {
        isRunning = true;
        AutoBindInvoice_toggleButtonState(isRunning);
        taskList = scanTableAndCreateBoundTasks(); //此处返回的是list，内部obj定义见scanTableAndCreateBoundTasks函数
        AutoBindInvoice_updateUiDisplay();
        Logger.log("开始串行处理流程...");
        // Logger.log(`[一键绑定]taskList:`);
        // console.log(taskList);

        while (isRunning) {
            const table = getTable('GV_ZDFPPL');
            if (!table) {
                Logger.error("找不到表格，退出处理");
                break;
            }

            const nowList = scanTableAndCreateBoundTasks(); //此处返回的是list，内部obj定义见scanTableAndCreateBoundTasks函数

            const findSharedInvoices = (taskList, nowList) => {
                const list1 = nowList;
                const list2 = taskList;
                // 创建一个 Set 用于存储 list2 中的所有发票号
                const invoiceNosInList2 = new Set();

                list2.forEach(task => { // 遍历 list2 中的每个任务
                    invoiceNosInList2.add(task.invoiceNo);// 将每个任务的发票号添加到 Set 中
                });

                const resultList = [];// 创建一个空数组用于存储匹配的任务

                // 遍历 list1 中的每个任务
                list1.forEach(task => {
                    // 检查当前任务的发票号是否存在于 list2 的发票号集合中
                    if (invoiceNosInList2.has(task.invoiceNo)) {
                        // 如果存在，直接将 list1 中的任务添加到结果数组中
                        resultList.push(task);
                    }
                });
                return resultList;// 返回包含匹配任务的新列表
            }

            const workList = findSharedInvoices(taskList, nowList); //只操作taskList里有的按钮
            // Logger.log(`[一键绑定]workList:`);
            // console.log(workList);

            if (workList.length === 0) {
                Logger.log("所有按钮已处理完毕！");
                // updateStatus('已完成', `总数量: ${workList.length}`);
                isRunning = false;
                break;
            }

            // 更新进度
            // updateStatus('处理中', `剩余: ${workList.length}`);

            // 只处理第一个按钮
            const firstButton = workList[0].buttonElement;
            const buttonId = firstButton.id;

            // 查找对应的任务
            const task = taskList.find(t => t.buttonId === buttonId);
            if (task) {
                task.status = 'processing';
                AutoBindInvoice_updateUiDisplay();
                AutoBindInvoice_updateCurrentTaskInfo(task);
            }

            Logger.log(`准备处理按钮: ${buttonId} (${workList.length} 个剩余)`);

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
                        AutoBindInvoice_updateUiDisplay();
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
                    AutoBindInvoice_updateUiDisplay();
                }

                // // 根据结果决定等待时间
                // const waitTime = result.success ? 2000 : 3000;

                // // 等待期间检查是否停止
                // for (let i = 0; i < waitTime / 100 && isRunning; i++) {
                //     await new Promise(resolve => setTimeout(resolve, 100));
                // }

                if (!isRunning) break;
            } catch (error) {
                Logger.error(`处理按钮 ${buttonId} 时出错:`, error);

                // 更新任务状态
                if (task) {
                    task.status = 'failed';
                    AutoBindInvoice_updateUiDisplay();
                }

                // // 等待期间检查是否停止
                // for (let i = 0; i < 20 && isRunning; i++) {
                //     await new Promise(resolve => setTimeout(resolve, 100));
                // }

                if (!isRunning) break;
            }
        }

        isRunning = false;
        AutoBindInvoice_toggleButtonState(isRunning);
        // updateStatus('已停止');

        // if (!isRunning) {
        //     updateStatus('已完成');
        // }

        Logger.log("处理流程结束");
    }

    // 串行处理函数 一键取消绑定 功能
    async function processAutoUnoundButtonsSerially() {
        isRunning = true;
        AutoBindInvoice_toggleButtonState(isRunning);
        taskList = scanTableAndCreateUnboundTasks(); //此处返回的是list，内部obj定义见scanTableAndCreateUnboundTasks函数
        AutoBindInvoice_updateUiDisplay();
        Logger.log("开始串行处理流程...");
        //Logger.log(`[一键取消绑定]taskList:`);
        //console.log(taskList);

        while (isRunning) {
            const table = getTable('GV_ZDFPPL');
            if (!table) {
                Logger.error("找不到表格，退出处理");
                break;
            }

            const nowList = scanTableAndCreateUnboundTasks(); //此处返回的是list，内部obj定义见scanTableAndCreateUnboundTasks函数

            const findSharedInvoices = (taskList, nowList) => {
                const list1 = nowList;
                const list2 = taskList;
                // 创建一个 Set 用于存储 list2 中的所有发票号
                const invoiceNosInList2 = new Set();

                list2.forEach(task => { // 遍历 list2 中的每个任务
                    invoiceNosInList2.add(task.invoiceNo);// 将每个任务的发票号添加到 Set 中
                });

                const resultList = [];// 创建一个空数组用于存储匹配的任务

                // 遍历 list1 中的每个任务
                list1.forEach(task => {
                    // 检查当前任务的发票号是否存在于 list2 的发票号集合中
                    if (invoiceNosInList2.has(task.invoiceNo)) {
                        // 如果存在，直接将 list1 中的任务添加到结果数组中
                        resultList.push(task);
                    }
                });
                return resultList;// 返回包含匹配任务的新列表
            }

            const workList = findSharedInvoices(taskList, nowList); //只操作taskList里有的按钮
            // Logger.log(`[一键取消绑定]workList:`);
            // console.log(workList);

            if (workList.length === 0) {
                Logger.log("所有按钮已处理完毕！");
                // updateStatus('已完成', `总数量: ${workList.length}`);
                isRunning = false;
                break;
            }

            // 更新进度
            // updateStatus('处理中', `剩余: ${workList.length}`);

            // 只处理倒数第一个按钮
            const firstButton = workList[workList.length - 1].buttonElement;
            const buttonId = firstButton.id;

            // 查找对应的任务
            const task = taskList.find(t => t.buttonId === buttonId);
            if (task) {
                task.status = 'processing';
                AutoBindInvoice_updateUiDisplay();
                AutoBindInvoice_updateCurrentTaskInfo(task);
            }

            Logger.log(`准备处理按钮: ${buttonId} (${workList.length} 个剩余)`);

            try {
                // 等待页面稳定
                await waitForPageStable();

                // 检查是否停止
                if (!isRunning) break;

                // 安全点击按钮
                const clickResult = await safeClickUnoundButton(firstButton);

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
                        AutoBindInvoice_updateUiDisplay();
                    }

                    // 如果按钮不可用，继续处理下一个
                    continue;
                }

                // 等待按钮状态变化
                const result = await waitForUnboundButtonStateChange(buttonId);
                Logger.log(`按钮 ${buttonId} 处理结果:`, result);

                // 更新任务状态
                if (task) {
                    if (result.success) {
                        task.status = 'success';
                    } else {
                        task.status = 'failed';
                    }
                    AutoBindInvoice_updateUiDisplay();
                }

                // // 根据结果决定等待时间
                // const waitTime = result.success ? 2000 : 3000;

                // // 等待期间检查是否停止
                // for (let i = 0; i < waitTime / 100 && isRunning; i++) {
                //     await new Promise(resolve => setTimeout(resolve, 100));
                // }

                if (!isRunning) break;
            } catch (error) {
                Logger.error(`处理按钮 ${buttonId} 时出错:`, error);

                // 更新任务状态
                if (task) {
                    task.status = 'failed';
                    AutoBindInvoice_updateUiDisplay();
                }

                // // 等待期间检查是否停止
                // for (let i = 0; i < 20 && isRunning; i++) {
                //     await new Promise(resolve => setTimeout(resolve, 100));
                // }

                if (!isRunning) break;
            }
        }

        isRunning = false;
        AutoBindInvoice_toggleButtonState(isRunning);
        // updateStatus('已停止');

        // if (!isRunning) {
        //     updateStatus('已完成');
        // }

        Logger.log("处理流程结束");
    }


    // 初始化函数（保留第一个脚本的核心逻辑）
    function initialize() {
        try {
            // 添加悬浮控制面板
            // addFloatingControlPanel();
            AutoBindInvoice_createTaskPanel();
            AutoBindInvoice_bindButtonsEvents();

            //在<tr id="tr_bd">后插入空行
            addEmptyRowAfterTrBd();

            // 监听ASP.NET异步回发完成事件
            if (typeof Sys !== 'undefined' && Sys.WebForms && Sys.WebForms.PageRequestManager) {
                const prm = Sys.WebForms.PageRequestManager.getInstance();
                prm.add_endRequest(function (sender, args) {
                    // 重新绑定事件
                    //bindControlEvents();
                    //Logger.log("ASP.NET异步回发完成，重新绑定事件");
                    //在<tr id="tr_bd">后插入空行
                    addEmptyRowAfterTrBd();
                    Logger.log("ASP.NET异步回发完成，重新插入空行");
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
