/**
 * search.js — поиск по JSON дереву
 */

/**
 * Строит RegExp для поиска по запросу с заданными опциями.
 * Чистая функция — не зависит от DOM.
 * Флаг `g` не включается — добавляйте его при необходимости.
 * @param {string} query
 * @param {{ caseSensitive?: boolean, wholeWord?: boolean }} options
 * @returns {RegExp|null}
 */
function buildSearchRegex(query, options) {
  if (!query) return null;
  options = options || {};
  var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var flags   = options.caseSensitive ? '' : 'i';
  var pattern = options.wholeWord ? '\\b' + escaped + '\\b' : escaped;
  try {
    return new RegExp(pattern, flags);
  } catch (e) {
    return null;
  }
}

/* ── DOM-зависимая часть (только в браузере) ─────────────────────────────── */
if (typeof document !== 'undefined') {
  (function () {
    'use strict';

    var matches         = [];
    var currentIdx      = -1;
    var searchContainer = null; // контейнер, в котором сделали highlight

    /* DOM-ссылки — инициализируются в init() */
    var searchPanel, searchInput, searchCounter;
    var btnSearchOpen, btnSearchPrev, btnSearchNext, btnSearchClose;
    var chkCaseSensitive, chkWholeWord;
    var treeContainer, rawContainer;

    /* ── Инициализация ──────────────────────────────────────────────────── */
    function init() {
      searchPanel      = document.getElementById('search-panel');
      searchInput      = document.getElementById('search-input');
      searchCounter    = document.getElementById('search-counter');
      btnSearchOpen    = document.getElementById('btn-search-open');
      btnSearchPrev    = document.getElementById('btn-search-prev');
      btnSearchNext    = document.getElementById('btn-search-next');
      btnSearchClose   = document.getElementById('btn-search-close');
      chkCaseSensitive = document.getElementById('search-case-sensitive');
      chkWholeWord     = document.getElementById('search-whole-word');
      treeContainer    = document.getElementById('tree-container');
      rawContainer     = document.getElementById('raw-container');

      if (!searchPanel) return;

      btnSearchOpen  && btnSearchOpen.addEventListener('click',  openSearch);
      btnSearchClose && btnSearchClose.addEventListener('click', closeSearch);
      btnSearchNext  && btnSearchNext.addEventListener('click',  function () { navigate(1); });
      btnSearchPrev  && btnSearchPrev.addEventListener('click',  function () { navigate(-1); });

      searchInput && searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); navigate(e.shiftKey ? -1 : 1); }
      });

      searchInput && searchInput.addEventListener('input', performSearch);

      chkCaseSensitive && chkCaseSensitive.addEventListener('change', performSearch);
      chkWholeWord     && chkWholeWord.addEventListener('change',     performSearch);

      /* Ctrl+F / Cmd+F открывает поиск во вкладке «Дерево»;
         Escape закрывает панель поиска из любого места */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          if (searchPanel && searchPanel.style.display !== 'none') {
            e.preventDefault();
            closeSearch();
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          var fmtView = document.getElementById('view-formatter');
          if (fmtView && fmtView.style.display !== 'none') {
            e.preventDefault();
            openSearch();
          }
        }
      });
    }

    /* ── Открыть / закрыть панель ───────────────────────────────────────── */
    function openSearch() {
      if (!searchPanel) return;
      searchPanel.style.display = '';
      searchInput && searchInput.focus();
      searchInput && searchInput.select();
    }

    function closeSearch() {
      if (!searchPanel) return;
      searchPanel.style.display = 'none';
      removeAllHighlights();
      matches     = [];
      currentIdx  = -1;
      updateCounter();
    }

    /* ── Выполнить поиск ────────────────────────────────────────────────── */
    function performSearch() {
      var query = searchInput ? searchInput.value : '';

      /* Убираем старые подсветки */
      removeAllHighlights();
      matches    = [];
      currentIdx = -1;

      if (!query) { updateCounter(); return; }

      var options = {
        caseSensitive: chkCaseSensitive ? chkCaseSensitive.checked : false,
        wholeWord:     chkWholeWord     ? chkWholeWord.checked     : false
      };

      /* Определяем активный контейнер */
      var container = null;
      if (treeContainer && treeContainer.style.display !== 'none') {
        container = treeContainer;
      } else if (rawContainer && rawContainer.style.display !== 'none') {
        container = rawContainer;
      }

      if (!container || !container.querySelector('pre,span')) {
        updateCounter(); return;
      }

      searchContainer = container;
      matches = highlightInContainer(container, query, options);

      if (matches.length > 0) {
        currentIdx = 0;
        activateMatch(0);
      }

      updateCounter();
    }

    /* ── Навигация ──────────────────────────────────────────────────────── */
    function navigate(delta) {
      if (matches.length === 0) return;
      if (currentIdx >= 0 && matches[currentIdx]) {
        matches[currentIdx].classList.remove('search-highlight-current');
      }
      currentIdx = (currentIdx + delta + matches.length) % matches.length;
      activateMatch(currentIdx);
      updateCounter();
    }

    function activateMatch(idx) {
      if (idx < 0 || idx >= matches.length) return;
      var el = matches[idx];
      el.classList.add('search-highlight-current');
      expandParents(el);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /* ── Раскрыть свёрнутые родительские узлы ──────────────────────────── */
    function expandParents(el) {
      if (!treeContainer) return;
      var node = el.parentElement;
      while (node && node !== treeContainer) {
        if (node.id && node.style.display === 'none') {
          var toggle = treeContainer.querySelector('[data-target="' + node.id + '"]');
          if (toggle) {
            node.style.display = '';
            toggle.textContent = '▼';
            toggle.classList.remove('collapsed');
            var preview = document.getElementById(node.id + '-preview');
            if (preview) preview.style.display = 'none';
          }
        }
        node = node.parentElement;
      }
    }

    /* ── Подсветка текстовых узлов ──────────────────────────────────────── */
    function highlightInContainer(container, query, options) {
      var found   = [];
      var baseRe  = buildSearchRegex(query, options);
      if (!baseRe) return found;
      /* Добавляем флаг 'g' для итеративного exec() */
      var regex   = new RegExp(baseRe.source, baseRe.flags + 'g');

      var walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            var p = node.parentElement;
            if (!p) return NodeFilter.FILTER_REJECT;
            /* Не трогаем тексты кнопок/тоглов и превью-подсказок */
            if (p.classList.contains('json-toggle'))  return NodeFilter.FILTER_REJECT;
            if (p.classList.contains('json-preview')) return NodeFilter.FILTER_REJECT;
            if (p.tagName === 'BUTTON')               return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      /* Собираем все текстовые узлы заранее — изменение DOM во время обхода
         может нарушить порядок итерации */
      var textNodes = [];
      var tn;
      while ((tn = walker.nextNode())) textNodes.push(tn);

      textNodes.forEach(function (textNode) {
        var text = textNode.textContent;
        regex.lastIndex = 0;

        var parts     = [];
        var lastIndex = 0;
        var match;
        var hasMatch  = false;

        while ((match = regex.exec(text)) !== null) {
          hasMatch = true;
          if (match.index > lastIndex) {
            parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          var mark = document.createElement('mark');
          mark.className = 'search-highlight';
          mark.textContent = match[0];
          parts.push(mark);
          found.push(mark);
          lastIndex = match.index + match[0].length;
          if (match[0].length === 0) { regex.lastIndex++; } /* защита от нулевой ширины */
        }

        if (hasMatch && textNode.parentNode) {
          if (lastIndex < text.length) {
            parts.push(document.createTextNode(text.slice(lastIndex)));
          }
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) { frag.appendChild(p); });
          textNode.parentNode.replaceChild(frag, textNode);
        }
      });

      return found;
    }

    /* ── Удалить все подсветки ──────────────────────────────────────────── */
    function removeAllHighlights() {
      var containers = searchContainer
        ? [searchContainer]
        : [treeContainer, rawContainer];
      containers.forEach(function (c) { if (c) removeHighlights(c); });
      searchContainer = null;
    }

    function removeHighlights(container) {
      var marks = container.querySelectorAll('mark.search-highlight');
      marks.forEach(function (mark) {
        var parent = mark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent), mark);
          parent.normalize();
        }
      });
    }

    /* ── Счётчик ────────────────────────────────────────────────────────── */
    function updateCounter() {
      if (!searchCounter) return;
      var q = searchInput ? searchInput.value : '';
      if (!q)                  { searchCounter.textContent = ''; return; }
      if (matches.length === 0){ searchCounter.textContent = '0 результатов'; return; }
      searchCounter.textContent = (currentIdx + 1) + ' из ' + matches.length;
    }

    /* ── Публичный API (вызывается из app.js) ───────────────────────────── */
    window.searchAPI = {
      init: init,

      /** Повторно применить поиск (после перерендера дерева). */
      rerunSearch: function () {
        if (searchPanel && searchPanel.style.display !== 'none' &&
            searchInput && searchInput.value) {
          performSearch();
        }
      },

      /** Сбросить подсветки и счётчик (не закрывая панель). */
      clearHighlights: function () {
        removeAllHighlights();
        matches    = [];
        currentIdx = -1;
        updateCounter();
      }
    };

  }()); /* end IIFE */
} /* end if document */
