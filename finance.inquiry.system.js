// ==UserScript==
// @name         SCUT财务系统UI优化-财务查询
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  解决查询系统首页大分辨率情况下UI错位、经费信息需要横向移动才能查看的问题
// @author       XANA
// @match        http://202.38.194.48:8182/*
// @match        https://202.38.194.48:8182/*
// @grant        GM_addStyle
// ==/UserScript==

//finance.inquiry.system.js
(function() {
    'use strict';

    const currentUrl = window.location.href;
    console.log("currentUrl",currentUrl)

    if (currentUrl.includes('202.38.194.48:8182/')) {
        // 使用 GM_addStyle 注入自定义CSS规则，解决首页经费表格太宽，但是容器窗口太小的问题。
        // 这会覆盖 .main 类的 width: 980px;
        GM_addStyle(`
        .main {
            width: auto !important; /* 或者可以使用百分比, 如 100%, 但 auto 通常更灵活 */
            max-width: none !important; /* 移除可能存在的最大宽度限制 */
            margin-left: auto !important; /* 保持居中或根据需要调整 */
            margin-right: auto !important; /* 保持居中或根据需要调整 */
        }
        `);
        // 这会覆盖 .width 类的 width: 960px;
        GM_addStyle(`
        .width {
            width: 100% !important; /* 改为占据其容器的100%宽度 */
            max-width: none !important; /* 移除可能存在的最大宽度限制 */
        }
        `);
        console.log("Fixed width restrictions removed for .main and .width classes.");

        // 使用 GM_addStyle注入自定义CSS规则，用于加宽“经费情况”、“我的工资”、“来款信息”行，解决它在高分辨率显示器下的错位问题
        // 并非完美解决，只解决了3840*2160+175%情况下的错位问题。如果分辨率更高，偷懒的方法就是继续改大width: 1100px。
        // 完美解决方案Todo
        GM_addStyle(`
        #pro, #pro_1 {
            width: 1100px !important; /* 覆盖原始的 1000px */
            /* 保留原始的其他样式 */
            float: left;
            position: relative;
            overflow: hidden;
            height: 140px;
            color: #FFF;
        }
        `);
        console.log("Width for #pro and #pro_1 updated to 1100px.");
    }

})();
