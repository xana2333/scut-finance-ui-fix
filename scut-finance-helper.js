// ==UserScript==
// @name         SCUT Finance Helper
// @name:zh      SCUT财务系统小助手
// @namespace    https://github.com/xana2333/scut-finance-ui-fix
// @version      1.0.0
// @description  SCUT网上报账系统 & 财务查询系统辅助小工具：UI修正功能、自动化批量操作，让报账更高效流畅。
// @author       XANA
// @homepage     https://github.com/xana2333/scut-finance-ui-fix
// @supportURL   https://github.com/xana2333/scut-finance-ui-fix
// @updateURL    https://raw.githubusercontent.com/xana2333/scut-finance-ui-fix/refs/heads/main/AutoDeleteInvoices.js
// @downloadURL  https://raw.githubusercontent.com/xana2333/scut-finance-ui-fix/refs/heads/main/AutoDeleteInvoices.js
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

(function() {
    'use strict';

    /** ==== 持久化配置文件相关 ==== **/
    const CONFIG_KEY = 'tampermonkeyuserConfig';
    const defaultConfig = {
        enable_OnlineReimbursement_OverridePopup: true,                              // 网上报账系统-覆写弹窗功能(跳过弹窗)

        enableAuto_OnlineReimbursement_BatchDeleteInvoice: true,                     // 网上报账系统-批量删除发票功能
        enableAuto_OnlineReimbursement_BatchInvoiceBindingToggle: true,              // 网上报账系统-批量绑定/取消绑定发票功能
        enableAuto_OnlineReimbursement_SelectAddedFundsInDailyReimbursement: true,   // 网上报账系统-自动选中日常报销中已添加经费

        enablefixUI_OnlineReimbursement_TaxInvoiceEntryPageHeight: true,            // 修正网上报账系统UI-税票录入页面高度问题
        enablefixUI_OnlineReimbursement_ProjectSelectPageTableHeight: true,         // 修正网上报账系统UI-项目选择（经费选择）页面表格高度问题
        enablefixUI_OnlineReimbursement_ExpenseDetailPageTableHeight: true,         // 修正网上报账系统UI-费用明细页面表格高度问题

        enablefixUI_FinanceQuery_UiMisalignment: true,           // 修正财务查询系统UI-首页表格错位问题
        enablefixUI_FinanceQuery_TableCannotExpandFully: true    // 修正财务查询系统UI-表格无法完全展开问题
    };

    // 功能描述，用于菜单显示
    const FEATURE_LABELS = {
        enable_OnlineReimbursement_OverridePopup: '网上报账-覆写弹窗功能(跳过弹窗)',
        enableAuto_OnlineReimbursement_BatchDeleteInvoice: '网上报账-批量删除发票功能',
        enableAuto_OnlineReimbursement_BatchInvoiceBindingToggle: '网上报账-批量绑定/取绑发票功能',
        enableAuto_OnlineReimbursement_SelectAddedFundsInDailyReimbursement: '网上报账-自动选中日常报销已添加经费',
        enablefixUI_OnlineReimbursement_TaxInvoiceEntryPageHeight: '网上报账修正UI-绑定发票表格高度',
        enablefixUI_OnlineReimbursement_ProjectSelectPageTableHeight: '网上报账修正UI-经费选择表格高度',
        enablefixUI_OnlineReimbursement_ExpenseDetailPageTableHeight: '网上报账修正UI-费用明细表格高度',
        enablefixUI_FinanceQuery_UiMisalignment: '财务查询修正UI-首页表格错位',
        enablefixUI_FinanceQuery_TableCannotExpandFully: '财务查询修正UI-表格无法完全展开'
    };

    // 控制菜单排序的数组
    const MENU_ORDER = [
        'enable_OnlineReimbursement_OverridePopup',
        'enableAuto_OnlineReimbursement_BatchDeleteInvoice',
        'enableAuto_OnlineReimbursement_BatchInvoiceBindingToggle',
        'enableAuto_OnlineReimbursement_SelectAddedFundsInDailyReimbursement',
        'enablefixUI_OnlineReimbursement_TaxInvoiceEntryPageHeight',
        'enablefixUI_OnlineReimbursement_ProjectSelectPageTableHeight',
        'enablefixUI_OnlineReimbursement_ExpenseDetailPageTableHeight',
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














})();