// ==UserScript==
// @name         SCUT财务系统UI优化-网上报账-批量删除发票
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在我的发票页面，增加批量删除发票功能
// @author       XANA
// @match        http://wsyy.cw.scut.edu.cn/*
// @match        https://wsyy.cw.scut.edu.cn/*
// @match        http://wsyy-cw.webvpn.scut.edu.cn/*
// @match        https://wsyy-cw.webvpn.scut.edu.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

/**
 * 发票任务对象
 * @typedef {Object} InvoiceTask
 * @property {boolean} isChecked - 是否勾选
 * @property {string} invoiceNo - 发票号
 * @property {string} invoiceDate - 开票日期（YYYY-MM-DD 格式）
 * @property {string} issuerName - 开票方名称
 * @property {string} payerName - 付款方名称
 * @property {string} invoiceContent - 发票内容
 * @property {number} totalAmount - 合计金额
 * @property {string} invoiceType - 发票类型
 * @property {string} entryDate - 录入日期（YYYY-MM-DD 格式）
 * @property {string} deleteButtonId - 删除按钮ID
 * @property {HTMLElement|null} deleteButtonElement - 删除按钮的 DOM 元素
 * @property {'pending' | 'processing' | 'success' | 'failed' | 'skipped'} status - 当前任务状态
 */

