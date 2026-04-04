// ==UserScript==
// @name         SCUT财务系统UI优化-网上报账-批量删除发票
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  在我的发票页面，增加批量删除发票功能
// @author       XANA
// @match        http://wsyy.cw.scut.edu.cn/*
// @match        https://wsyy.cw.scut.edu.cn/*
// @match        http://wsyy-cw.webvpn.scut.edu.cn/*
// @match        https://wsyy-cw.webvpn.scut.edu.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

  
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



    // 串行处理函数 一键绑定 功能
    async function processAutoBoundButtonsSerially() {
        isRunning = true;
        toggleButtonState(true);
        taskList = scanTableAndCreateBoundTasks(); //此处返回的是list，内部obj定义见scanTableAndCreateBoundTasks函数
        updateTaskListDisplay();
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
                updateStatus('已完成', `总数量: ${workList.length}`);
                break;
            }

            // 更新进度
            updateStatus('处理中', `剩余: ${workList.length}`);

            // 只处理第一个按钮
            const firstButton = workList[0].buttonElement;
            const buttonId = firstButton.id;

            // 查找对应的任务
            const task = taskList.find(t => t.buttonId === buttonId);
            if (task) {
                task.status = 'processing';
                updateTaskListDisplay();
                updateCurrentTaskInfo(task);
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





    // 初始化函数（保留第一个脚本的核心逻辑）
    function initialize() {
        try {
            // 添加悬浮控制面板
            addFloatingControlPanel();

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
