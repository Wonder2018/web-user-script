// ==UserScript==
// @name         52pojie主题筛选工具
// @namespace    http://tampermonkey.net/
// @version      0.0.1-b20241118
// @description  try to take over the world!
// @author       wonder2018
// @license      CC-BY-4.0 license
// @match        https://www.52pojie.cn/forum*
// @icon         http://52pojie.cn/favicon.ico
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// ==/UserScript==

;(function () {
  'use strict'
  // #region 初始化
  const tableSelector = `div#threadlist table`
  const appendSelector = `ul#thread_types`
  const sideBtnWrapId = `filterBox`
  const sideBtnWrapSelector = `ul#${sideBtnWrapId}`
  const allHideTypes = new Set()
  const filterBtnColor = '#66ccff'
  const showBtnColor = 'goldenrod'
  /** @type {HTMLLIElement[]} */
  const btnList = []
  const availableTools = [
    { switchName: '移除已解决', switchKey: 'useFilterBySolved', init: filterBySolved, menuId: null },
    { switchName: '移除回复多于x', switchKey: 'useFilterByReplyGt', init: filterByReplyGt, menuId: null },
    { switchName: '移除CB少于x', switchKey: 'useFilterByCBLt', init: filterByCBLt, menuId: null },
    { switchName: '正则过滤', switchKey: 'useFilterByRegExp', init: filterByRegExp, menuId: null },
  ]
  const dftPJOpts = availableTools.reduce((p, i) => ((p[i.switchKey] = true), p), { showPos: 2 })
  dftPJOpts.useFilterByRegExp = false
  let togglePosMenuId = null
  // #endregion 初始化

  // #region 样式

  // #region 样式 > 基础样式
  GM_addStyle(`
    .pj-btn {
      border-radius: 5px;
      color: #fff;
      cursor: pointer;
    }
    .pj-btn>input.pj-ctl{
      width:2em;
      height:1em;
      pointer-events:all;
      text-align:center;
    }
  `)

  // #endregion 样式 > 基础样式

  // #region 样式 > fixed mode box
  GM_addStyle(`
    ${sideBtnWrapSelector} {
      position: fixed;
      top: 50%;
      right: 0;
      padding: 40px 20px;
      flex-direction: row;
      z-index: 99999;
      display: flex;
      flex-wrap: wrap;
      width: 295px;
      transform: translate(95%, -50%);
      transition: .3s;
      transition-delay: .3s;
    }

    ${sideBtnWrapSelector}:hover{
      transform: translate(0, -50%);
      transition-delay: 0s;
    }

    ${sideBtnWrapSelector}::after{
      content: '<';
      position: absolute;
      display: block;
      width: 30px;
      height: 50px;
      line-height: 50px;
      text-align: center;
      background-color: #66ccff;
      top: 0;
      bottom: 0;
      margin: auto;
      left: -40px;
      margin-left: 20px;
      font-weight: bold;
      color: rgb(0, 102, 255);
      border-radius: 5px;
    }

    ${sideBtnWrapSelector}>li {
      margin: 5px 0;
      flex-grow: 1;
      flex-basis: 40%;
    }
    ${sideBtnWrapSelector}>li>a {
      padding: 10px;
      border-color: rgb(0,102,255);
      border-radius: 5px;
      background-color: white;
      color: rgb(0,102,255);
      margin-right: 10px;
      box-shadow: rgb(207,207,207) 1px 1px 9px 3px;
      text-decoration: none;
      display: block;
      transition: .3s;
    }
    ${sideBtnWrapSelector}>li>a:hover {
      box-shadow: #888 1px 1px 9px 3px;
    }
    ${sideBtnWrapSelector}>li>a>input {
      float:right;
    }
  `)
  // #endregion > fixed mode box

  // #endregion 样式

  // #region 菜单
  const OPTION_KEY = 'PJ_FILTER_OPT'

  const showPosList = ['移除按钮', '列表头部', '窗口右侧']

  /** @type {typeof dftPJOpts} */
  const options = JSON.parse(GM_getValue(OPTION_KEY, JSON.stringify(dftPJOpts)))
  function saveOpt() {
    regMenu()
    GM_setValue(OPTION_KEY, JSON.stringify(options))
  }

  function toggleBtnPos(type = options.showPos) {
    options.showPos = (type || 0) % 3
    saveOpt()
    if (options.showPos === 0) return removeAllBtn()
    if (options.showPos === 1) return showBtnTableHead()
    if (options.showPos === 2) return showBtnFixed()
  }
  /** @param {(typeof availableTools)[number]} type */
  function togglePJToolUse(type) {
    if (type.switchKey === 'useFilterByRegExp') return changeRegExpFilter(type)
    options[type.switchKey] = !options[type.switchKey]
    saveOpt()
    initPJTools()
  }

  /** @param {(typeof availableTools)[number]} type */
  function changeRegExpFilter(type) {
    if (type.switchKey !== 'useFilterByRegExp') return
    let reg = prompt('输入正则表达式（留空点击确定可关闭此功能）', options[type.switchKey] || '')
    // 点击取消时不做任何操作
    if (typeof reg !== 'string') return
    reg = reg.trim()
    const regObj = strToRegExp(reg.trim())
    if (!(regObj instanceof RegExp) && regObj != null) return alert(`输入的正则表达式有误请检查：${reg}`)
    options[type.switchKey] = !!regObj && `/${regObj.source}/${regObj.flags}`
    saveOpt()
    initPJTools()
  }

  function initPJTools() {
    loadBtnByOpts()
    toggleBtnPos(options.showPos)
  }

  function regToggleBtnPosMenu() {
    if (togglePosMenuId != null) GM_unregisterMenuCommand(togglePosMenuId)
    togglePosMenuId = GM_registerMenuCommand(`切换按钮位置：[${showPosList[options.showPos]}]`, () => toggleBtnPos(options.showPos + 1))
  }

  /** @param {(typeof availableTools)[number]} type */
  function regToolsMenu(type) {
    if (type.switchKey === 'useFilterByRegExp') return regRegExpFilterMenu(type)
    if (type.menuId != null) GM_unregisterMenuCommand(type.menuId)
    type.menuId = GM_registerMenuCommand(`${type.switchName}[${options[type.switchKey] ? '开' : '关'}]`, () => togglePJToolUse(type))
  }

  /** @param {(typeof availableTools)[number]} type */
  function regRegExpFilterMenu(type) {
    if (type.switchKey !== 'useFilterByRegExp') return null
    if (type.menuId != null) GM_unregisterMenuCommand(type.menuId)
    type.menuId = GM_registerMenuCommand(`${type.switchName}[${options[type.switchKey] || '关'}]`, () => togglePJToolUse(type))
  }

  function regMenu() {
    regToggleBtnPosMenu()
    availableTools.forEach(i => regToolsMenu(i))
  }
  // #endregion 菜单

  // #region utils
  function createBtn(text, color) {
    const btn = document.createElement('li')
    btn.classList.add('pj-btn-wrap')
    btn.innerHTML = `<a class="pj-btn" style="background-color:${color};">${text}</a>`
    btnList.push(btn)
    return btn
  }

  /** 处理还原隐藏帖子事件 */
  function recoverByType(type) {
    /** @type {HTMLTableSectionElement[]} */
    const lines = [...document.querySelectorAll(`${tableSelector}>tbody[id*=normalthread_][${type}]`)]
    lines.forEach(i => {
      i.setAttribute(type, false)
      if ([...allHideTypes].every(t => !i.getAttribute(t) || i.getAttribute(t) == 'false')) {
        i.style.display = ''
      }
    })
  }

  /** 根据配置项初始化所有按钮 */
  function loadBtnByOpts() {
    // 移除已添加的按钮，和附带元素（比如fixed模式下的按钮容器）
    removeAllBtn()
    // 确保所有按钮都被移除再清空数组
    btnList.forEach(i => i.remove())
    btnList.length = 0
    availableTools.filter(i => options[i.switchKey]).forEach(i => i.init())
  }

  /** 按钮显示到列表头部 */
  function removeAllBtn() {
    btnList.forEach(i => i.remove())
    const sideBtnWrap = document.querySelector(sideBtnWrapSelector)
    sideBtnWrap && sideBtnWrap.remove()
  }

  /** 按钮显示到列表头部 */
  function showBtnTableHead() {
    const appendTarget = document.querySelector(appendSelector)
    if (!appendTarget) return console.warn('不是论坛列表页，不添加按钮。')
    btnList.forEach(i => appendTarget.appendChild(i))
    const sideBtnWrap = document.querySelector(sideBtnWrapSelector)
    sideBtnWrap && sideBtnWrap.remove()
  }

  /** 按钮固定在窗口右侧 */
  function showBtnFixed() {
    if (!btnList.length) return
    const filterButtonBox = document.createElement('ul')
    filterButtonBox.id = sideBtnWrapId
    btnList.forEach(i => filterButtonBox.appendChild(i))
    document.body.appendChild(filterButtonBox)
  }

  /** 字符串转正则表达式 */
  function strToRegExp(str) {
    if (!str || typeof str !== 'string') return null
    try {
      str = str.trim()
      const part = str.match(/^\/(.+?)\/(\w*)$/)
      /** @type {RegExp} */
      let regObj = null
      if (part) {
        regObj = new RegExp(part[1], part[2])
      } else if (str) {
        regObj = new RegExp(str, 'i')
      }
      return regObj
    } catch (error) {
      return new Error('错误的正则表达式！')
    }
  }

  // #endregion utils

  // #region 脚本功能

  /** 移除已解决 */
  function filterBySolved() {
    const hideType = 'hide-by-solved'
    allHideTypes.add(hideType)
    const filterNonSolvedBtn = createBtn('移除已解决', filterBtnColor)
    filterNonSolvedBtn.addEventListener('click', () => {
      /** @type {HTMLTableSectionElement[]} */
      const lines = [...document.querySelectorAll(`${tableSelector}>tbody[id*=normalthread_]`)]
      lines.forEach(i => {
        if (!(i.innerText || '').includes('已解决')) return
        i.setAttribute(hideType, true)
        i.style.display = 'none'
      })
    })
    createBtn('还原已解决', showBtnColor).addEventListener('click', () => recoverByType(hideType))
  }
  /** 移除回复多于x */
  function filterByReplyGt() {
    const hideType = 'hide-by-reply-gt'
    allHideTypes.add(hideType)
    const filterByReply = createBtn(`移除回复多于 <input class="pj-ctl"/>`, filterBtnColor)
    const replyCount = filterByReply.querySelector('input')
    replyCount.addEventListener('click', e => e.stopPropagation())
    replyCount.value = 0
    filterByReply.addEventListener('click', () => {
      const maxCount = replyCount.value
      /** @type {HTMLTableSectionElement[]} */
      const lines = [...document.querySelectorAll(`${tableSelector}>tbody[id*=normalthread_]`)]
      lines.forEach(i => {
        const countEl = i.querySelector('tr>td.num>.xi2')
        if (parseInt(countEl.innerText) <= maxCount) return
        i.setAttribute(hideType, true)
        i.style.display = 'none'
      })
    })
    createBtn('还原回复多于x', showBtnColor).addEventListener('click', () => recoverByType(hideType))
  }
  /** 移除CB少于x */
  function filterByCBLt() {
    const hideType = 'hide-by-cb-lt'
    allHideTypes.add(hideType)
    const filterByCB = createBtn(`移除CB少于 <input class="pj-ctl"/>`, filterBtnColor)
    const CBCount = filterByCB.querySelector('input')
    CBCount.addEventListener('click', e => e.stopPropagation())
    CBCount.value = 0
    filterByCB.addEventListener('click', () => {
      const minCount = CBCount.value
      /** @type {HTMLTableSectionElement[]} */
      const lines = [...document.querySelectorAll(`${tableSelector}>tbody[id*=normalthread_]`)]
      lines.forEach(i => {
        const cb = parseInt(i.innerText.replaceAll('\n', '').replace(/.*悬赏\s*(\d+)\s*CB\s*吾爱币.*/, '$1'))
        if (cb >= minCount) return
        i.setAttribute(hideType, true)
        i.style.display = 'none'
      })
    })
    createBtn('还原CB少于x', showBtnColor).addEventListener('click', () => recoverByType(hideType))
  }

  /** 正则过滤 */
  function filterByRegExp() {
    const hideType = 'hide-by-reg-exp'
    allHideTypes.add(hideType)
    const filterByRegExp = createBtn(`正则过滤`, filterBtnColor)
    filterByRegExp.addEventListener('click', () => {
      /** @type {HTMLTableSectionElement[]} */
      const lines = [...document.querySelectorAll(`${tableSelector}>tbody[id*=normalthread_]`)]
      const regObj = strToRegExp(options.useFilterByRegExp)
      if (!(regObj instanceof RegExp)) return
      lines.forEach(i => {
        if (!regObj.test(i.innerText.replaceAll('\n', ''))) return
        i.setAttribute(hideType, true)
        i.style.display = 'none'
      })
    })
    createBtn('还原正则过滤', showBtnColor).addEventListener('click', () => recoverByType(hideType))
  }

  // #endregion 脚本功能

  window.addEventListener('load', () => {
    regMenu()
    const appendTarget = document.querySelector(appendSelector)
    if (!appendTarget) return console.warn('不是论坛列表页，不添加按钮。')
    initPJTools()
  })
})()
