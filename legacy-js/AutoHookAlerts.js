// ==UserScript==
// @name         Hook Alerts in All Frames
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  自动覆盖 我的票夹页面 alert/confirm/prompt 并在调用时进入 debugger，适用于所有 iframe，包括动态加载
// @author       XANA
// @match        http://wsyy.cw.scut.edu.cn/*
// @match        https://wsyy.cw.scut.edu.cn/*
// @match        http://wsyy-cw.webvpn.scut.edu.cn/*
// @match        https://wsyy-cw.webvpn.scut.edu.cn/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log("[Tampermonkey] Hook Alerts script started");
    console.log("window.frames.length:",window.frames.length);

    /** Hook 目标窗口的 alert/confirm/prompt */
    function hookWindow(win, frameName) {
        try {
            if (win._alertHooked) return; // 避免重复 Hook
            console.log("currentUrl:", win.location.href," ,frameName:",frameName);
            win.alert = function (message) {
                console.log("Alert in frame:", frameName, " ,currentUrl:", win.location.href," , message:", message);
                debugger;
            };
            win.confirm = function (message) {
                console.log("Confirm in frame:", frameName, " ,currentUrl:", win.location.href," , message:", message);
                debugger;
                return true; // 或根据需要返回 false
            };
            win.prompt = function (message, defaultValue) {
                console.log("Prompt in frame:", frameName, " ,currentUrl:", win.location.href," , message:", message);
                debugger;
                return defaultValue;
            };
            win._alertHooked = true;
        } catch (e) {
            console.warn("Cannot hook frame:", frameName, e);
        }
    }

    /** Hook 所有当前已有的 frame */
    function hookAllFrames() {
        hookWindow(window, 'top');

        for (let i = 0; i < window.frames.length; i++) {
            hookWindow(window.frames[i], `frame-${i}`);
        }
    }

    // 页面初始 Hook
    hookAllFrames();

    // 动态检测新出现的 iframe
    setInterval(() => {
        //console.log("window.frames.length:",window.frames.length);
        hookAllFrames();
    }, 1000);

})();
