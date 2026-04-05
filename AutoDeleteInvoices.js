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
            console.log("currentUrl", currentUrl);
            // 这里也可以调用你已有的函数，如 setupAutoAlert();
            // setupAutoAlert();

            //获取发票列表
            const list = extractTableInformation();
            console.log("list", list);
            if (list && list.length > 0) {
                const result = safeClickDeleteButton(list[0]);
                console.log("return", result.success, result.reason, result.error);
                // alert("line181");
                // confirm("line191");
            }

        });

        document.body.appendChild(btn);
    }


    // 定义提取函数
    function extractTableInformation() {
        // 获取表格
        const table = document.getElementById('ctl00_ContentPlaceHolder1_TR_WDPJ0');
        if (!table) {
            console.error('未找到 ID 为 "ctl00_ContentPlaceHolder1_TR_WDPJ0" 的表格。');
            return;
        }

        // 存储任务列表
        const tasks = [];
        const rows = table.querySelectorAll('tr.row'); // 排除表头，仅选择有数据的行

        rows.forEach(row => {
            const cells = row.querySelectorAll('td'); // 获取当前行的所有单元格
            if (cells.length === 0) {
                console.warn('表格没有数据或内容为空。');
                return; // 跳过空行
            }
            if (cells.length < 8) {
                console.warn(`表格宽度异常。宽度=${cells.length}`);
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

            if (invoiceNo) {
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
                };
                tasks.push(task); // 将当前行的信息加入任务列表
            }
        });
        //console.log('提取到的发票列表：', tasks);// 输出结果到控制台
        return tasks;

    }

    /**
     * 安全点击删除按钮
     * @param {string} buttonId - 删除按钮的 ID（如 ctl00_ContentPlaceHolder1_GV_ZDFPPL_ctl02_Imb_RYDEL）
     * @returns {Promise<Object>} 点击结果，包含成功与否和原因。
     */
    async function safeClickDeleteButton(listrow) {
        try {
            // 根据 buttonId 获取按钮 Element
            const deleteButton = document.getElementById(listrow.deleteButtonId);

            // 检查按钮是否存在
            if (!deleteButton) {
                console.warn(`按钮 ${listrow.deleteButtonId} 不存在，无法进行删除操作`);
                return { success: false, reason: 'button_not_found' };
            }

            // 检查按钮是否可用
            if (deleteButton.disabled || deleteButton.offsetParent === null) {
                console.log(`按钮 ${listrow.deleteButtonId} 不可用，可能已经被隐藏或禁用`);
                return { success: false, reason: 'button_unavailable' };
            }

            // 发起点击操作
            if (typeof __doPostBack !== 'undefined' && deleteButton.name) {
                // 如果 ASP.NET 环境支持 __doPostBack，则优先使用该方式触发事件
                console.log(`触发 postback 删除按钮: ${deleteButton.name}`);
                __doPostBack(deleteButton.name, '');
            } else {
                // 如果无法使用 __doPostBack，直接模拟用户点击
                console.log(`直接点击删除按钮: ${listrow.deleteButtonId}`);
                deleteButton.click();
            }

            // 返回成功操作
            return { success: true };
        } catch (error) {
            // 捕获可能产生的任何错误
            console.error(`点击删除按钮 ${listrow.deleteButtonId} 时出错:`, error);
            return { success: false, reason: 'click_failed', error };
        }
    }



    // 用于覆写原始windo弹窗函数
    function hookWindow(win, frameName) {
        try {
            if (win._alertHooked) return;

            const originalAlert = window.alert;
            win.alert = function (message) {
                console.log("Alert frame URL:", win.location.href);
                console.log("Alert frame URL:", win.location.href,", name:", frameName, ", message:", message);
                // debugger;

                //只替换指定消息的弹窗
                if (message === "删除成功！" &&
                    win.location.href.includes("wsyy-cw.webvpn.scut.edu.cn/hnlgwsyy60/Modules/WDPJ/WDPJ0.aspx")) {
                    console.log("我的票夹页面 删除发票成功");
                } else {
                    //其余消息放行
                    originalAlert(message);
                }
            };

            const originalConfirm = window.confirm;
            win.confirm = function (message) {
                console.log("Confirm frame URL:", win.location.href, ", name:", frameName, ", message:", message);
                // debugger;

                //只替换指定消息的弹窗
                if (message === "注1意：删除后如果再需要用这张票的话，需要重新上传查验，您确定要删除吗？" &&
                    win.location.href.includes("wsyy-cw.webvpn.scut.edu.cn/hnlgwsyy60/Modules/WDPJ/WDPJ0.aspx")) {
                    console.log("我的票夹页面 自动确认删除发票对话框");
                    return true;
                } else {
                    //其余消息放行
                    originalConfirm(message);
                }
                return true;
            };

            // const originalPrompt = window.prompt;
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

    function hookAllFrames() {
        hookWindow(window, 'top');
        for (let i = 0; i < window.frames.length; i++) {
            hookWindow(window.frames[i], `frame-${i}`);
        }
    }








    // 初始化函数（保留第一个脚本的核心逻辑）
    function initialize() {
        try {
            const currentUrl = window.location.href;
            console.log("currentUrl", currentUrl)

            createFloatingButton();


            //用来覆写原始弹窗函数
            hookAllFrames();
            // 持续检测新 iframe
            setInterval(() => {
                hookAllFrames();
            }, 1000);





            // //获取发票列表
            // const list = extractTableInformation();
            // console.log("list", list);
            // if (list && list.length > 0) {
            //     setupAutoAlert();
            //     const result = safeClickDeleteButton(list[0]);
            //     console.log("return", result.success, result.reason, result.error);
            //     alert("line181");
            //     confirm("line191");
            // }




            // 监听ASP.NET异步回发完成事件
            if (typeof Sys !== 'undefined' && Sys.WebForms && Sys.WebForms.PageRequestManager) {
                const prm = Sys.WebForms.PageRequestManager.getInstance();
                prm.add_endRequest(function (sender, args) {
                    //获取发票列表
                    //extractTableInformation();


                    console.log("ASP.NET异步回发完成");
                });
            }

            console.log("批量删除发票 已初始化完成");
        } catch (error) {
            console.error("初始化失败:", error);
        }
    }

    // 运行逻辑
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();