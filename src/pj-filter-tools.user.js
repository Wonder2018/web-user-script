// ==UserScript==
// @name         52pojie主题筛选工具
// @namespace    http://tampermonkey.net/
// @version      0.0.1-b20241118
// @description  try to take over the world!
// @author       wonder2018
// @match        https://www.52pojie.cn/forum*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=52pojie.cn
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'
  const tableSelector = `div#threadlist table`
  const appendSelector = `ul#thread_types`
  const allHideTypes = ['hide-by-solved', 'hide-by-reply', 'hide-by-lt-cb']
  const btnList = []
  function createBtn(text, color) {
    const btn = document.createElement('li')
    btn.innerHTML = `<a style="background-color:${color};border-radius:5px;color:#fff;pointer-events:none;">${text}</a>`
    btnList.push(btn)
    return btn
  }

  function recoverByType(type) {
    /** @type {HTMLTableSectionElement[]} */
    const lines = [...document.querySelectorAll(`${tableSelector}>tbody[id*=normalthread_][${type}]`)]
    lines.forEach(i => {
      i.setAttribute(type, false)
      if (allHideTypes.every(t => !i.getAttribute(t) || i.getAttribute(t) == 'false')) {
        i.style.display = ''
      }
    })
  }

  window.addEventListener('load', () => {
    // #region 移除已解决
    {
      const filterNonSolvedBtn = createBtn('移除已解决', '#66ccff')
      filterNonSolvedBtn.addEventListener('click', () => {
        /** @type {HTMLTableSectionElement[]} */
        const lines = [...document.querySelectorAll(`${tableSelector}>tbody[id*=normalthread_]`)]
        lines.forEach(i => {
          if (!(i.innerText || '').includes('已解决')) return
          i.setAttribute('hide-by-solved', true)
          i.style.display = 'none'
        })
      })
    }
    // #endregion 移除已解决

    // #region 还原已解决
    {
      const showNonSolvedBtn = createBtn('还原已解决', '#66ccff')
      showNonSolvedBtn.addEventListener('click', () => recoverByType('hide-by-solved'))
    }
    // #endregion 还原已解决

    // #region 移除回复多余x
    {
      const filterByReply = createBtn(`移除回复多余 <input style="width:2em;height:1em;pointer-events:all;"/>`, '#66ccff')
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
          i.setAttribute('hide-by-reply', true)
          i.style.display = 'none'
        })
      })
    }
    // #endregion 移除回复多余

    // #region 还原回复多余x
    {
      const showByReply = createBtn('还原回复多余x', '#66ccff')
      showByReply.addEventListener('click', () => recoverByType('hide-by-reply'))
    }
    // #endregion 还原已解决

    // #region 移除CB少于x
    {
      const filterByCB = createBtn(`移除CB少于 <input style="width:2em;height:1em;pointer-events:all;"/>`, '#66ccff')
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
          i.setAttribute('hide-by-lt-cb', true)
          i.style.display = 'none'
        })
      })
    }
    // #endregion 移除CB少于x

    // #region 还原CB少于x
    {
      const showByReply = createBtn('还原CB少于x', '#66ccff')
      showByReply.addEventListener('click', () => recoverByType('hide-by-lt-cb'))
    }
    // #endregion 还原CB少于x

    btnList.forEach(i => document.querySelector(appendSelector).appendChild(i))
  })
})()
