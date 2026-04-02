// ==UserScript==
// @name         SCUT财务处UI优化-网上报账
// @namespace    http://tampermonkey.net/
// @version      1.4
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
    // 初始化修复div id=ctl00_ContentPlaceHolder1_div_xmtb 功能
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


    // ==================== 修改 税票录入 的iframe高度 ====================
    //税票录入 id=ctl00_ContentPlaceHolder1_fm_wx
    // 监听iframe相关的DOM变化
    const DOM_Observer_ctl00_ContentPlaceHolder1_fm_wx = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.id === 'ctl00_ContentPlaceHolder1_fm_wx' && node.tagName.toLowerCase() === 'iframe') {
                        adj_Iframe_Height(node,"1050px");
                    }
                    // 检查子元素中的iframe
                    const targetIframes = node.querySelectorAll('#ctl00_ContentPlaceHolder1_fm_wx');
                    targetIframes.forEach(function(iframe) {
                        if (iframe.tagName.toLowerCase() === 'iframe') {
                            adj_Iframe_Height(iframe,"1050px");
                        }
                    });
                }
            });
        });
    });
    // 初始化iframe高度调整功能
    function initIframeHeightAdjustment() {
        const targetIframe = document.getElementById('ctl00_ContentPlaceHolder1_fm_wx');
        if (targetIframe && targetIframe.tagName.toLowerCase() === 'iframe') {
            adj_Iframe_Height(targetIframe,"1050px");
        }
        // 开始监听iframe相关的DOM变化
        DOM_Observer_ctl00_ContentPlaceHolder1_fm_wx.observe(document.body, {
            childList: true,
            subtree: true
        });
    }








    //==========================================================================


    // 主初始化函数
    function initializeAllFeatures() {
        // 初始化修复div id=ctl00_ContentPlaceHolder1_div_xmtb 功能
        init_fix_height_ctl00_ContentPlaceHolder1_div_xmtb();

        // 初始化新增功能
        initIframeHeightAdjustment();
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
