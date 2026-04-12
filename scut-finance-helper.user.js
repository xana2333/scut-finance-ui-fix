// ==UserScript==
// @name         SCUT Finance Helper
// @name:zh      SCUT财务系统小助手
// @namespace    https://github.com/xana2333/scut-finance-ui-fix
// @version      1.0.13
// @description  SCUT网上报账系统 & 财务查询系统辅助小工具：UI修正功能、自动化批量操作，让报账更高效流畅。
// @author       XANA
// @homepage     https://github.com/xana2333/scut-finance-ui-fix
// @supportURL   https://github.com/xana2333/scut-finance-ui-fix
// @updateURL    https://raw.githubusercontent.com/xana2333/scut-finance-ui-fix/main/scut-finance-helper.js
// @downloadURL  https://raw.githubusercontent.com/xana2333/scut-finance-ui-fix/main/scut-finance-helper.js
// @match        http://wsyy.cw.scut.edu.cn/*
// @match        https://wsyy.cw.scut.edu.cn/*
// @match        http://wsyy-cw.webvpn.scut.edu.cn/*
// @match        https://wsyy-cw.webvpn.scut.edu.cn/*
// @match        http://202.38.194.48:8182/*
// @match        https://202.38.194.48:8182/*
// @match        http://202-38-194-48-8182.webvpn.scut.edu.cn/*
// @match        https://202-38-194-48-8182.webvpn.scut.edu.cn/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    /** ==== 持久化配置文件相关 ==== **/
    const CONFIG_KEY = 'tampermonkeyuserConfig';
    const defaultConfig = {
        enable_OnlineReimbursement_OverridePopup: false,                              // 网上报账系统-覆写弹窗功能(跳过弹窗)

        enableAuto_OnlineReimbursement_BatchDeleteInvoice: false,                     // 网上报账系统-批量删除发票功能
        enableAuto_OnlineReimbursement_BatchInvoiceBindingToggle: false,              // 网上报账系统-批量绑定/取消绑定发票功能
        enableAuto_OnlineReimbursement_SelectAddedFundsInDailyReimbursement: false,   // 网上报账系统-自动选中日常报销中已添加经费

        enablefixUI_OnlineReimbursement_TaxInvoiceEntryPageHeight: false,            // 修正网上报账系统UI-税票录入页面高度问题
        enablefixUI_OnlineReimbursement_ProjectSelectPageTableHeight: false,         // 修正网上报账系统UI-项目选择（经费选择）页面表格高度问题
        enablefixUI_OnlineReimbursement_ExpenseDetailPageTableHeight: false,         // 修正网上报账系统UI-费用明细页面表格高度问题

        enablefixUI_FinanceQuery_UiMisalignment: false,           // 修正财务查询系统UI-首页表格错位问题
        enablefixUI_FinanceQuery_TableCannotExpandFully: false    // 修正财务查询系统UI-表格无法完全展开问题
    };

    // 功能描述，用于菜单显示
    const FEATURE_LABELS = {

        enableAuto_OnlineReimbursement_BatchDeleteInvoice: '网上报账-批量删除发票功能',
        enableAuto_OnlineReimbursement_BatchInvoiceBindingToggle: '网上报账-批量绑定/取绑发票功能',
        enableAuto_OnlineReimbursement_SelectAddedFundsInDailyReimbursement: '网上报账-自动选中日常报销已添加经费',

        enable_OnlineReimbursement_OverridePopup: '网上报账-覆写弹窗功能(跳过弹窗)',

        enablefixUI_OnlineReimbursement_ProjectSelectPageTableHeight: '网上报账修正UI-经费选择表格高度',
        enablefixUI_OnlineReimbursement_ExpenseDetailPageTableHeight: '网上报账修正UI-费用明细表格高度',
        enablefixUI_OnlineReimbursement_TaxInvoiceEntryPageHeight: '网上报账修正UI-绑定发票表格高度',

        enablefixUI_FinanceQuery_UiMisalignment: '财务查询修正UI-首页表格错位',
        enablefixUI_FinanceQuery_TableCannotExpandFully: '财务查询修正UI-表格无法完全展开'
    };

    // 控制菜单排序的数组
    const MENU_ORDER = [

        'enableAuto_OnlineReimbursement_BatchDeleteInvoice',
        'enableAuto_OnlineReimbursement_BatchInvoiceBindingToggle',
        'enableAuto_OnlineReimbursement_SelectAddedFundsInDailyReimbursement',

        // 'enable_OnlineReimbursement_OverridePopup',

        'enablefixUI_OnlineReimbursement_ProjectSelectPageTableHeight',
        'enablefixUI_OnlineReimbursement_ExpenseDetailPageTableHeight',
        'enablefixUI_OnlineReimbursement_TaxInvoiceEntryPageHeight',

        'enablefixUI_FinanceQuery_UiMisalignment',
        'enablefixUI_FinanceQuery_TableCannotExpandFully'
    ];

    // 加载配置，并与默认值合并，防止缺失
    let tampermonkeyuserConfig = GM_getValue(CONFIG_KEY, defaultConfig);// 从存储加载配置或使用默认值
    function saveConfig() { GM_setValue(CONFIG_KEY, tampermonkeyuserConfig); } // 保存配置到存储
    let menuIds = {};// 保存菜单 ID

    // 切换功能
    function toggleFeature(key) {
        tampermonkeyuserConfig[key] = !tampermonkeyuserConfig[key];
        saveConfig();// 保存最新配置
        console.log(`[Tampermonkey] 切换: ${FEATURE_LABELS[key]} => ${tampermonkeyuserConfig[key] ? '启用' : '禁用'}`);
        console.log('当前配置:', JSON.stringify(tampermonkeyuserConfig, null, 4));// 输出当前完整配置对象到控制台
        updateMenus();// 更新菜单标题
    }

    // 更新菜单项（先注销旧菜单再注册新菜单）
    function updateMenus() {
        // 注销旧菜单
        Object.values(menuIds).forEach(id => GM_unregisterMenuCommand(id));
        menuIds = {};

        // 按 MENU_ORDER 顺序注册
        MENU_ORDER.forEach(key => {
            const enabled = tampermonkeyuserConfig[key];
            const label = `${enabled ? '✅' : '⛔'} ${FEATURE_LABELS[key]} (当前${enabled ? '已启用' : '已禁用'})`;
            menuIds[key] = GM_registerMenuCommand(label, () => toggleFeature(key));
        });

        // 额外按钮 - Bug 反馈
        menuIds.bugReport = GM_registerMenuCommand(
            '🐛 BUG反馈 / 提建议',
            () => { window.open('https://github.com/xana2333/scut-finance-ui-fix/issues', '_blank'); }
        );
    }

    updateMenus();// 初次注册菜单

    //========================================================================================================



    /** ==== 公共配置区 ==== **/
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

    //========================================================================================================



    /** ==== 公共函数  ==== **/
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
                    AutoDeleteInvoice_Logger.warn('等待页面稳定超时');
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
            // AutoDeleteInvoice_Logger.error("未找到 ID 为 " + ElementId + " 的表格。");
        }
        return table;
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

    // 获得iframe对象宽高的函数
    function getIframeSize(iframe) {
        if (!iframe || iframe.tagName !== 'IFRAME') {
            throw new Error('传入的元素不是 iframe');
        }

        try {
            // 尝试获取内部文档的高度和宽度
            // 注意：如果是跨域 iframe，此处会报错进入 catch
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc && doc.body) {
                const height = doc.body.scrollHeight;
                const width = doc.body.scrollWidth;

                return {
                    width: width,
                    height: height,
                    isCrossOrigin: false,
                    success: height > 0
                };
            } else {
                // 文档未完全加载或 body 不存在
                return {
                    width: iframe.offsetWidth,
                    height: iframe.offsetHeight,
                    isCrossOrigin: false,
                    success: false,
                    reason: 'iframe 内容未完全加载'
                };
            }
        } catch (e) {
            // 跨域情况，只能获取 iframe 标签本身的尺寸
            return {
                width: iframe.offsetWidth,
                height: iframe.offsetHeight,
                isCrossOrigin: true,
                success: true,
                reason: '跨域限制，仅能获取标签占位尺寸'
            };
        }
    }

    //========================================================================================================



    /** ==== 网上报账系统-批量删除发票功能 ==== **/
    /** ==== 日志工具 ==== **/
    const AutoDeleteInvoice_Logger = {
        log: (...args) => console.log('[AutoDelete]', ...args),
        warn: (...args) => console.warn('[AutoDelete]', ...args),
        error: (...args) => console.error('[AutoDelete]', ...args)
    };

    /** ==== 构建 UI部分 ==== **/
    /**
     * 插入批量删除功能按钮（删除选中发票 / 停止任务 / 展开关闭任务列表）
     * @returns {void}
     */
    function AutoDeleteInvoice_addButtons(running = isRunning) {
        // 样式：固定宽度+保留占位
        GM_addStyle(`
            /* 公共按钮样式 */
            .AutoDeleteInvoice_Btn {
                padding: 8px 16px;
                font-size: 14px;
                font-family: 'Microsoft YaHei', Arial, sans-serif;
                font-weight: bold;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                color: white;
                margin-left: 5px;
            }
            .AutoDeleteInvoice_Btn:hover {
                opacity: 0.9;
                transform: translateY(-2px);
            }
            .AutoDeleteInvoice_Btn:active {
                transform: translateY(1px);
            }

            /* 删除选中按钮 */
            .AutoDeleteInvoice_Btn-delete-selected {
                background-color: #f44336; /* 红色 */
                width: 140px;
            }

            /* 停止任务按钮 */
            .AutoDeleteInvoice_Btn-stop-task {
                background-color: #FF9800; /* 橙色 */
                width: 110px;
            }

            /* 展开任务列表按钮 */
            .AutoDeleteInvoice_Btn-expand-tasklist {
                background-color: #2196F3; /* 蓝色 */
                width: 170px;
            }
        `);

        // 找到“用餐明细”按钮
        const mealBtn = document.getElementById('ctl00_ContentPlaceHolder1_BT_CFMX');
        if (!mealBtn) {
            AutoDeleteInvoice_Logger.warn("[用餐明细]按钮未找到，无法插入[批量删除发票]相关功能按钮");
            return;
        }

        const delBtnVisibility = running ? "hidden" : "visible";
        const stopBtnVisibility = running ? "visible" : "hidden";

        // 一次性 HTML 拼接三个按钮
        const btnHTML = `
            <span style="display:inline-block;">
                <input type="button" id="AutoDeleteInvoice_btnDeleteSelected"
                    value="删除选中发票"
                    class="AutoDeleteInvoice_Btn AutoDeleteInvoice_Btn-delete-selected"
                    style="visibility:${delBtnVisibility};"
                    >
                <input type="button" id="AutoDeleteInvoice_btnStopTask"
                    value="停止任务"
                    class="AutoDeleteInvoice_Btn AutoDeleteInvoice_Btn-stop-task"
                    style="visibility:${stopBtnVisibility};"
                    >
                <input type="button" id="AutoDeleteInvoice_btnExpandTaskList"
                    value="展开关闭任务列表"
                    class="AutoDeleteInvoice_Btn AutoDeleteInvoice_Btn-expand-tasklist"
                    style="visibility:visible;"
                    >
            </span>
        `;

        // 插入到“用餐明细”按钮之后
        mealBtn.insertAdjacentHTML('afterend', btnHTML);
        AutoDeleteInvoice_Logger.log("[批量删除发票]相关功能按钮已添加");
    }
    /**
     * 为批量删除功能的三个按钮绑定事件
     */
    function AutoDeleteInvoice_bindButtonsEvents() {
        // 删除选中按钮
        const deleteBtn = document.getElementById('AutoDeleteInvoice_btnDeleteSelected');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                AutoDeleteInvoice_Logger.log('删除选中按钮点击（开始异步任务）');
                try {
                    AutoDeleteInvoice_Logger.log("开始批量删除选中发票流程...");
                    taskList = [];//清空全局任务列表
                    await AutoDeleteInvoice_processDeleteTasks(); // 调用原脚本异步批量删除逻辑
                    AutoDeleteInvoice_Logger.log('批量删除任务已完成');
                } catch (err) {
                    AutoDeleteInvoice_Logger.error('批量删除过程中出错:', err);
                }
            });
        }

        // 停止任务按钮
        const stopBtn = document.getElementById('AutoDeleteInvoice_btnStopTask');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                AutoDeleteInvoice_Logger.log("停止任务按钮点击 用户手动停止批量删除选中发票流程");
                isRunning = false;
            });
        }

        // 展开任务列表按钮
        const expandBtn = document.getElementById('AutoDeleteInvoice_btnExpandTaskList');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                AutoDeleteInvoice_Logger.log("展开任务列表按钮点击 展开/折叠详情");
                // TODO: 换成实际展开任务列表逻辑
                AutoDeleteInvoice_toggleTaskPanel(); // 切换显示/隐藏面板
            });
        }
    }
    /**
     * 创建任务列表面板（固定位置）
     */
    function AutoDeleteInvoice_createTaskPanel() {
        if (document.getElementById('AutoDeleteInvoice_taskPanel')) return;//如果已经存在面板，不创建
        if (!document.getElementById('ctl00_ContentPlaceHolder1_TR_WDPJ0')) return;//如果不存在目标表格，不创建

        GM_addStyle(`
            .AutoDeleteInvoice_panel {
                position: fixed;
                top: 50px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99999;
                background-color: rgba(255, 255, 255, 0.95);
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 700px;
                font-family: 'Microsoft YaHei', sans-serif;
            }
            .AutoDeleteInvoice_headerRow {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 8px;
            }
            .AutoDeleteInvoice_statusBar {
                display: flex;
                gap: 8px;
            }
            .AutoDeleteInvoice_statusItem {
                text-align: center;
                font-size: 11px;
            }
            .AutoDeleteInvoice_statusValue {
                font-size: 13px;
                font-weight: bold;
            }
            .AutoDeleteInvoice_statusValue.green { color: green; }
            .AutoDeleteInvoice_statusValue.orange { color: orange; }

            /* 关闭按钮 */
            #AutoDeleteInvoice_closeBtn {
                background-color: #f44336;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                cursor: pointer;
                font-size: 12px;
                float: right;
            }
            #AutoDeleteInvoice_closeBtn:hover {
                opacity: 0.9;
            }

            /* 任务列表 表格样式 */
            .AutoDeleteInvoice_taskTable {
                min-width: 430px;
                border-collapse: collapse;
                table-layout: fixed; /* 固定列宽 */
            }
            .AutoDeleteInvoice_taskTable th, 
            .AutoDeleteInvoice_taskTable td {
                border: 1px solid #ddd;
                padding: 2px 10px;
                font-size: 14px;
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .AutoDeleteInvoice_taskTable th.AutoDeleteInvoice_invoiceNo,
            .AutoDeleteInvoice_taskTable td.AutoDeleteInvoice_invoiceNo {
                width: 130px;
            }
            .AutoDeleteInvoice_taskTable th.AutoDeleteInvoice_invoiceDate,
            .AutoDeleteInvoice_taskTable td.AutoDeleteInvoice_invoiceDate {
                width: 50px;
            }
            .AutoDeleteInvoice_taskTable th.AutoDeleteInvoice_totalAmount,
            .AutoDeleteInvoice_taskTable td.AutoDeleteInvoice_totalAmount {
                width: 50px;
            }
            .AutoDeleteInvoice_taskTable th.AutoDeleteInvoice_statusCol,
            .AutoDeleteInvoice_taskTable td.AutoDeleteInvoice_statusCol {
                width: 45px;
            }
            
            /* 状态颜色类 */
            .AutoDeleteInvoice_statusPending {
                background-color: #e0e0e0;
                color: #333;
            }
            .AutoDeleteInvoice_statusProcessing {
                background-color: #2196F3;
                color: #fff;
            }
            .AutoDeleteInvoice_statusSuccess {
                background-color: #4CAF50;
                color: #fff;
            }
            .AutoDeleteInvoice_statusFailed {
                background-color: #f44336;
                color: #fff;
            }
            .AutoDeleteInvoice_statusSkipped {
                background-color: #FF9800;
                color: #fff;
            }

        `);

        const panelHTML = `
            <div id="AutoDeleteInvoice_taskPanel" class="AutoDeleteInvoice_panel" style="display:none;">
                <div class="AutoDeleteInvoice_headerRow">
                    <!-- 左端标题 -->
                    <div style="font-size:16px;font-weight:bold;">批量删除选中发票</div>

                    <!-- 中间状态栏 -->
                    <div id="AutoDeleteInvoice_statusBar" class="AutoDeleteInvoice_statusBar">
                        <div class="AutoDeleteInvoice_statusItem">
                            总任务数 <span class="AutoDeleteInvoice_statusValue" id="AutoDeleteInvoice_totalTasks">0</span>
                        </div>
                        <div class="AutoDeleteInvoice_statusItem">
                            成功数 <span class="AutoDeleteInvoice_statusValue green" id="AutoDeleteInvoice_successTasks">0</span>
                        </div>
                        <div class="AutoDeleteInvoice_statusItem">
                            待执行数 <span class="AutoDeleteInvoice_statusValue orange" id="AutoDeleteInvoice_pendingTasks">0</span>
                        </div>
                    </div>

                    <!-- 关闭按钮 -->
                    <button id="AutoDeleteInvoice_closeBtn" title="关闭面板">关闭</button>
                </div>
                <!-- 当前任务信息 -->
                <div id="AutoDeleteInvoice_currentTask" style="font-size:14px;color:#333;">当前任务：无</div>

                <!-- 任务表格 -->
                <table id="AutoDeleteInvoice_taskTable" class="AutoDeleteInvoice_taskTable">
                    <thead>
                        <tr>
                            <th class="AutoDeleteInvoice_invoiceNo">发票号</th> 
                            <th class="AutoDeleteInvoice_invoiceDate">开票日期</th>
                            <th class="AutoDeleteInvoice_totalAmount">合计金额</th>
                            <th class="AutoDeleteInvoice_statusCol">状态</th>
                        </tr>
                    </thead>
                    <tbody id="AutoDeleteInvoice_taskTableBody">
                        <!-- 数据由 AutoDeleteInvoice_updateUiDisplay() 填充 -->
                    </tbody>
                </table>
            </div>
        `;

        // 插入到 body
        document.body.insertAdjacentHTML('beforeend', panelHTML);

        // 绑定关闭按钮事件
        document.getElementById('AutoDeleteInvoice_closeBtn')
            .addEventListener('click', () => {
                document.getElementById('AutoDeleteInvoice_taskPanel').style.display = 'none';
            });
    }


    /** ==== 更新 UI内容部分 ==== **/
    /**
     * 全量刷新任务面板显示
     * 使用全局 taskList 数据
     */
    function AutoDeleteInvoice_updateUiDisplay() {
        // 检查面板是否存在
        const panel = document.getElementById('AutoDeleteInvoice_taskPanel');
        if (!panel) {
            AutoDeleteInvoice_Logger.warn('任务面板不存在，无法刷新 UI');
            return;
        }

        // 顶部统计元素
        const totalTasksEl = document.getElementById('AutoDeleteInvoice_totalTasks');
        const successTasksEl = document.getElementById('AutoDeleteInvoice_successTasks');
        const pendingTasksEl = document.getElementById('AutoDeleteInvoice_pendingTasks');
        const tbody = document.getElementById('AutoDeleteInvoice_taskTableBody');

        if (!totalTasksEl || !successTasksEl || !pendingTasksEl || !tbody) {
            AutoDeleteInvoice_Logger.warn('面板 DOM 不完整');
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

        // **全量更新表格**
        tbody.innerHTML = ''; // 清空现有内容
        taskList.forEach(task => {
            // 创建行并设置列内容
            const row = document.createElement('tr');
            row.innerHTML = `
            <td class="AutoDeleteInvoice_invoiceNo">${task.invoiceNo || ''}</td>
            <td class="AutoDeleteInvoice_invoiceDate">${task.invoiceDate || ''}</td>
            <td class="AutoDeleteInvoice_totalAmount">${task.totalAmount != null ? task.totalAmount : ''}</td>
            <td class="AutoDeleteInvoice_statusCol AutoDeleteInvoice_status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}">
                ${getStatusText(task.status)}
            </td>
        `;
            tbody.appendChild(row);
        });
    }

    /**
     * 更新 UI 中当前任务信息
     * @function
     * @param {InvoiceTask} task - 当前任务对象
     */
    function AutoDeleteInvoice_updateCurrentTaskInfo(task) {
        // 找到面板当前任务信息元素
        const currentTaskEl = document.getElementById('AutoDeleteInvoice_currentTask');
        if (!currentTaskEl) {
            AutoDeleteInvoice_Logger.warn('当前任务信息元素不存在');
            return;
        }

        if (!task) {
            currentTaskEl.textContent = '当前任务信息：无';
            return;
        }

        // 构造状态文字与颜色类
        const statusText = getStatusText(task.status);
        const statusClass = `AutoDeleteInvoice_status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`;

        // 更新显示内容（HTML更灵活，可以分列显示）
        currentTaskEl.innerHTML = `
            当前任务：
            ${task.invoiceNo || ''}
            (${task.invoiceDate || ''})
            ${task.totalAmount != null ? task.totalAmount : ''} 元            
        `;
    }

    /**
     * 切换按钮状态
     * @function
     * @param {boolean} [Running=isRunning] - 是否处于运行状态
     */
    function AutoDeleteInvoice_toggleButtonState(running = isRunning) {
        //todo
        //显示/隐藏各个功能按钮
        const deleteBtn = document.getElementById('AutoDeleteInvoice_btnDeleteSelected');
        const stopBtn = document.getElementById('AutoDeleteInvoice_btnStopTask');
        if (!deleteBtn || !stopBtn) return;

        if (running) {
            deleteBtn.style.visibility = 'hidden';
            stopBtn.style.visibility = 'visible';
        } else {
            deleteBtn.style.visibility = 'visible';
            stopBtn.style.visibility = 'hidden';
        }
    }

    /**
     * 显示/隐藏 AutoDeleteInvoice_taskPanel
     * @param {boolean|null} forceShow - 如果 true 则强制显示，如果 false 则强制隐藏，null 则切换
     */
    function AutoDeleteInvoice_toggleTaskPanel(forceShow = null) {
        const panel = document.getElementById('AutoDeleteInvoice_taskPanel');
        if (!panel) {
            AutoDeleteInvoice_Logger.warn('任务面板不存在，无法切换显示状态');
            return;
        }

        const isHidden = panel.style.display === 'none' || getComputedStyle(panel).display === 'none';

        // 逻辑判断
        if (forceShow === true) {
            panel.style.display = 'block';
            AutoDeleteInvoice_updateUiDisplay(); // 刷新面板内容
        } else if (forceShow === false) {
            panel.style.display = 'none';
        } else {
            // Toggle 模式
            if (isHidden) {
                panel.style.display = 'block';
                AutoDeleteInvoice_updateUiDisplay(); // 刷新面板内容
            } else {
                panel.style.display = 'none';
            }
        }
    }


    /** ==== 批量删除选中发票 功能业务函数  ==== **/
    /**
     * 从发票表格中提取任务列表
     * @function
     * @returns {InvoiceTask[]} 发票任务列表
     * @changelog
     * 将ctl00_ContentPlaceHolder1_TR_WDPJ0表格转化为list obj
     */
    function AutoDeleteInvoice_extractTableInformation() {
        // 获取表格
        const table = document.getElementById('ctl00_ContentPlaceHolder1_TR_WDPJ0');
        if (!table) {
            AutoDeleteInvoice_Logger.error('未找到 ID 为 "ctl00_ContentPlaceHolder1_TR_WDPJ0" 的表格。');
            return;
        }

        // 存储任务列表
        const tasks = [];
        const rows = table.querySelectorAll('tr.row'); // 排除表头，仅选择有数据的行

        rows.forEach(row => {
            const cells = row.querySelectorAll('td'); // 获取当前行的所有单元格
            if (cells.length === 0) {
                AutoDeleteInvoice_Logger.warn('表格没有数据或内容为空。');
                return; // 跳过空行
            }
            if (cells.length < 8) {
                AutoDeleteInvoice_Logger.warn(`表格宽度异常。宽度=${cells.length}`);
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
        //AutoDeleteInvoice_Logger.log('提取到的发票列表：', tasks);// 输出结果到控制台
        return tasks;

    }

    /**
     * 创建勾选的任务列表
     * @function
     * @returns {InvoiceTask[]} 已勾选的任务列表
     */
    function AutoDeleteInvoice_createTaskList() {
        const tasks = [];
        AutoDeleteInvoice_extractTableInformation().forEach(row => {
            if (row.isChecked) {
                tasks.push(row);
            }
        })
        // AutoDeleteInvoice_Logger.log("勾选的发票AutoDeleteInvoice_createTaskList", tasks);
        return tasks;
    }

    /**
     * 安全点击删除按钮
     * @async
     * @function
     * @param {InvoiceTask} listrow - 发票任务对象
     * @returns {Promise<{success:boolean, reason?:string, error?:Error}>} 点击结果
     */
    async function AutoDeleteInvoice_safeClickDeleteButton(listrow) {
        try {
            // 根据 buttonId 获取按钮 Element
            const deleteButton = document.getElementById(listrow.deleteButtonId);

            // 检查按钮是否存在
            if (!deleteButton) {
                AutoDeleteInvoice_Logger.warn(`按钮 ${listrow.deleteButtonId} 不存在，无法进行删除操作`);
                return { success: false, reason: 'button_not_found' };
            }

            // 检查按钮是否可用
            if (deleteButton.disabled || deleteButton.offsetParent === null) {
                AutoDeleteInvoice_Logger.log(`按钮 ${listrow.deleteButtonId} 不可用，可能已经被隐藏或禁用`);
                return { success: false, reason: 'button_unavailable' };
            }

            // 发起点击操作
            if (typeof __doPostBack !== 'undefined' && deleteButton.name) {
                // 如果 ASP.NET 环境支持 __doPostBack，则优先使用该方式触发事件
                AutoDeleteInvoice_Logger.log(`触发 postback 删除按钮: ${deleteButton.name}`);
                __doPostBack(deleteButton.name, '');
            } else {
                // 如果无法使用 __doPostBack，直接模拟用户点击
                AutoDeleteInvoice_Logger.log(`直接点击删除按钮: ${listrow.deleteButtonId}`);
                deleteButton.click();
            }

            // 返回成功操作
            return { success: true };
        } catch (error) {
            // 捕获可能产生的任何错误
            AutoDeleteInvoice_Logger.error(`点击删除按钮 ${listrow.deleteButtonId} 时出错:`, error);
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
    function AutoDeleteInvoice_waitForDeleteButtonStateChange(tablerow, timeout = CONFIG.MAX_WAIT_TIME) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const buttonId = tablerow.deleteButtonId;
            const invoiceNo = tablerow.invoiceNo;

            function checkState() {
                const button = document.getElementById(buttonId);
                const nowlist = AutoDeleteInvoice_extractTableInformation();
                const notHasInvo = nowlist.some(obj => obj.invoiceNo === invoiceNo) ? 0 : 1;//判断taskList中有无当前行的发票，以发票号为关键词。没有输出1，有输出0

                if (notHasInvo) {
                    //新获取的表格中，没有对应的发票号
                    AutoDeleteInvoice_Logger.log(`发票号 ${invoiceNo} 已消失（成功）`);
                    resolve({ success: true, reason: 'invoiceNo_disappeared' });
                    return;
                }
                if (!button) {
                    // 按钮消失了（成功绑定）
                    AutoDeleteInvoice_Logger.log(`按钮 ${buttonId} 已消失（成功）`);
                    resolve({ success: true, reason: 'button_disappeared' });
                    return;
                }

                if (button.disabled) {
                    // 按钮状态改变了（变灰）
                    AutoDeleteInvoice_Logger.log(`按钮 ${buttonId} 状态已改变`);
                    resolve({ success: true, reason: 'state_changed' });
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    AutoDeleteInvoice_Logger.log(`按钮 ${buttonId} 等待超时`);
                    resolve({ success: false, reason: 'timeout' });
                    return;
                }

                setTimeout(checkState, CONFIG.CHECK_INTERVAL);
            }

            checkState();
        });
    }

    /**
     * 串行删除勾选的发票 主要工作逻辑函数
     * @async
     * @function
     * @returns {Promise<void>}
     */
    async function AutoDeleteInvoice_processDeleteTasks() {
        isRunning = true;
        AutoDeleteInvoice_toggleButtonState(isRunning);//更新按钮状态
        taskList = AutoDeleteInvoice_createTaskList(); //获取最新状态，并写入全局taskList列表中
        AutoDeleteInvoice_updateUiDisplay();//更新UI-任务列表
        AutoDeleteInvoice_Logger.log("勾选的发票", taskList);
        AutoDeleteInvoice_Logger.log("串行处理删除选中发票流程 开始...");

        while (isRunning) {
            const table = getTable('ctl00_ContentPlaceHolder1_TR_WDPJ0');
            if (!table) {
                AutoDeleteInvoice_Logger.error("找不到ctl00_ContentPlaceHolder1_TR_WDPJ0表格，退出处理");
                break;
            }

            const nowList = AutoDeleteInvoice_extractTableInformation();//获取最新表格状态

            const workList = findSharedInvoices(nowList, taskList);//基于nowList内容，找到nowList与taskList都有的发票号

            if (workList.length === 0) {
                AutoDeleteInvoice_Logger.log("所有按钮已处理完毕！");
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
                AutoDeleteInvoice_updateUiDisplay();
                AutoDeleteInvoice_updateCurrentTaskInfo(task);
            }

            // 检查是否停止
            if (!isRunning) break;

            AutoDeleteInvoice_Logger.log(`准备处理发票，编号: ${invoiceNo} (${workList.length} 个剩余)`);

            try {
                // 等待页面稳定
                await waitForPageStable();

                // 检查是否停止
                if (!isRunning) break;

                // 安全点击按钮
                const clickResult = await AutoDeleteInvoice_safeClickDeleteButton(firstDelInvoice);
                if (!clickResult.success) { //删除按钮点击不成功处理
                    AutoDeleteInvoice_Logger.warn(`发票编号: ${invoiceNo} 删除按钮点击失败: ${clickResult.reason}`);

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
                        AutoDeleteInvoice_updateUiDisplay();
                    }

                    // 如果按钮不存在、不可用，继续处理下一个
                    continue;//跳过后续，重新执行 while (isRunning) {
                }

                // 等待按钮状态变化
                const buttonResult = await AutoDeleteInvoice_waitForDeleteButtonStateChange(firstDelInvoice);
                AutoDeleteInvoice_Logger.log(`发票编号:${invoiceNo}删除按钮 处理结果:`, buttonResult);
                // 更新任务状态
                if (task) {
                    if (buttonResult.success) {
                        task.status = 'success';
                    } else {
                        task.status = 'failed';
                    }
                    AutoDeleteInvoice_updateUiDisplay();
                }

                // 检查是否停止
                if (!isRunning) break;

            } catch (error) {
                AutoDeleteInvoice_Logger.error(`处理发票，编号 ${invoiceNo} 时出错:`, error);

                // 更新任务状态
                if (task) {
                    task.status = 'failed';
                    AutoDeleteInvoice_updateUiDisplay();
                }

                // // 等待期间检查是否停止
                // for (let i = 0; i < 20 && isRunning; i++) {
                //     await new Promise(resolve => setTimeout(resolve, 100));
                // }

                if (!isRunning) break;
            }
        }
        isRunning = false;
        AutoDeleteInvoice_toggleButtonState(isRunning);//更新按钮状态
        AutoDeleteInvoice_Logger.log("串行处理删除选中发票流程 结束...");
    }

    //========================================================================================================



    /** ==== 劫持alert和confirm弹窗 功能业务函数  ==== **/
    /**
     * 覆写窗口对象的 alert 和 confirm
     * @function
     * @param {Window} win - 目标窗口对象
     * @param {string} frameName - 窗口名称（用于日志）
     */
    function hookWindow(win, frameName) {
        try {
            if (win._alertHooked) return;
            console.log("[hookWindow] frame URL:", win.location.href, ", name:", frameName);

            const originalAlert = win.alert;
            win.alert = function (message) {
                console.log("[hookWindow]Alert frame URL:", win.location.href, ", name:", frameName, ", message:", message);
                // debugger;

                //只在启用批量删除发票功能时替换指定消息的弹窗
                if (tampermonkeyuserConfig.enableAuto_OnlineReimbursement_BatchDeleteInvoice &&
                    message === "删除成功！" &&
                    win.location.href.includes("/hnlgwsyy60/Modules/WDPJ/WDPJ0.aspx")) {
                    console.log("[hookWindow]我的票夹页面[删除发票]动作收到回调-删除成功");
                    return true;
                }else {
                    //其余消息放行
                    console.log("[hookWindow]调用原版Alert URL:", win.location.href, ", message:", message);
                    originalAlert(message);
                }

                // //使能 覆写弹窗功能(跳过弹窗)
                // if (tampermonkeyuserConfig.enable_OnlineReimbursement_OverridePopup) {
                //     console.log("[hookWindow]覆写Alert URL:", win.location.href, ", message:", message);
                //     fixUI_PopupUI_showAlert(message);
                // } else {
                //     //其余消息放行
                //     console.log("[hookWindow]调用原版Alert URL:", win.location.href, ", message:", message);
                //     originalAlert(message);
                // }
            };

            const originalConfirm = win.confirm;
            win.confirm = function (message) {
                console.log("Confirm frame URL:", win.location.href, ", name:", frameName, ", message:", message);
                // debugger;

                //只在启用批量删除发票功能时替换指定消息的弹窗
                if (tampermonkeyuserConfig.enableAuto_OnlineReimbursement_BatchDeleteInvoice &&
                    message === "注意：删除后如果再需要用这张票的话，需要重新上传查验，您确定要删除吗？" &&
                    win.location.href.includes("/hnlgwsyy60/Modules/WDPJ/WDPJ0.aspx")) {
                    console.log("[hookWindow]我的票夹页面 自动确认删除发票对话框");
                    return true;
                }else {
                    //其余消息放行
                    console.log("[hookWindow]调用原版Confirm URL:", win.location.href, ", message:", message);
                    return originalConfirm(message);
                }

                // //使能 覆写弹窗功能(跳过弹窗)
                // if (tampermonkeyuserConfig.enable_OnlineReimbursement_OverridePopup) {
                //     console.log("[hookWindow]覆写Confirm URL:", win.location.href, ", message:", message);
                //     return fixUI_PopupUI_showConfirm(message);
                // } else {
                //     //其余消息放行
                //     console.log("[hookWindow]调用原版Confirm URL:", win.location.href, ", message:", message);
                //     return originalConfirm(message);
                // }
                //return true;
            };

            // const originalPrompt = win.prompt;
            // win.prompt = function (message, defaultValue) {
            //     console.log("Prompt frame URL:",win.location.href);
            //     console.log("Prompt in frame:", frameName, ", message:", message);
            //     // debugger;
            //     return defaultValue;
            // };

            win._alertHooked = true;
        } catch (e) {
            console.warn("Cannot hook frame:", frameName, e);
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

    //创建弹出窗口的容器
    function fixUI_PopupUI_ensureContainer() {
        // let topDoc = window.top.document;
        let mainFrameDoc = window.top.frames['mainframe'].document;

        let container = mainFrameDoc.getElementById('fixUI_PopupUI_container');
        if (!container) {
            container = mainFrameDoc.createElement('div');
            container.id = 'fixUI_PopupUI_container';
            Object.assign(container.style, {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',  // 将元素中心对齐到中间
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 99999
            });
            mainFrameDoc.body.appendChild(container);
        }
        return container;
    }

    //创建弹出窗口条目的css
    function fixUI_PopupUI_injectStyles() {
        if (document.getElementById('fixUI_PopupUI_styles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'fixUI_PopupUI_styles';
        styleEl.textContent = `
            .fixUI_PopupUI_box{
                padding: 10px 20px;
                border-radius: 5px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                opacity:1;
                transition: opacity 0.5s, transform 0.3s;
                pointer-events:auto;
                font-size:14px;
                display:flex;
                flex-direction: column;      /* 改成纵向排列，文本和按钮分行 */
                align-items: center;         /* 元素居中 */
                color:#fff;
                max-width: 400px;            /* 最大宽度 */
                word-break: break-word;      /* 自动换行 */
                white-space: normal;
            }
            .fixUI_PopupUI_fadeout{
                opacity:0;
                transform:translateX(50px);
            }
            .fixUI_PopupUI_success {background-color: rgba(40, 167, 69, 0.9);}
            .fixUI_PopupUI_info    {background-color: rgba(33, 150, 243, 0.9);}
            .fixUI_PopupUI_warning {background-color: rgba(255, 193, 7, 0.9); color: #000;}
            .fixUI_PopupUI_error   {background-color: rgba(220, 53, 69, 0.9);}
            /* Alert 内部容器（左右排列：左文字 + 右按钮） */
            .alertContentContainer{
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: flex-start;
                gap: 10px;
            }
            /* 红色关闭按钮（右列） */
            .alertCloseBtn{
                background: red;
                color: #fff;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                flex-shrink: 0; /* 防止按钮被压缩 */
            }
            /* 确认按钮容器（单独占一行居中） */
            .fixUI_PopupUI_confirmBtns{
                margin-top: 10px;
                display:flex;
                flex-direction: row;         /* 横向排列按钮 */
                justify-content: center;     /* 居中 */
                gap:10px;
                width: 100%;
            }
            .fixUI_PopupUI_confirmBtns button{
                background:#444;
                color:#fff;
                border:none;
                padding:5px 10px;
                border-radius:3px;
                cursor:pointer;
            }
        `;
        document.head.appendChild(styleEl);
    }

    //创建弹出窗口的容器和css
    function fixUI_PopupUI_initContainerAndCSS() {
        // 找到目标 document
        // let targetDoc = window.top.frames['mainframe']?.document || window.top.document;
        let targetDoc = document;

        console.log("window.top.frames[mainframe]",window.top.frames['mainframe']);
        // 在 frame 内运行的 JS
        console.log("fixUI_PopupUI_initContainerAndCSS window.frameElement", window.frameElement);    // <frame name="mainframe" src="frame_main.aspx">
        console.log("fixUI_PopupUI_initContainerAndCSS window.frameElement.src", window.frameElement.src); // "https://example.com/frame_main.aspx"
        // console.log("window.top.frames[mainframe]",window.top.frames['mainframe']);

        // debugger

        if (window.frameElement.src.includes("/hnlgwsyy60/frame_main.aspx")) {
            // console.log("has!!!")

        }
        // 样式
        if (!targetDoc.getElementById('fixUI_PopupUI_styles')) {
            const styleEl = targetDoc.createElement('style');
            styleEl.id = 'fixUI_PopupUI_styles';
            styleEl.textContent = `
            .fixUI_PopupUI_box{
                padding: 10px 20px;
                border-radius: 5px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                opacity:1;
                transition: opacity 0.5s, transform 0.3s;
                pointer-events:auto;
                font-size:14px;
                display:flex;
                flex-direction: column;      /* 改成纵向排列，文本和按钮分行 */
                align-items: center;         /* 元素居中 */
                color:#fff;
                max-width: 400px;            /* 最大宽度 */
                word-break: break-word;      /* 自动换行 */
                white-space: normal;
            }
            .fixUI_PopupUI_fadeout{
                opacity:0;
                transform:translateX(50px);
            }
            .fixUI_PopupUI_success {background-color: rgba(40, 167, 69, 0.9);}
            .fixUI_PopupUI_info    {background-color: rgba(33, 150, 243, 0.9);}
            .fixUI_PopupUI_warning {background-color: rgba(255, 193, 7, 0.9); color: #000;}
            .fixUI_PopupUI_error   {background-color: rgba(220, 53, 69, 0.9);}
            /* Alert 内部容器（左右排列：左文字 + 右按钮） */
            .alertContentContainer{
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: flex-start;
                gap: 10px;
            }
            /* 红色关闭按钮（右列） */
            .alertCloseBtn{
                background: red;
                color: #fff;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                flex-shrink: 0; /* 防止按钮被压缩 */
            }
            /* 确认按钮容器（单独占一行居中） */
            .fixUI_PopupUI_confirmBtns{
                margin-top: 10px;
                display:flex;
                flex-direction: row;         /* 横向排列按钮 */
                justify-content: center;     /* 居中 */
                gap:10px;
                width: 100%;
            }
            .fixUI_PopupUI_confirmBtns button{
                background:#444;
                color:#fff;
                border:none;
                padding:5px 10px;
                border-radius:3px;
                cursor:pointer;
            }
        `;
            targetDoc.head.appendChild(styleEl);
        }

        // 容器
        let container = targetDoc.getElementById('fixUI_PopupUI_container');
        if (!container) {
            container = targetDoc.createElement('div');
            container.id = 'fixUI_PopupUI_container';
            Object.assign(container.style, {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 99999
            });
            targetDoc.body.appendChild(container);
        }

        return container;

    }

    //移除弹窗
    function fixUI_PopupUI_removeBox(box) {
        box.classList.add('fixUI_PopupUI_fadeout');
        setTimeout(() => box.remove(), 500);
    }

    //构建alert弹窗
    function fixUI_PopupUI_showAlert(msg, type = 'info', timeout = 5000) {
        // fixUI_PopupUI_injectStyles();
        // const container = fixUI_PopupUI_ensureContainer();
        const container = fixUI_PopupUI_initContainerAndCSS();
        debugger
        const box = document.createElement('div');
        box.className = `fixUI_PopupUI_box fixUI_PopupUI_${type}`;

        // 内部容器（横排：文字左，按钮右）
        const innerContainer = document.createElement('div');
        innerContainer.className = 'alertContentContainer';

        // 左文字
        const textSpan = document.createElement('div');
        textSpan.textContent = msg;

        // 右按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'alertCloseBtn';
        closeBtn.textContent = '关闭';
        closeBtn.onclick = () => fixUI_PopupUI_removeBox(box);

        // 横排加入
        innerContainer.appendChild(textSpan);
        innerContainer.appendChild(closeBtn);
        box.appendChild(innerContainer);

        container.appendChild(box);

        if (timeout > 0) {
            setTimeout(() => fixUI_PopupUI_removeBox(box), timeout);
        }
    }

    //构建confirm弹窗
    function fixUI_PopupUI_showConfirm(msg) {
        // fixUI_PopupUI_injectStyles();
        return new Promise(resolve => {
            // const container = fixUI_PopupUI_ensureContainer();
            const container = fixUI_PopupUI_initContainerAndCSS();
            debugger
            const box = document.createElement('div');
            box.className = `fixUI_PopupUI_box fixUI_PopupUI_info`;
            box.textContent = msg;

            const btnContainer = document.createElement('div');
            btnContainer.className = 'fixUI_PopupUI_confirmBtns';

            const okBtn = document.createElement('button');
            okBtn.textContent = '确定';
            okBtn.onclick = () => { fixUI_PopupUI_removeBox(box); resolve(true); };

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.onclick = () => { fixUI_PopupUI_removeBox(box); resolve(false); };

            btnContainer.appendChild(okBtn);
            btnContainer.appendChild(cancelBtn);
            box.appendChild(btnContainer);

            container.appendChild(box);
        });
    }









    //========================================================================================================


    /** ==== 网上报账系统-一键绑定/解绑发票功能 ==== **/
    // 日志工具
    const AutoClicker_Logger = {
        log: (...args) => console.log('[AutoClicker]', ...args),
        warn: (...args) => console.warn('[AutoClicker]', ...args),
        error: (...args) => console.error('[AutoClicker]', ...args),
        debug: (...args) => console.debug('[AutoClicker]', ...args)
    };

    function AutoBindInvoice_addEmptyRowAfterTrBd() {
        // 定位目标行
        const targetRow = document.getElementById('tr_bd');
        if (!targetRow) {
            AutoClicker_Logger.log("未找到 tr_bd 行");
            return;
        }

        // 检查是否已存在空行
        if (document.getElementById('tr_empty_row')) {
            AutoClicker_Logger.log("空行已存在");
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
        AutoClicker_Logger.log("空白行添加成功");
    }


    /** ==== 构建 UI部分 ==== **/
    /** ==== 创建任务列表面板（包含按钮和折叠区） ==== **/
    function AutoBindInvoice_createTaskPanel(running = isRunning) {
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

        const runningBtnVisibility = running ? "hidden" : "visible";
        const notrunBtnVisibility = running ? "visible" : "hidden";

        const panelHTML = `
            <div id="AutoBindInvoice_taskPanel" class="AutoBindInvoice_panel">
                <!-- 顶部按钮栏 -->
                <div class="AutoBindInvoice_buttonRow">
                    <button id="AutoBindInvoice_btnBindAll" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-bind" style="visibility:${runningBtnVisibility};">
                        一键[绑定]</span><br>本页所有发票
                    </button>
                    <button id="AutoBindInvoice_btnUnbindAll" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-unbind" style="visibility:${runningBtnVisibility};">
                        一键[取消绑定]<br>本页所有发票
                    </button>
                    <button id="AutoBindInvoice_btnStopTask" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-stop" style="visibility:${notrunBtnVisibility};">
                        停止<br>任务
                    </button>
                    <button id="AutoBindInvoice_btnClearList" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-clear" style="visibility:visible;">
                        清除<br>列表
                    </button>
                    <button id="AutoBindInvoice_btnTogglePanel" class="AutoBindInvoice_Btn AutoBindInvoice_Btn-toggle" style="visibility:visible;">
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

        AutoClicker_Logger.log("任务面板已创建");
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
                    AutoClicker_Logger.log('开始一键绑定流程...');
                    taskList = [];
                    // setupAutoConfirm(); // 你第一个脚本里的自动确认
                    await AutoBindInvoice_processAutoBoundButtonsSerially(); // 调用你的绑定逻辑
                }
            });
        }

        // 一键解绑
        const btnUnbind = document.getElementById('AutoBindInvoice_btnUnbindAll');
        if (btnUnbind) {
            btnUnbind.addEventListener('click', async () => {
                if (!isRunning) {
                    AutoClicker_Logger.log('开始一键解绑流程...');
                    taskList = [];
                    // setupAutoConfirm();
                    await AutoBindInvoice_processAutoUnoundButtonsSerially(); // 调用你的解绑逻辑
                }
            });
        }

        // 停止任务
        const btnStop = document.getElementById('AutoBindInvoice_btnStopTask');
        if (btnStop) {
            btnStop.addEventListener('click', () => {
                AutoClicker_Logger.log('手动停止任务');
                isRunning = false;
            });
        }

        // 清除列表
        const btnClear = document.getElementById('AutoBindInvoice_btnClearList');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                AutoClicker_Logger.log('清空任务列表');
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
                    btnToggle.innerHTML = '收起<br>列表';
                    AutoBindInvoice_updateUiDisplay();
                } else {
                    contentDiv.style.display = 'none';
                    btnToggle.innerHTML = '展开<br>列表';
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
            AutoClicker_Logger.warn('面板 DOM 不完整，无法刷新 UI');
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
            AutoClicker_Logger.warn('当前任务信息元素不存在');
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


    // 扫描表格并创建【绑定】任务列表 ===更新好===
    function AutoBindInvoice_scanTableAndCreateBoundTasks() {
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
    function AutoBindInvoice_scanTableAndCreateUnboundTasks() {
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
    function AutoBindInvoice_waitForBoundButtonStateChange(buttonId, timeout = CONFIG.MAX_WAIT_TIME) {
        return new Promise((resolve) => {
            const startTime = Date.now();

            function checkState() {
                const button = document.getElementById(buttonId);

                if (!button) {
                    // 按钮消失了（成功绑定）
                    AutoClicker_Logger.log(`按钮 ${buttonId} 已消失（成功）`);
                    resolve({ success: true, reason: 'button_disappeared' });
                    return;
                }

                if (button.disabled || button.value !== '绑定') {
                    // 按钮状态改变了（变灰或文字改变）
                    AutoClicker_Logger.log(`按钮 ${buttonId} 状态已改变`);
                    resolve({ success: true, reason: 'state_changed' });
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    AutoClicker_Logger.log(`按钮 ${buttonId} 等待超时`);
                    resolve({ success: false, reason: 'timeout' });
                    return;
                }

                setTimeout(checkState, CONFIG.CHECK_INTERVAL);
            }

            checkState();
        });
    }

    // 等待[取消绑定]按钮状态变化 ===更新好===
    function AutoBindInvoice_waitForUnboundButtonStateChange(buttonId, timeout = CONFIG.MAX_WAIT_TIME) {
        return new Promise((resolve) => {
            const startTime = Date.now();

            function checkState() {
                const button = document.getElementById(buttonId);

                if (!button) {
                    // 按钮消失了（成功绑定）
                    AutoClicker_Logger.log(`按钮 ${buttonId} 已消失（成功）`);
                    resolve({ success: true, reason: 'button_disappeared' });
                    return;
                }

                if (button.disabled || button.value !== '取消绑定') {
                    // 按钮状态改变了（变灰或文字改变）
                    AutoClicker_Logger.log(`按钮 ${buttonId} 状态已改变`);
                    resolve({ success: true, reason: 'state_changed' });
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    AutoClicker_Logger.log(`按钮 ${buttonId} 等待超时`);
                    resolve({ success: false, reason: 'timeout' });
                    return;
                }

                setTimeout(checkState, CONFIG.CHECK_INTERVAL);
            }

            checkState();
        });
    }


    // 安全点击[绑定]按钮 ===更新好===
    async function AutoBindInvoice_safeClickBoundButton(button) {
        if (!isRunning) return { success: false, reason: 'stopped' };

        try {
            const currentButton = document.getElementById(button.id);

            if (!currentButton || currentButton.disabled || currentButton.value !== '绑定') {
                AutoClicker_Logger.log(`按钮 ${button.id} 不再可用`);
                return { success: false, reason: 'button_unavailable' };
            }

            // 使用postback
            if (typeof (__doPostBack) !== 'undefined' && currentButton.name) {
                AutoClicker_Logger.log(`触发 postback: ${currentButton.name}`);
                __doPostBack(currentButton.name, '');
            } else {
                AutoClicker_Logger.log(`直接点击按钮: ${currentButton.id}`);
                currentButton.click();
            }

            return { success: true };
        } catch (error) {
            AutoClicker_Logger.error(`点击按钮${button.id}失败:`, error);
            return { success: false, reason: 'click_failed' };
        }
    }

    // 安全点击[取消绑定]按钮 ===更新好===
    async function AutoBindInvoice_safeClickUnoundButton(button) {
        if (!isRunning) return { success: false, reason: 'stopped' };

        try {
            const currentButton = document.getElementById(button.id);

            if (!currentButton || currentButton.disabled || currentButton.value !== '取消绑定') {
                AutoClicker_Logger.log(`按钮 ${button.id} 不再可用`);
                return { success: false, reason: 'button_unavailable' };
            }

            // 使用postback
            if (typeof (__doPostBack) !== 'undefined' && currentButton.name) {
                AutoClicker_Logger.log(`触发 postback: ${currentButton.name}`);
                __doPostBack(currentButton.name, '');
            } else {
                AutoClicker_Logger.log(`直接点击按钮: ${currentButton.id}`);
                currentButton.click();
            }

            return { success: true };
        } catch (error) {
            AutoClicker_Logger.error(`点击按钮${button.id}失败:`, error);
            return { success: false, reason: 'click_failed' };
        }
    }

    // 串行处理函数 一键绑定 功能
    async function AutoBindInvoice_processAutoBoundButtonsSerially() {
        isRunning = true;
        AutoBindInvoice_toggleButtonState(isRunning);
        taskList = AutoBindInvoice_scanTableAndCreateBoundTasks(); //此处返回的是list，内部obj定义见AutoBindInvoice_scanTableAndCreateBoundTasks函数
        AutoBindInvoice_updateUiDisplay();
        AutoClicker_Logger.log("开始串行处理流程...");
        // AutoClicker_Logger.log(`[一键绑定]taskList:`);
        // AutoClicker_Logger.log(taskList);

        while (isRunning) {
            const table = getTable('GV_ZDFPPL');
            if (!table) {
                AutoClicker_Logger.error("找不到表格，退出处理");
                break;
            }

            const nowList = AutoBindInvoice_scanTableAndCreateBoundTasks(); //此处返回的是list，内部obj定义见AutoBindInvoice_scanTableAndCreateBoundTasks函数

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
            // AutoClicker_Logger.log(`[一键绑定]workList:`);
            // AutoClicker_Logger.log(workList);

            if (workList.length === 0) {
                AutoClicker_Logger.log("所有按钮已处理完毕！");
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

            AutoClicker_Logger.log(`准备处理按钮: ${buttonId} (${workList.length} 个剩余)`);

            try {
                // 等待页面稳定
                await waitForPageStable();

                // 检查是否停止
                if (!isRunning) break;

                // 安全点击按钮
                const clickResult = await AutoBindInvoice_safeClickBoundButton(firstButton);

                if (!clickResult.success) {
                    AutoClicker_Logger.warn(`按钮 ${buttonId} 点击失败: ${clickResult.reason}`);

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
                const result = await AutoBindInvoice_waitForBoundButtonStateChange(buttonId);
                AutoClicker_Logger.log(`按钮 ${buttonId} 处理结果:`, result);

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
                AutoClicker_Logger.error(`处理按钮 ${buttonId} 时出错:`, error);

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

        AutoClicker_Logger.log("处理流程结束");
    }

    // 串行处理函数 一键取消绑定 功能
    async function AutoBindInvoice_processAutoUnoundButtonsSerially() {
        isRunning = true;
        AutoBindInvoice_toggleButtonState(isRunning);
        taskList = AutoBindInvoice_scanTableAndCreateUnboundTasks(); //此处返回的是list，内部obj定义见AutoBindInvoice_scanTableAndCreateUnboundTasks函数
        AutoBindInvoice_updateUiDisplay();
        AutoClicker_Logger.log("开始串行处理流程...");
        //AutoClicker_Logger.log(`[一键取消绑定]taskList:`);
        //AutoClicker_Logger.log(taskList);

        while (isRunning) {
            const table = getTable('GV_ZDFPPL');
            if (!table) {
                AutoClicker_Logger.error("找不到表格，退出处理");
                break;
            }

            const nowList = AutoBindInvoice_scanTableAndCreateUnboundTasks(); //此处返回的是list，内部obj定义见AutoBindInvoice_scanTableAndCreateUnboundTasks函数

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
            // AutoClicker_Logger.log(`[一键取消绑定]workList:`);
            // AutoClicker_Logger.log(workList);

            if (workList.length === 0) {
                AutoClicker_Logger.log("所有按钮已处理完毕！");
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

            AutoClicker_Logger.log(`准备处理按钮: ${buttonId} (${workList.length} 个剩余)`);

            try {
                // 等待页面稳定
                await waitForPageStable();

                // 检查是否停止
                if (!isRunning) break;

                // 安全点击按钮
                const clickResult = await AutoBindInvoice_safeClickUnoundButton(firstButton);

                if (!clickResult.success) {
                    AutoClicker_Logger.warn(`按钮 ${buttonId} 点击失败: ${clickResult.reason}`);

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
                const result = await AutoBindInvoice_waitForUnboundButtonStateChange(buttonId);
                AutoClicker_Logger.log(`按钮 ${buttonId} 处理结果:`, result);

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
                AutoClicker_Logger.error(`处理按钮 ${buttonId} 时出错:`, error);

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

        AutoClicker_Logger.log("处理流程结束");
    }

    //========================================================================================================


    /** ==== 修正财务查询系统UI-表格无法完全展开问题 ==== **/
    //处理财务查询系统首页首页经费表格UI太窄不便于操作问题
    function fixUI_FinanceQuery_TableCannotExpandFully() {
        if (document.getElementById("fixUI_FinanceQuery_TableCannotExpandFully-FixWidthWidth")) {
            // console.log('[UIFix] 样式已存在:', uniqueId);
            return;
        }
        // 使用 GM_addStyle 注入自定义CSS规则，解决首页经费表格太宽，但是容器窗口太小的问题。
        // 这会覆盖 .main 类的 width: 980px;
        // 这会覆盖 .width 类的 width: 960px;
        // 注入样式
        const styleEl = GM_addStyle(`
            .main {
                min-width: 980px; /*增加最小宽度（与原来保持一致），避免它过小带来新问题*/
                width: auto !important; /* 或者可以使用百分比, 如 100%, 但 auto 通常更灵活 */
                max-width: none !important; /* 移除可能存在的最大宽度限制 */
                margin-left: auto !important; /* 保持居中或根据需要调整 */
                margin-right: auto !important; /* 保持居中或根据需要调整 */
            }
            .width {
                width: 100% !important; /* 改为占据其容器的100%宽度 */
                max-width: none !important; /* 移除可能存在的最大宽度限制 */
            }
        `);

        // 手动加 ID 标记，这样以后就能用 getElementById 检查
        styleEl.id = "fixUI_FinanceQuery_TableCannotExpandFully-FixWidthWidth";

        // console.log("[fixUI 财务查询]修正首页表格宽度问题Fixed width restrictions removed for .main and .width classes.");

    }


    /** ==== 修正财务查询系统UI-首页表格错位问题 ==== **/
    function fixUI_FinanceQuery_UiMisalignment(window_width) {
        // 在div id=ctl00_ContentPlaceHolder1_probox 与 div_mb之间插入一个1px高的空内容，解决“经费情况”、“我的工资”、“来款信息”行错位问题
        // 尝试插入，直到成功为止
        const fixUI_FinanceQuery_insertDiv = setInterval(() => {
            //检查是否插入过
            if (document.getElementById('uiFix_financeQuerySYS_layoutSpacer_1px')) {
                clearInterval(fixUI_FinanceQuery_insertDiv); // 成功后停止检测
            }
            // 精确匹配 id 为 div_mb 的元素
            const target = document.getElementById('div_mb');
            if (target) {
                let val = window_width * 0.7;
                let customWidth = val + "px";
                const htmlString = '<div class="all_content" id="uiFix_financeQuerySYS_layoutSpacer_1px" style="width:' + customWidth + '; height: 1px;"></div>';

                // 'beforebegin' 表示插入到 target 元素的前面
                target.insertAdjacentHTML('beforebegin', htmlString);

                console.log("[fixUI 财务查询]首页表格错位问题 成功在 div_mb 前插入了 HTML 代码");
                clearInterval(fixUI_FinanceQuery_insertDiv); // 成功后停止检测
            }
        }, 500);
    }


    // 修复项目选择（经费选择）表格高度问题 - 用 CSS 方式永久覆盖
    function fixUI_OnlineReimbursement_ProjectSelectPageTableHeight() {
        // 检查是否已经注入过，防止重复添加
        if (document.getElementById('fixUI_ProjectSelectPageTableHeightStyle')) return;

        // 使用 GM_addStyle 注入规则
        const styleEl = GM_addStyle(`
            /* 覆盖 id=ctl00_ContentPlaceHolder1_div_xmtb 的高度 */
            #ctl00_ContentPlaceHolder1_div_xmtb {
                height: auto !important; /* 不论原来是什么值，都强制改为自动高度 */
                min-height: 600px;
            }
        `);

        // 给样式标签加 ID，方便后续检查/删除
        styleEl.id = 'fixUI_ProjectSelectPageTableHeightStyle';

        console.log('[fixUI 网上报账] 经费选择表格高度样式已注入');
    }


    //==================== 修复 费用明细 页面项目选择表格高度问题 ====================================
    //修复 费用明细 页面项目选择表格高度问题
    function fixUI_OnlineReimbursement_expenseDetailContentTABLE() {
        // 定位父容器
        const container = document.getElementById('ctl00_ContentPlaceHolder1_PN_BXNR');
        if (!container) return;
        if (document.getElementById('uiFix_expenseDetailContent')) return;

        // 1. 获取容器内【所有层级】的 div
        const allDivs = container.querySelectorAll('div');

        // 2. 寻找第一个 inline style 明确设定为 600px 的 div
        // Array.from 是为了让 querySelectorAll 返回的 NodeList 可以使用 find 方法
        const targetDiv = Array.from(allDivs).find(div => {
            // 检查 inline style，同时兼容可能有空格的情况（如 "600px " 或 " 600px"）
            return div.style.height.trim() === '600px';
        });

        // 3. 如果找到了，执行修改并终止循环/监听
        if (targetDiv) {
            targetDiv.style.height = '100%';
            targetDiv.id = 'uiFix_expenseDetailContent';
            console.log('已找到div id=ctl00_ContentPlaceHolder1_PN_BXNR 深层级中的第一个 height: 600px 并改为 100%');

            // 任务完成，清除定时器
            if (window.scutTimer) {
                clearInterval(window.scutTimer);
            }
        }
    }


    //==================== 修复 税票录入 页面绑定发票表格iframe高度问题 ====================================
    // 初始化修复 税票录入 的iframe高度功能
    function fixUI_OnlineReimbursement_InvoiceBindingIFRAME() {
        const targetIframe = document.getElementById('ctl00_ContentPlaceHolder1_fm_wx');
        if (targetIframe && targetIframe.tagName.toLowerCase() === 'iframe') {
            const sizeInfo = getIframeSize(targetIframe);
            console.log("iframe id=" + targetIframe.id + '的height: ' + sizeInfo + "px");

            const newIframeHeight = sizeInfo.height < 901 ? 950 : sizeInfo.height + 50;
            //console.log(newIframeHeight+"px");
            // adj_Iframe_Height(targetIframe, newIframeHeight + "px");
            targetIframe.height = newIframeHeight + "px";
            console.log("已设置iframe id=" + targetIframe.id + '的height: ' + newIframeHeight + "px");
        }

    }


    //==================== 网上报账系统-自动选中日常报销中已添加经费 ====================================
    //当项目选择（经费选择）页面有且只有1个已录入经费，自动勾选该经费
    function autoSelect_FundingRow() {
        const table = document.getElementById('ctl00_ContentPlaceHolder1_GV_RCXMXX');

        if (table && table.tagName === 'TABLE') {
            // console.log('找到id=ctl00_ContentPlaceHolder1_GV_RCXMXX 的表格:');

            // 获取表格的所有行
            const rows = table.querySelectorAll('tr');
            // console.log('表格行数:', rows.length);

            // // 遍历每一行并输出内容
            // rows.forEach((row, index) => {
            //     const cells = row.querySelectorAll('td, th');
            //     const cellContents = Array.from(cells).map(cell =>
            //         cell.textContent.trim().replace(/\s+/g, ' ')
            //     );

            //     //console.log(`第 ${index + 1} 行:`, cellContents);
            // });

            // 检查条件：行数为2，且第二行的第二个元素不为空
            if (rows.length === 2) {
                const secondRow = rows[1]; // 第二行（索引为1）
                const cellsInSecondRow = secondRow.querySelectorAll('td, th');

                if (cellsInSecondRow.length >= 2) { // 确保至少有2列
                    const secondCellContent = cellsInSecondRow[1].textContent.trim(); // 第二个元素（索引为1）

                    if (secondCellContent !== '') {
                        console.log("table id=ctl00_ContentPlaceHolder1_GV_RCXMXX 的表格有且仅有2行，且第二行不为空:");
                        // 查找第七列（索引为6）的复选框并点击
                        if (cellsInSecondRow.length >= 7) {
                            const seventhCell = cellsInSecondRow[6]; // 第七列（索引6）
                            const checkbox = seventhCell.querySelector('input[type="checkbox"]');

                            if (checkbox) {
                                console.log('找到复选框，准备点击:', checkbox);

                                // 方法1: 直接点击
                                try {
                                    checkbox.checked = true;
                                    // console.log('复选框已点击');
                                    console.log('验证复选框最终状态:', checkbox.checked);
                                } catch (error) {
                                    console.log('直接点击失败，尝试触发事件:', error);

                                    // 方法2: 创建并触发click事件
                                    /**/ const event = new MouseEvent('click', {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window
                                    });
                                    checkbox.dispatchEvent(event);
                                    console.log('通过事件触发点击');
                                }
                            } else {
                                console.log('第七列没有找到复选框');
                            }
                        } else {
                            console.log(`第七列不存在，当前列数: ${cellsInSecondRow.length}`);
                        }
                    } else {
                        console.log('条件不满足：第二行的第二个元素为空');
                    }
                } else {
                    console.log('条件不满足：第二行的列数少于2');
                }
            } else {
                console.log(`条件不满足：表格行数不是2（当前行数：${rows.length}）`);
            }

            return true;
        }

        return false;
    }







    /** ==== 脚本初始化函数  ==== **/
    /**
     * 初始化脚本
     * @function
     * @returns {void}
     */
    function initialize() {
        try {
            //获取当前URL
            const currentUrl = window.location.href;
            // console.log("[SCUT Finance Helper]currentUrl", currentUrl)
            // console.log("[SCUT Finance Helper]当前配置:", JSON.stringify(tampermonkeyuserConfig, null, 4));
            // 获取当前窗口的视口宽度（包含滚动条）
            let window_width = window.innerWidth;
            console.log("[SCUT Finance Helper]currentUrl " + currentUrl + " 当前宽度为: " + window_width + "px");

            // fixUI_PopupUI_ensureContainer();//创建弹出窗口的容器
            // fixUI_PopupUI_injectStyles();//创建弹出窗口条目的css




            //判断是否使能 覆写弹窗功能(跳过弹窗)
            // if (tampermonkeyuserConfig.enable_OnlineReimbursement_OverridePopup) {
            //用来覆写原始弹窗函数
            hookAllFrames();
            // 持续检测新 iframe
            setInterval(() => {
                hookAllFrames();
            }, 1000);
            // }


            // fixUI_PopupUI_showAlert("showAlert info 45333333333333333333333333333333333333333333333333333333333366123info", "info", 2000000);
            // fixUI_PopupUI_showAlert("123success", "success", 2000000);
            // fixUI_PopupUI_showAlert("123warning", "warning", 2000000);
            // fixUI_PopupUI_showAlert("123error", "error", 2000000);
            // fixUI_PopupUI_showConfirm("showConfirm 45333333333333333333333333333333333333333333333333333333333333333366");


            //判断是否使能 批量删除发票功能
            if (tampermonkeyuserConfig.enableAuto_OnlineReimbursement_BatchDeleteInvoice) {
                //判断是否存在 我的票夹 页面的指定表格
                if (getTable('ctl00_ContentPlaceHolder1_TR_WDPJ0')) {
                    //修改原有页面样式的函数
                    AutoDeleteInvoice_addButtons();//添加删除选中功能按钮
                    AutoDeleteInvoice_createTaskPanel();//添加任务列表（默认隐藏）

                    //为批量删除功能的三个按钮绑定事件
                    AutoDeleteInvoice_bindButtonsEvents();

                    AutoDeleteInvoice_Logger.log("批量删除发票 已初始化完成");
                }
            }



            //判断是否使能 批量绑定/取消绑定发票功能
            if (tampermonkeyuserConfig.enableAuto_OnlineReimbursement_BatchInvoiceBindingToggle &&
                currentUrl.includes('hnlgwsyy60/ifpCheckNew_WX.aspx')
            ) {
                AutoBindInvoice_createTaskPanel();// 添加悬浮控制面板
                AutoBindInvoice_bindButtonsEvents();//绑定控制面板按钮事件

                //在<tr id="tr_bd">后插入空行
                AutoBindInvoice_addEmptyRowAfterTrBd();

                AutoClicker_Logger.log("自动绑定系统已初始化完成");
            }

            //判断是否使能 修正财务查询系统UI-首页表格错位问题
            if (tampermonkeyuserConfig.enablefixUI_FinanceQuery_UiMisalignment) {
                if (currentUrl.includes('202.38.194.48:8182/') || currentUrl.includes('202-38-194-48-8182.webvpn.scut.edu.cn/')) {
                    fixUI_FinanceQuery_UiMisalignment(window_width);
                    console.log("[fixUI 财务查询]首页表格错位问题 成功在 div_mb 前插入1px高空行");
                }
            }

            //判断是否使能 修正财务查询系统UI-表格无法完全展开问题
            if (tampermonkeyuserConfig.enablefixUI_FinanceQuery_TableCannotExpandFully) {
                if (currentUrl.includes('202.38.194.48:8182/') || currentUrl.includes('202-38-194-48-8182.webvpn.scut.edu.cn/')) {
                    fixUI_FinanceQuery_TableCannotExpandFully();
                    console.log("[fixUI 财务查询]修正首页表格宽度问题Fixed width restrictions removed for .main and .width classes.");
                }
            }

            //判断是否使能 修复项目选择（经费选择）表格高度问题
            if (tampermonkeyuserConfig.enablefixUI_OnlineReimbursement_ProjectSelectPageTableHeight) {
                if (getTable('ctl00_ContentPlaceHolder1_div_xmtb')) {
                    fixUI_OnlineReimbursement_ProjectSelectPageTableHeight();
                    console.log("[fixUI 网上报账]项目选择（经费选择）表格高度样式已改为 auto");
                }
            }

            //判断是否使能 修正网上报账系统UI-费用明细页面表格高度问题
            if (tampermonkeyuserConfig.enablefixUI_OnlineReimbursement_ExpenseDetailPageTableHeight) {
                if (document.getElementById('ctl00_ContentPlaceHolder1_PN_BXNR')) {
                    fixUI_OnlineReimbursement_expenseDetailContentTABLE();
                    console.log("[fixUI 网上报账]费用明细页面表格高度样式已改为 100%");
                }
            }

            //判断是否使能 修正网上报账系统UI-税票录入页面绑定发票表格iframe高度问题
            if (tampermonkeyuserConfig.enablefixUI_OnlineReimbursement_TaxInvoiceEntryPageHeight) {
                if (document.getElementById('ctl00_ContentPlaceHolder1_fm_wx')) {
                    fixUI_OnlineReimbursement_InvoiceBindingIFRAME();
                    console.log("[fixUI 网上报账]税票录入页面绑定发票表格iframe高度已更改");
                }
            }

            //判断是否使能 网上报账系统-自动选中日常报销中已添加经费
            if (tampermonkeyuserConfig.enableAuto_OnlineReimbursement_SelectAddedFundsInDailyReimbursement) {
                if (document.getElementById('ctl00_ContentPlaceHolder1_GV_RCXMXX')) {
                    autoSelect_FundingRow();
                    console.log("[autoSelect_FundingRow]已自动选中存在的经费行");
                }
            }



            // 监听ASP.NET异步回发完成事件
            if (typeof Sys !== 'undefined' && Sys.WebForms && Sys.WebForms.PageRequestManager) {
                const prm = Sys.WebForms.PageRequestManager.getInstance();
                prm.add_endRequest(function (sender, args) {
                    console.log("[SCUT Finance Helper]ASP.NET异步回发开始.....");
                    //ASP.NET异步后要重新再插入一次
                    //修改原有页面样式的函数

                    //判断是否使能 批量删除发票功能
                    if (tampermonkeyuserConfig.enableAuto_OnlineReimbursement_BatchDeleteInvoice) {
                        //判断是否存在 我的票夹 页面的指定表格
                        if (getTable('ctl00_ContentPlaceHolder1_TR_WDPJ0')) {
                            //修改原有页面样式的函数
                            AutoDeleteInvoice_addButtons();//添加删除选中功能按钮
                            AutoDeleteInvoice_Logger.log("[批量删除发票]ASP.NET异步回发完成，相关功能按钮已添加");

                            //为批量删除功能的三个按钮绑定事件
                            AutoDeleteInvoice_bindButtonsEvents();
                            AutoDeleteInvoice_Logger.log("[批量删除发票]ASP.NET异步回发完成，相关功能按钮绑定事件已添加");
                        }
                    }

                    //判断是否使能 批量绑定/取消绑定发票功能
                    if (tampermonkeyuserConfig.enableAuto_OnlineReimbursement_BatchInvoiceBindingToggle &&
                        currentUrl.includes('hnlgwsyy60/ifpCheckNew_WX.aspx')
                    ) {

                        //在<tr id="tr_bd">后插入空行
                        AutoBindInvoice_addEmptyRowAfterTrBd();

                        AutoClicker_Logger.log("ASP.NET异步回发完成，重新插入空行");
                    }

                    //判断是否使能 修复项目选择（经费选择）表格高度问题
                    if (tampermonkeyuserConfig.enablefixUI_OnlineReimbursement_ProjectSelectPageTableHeight) {
                        if (getTable('ctl00_ContentPlaceHolder1_div_xmtb')) {
                            fixUI_OnlineReimbursement_ProjectSelectPageTableHeight();
                            console.log("[fixUI 网上报账]ASP.NET异步回发完成,项目选择（经费选择）表格高度样式已改为 auto");
                        }
                    }

                    //判断是否使能 修正网上报账系统UI-费用明细页面表格高度问题
                    if (tampermonkeyuserConfig.enablefixUI_OnlineReimbursement_ExpenseDetailPageTableHeight) {
                        if (document.getElementById('ctl00_ContentPlaceHolder1_PN_BXNR')) {
                            fixUI_OnlineReimbursement_expenseDetailContentTABLE();
                            console.log("[fixUI 网上报账]ASP.NET异步回发完成,费用明细页面表格高度样式已改为 100%");
                        }
                    }

                    //判断是否使能 修正网上报账系统UI-税票录入页面绑定发票表格iframe高度问题
                    if (tampermonkeyuserConfig.enablefixUI_OnlineReimbursement_TaxInvoiceEntryPageHeight) {
                        if (document.getElementById('ctl00_ContentPlaceHolder1_fm_wx')) {
                            fixUI_OnlineReimbursement_InvoiceBindingIFRAME();
                            console.log("[fixUI 网上报账]-税票录入页面绑定发票表格iframe高度已更改");
                        }
                    }

                    //判断是否使能 网上报账系统-自动选中日常报销中已添加经费
                    if (tampermonkeyuserConfig.enableAuto_OnlineReimbursement_SelectAddedFundsInDailyReimbursement) {
                        if (document.getElementById('ctl00_ContentPlaceHolder1_GV_RCXMXX')) {
                            autoSelect_FundingRow();
                            console.log("[autoSelect_FundingRow]已自动选中存在的经费行");
                        }
                    }


                    console.log("[SCUT Finance Helper]ASP.NET异步回发完成");
                });
            }

            console.log("[SCUT Finance Helper]initialize 已初始化完成");
        } catch (error) {
            console.error("[SCUT Finance Helper]初始化失败:", error);
        }
    }

    // 运行逻辑
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();