(function () {
    'use strict';

    /** ==== 配置区 ==== **/
    const CONFIG = {
        CHECK_INTERVAL: 200,      // 检查间隔
        MAX_WAIT_TIME: 5000,     // 最大等待时间
    };

    /** @type {InvoiceTask[]} */
    let taskList = [];

    /** ==== 变量 ==== **/
    /**
     * 是否正在批量运行删除任务
     * @type {boolean}
     */
    let isRunning = false;
    /**
     * 控制面板 DOM 元素
     * @type {HTMLElement|null}
     */
    let controlPanel = null;


    /** ==== 日志工具 ==== **/
    const Logger = {
        log: (...args) => console.log('[AutoDelete]', ...args),
        warn: (...args) => console.warn('[AutoDelete]', ...args),
        error: (...args) => console.error('[AutoDelete]', ...args)
    };

    // 添加悬浮按钮的样式
    GM_addStyle(`
        #myFloatingBtn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #ff5722;
            color: white;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 999999;
        }
        #myFloatingBtn:hover {
            background-color: #e64a19;
        }
    `);
    // 创建悬浮按钮
    function createFloatingButton() {
        const btn = document.createElement('button');
        btn.id = 'myFloatingBtn';
        btn.textContent = 'Test';
        btn.title = '点击测试函数';

        btn.addEventListener('click', () => {
            const currentUrl = window.location.href;
            Logger.log("currentUrl", currentUrl);
            // 这里也可以调用你已有的函数，如 setupAutoAlert();
            // setupAutoAlert();


            // const list = createTaskList();
            // Logger.log("work list", list);

            // debugger;

            processDeleteTasks();

            // //获取发票列表
            // const list = extractTableInformation();
            // Logger.log("list", list);
            // if (list && list.length > 0) {
            //     const result = safeClickDeleteButton(list[0]);
            //     Logger.log("return", result.success, result.reason, result.error);
            //     // alert("line181");
            //     // confirm("line191");
            // }

        });

        document.body.appendChild(btn);
    }

    // 更新UI-任务列表
    function updateUiDisplay() {
        //todo
        //更新任务列表Ui
    }


    /**
     * 更新 UI 中当前任务信息
     * @function
     * @param {InvoiceTask} task - 当前任务对象
     */
    function updateCurrentTaskInfo(task) {
        // const taskInfoElement = document.getElementById('current-task-info');//current-task-info ID待修改
        // if (taskInfoElement) {
        //     taskInfoElement.textContent = `当前删除任务: ${task.invoiceNo} (${task.invoiceDate})`;
        // }
        //todo
        //UI中应该有个地方显示当前任务信息
    }


    /**
     * 切换按钮状态
     * @function
     * @param {boolean} [Running=isRunning] - 是否处于运行状态
     */
    function toggleButtonState(Running = isRunning) {
        //todo
        //显示/隐藏各个功能按钮
    }


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

    /**
     * 获取表格元素
     * @function
     * @param {string} [ElementId='ctl00_ContentPlaceHolder1_TR_WDPJ0'] - 表格的 DOM 元素 ID
     * @returns {HTMLTableElement|null} 目标表格 DOM 元素
     */
    function getTable(ElementId = 'ctl00_ContentPlaceHolder1_TR_WDPJ0') {
        const table = document.getElementById(ElementId);
        if (!table) {
            Logger.error("未找到 ID 为 " + ElementId + " 的表格。");
        }
        return table;
    }


    /**
     * 从发票表格中提取任务列表
     * @function
     * @returns {InvoiceTask[]} 发票任务列表
     * @changelog
     * 将ctl00_ContentPlaceHolder1_TR_WDPJ0表格转化为list obj
     */
    function extractTableInformation() {
        // 获取表格
        const table = document.getElementById('ctl00_ContentPlaceHolder1_TR_WDPJ0');
        if (!table) {
            Logger.error('未找到 ID 为 "ctl00_ContentPlaceHolder1_TR_WDPJ0" 的表格。');
            return;
        }

        // 存储任务列表
        const tasks = [];
        const rows = table.querySelectorAll('tr.row'); // 排除表头，仅选择有数据的行

        rows.forEach(row => {
            const cells = row.querySelectorAll('td'); // 获取当前行的所有单元格
            if (cells.length === 0) {
                Logger.warn('表格没有数据或内容为空。');
                return; // 跳过空行
            }
            if (cells.length < 8) {
                Logger.warn(`表格宽度异常。宽度=${cells.length}`);
                return;
            }

            // 提取勾选状态
            const checkbox = cells[0]?.querySelector('input[type="checkbox"]'); // 第一列包含复选框
            const isChecked = checkbox?.checked || false; // 提取复选框的勾选状态

            // 提取关键信息
            const invoiceNo = cells[1]?.textContent.trim() || ''; // 发票号
            const invoiceDate = cells[2]?.textContent.trim() || ''; // 开票日期
            const issuerName = cells[3]?.textContent.trim() || ''; // 开票方名称
            const payerName = cells[4]?.textContent.trim() || ''; // 付款方名称
            const invoiceContent = row.querySelector('span[id$="LBL_FPNR"]')?.textContent.trim() || ''; // 发票内容
            const totalAmount = cells[6]?.textContent.trim() || ''; // 合计金额
            const invoiceType = row.querySelector('span[id$="LBL_FPLX"]')?.textContent.trim() || ''; // 发票类型
            const entryDate = cells[8]?.textContent.trim() || ''; // 录入日期

            // 提取【删除】按钮信息
            const deleteButton = row.querySelector('input[type="image"][src*="del.png"]'); // 删除按钮

            if (invoiceNo && deleteButton) {
                const existingTask = taskList.find(t => t.invoiceNo === row.invoiceNo); //判断taskList中有无当前行的发票，以发票号为关键词
                const task = {
                    isChecked,           // 是否勾选
                    invoiceNo,           // 发票号
                    invoiceDate,         // 开票日期
                    issuerName,          // 开票方名称
                    payerName,           // 付款方名称
                    invoiceContent,      // 发票内容
                    totalAmount,         // 合计金额
                    invoiceType,         // 发票类型
                    entryDate,           // 录入日期
                    deleteButtonId: deleteButton?.id || '',              // 删除按钮ID
                    deleteButtonElement: deleteButton || null,           // 删除按钮Element
                    status: existingTask ? existingTask.status : 'pending' //如果taskList已有本行发票，status用taskList已有值，否则用'pending'
                };
                tasks.push(task); // 将当前行的信息加入任务列表
            }
        });
        //Logger.log('提取到的发票列表：', tasks);// 输出结果到控制台
        return tasks;

    }

    /**
     * 创建勾选的任务列表
     * @function
     * @returns {InvoiceTask[]} 已勾选的任务列表
     */
    function createTaskList() {
        const tasks = [];
        extractTableInformation().forEach(row => {
            if (row.isChecked) {
                tasks.push(row);
            }
        })
        // Logger.log("勾选的发票createTaskList", tasks);
        return tasks;
    }

    /**
     * 安全点击删除按钮
     * @async
     * @function
     * @param {InvoiceTask} listrow - 发票任务对象
     * @returns {Promise<{success:boolean, reason?:string, error?:Error}>} 点击结果
     */
    async function safeClickDeleteButton(listrow) {
        try {
            // 根据 buttonId 获取按钮 Element
            const deleteButton = document.getElementById(listrow.deleteButtonId);

            // 检查按钮是否存在
            if (!deleteButton) {
                Logger.warn(`按钮 ${listrow.deleteButtonId} 不存在，无法进行删除操作`);
                return { success: false, reason: 'button_not_found' };
            }

            // 检查按钮是否可用
            if (deleteButton.disabled || deleteButton.offsetParent === null) {
                Logger.log(`按钮 ${listrow.deleteButtonId} 不可用，可能已经被隐藏或禁用`);
                return { success: false, reason: 'button_unavailable' };
            }

            // 发起点击操作
            if (typeof __doPostBack !== 'undefined' && deleteButton.name) {
                // 如果 ASP.NET 环境支持 __doPostBack，则优先使用该方式触发事件
                Logger.log(`触发 postback 删除按钮: ${deleteButton.name}`);
                __doPostBack(deleteButton.name, '');
            } else {
                // 如果无法使用 __doPostBack，直接模拟用户点击
                Logger.log(`直接点击删除按钮: ${listrow.deleteButtonId}`);
                deleteButton.click();
            }

            // 返回成功操作
            return { success: true };
        } catch (error) {
            // 捕获可能产生的任何错误
            Logger.error(`点击删除按钮 ${listrow.deleteButtonId} 时出错:`, error);
            return { success: false, reason: 'click_failed', error };
        }
    }

    /**
     * 等待删除按钮状态变化（或发票行消失）
     * @function
     * @param {InvoiceTask} tablerow - 发票任务对象
     * @param {number} [timeout=CONFIG.MAX_WAIT_TIME] - 最大等待时间
     * @returns {Promise<{success:boolean, reason:string}>} 变化检测结果
     * @changelog
     * 增加基于发票号是否存在 判断是否成功
     */
    function waitForDeleteButtonStateChange(tablerow, timeout = CONFIG.MAX_WAIT_TIME) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const buttonId = tablerow.deleteButtonId;
            const invoiceNo = tablerow.invoiceNo;

            function checkState() {
                const button = document.getElementById(buttonId);
                const nowlist = extractTableInformation();
                const notHasInvo = nowlist.some(obj => obj.invoiceNo === invoiceNo) ? 0 : 1;//判断taskList中有无当前行的发票，以发票号为关键词。没有输出1，有输出0

                if (notHasInvo) {
                    //新获取的表格中，没有对应的发票号
                    Logger.log(`发票号 ${invoiceNo} 已消失（成功）`);
                    resolve({ success: true, reason: 'invoiceNo_disappeared' });
                    return;
                }
                if (!button) {
                    // 按钮消失了（成功绑定）
                    Logger.log(`按钮 ${buttonId} 已消失（成功）`);
                    resolve({ success: true, reason: 'button_disappeared' });
                    return;
                }

                if (button.disabled) {
                    // 按钮状态改变了（变灰）
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

    /**
     * 查找两个任务列表中共同存在的发票
     * @function
     * @param {InvoiceTask[]} list1 - 第一个任务列表
     * @param {InvoiceTask[]} list2 - 第二个任务列表
     * @returns {InvoiceTask[]} 在两个列表中都存在的任务（返回list的每行对象引用自list1）
     */
    const findSharedInvoices = (list1, list2) => {
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

    /**
     * 覆写窗口对象的 alert 和 confirm
     * @function
     * @param {Window} win - 目标窗口对象
     * @param {string} frameName - 窗口名称（用于日志）
     */
    function hookWindow(win, frameName) {
        try {
            if (win._alertHooked) return;

            const originalAlert = window.alert;
            win.alert = function (message) {
                Logger.log("Alert frame URL:", win.location.href, ", name:", frameName, ", message:", message);
                // debugger;

                //只替换指定消息的弹窗
                if (message === "删除成功！" ||
                    win.location.href.includes("wsyy-cw.webvpn.scut.edu.cn/hnlgwsyy60/Modules/WDPJ/WDPJ0.aspx")) {
                    Logger.log("我的票夹页面[删除发票]动作收到回调-删除成功");
                } else {
                    //其余消息放行
                    originalAlert(message);
                }
            };

            const originalConfirm = window.confirm;
            win.confirm = function (message) {
                Logger.log("Confirm frame URL:", win.location.href, ", name:", frameName, ", message:", message);
                // debugger;

                //只替换指定消息的弹窗
                if (message === "注1意：删除后如果再需要用这张票的话，需要重新上传查验，您确定要删除吗？" ||
                    win.location.href.includes("wsyy-cw.webvpn.scut.edu.cn/hnlgwsyy60/Modules/WDPJ/WDPJ0.aspx")) {
                    Logger.log("我的票夹页面 自动确认删除发票对话框");
                    return true;
                } else {
                    //其余消息放行
                    originalConfirm(message);
                }
                return true;
            };

            // const originalPrompt = window.prompt;
            // win.prompt = function (message, defaultValue) {
            //     Logger.log("Prompt frame URL:",win.location.href);
            //     Logger.log("Prompt in frame:", frameName, ", message:", message);
            //     // debugger;
            //     return defaultValue;
            // };

            win._alertHooked = true;
        } catch (e) {
            Logger.warn("Cannot hook frame:", frameName, e);
        }
    }
    /**
     * 覆写所有 frame 的 alert 和 confirm
     * @function
     */
    function hookAllFrames() {
        hookWindow(window, 'top');
        for (let i = 0; i < window.frames.length; i++) {
            hookWindow(window.frames[i], `frame-${i}`);
        }
    }

    /**
     * 串行删除勾选的发票 主要工作逻辑函数
     * @async
     * @function
     * @returns {Promise<void>}
     */
    async function processDeleteTasks() {
        isRunning = true;
        toggleButtonState(isRunning);//更新按钮状态
        taskList = createTaskList(); //获取最新状态，并写入全局taskList列表中
        updateUiDisplay();//更新UI-任务列表
        Logger.log("勾选的发票", taskList);
        Logger.log("串行处理删除选中发票流程 开始...");

        while (isRunning) {
            const table = getTable('ctl00_ContentPlaceHolder1_TR_WDPJ0');
            if (!table) {
                Logger.error("找不到ctl00_ContentPlaceHolder1_TR_WDPJ0表格，退出处理");
                break;
            }

            const nowList = extractTableInformation();//获取最新表格状态

            const workList = findSharedInvoices(nowList, taskList);//基于nowList内容，找到nowList与taskList都有的发票号

            if (workList.length === 0) {
                Logger.log("所有按钮已处理完毕！");
                // updateStatus('已完成', `总数量: ${workList.length}`);
                isRunning = false;
                break;
            }

            // 更新进度
            // updateStatus('处理中', `剩余: ${workList.length}`); //TODO

            // 只处理第一个按钮
            const firstDelInvoice = workList[0]; //当前要删除的发票行信息
            const invoiceNo = firstDelInvoice.invoiceNo;

            // 查找对应的任务
            const task = taskList.find(t => t.invoiceNo === invoiceNo);//task为当前任务
            if (task) {
                task.status = 'processing';
                updateUiDisplay();
                updateCurrentTaskInfo(task);
            }

            // 检查是否停止
            if (!isRunning) break;

            Logger.log(`准备处理发票，编号: ${invoiceNo} (${workList.length} 个剩余)`);

            try {
                // 等待页面稳定
                await waitForPageStable();

                // 检查是否停止
                if (!isRunning) break;

                // 安全点击按钮
                const clickResult = await safeClickDeleteButton(firstDelInvoice);
                if (!clickResult.success) { //删除按钮点击不成功处理
                    Logger.warn(`发票编号: ${invoiceNo} 删除按钮点击失败: ${clickResult.reason}`);

                    // 更新任务状态
                    if (task) {
                        switch (clickResult.reason) {
                            case 'button_not_found': //不存在
                                task.status = 'skipped';
                                break;

                            case 'button_unavailable': //不可用
                                task.status = 'failed';
                                break;

                            default:
                                break;
                        }
                        updateUiDisplay();
                    }

                    // 如果按钮不存在、不可用，继续处理下一个
                    continue;//跳过后续，重新执行 while (isRunning) {
                }

                // 等待按钮状态变化
                const buttonResult = await waitForDeleteButtonStateChange(firstDelInvoice);
                Logger.log(`发票编号:${invoiceNo}删除按钮 处理结果:`, buttonResult);
                // 更新任务状态
                if (task) {
                    if (buttonResult.success) {
                        task.status = 'success';
                    } else {
                        task.status = 'failed';
                    }
                    updateUiDisplay();
                }

                // 检查是否停止
                if (!isRunning) break;

            } catch (error) {
                Logger.error(`处理发票，编号 ${invoiceNo} 时出错:`, error);

                // 更新任务状态
                if (task) {
                    task.status = 'failed';
                    updateUiDisplay();
                }

                // // 等待期间检查是否停止
                // for (let i = 0; i < 20 && isRunning; i++) {
                //     await new Promise(resolve => setTimeout(resolve, 100));
                // }

                if (!isRunning) break;
            }
        }
        isRunning = false;
        toggleButtonState(isRunning);//更新按钮状态
        Logger.log("串行处理删除选中发票流程 结束...");
    }


    /**
     * 初始化脚本
     * @function
     * @returns {void}
     */
    function initialize() {
        try {
            const currentUrl = window.location.href;
            Logger.log("currentUrl", currentUrl)

            //添加临时测试的按钮
            createFloatingButton();

            //修改原有页面样式的函数
            //todo

            //用来覆写原始弹窗函数
            hookAllFrames();
            // 持续检测新 iframe
            setInterval(() => {
                hookAllFrames();
            }, 1000);


            // 监听ASP.NET异步回发完成事件
            if (typeof Sys !== 'undefined' && Sys.WebForms && Sys.WebForms.PageRequestManager) {
                const prm = Sys.WebForms.PageRequestManager.getInstance();
                prm.add_endRequest(function (sender, args) {

                    //ASP.NET异步后要重新再插入一次
                    //修改原有页面样式的函数
                    //todo

                    Logger.log("ASP.NET异步回发完成");
                });
            }

            Logger.log("批量删除发票 已初始化完成");
        } catch (error) {
            Logger.error("初始化失败:", error);
        }
    }

    // 运行逻辑
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();