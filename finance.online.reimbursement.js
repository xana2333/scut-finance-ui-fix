// ==UserScript==
// @name         SCUT财务处UI优化-网上报账
// @namespace    http://tampermonkey.net/
// @version      1.2
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

    // ==================== 原有功能：移除经费表格高度限制 ====================

    // 监听DOM变化
    const heightLimitObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // 检查新增的节点
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // 元素节点
                    checkAndRemoveHeightLimit(node);
                    // 如果是容器节点，检查其子节点
                    const targetDiv = node.querySelector('#ctl00_ContentPlaceHolder1_div_xmtb');
                    if (targetDiv) {
                        removeHeightLimitFromDiv(targetDiv);
                    }

                    // 检查是否有需要修改高度的iframe
                    const targetIframe = node.querySelector('#ctl00_ContentPlaceHolder1_fm_wx');
                    if (targetIframe) {
                        adjustIframeHeight(targetIframe);
                    }
                }
            });
        });
    });

    // 检查并移除 项目选择 经费选择div id高度限制的函数
    function checkAndRemoveHeightLimit(element) {
        if (element.id === 'ctl00_ContentPlaceHolder1_div_xmtb') {//项目选择 经费选择id
            removeHeightLimitFromDiv(element);
        }
    }

    // 移除div高度限制的函数
    function removeHeightLimitFromDiv(divElement) {
        // 方法1：直接移除height属性
        divElement.style.removeProperty('height');
        // 方法2：设置为auto（备用方案）
        // divElement.style.height = 'auto';
        console.log('已移除项目选择 经费选择表格div的高度限制');
    }

    // ==================== 新增功能：修改iframe高度 ====================

    // 监听iframe相关的DOM变化
    const iframeObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    checkAndAdjustIframe(node);
                }
            });
        });
    });

    // 检查并调整特定iframe高度的函数
    function checkAndAdjustIframe(element) {
        if (element.id === 'ctl00_ContentPlaceHolder1_fm_wx' && element.tagName.toLowerCase() === 'iframe') {
            adjustIframeHeight(element);
        }

        // 检查子元素中的iframe
        const targetIframes = element.querySelectorAll('#ctl00_ContentPlaceHolder1_fm_wx');
        targetIframes.forEach(function(iframe) {
            if (iframe.tagName.toLowerCase() === 'iframe') {
                adjustIframeHeight(iframe);
            }
        });
    }

    // 调整iframe高度的函数
    function adjustIframeHeight(iframeElement) {
        // 将iframe高度从900px修改为1050px
        iframeElement.style.height = '1050px';
        console.log('已将iframe高度调整为1050px');
    }

    // 初始化高度限制移除功能
    function initHeightLimitRemoval() {
        const targetDiv = document.getElementById('ctl00_ContentPlaceHolder1_div_xmtb');
        if (targetDiv) {
            removeHeightLimitFromDiv(targetDiv);
        }
        // 开始监听DOM变化
        heightLimitObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 初始化iframe高度调整功能
    function initIframeHeightAdjustment() {
        const targetIframe = document.getElementById('ctl00_ContentPlaceHolder1_fm_wx');
        if (targetIframe && targetIframe.tagName.toLowerCase() === 'iframe') {
            adjustIframeHeight(targetIframe);
        }
        // 开始监听iframe相关的DOM变化
        iframeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 新增功能初始化函数
    function initAdditionalFeatures() {
        // 初始化iframe高度调整功能
        initIframeHeightAdjustment();
        console.log('iframe高度调整功能已启用');
    }

    // 主初始化函数
    function initializeAllFeatures() {
        // 初始化原有功能
        initHeightLimitRemoval();

        // 初始化新增功能
        initAdditionalFeatures();
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
        setTimeout(initIframeHeightAdjustment, 2000); // 给iframe更多时间加载
    }

    // 启动脚本
    runWhenReady();

})();
