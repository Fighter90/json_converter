/**
 * app.js — основная логика приложения
 */

(function () {
  'use strict';

  // ── DOM-ссылки ─────────────────────────────────────────────────────────────
  var inputEl       = document.getElementById('json-input');
  var validateBtn   = document.getElementById('btn-validate');
  var formatBtn     = document.getElementById('btn-format');
  var minifyBtn     = document.getElementById('btn-minify');
  var clearBtn      = document.getElementById('btn-clear');
  var convertBtn    = document.getElementById('btn-convert');

  var statusBar     = document.getElementById('status-bar');

  var tabFormatter  = document.getElementById('tab-formatter');
  var tabTable      = document.getElementById('tab-table');
  var tabStats      = document.getElementById('tab-stats');

  var formatterView = document.getElementById('view-formatter');
  var tableView     = document.getElementById('view-table');
  var statsView     = document.getElementById('view-stats');

  var treeContainer = document.getElementById('tree-container');
  var rawContainer  = document.getElementById('raw-container');
  var tableContainer= document.getElementById('table-container');
  var statsContainer= document.getElementById('stats-container');

  var tableSearch   = document.getElementById('table-search');
  var tableInfo     = document.getElementById('table-info');

  var btnDownloadJson = document.getElementById('btn-dl-json');
  var btnDownloadCsv  = document.getElementById('btn-dl-csv');
  var btnDownloadTxt  = document.getElementById('btn-dl-txt');

  var btnExpandAll    = document.getElementById('btn-expand-all');
  var btnCollapseAll  = document.getElementById('btn-collapse-all');
  var btnViewTree     = document.getElementById('btn-view-tree');
  var btnViewRaw      = document.getElementById('btn-view-raw');

  var exampleBtns   = document.querySelectorAll('.example-btn');

  // ── Состояние ──────────────────────────────────────────────────────────────
  var currentData   = null;
  var currentRaw    = '';
  var currentView   = 'tree'; // 'tree' | 'raw'

  // ── Инициализация ──────────────────────────────────────────────────────────
  initTableExpandHandlers(tableContainer);
  initTreeToggleHandler();

  // ── Вкладки ────────────────────────────────────────────────────────────────
  tabFormatter.addEventListener('click', function () { showView('formatter'); });
  tabTable.addEventListener('click', function () { showView('table'); });
  tabStats.addEventListener('click', function () { showView('stats'); });

  function showView(name) {
    [tabFormatter, tabTable, tabStats].forEach(function (t) { t.classList.remove('active'); });
    [formatterView, tableView, statsView].forEach(function (v) { v.style.display = 'none'; });
    if (name === 'formatter') { tabFormatter.classList.add('active'); formatterView.style.display = ''; }
    if (name === 'table')     { tabTable.classList.add('active');     tableView.style.display = '';     }
    if (name === 'stats')     { tabStats.classList.add('active');     statsView.style.display = '';     }
  }

  // ── Переключение Tree / Raw ────────────────────────────────────────────────
  btnViewTree && btnViewTree.addEventListener('click', function () {
    currentView = 'tree';
    btnViewTree.classList.add('active');
    btnViewRaw && btnViewRaw.classList.remove('active');
    treeContainer.style.display = '';
    rawContainer.style.display = 'none';
  });

  btnViewRaw && btnViewRaw.addEventListener('click', function () {
    currentView = 'raw';
    btnViewRaw.classList.add('active');
    btnViewTree && btnViewTree.classList.remove('active');
    rawContainer.style.display = '';
    treeContainer.style.display = 'none';
  });

  // ── Кнопки действий ───────────────────────────────────────────────────────
  validateBtn && validateBtn.addEventListener('click', function () {
    var text = inputEl.value.trim();
    if (!text) { showStatus('Введите JSON для валидации.', 'warning'); return; }
    var result = parseJSON(text);
    if (result.ok) {
      showStatus('✓ Валидный JSON', 'success');
    } else {
      var loc = result.line ? ' (строка ' + result.line + ', позиция ' + result.col + ')' : '';
      showStatus('✗ Ошибка: ' + result.message + loc, 'danger');
    }
  });

  formatBtn && formatBtn.addEventListener('click', function () {
    var text = inputEl.value.trim();
    if (!text) { showStatus('Введите JSON для форматирования.', 'warning'); return; }
    var result = parseJSON(text);
    if (!result.ok) {
      var loc = result.line ? ' (строка ' + result.line + ', позиция ' + result.col + ')' : '';
      showStatus('✗ Ошибка: ' + result.message + loc, 'danger');
      return;
    }
    inputEl.value = formatJSON(result.data, 2);
    showStatus('✓ JSON отформатирован.', 'success');
  });

  minifyBtn && minifyBtn.addEventListener('click', function () {
    var text = inputEl.value.trim();
    if (!text) { showStatus('Введите JSON для минификации.', 'warning'); return; }
    var result = parseJSON(text);
    if (!result.ok) {
      showStatus('✗ Ошибка: ' + result.message, 'danger');
      return;
    }
    inputEl.value = minifyJSON(result.data);
    showStatus('✓ JSON минифицирован.', 'success');
  });

  clearBtn && clearBtn.addEventListener('click', function () {
    inputEl.value = '';
    currentData = null;
    currentRaw = '';
    treeContainer.innerHTML = '<p class="text-muted m-3">Введите JSON и нажмите «Конвертировать».</p>';
    rawContainer.innerHTML = '';
    tableContainer.innerHTML = '<p class="text-muted m-3">Введите JSON и нажмите «Конвертировать».</p>';
    statsContainer.innerHTML = '<p class="text-muted m-3">Введите JSON и нажмите «Конвертировать».</p>';
    tableInfo.textContent = '';
    tableSearch.value = '';
    showStatus('', '');
  });

  convertBtn && convertBtn.addEventListener('click', function () {
    var text = inputEl.value.trim();
    if (!text) { showStatus('Введите JSON для конвертации.', 'warning'); return; }
    var result = parseJSON(text);
    if (!result.ok) {
      var loc = result.line ? ' (строка ' + result.line + ', позиция ' + result.col + ')' : '';
      showStatus('✗ Ошибка: ' + result.message + loc, 'danger');
      return;
    }
    currentData = result.data;
    currentRaw = text;

    // Formatter: дерево
    treeContainer.innerHTML = '<pre class="json-tree m-0">' + buildCollapsibleTree(currentData, 0) + '</pre>';
    // Formatter: raw highlight
    rawContainer.innerHTML = '<pre class="json-raw m-0">' + syntaxHighlight(formatJSON(currentData, 2)) + '</pre>';

    // Table
    var tableResult = buildTable(currentData);
    tableContainer.innerHTML = tableResult.html;
    tableInfo.textContent = tableResult.rows + ' строк, ' + tableResult.cols + ' колонок';

    // Stats
    renderStats(currentData);

    showStatus('✓ Конвертация выполнена.', 'success');
    showView('formatter');
  });

  // ── Поиск по таблице ───────────────────────────────────────────────────────
  tableSearch && tableSearch.addEventListener('input', function () {
    filterTable(tableSearch.value);
  });

  // ── Экспорт ───────────────────────────────────────────────────────────────
  btnDownloadJson && btnDownloadJson.addEventListener('click', function () {
    if (!currentData) { showStatus('Сначала выполните конвертацию.', 'warning'); return; }
    downloadBlob(formatJSON(currentData, 2), 'data.json', 'application/json;charset=utf-8');
  });

  btnDownloadCsv && btnDownloadCsv.addEventListener('click', function () {
    if (!currentData) { showStatus('Сначала выполните конвертацию.', 'warning'); return; }
    downloadBlob(jsonToCsv(currentData), 'data.csv', 'text/csv;charset=utf-8');
  });

  btnDownloadTxt && btnDownloadTxt.addEventListener('click', function () {
    if (!currentData) { showStatus('Сначала выполните конвертацию.', 'warning'); return; }
    downloadBlob(jsonToText(currentData), 'data.txt', 'text/plain;charset=utf-8');
  });

  // ── Expand / Collapse All ─────────────────────────────────────────────────
  btnExpandAll && btnExpandAll.addEventListener('click', function () {
    treeContainer.querySelectorAll('.json-toggle').forEach(function (btn) {
      var targetId = btn.dataset.target;
      var node = document.getElementById(targetId);
      var preview = document.getElementById(targetId + '-preview');
      if (node) node.style.display = '';
      if (preview) preview.style.display = 'none';
      btn.textContent = '▼';
      btn.classList.remove('collapsed');
    });
  });

  btnCollapseAll && btnCollapseAll.addEventListener('click', function () {
    treeContainer.querySelectorAll('.json-toggle').forEach(function (btn) {
      var targetId = btn.dataset.target;
      var node = document.getElementById(targetId);
      var preview = document.getElementById(targetId + '-preview');
      if (node) node.style.display = 'none';
      if (preview) preview.style.display = '';
      btn.textContent = '▶';
      btn.classList.add('collapsed');
    });
  });

  // ── Примеры ────────────────────────────────────────────────────────────────
  exampleBtns && exampleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.dataset.example;
      fetch('examples/' + name)
        .then(function (r) { return r.text(); })
        .then(function (text) {
          inputEl.value = text;
          showStatus('Пример загружен. Нажмите «Конвертировать».', 'info');
        })
        .catch(function () {
          showStatus('Не удалось загрузить пример.', 'warning');
        });
    });
  });

  // ── Поддержка Tab в textarea ───────────────────────────────────────────────
  inputEl && inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = inputEl.selectionStart;
      var end = inputEl.selectionEnd;
      inputEl.value = inputEl.value.slice(0, start) + '  ' + inputEl.value.slice(end);
      inputEl.selectionStart = inputEl.selectionEnd = start + 2;
    }
  });

  // ── Статистика ────────────────────────────────────────────────────────────
  function renderStats(data) {
    var s = collectStats(data);
    var html = '<div class="row g-3 p-3">';

    var cards = [
      { label: 'Размер (raw)',     value: formatBytes(s.rawSize),   icon: '📦', color: 'primary' },
      { label: 'Макс. глубина',    value: s.depth,                  icon: '🌳', color: 'success' },
      { label: 'Всего ключей',     value: s.totalKeys,              icon: '🔑', color: 'info'    },
      { label: 'Объектов',         value: s.objects,                icon: '{ }', color: 'secondary'},
      { label: 'Массивов',         value: s.arrays,                 icon: '[ ]', color: 'warning' },
      { label: 'Строк',            value: s.strings,                icon: '📝', color: 'primary' },
      { label: 'Чисел',            value: s.numbers,                icon: '🔢', color: 'success' },
      { label: 'Булевых',          value: s.booleans,               icon: '✅', color: 'info'    },
      { label: 'Null-значений',    value: s.nulls,                  icon: '∅',  color: 'danger'  }
    ];

    cards.forEach(function (c) {
      html += '<div class="col-6 col-md-4 col-lg-3">' +
        '<div class="card h-100 border-' + c.color + '">' +
        '<div class="card-body text-center py-3">' +
        '<div class="fs-2">' + c.icon + '</div>' +
        '<div class="fs-4 fw-bold text-' + c.color + '">' + c.value + '</div>' +
        '<div class="small text-muted">' + c.label + '</div>' +
        '</div></div></div>';
    });

    html += '</div>';
    statsContainer.innerHTML = html;
  }

  // ── Вспомогательные ──────────────────────────────────────────────────────
  function showStatus(msg, type) {
    if (!statusBar) return;
    if (!msg) { statusBar.style.display = 'none'; return; }
    var classMap = {
      success: 'alert-success',
      danger:  'alert-danger',
      warning: 'alert-warning',
      info:    'alert-info'
    };
    statusBar.className = 'alert alert-dismissible mb-3 ' + (classMap[type] || 'alert-secondary');
    statusBar.style.display = '';
    statusBar.innerHTML = escapeHtml(msg) +
      '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Закрыть"></button>';
  }

  function initTreeToggleHandler() {
    treeContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.json-toggle');
      if (!btn) return;
      var targetId = btn.dataset.target;
      var node = document.getElementById(targetId);
      var preview = document.getElementById(targetId + '-preview');
      if (!node) return;
      var collapsed = node.style.display === 'none';
      node.style.display = collapsed ? '' : 'none';
      if (preview) preview.style.display = collapsed ? 'none' : '';
      btn.textContent = collapsed ? '▼' : '▶';
      btn.classList.toggle('collapsed', !collapsed);
    });
  }

})();
