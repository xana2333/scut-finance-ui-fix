// ==UserScript==
// @name         SCUT财务系统UI优化-财务查询
// @namespace    http://github.com/xana2333/scut-finance-ui-fix/finance.inquiry.system/
// @version      1.7
// @description  解决查询系统首页大分辨率情况下UI错位、经费信息需要横向移动才能查看的问题
// @author       XANA
// @homepage     https://github.com/xana2333/scut-finance-ui-fix
// @supportURL   https://github.com/xana2333/scut-finance-ui-fix
// @updateURL    https://raw.githubusercontent.com/xana2333/scut-finance-ui-fix/refs/heads/main/finance.inquiry.system.js
// @downloadURL  https://raw.githubusercontent.com/xana2333/scut-finance-ui-fix/refs/heads/main/finance.inquiry.system.js
// @match        http://202.38.194.48:8182/*
// @match        https://202.38.194.48:8182/*
// @match        http://202-38-194-48-8182.webvpn.scut.edu.cn/*
// @match        https://202-38-194-48-8182.webvpn.scut.edu.cn/*
// @grant        GM_addStyle
// ==/UserScript==

//finance.inquiry.system.js
(function() {
    'use strict';

    //获取当前URL
    const currentUrl = window.location.href;
    //console.log("currentUrl",currentUrl)
    // 获取当前窗口的视口宽度（包含滚动条）
    let window_width = window.innerWidth;
    console.log("Url"+currentUrl+" 当前宽度为: " + window_width + "px");

    //处理财务查询系统首页UI错位、首页经费表格，UI太窄不便于操作问题
    if (currentUrl.includes('202.38.194.48:8182/') || currentUrl.includes('02-38-194-48-8182.webvpn.scut.edu.cn/')) {

        // 使用 GM_addStyle 注入自定义CSS规则，解决首页经费表格太宽，但是容器窗口太小的问题。
        // 这会覆盖 .main 类的 width: 980px;
        GM_addStyle(`
        .main {
            min-width: 980px; /*增加最小宽度（与原来保持一致），避免它过小带来新问题*/
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


        // 在div id=ctl00_ContentPlaceHolder1_probox 与 div_mb之间插入一个1px高的空内容，解决“经费情况”、“我的工资”、“来款信息”行错位问题
        // 尝试插入，直到成功为止
        const insertDiv = setInterval(() => {
            // 精确匹配 id 为 div_mb 的元素
            const target = document.getElementById('div_mb');
            if (target) {
                let val =window_width*0.7;
                let customWidth=val+ "px";
                const htmlString = '<div class="all_content" style="width:' + customWidth + '; height: 1px;"></div>';

                // 'beforebegin' 表示插入到 target 元素的前面
                target.insertAdjacentHTML('beforebegin', htmlString);

                console.log("成功在 div_mb 前插入了 HTML 代码");
                clearInterval(insertDiv); // 成功后停止检测
            }
        }, 500);


        //===================== 老方法，已弃用 ======================
        /*
        // 使用 GM_addStyle注入自定义CSS规则，用于加宽“经费情况”、“我的工资”、“来款信息”行，解决它在高分辨率显示器下的错位问题
        // 并非完美解决，只解决了3840*2160+175%情况下的错位问题。如果分辨率更高，偷懒的方法就是继续改大width: 1100px。
        // 完美解决方案Todo
        GM_addStyle(`
        #pro, #pro_1 {
            width: 1100px !important; // 覆盖原始的 1000px
            // 保留原始的其他样式
            float: left;
            position: relative;
            overflow: hidden;
            height: 140px;
            color: #FFF;
        }
        `);
        console.log("Width for #pro and #pro_1 updated to 1100px.");*/
    }


    //===================== ONLY FOR DEBUG ======================
    const element2 = document.getElementById("ctl00_ContentPlaceHolder1_probox");
    if (element2) {
        // 方法 1：获取布局宽度（整数，包含 padding 和 border）
        const widthOffset = element2.offsetWidth;

        // 方法 2：获取精确渲染宽度（含小数，受 transform: scale 等影响后的视觉宽度）
        const widthRect = element2.getBoundingClientRect().width;

        console.log(`ctl00_ContentPlaceHolder1_probox offsetWidth: ${widthOffset}px`);
        console.log(`ctl00_ContentPlaceHolder1_probox 精确渲染宽度: ${widthRect}px`);
    }

    const element1 = document.getElementById("div_mb");
    if (element1) {
        // 方法 1：获取布局宽度（整数，包含 padding 和 border）
        const widthOffset = element1.offsetWidth;

        // 方法 2：获取精确渲染宽度（含小数，受 transform: scale 等影响后的视觉宽度）
        const widthRect = element1.getBoundingClientRect().width;

        console.log(`div_mb offsetWidth: ${widthOffset}px`);
        console.log(`div_mb 精确渲染宽度: ${widthRect}px`);
    }

})();
