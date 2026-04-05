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

    function setupAutoAlert() {
        const originalAlert = window.alert;
        window.alert = (message) => {
            console.log(`自动确认alert弹窗: "${message}"`);
            return; // 不显示原本的弹窗，直接自动确认
        };
        const originalConfirm = window.confirm;
        window.confirm = function (message) {
            console.log(`自动确认弹窗: "${message}"`);
            return true; // 自动点击 "确定"
        };
    }

    function observeMutationsForAlertOverride() {
        //     // 使用 MutationObserver 监控动态插入的脚本或内容
        //     const observer = new MutationObserver(() => {
        //         setupAutoAlert(); // 每次 DOM 发生变化时重新覆盖 alert
        //         console.log("重新覆盖 alert()，确保弹窗被拦截！");
        //     });

        //     // 监听整个文档的修改
        //     observer.observe(document.body, {
        //         childList: true, // 监听子元素的变化
        //         subtree: true    // 递归监听所有子节点
        //     });

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                // 检查新增的脚本内容
                const addedNodes = mutation.addedNodes;
                addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "SCRIPT") {
                        const scriptContent = node.textContent || node.innerText;

                        // 如果匹配到 alert('删除成功！');
                        if (scriptContent.includes("alert('删除成功！');")) {
                            console.log("[自定义处理] 拦截并替换了 alert('删除成功！')");

                            // 移除原始脚本节点
                            node.parentNode.removeChild(node);

                            // 可以执行新的脚本
                            const newScript = document.createElement("script");
                            newScript.textContent = "console.log('删除成功，但弹窗已被替代。');"; // 自定义提示
                            document.body.appendChild(newScript);
                        }
                    }
                });
            });
        });
    }






    // 初始化函数（保留第一个脚本的核心逻辑）
    function initialize() {
        try {

            //获取发票列表
            const list = extractTableInformation();
            console.log("list", list);
            if (list && list.length > 0) {
                setupAutoAlert();
                const result = safeClickDeleteButton(list[0]);
                console.log("return", result.success, result.reason, result.error);
                alert("line181");
                confirm("line191");
            }

            // 启用 MutationObserver 监听动态插入的脚本
            // observeMutationsForAlertOverride();

            if (typeof Sys !== 'undefined' && Sys.WebForms && Sys.WebForms.PageRequestManager) {
                const prm = Sys.WebForms.PageRequestManager.getInstance();

                prm.add_beginRequest(function (sender, args) {
                    console.log("AJAX 请求已发送，开始准备处理响应...");

                    // 获取 WebRequest 对象
                    const webRequest = args.get_request().get_webRequest();

                    // 拦截响应处理逻辑（可以重新定义响应内容）
                    const originalCallback = webRequest.completed;
                    webRequest.completed = function () {
                        const response = webRequest.get_executor();
                        if (response.get_statusCode() === 200) {
                            console.log("在响应框架处理前抓取响应内容：", response.get_responseData());

                            // 如果需要，可以对返回的内容进行修改（例如添加自定义标识等）
                            let modifiedResponse = response.get_responseData().replace("OriginalText", "ModifiedText");
                            console.log("修改后的响应：", modifiedResponse);

                            // NOTE: 重新定义响应内容需要较深入的 hack 行为，直接覆盖框架层处理逻辑较难，需要结合替换 `webRequest` 中的执行逻辑。
                        }
                        originalCallback.apply(this, arguments); // 执行原始的完成回调行为
                    };
                });
            }


            // 监听ASP.NET异步回发完成事件
            if (typeof Sys !== 'undefined' && Sys.WebForms && Sys.WebForms.PageRequestManager) {
                const prm = Sys.WebForms.PageRequestManager.getInstance();
                prm.add_endRequest(function (sender, args) {
                    //获取发票列表
                    //extractTableInformation();
                    confirm("line231");
                    alert("line232");
                    setupAutoAlert();
                    alert("line234");
                    confirm("line235");

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