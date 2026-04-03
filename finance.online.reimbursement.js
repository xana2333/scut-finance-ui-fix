// ==UserScript==
// @name         SCUT财务系统UI优化-网上报账
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  移除指定div的高度限制，让内容自适应；优化iframe高度
// @author       XANA
// @match        http://wsyy.cw.scut.edu.cn/*
// @match        https://wsyy.cw.scut.edu.cn/*
// @grant        none
// @run-at       document-start
// ==/UserScript==


//finance.online.reimbursement
(function() {
    'use strict';

    // 移除div高度限制的函数
    function configDivHeightStyle(divElement,newHeight="auto") {
        // 方法1：直接移除height属性
        //divElement.style.removeProperty('height');
        //console.log('已移除div id='+divElement.id+'的height参数');
        // 方法2：设置为auto（备用方案）
        divElement.style.height = newHeight;
        console.log('已设置div id='+divElement.id+'的height: '+newHeight);
    }
    // 调整iframe高度的函数
    function adj_Iframe_Height(iframeElement,newHeight="1050px") {
        // 将iframe高度从900px修改为1050px
        iframeElement.style.height = newHeight;
        console.log("已设置iframe id="+iframeElement.id+'的height: '+newHeight);
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




    //==================== 修复 费用明细 页面项目选择表格高度问题 ====================================
    //修复 费用明细 页面项目选择表格高度问题
    function fix_height_ctl00_ContentPlaceHolder1_PN_BXNR() {
        // 定位父容器
        const container = document.getElementById('ctl00_ContentPlaceHolder1_PN_BXNR');
        if (!container) return;

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
            console.log('已找到div id=ctl00_ContentPlaceHolder1_PN_BXNR 深层级中的第一个 height: 600px 并改为 100%');

            // 任务完成，清除定时器
            if (window.scutTimer) {
                clearInterval(window.scutTimer);
            }
        }
    }
    //==================================================================



    //======================= 在项目选择（经费选择）页面，当有且仅有1个经费被添加时，自动选择该经费===========================
    //项目选择 经费选择id=ctl00_ContentPlaceHolder1_GV_RCXMXX
    // 监听DOM变化,id=ctl00_ContentPlaceHolder1_GV_RCXMXX
    const ctl00_ContentPlaceHolder1_GV_RCXMXX = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // 检查新增的节点
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // 元素节点
                    if (node.id === 'ctl00_ContentPlaceHolder1_GV_RCXMXX') {
                        auto_Select_ctl00_ContentPlaceHolder1_GV_RCXMXX();
                    }

                    // 如果是容器节点，检查其子节点
                    const targetDiv = node.querySelector('#ctl00_ContentPlaceHolder1_GV_RCXMXX');
                    if (targetDiv) {
                        auto_Select_ctl00_ContentPlaceHolder1_GV_RCXMXX();
                    }
                }
            });
        });
    });
    // 初始化在项目选择（经费选择）页面，当有且仅有1个经费被添加时，自动选择该经费功能
    function init_auto_Select_ctl00_ContentPlaceHolder1_GV_RCXMXX() {
        auto_Select_ctl00_ContentPlaceHolder1_GV_RCXMXX();
        // 开始监听iframe相关的DOM变化
        DOM_Observer_ctl00_ContentPlaceHolder1_div_xmtb.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    //当项目选择（经费选择）页面有且只有1个已录入经费，自动勾选该经费
    function auto_Select_ctl00_ContentPlaceHolder1_GV_RCXMXX() {
        const table = document.getElementById('ctl00_ContentPlaceHolder1_GV_RCXMXX');

        if (table && table.tagName === 'TABLE') {
            console.log('找到id=ctl00_ContentPlaceHolder1_GV_RCXMXX 的表格:');

            // 获取表格的所有行
            const rows = table.querySelectorAll('tr');
            console.log('表格行数:', rows.length);

            // 遍历每一行并输出内容
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td, th');
                const cellContents = Array.from(cells).map(cell =>
                                                           cell.textContent.trim().replace(/\s+/g, ' ')
                                                          );

                //console.log(`第 ${index + 1} 行:`, cellContents);
            });

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
                                    checkbox.checked=true;
                                    console.log('复选框已点击');
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
    //====================================================================================



    // ==================== 修复经费选择表格高度问题 ====================
    //项目选择 经费选择id=ctl00_ContentPlaceHolder1_div_xmtb
    // 监听DOM变化,id=ctl00_ContentPlaceHolder1_div_xmtb
    const DOM_Observer_ctl00_ContentPlaceHolder1_div_xmtb = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // 检查新增的节点
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // 元素节点
                    if (node.id === 'ctl00_ContentPlaceHolder1_div_xmtb') {//项目选择 经费选择id
                        configDivHeightStyle(node);
                    }

                    // 如果是容器节点，检查其子节点
                    const targetDiv = node.querySelector('#ctl00_ContentPlaceHolder1_div_xmtb');
                    if (targetDiv) {
                        configDivHeightStyle(targetDiv);
                    }
                }
            });
        });
    });
    // 初始化修复经费选择表格高度问题 修复div id=ctl00_ContentPlaceHolder1_div_xmtb 功能
    function init_fix_height_ctl00_ContentPlaceHolder1_div_xmtb() {
        const targetDiv = document.getElementById('ctl00_ContentPlaceHolder1_div_xmtb');
        //如果id=ctl00_ContentPlaceHolder1_div_xmtb存在，直接修改。
        if (targetDiv) {
            configDivHeightStyle(targetDiv);
        }
        // 开始监听DOM变化
        DOM_Observer_ctl00_ContentPlaceHolder1_div_xmtb.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    //====================================================================================



    // ==================== 修复 税票录入 的iframe高度 ====================
    //税票录入 id=ctl00_ContentPlaceHolder1_fm_wx
    // 监听iframe相关的DOM变化
    const DOM_Observer_ctl00_ContentPlaceHolder1_fm_wx = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.id === 'ctl00_ContentPlaceHolder1_fm_wx' && node.tagName.toLowerCase() === 'iframe') {
                        const sizeInfo = getIframeSize(node);
                        if (sizeInfo.height<900){
                            const newIframeHeight=900;
                        }else{
                            const newIframeHeight=sizeInfo.height+50;
                        }
                        //console.log(newIframeHeight+"px");
                        adj_Iframe_Height(node,newIframeHeight+"px");
                    }
                    // 检查子元素中的iframe
                    const targetIframes = node.querySelectorAll('#ctl00_ContentPlaceHolder1_fm_wx');
                    targetIframes.forEach(function(iframe) {
                        if (iframe.tagName.toLowerCase() === 'iframe') {
                            const sizeInfo = getIframeSize(iframe);
                            if (sizeInfo.height<900){
                                const newIframeHeight=900;
                            }else{
                                const newIframeHeight=sizeInfo.height+50;
                            }
                            //console.log(newIframeHeight+"px");
                            adj_Iframe_Height(iframe,newIframeHeight+"px");
                        }
                    });
                }
            });
        });
    });
    // 初始化修复 税票录入 的iframe高度功能
    function init_fix_height_ctl00_ContentPlaceHolder1_fm_wx() {
        const targetIframe = document.getElementById('ctl00_ContentPlaceHolder1_fm_wx');
        if (targetIframe && targetIframe.tagName.toLowerCase() === 'iframe') {
            const sizeInfo = getIframeSize(targetIframe);
            if (sizeInfo.height<900){
                const newIframeHeight=900;
            }else{
                const newIframeHeight=sizeInfo.height+50;
            }
            //console.log(newIframeHeight+"px");
            adj_Iframe_Height(targetIframe,newIframeHeight+"px");
        }
        // 开始监听iframe相关的DOM变化
        DOM_Observer_ctl00_ContentPlaceHolder1_fm_wx.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    //==========================================================================









    //==========================================================================
    // 主初始化函数
    function initializeAllFeatures() {
        // 初始化修复经费选择表格高度问题 修复div id=ctl00_ContentPlaceHolder1_div_xmtb 功能
        init_fix_height_ctl00_ContentPlaceHolder1_div_xmtb();

        // 初始化在项目选择（经费选择）页面，当有且仅有1个经费被添加时，自动选择该经费功能
        init_auto_Select_ctl00_ContentPlaceHolder1_GV_RCXMXX();

        // 初始化修复 税票录入 的iframe高度功能
        init_fix_height_ctl00_ContentPlaceHolder1_fm_wx();
    }

    // 页面加载完成后执行所有功能
    function runWhenReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAllFeatures);
        } else {
            initializeAllFeatures();
        }

        // 额外的安全检查，防止页面动态加载后才出现元素
        setTimeout(initializeAllFeatures, 1000);

    }

    // 启动脚本
    runWhenReady();


    //修复 费用明细 页面项目选择表格高度问题
    // 考虑到页面异步加载，每100ms检查一次
    window.scutTimer = setInterval(fix_height_ctl00_ContentPlaceHolder1_PN_BXNR, 100);

    // 初始尝试
    fix_height_ctl00_ContentPlaceHolder1_PN_BXNR();




})();
