/**
 * table-builder.js — построитель таблиц из JSON-данных
 */

/**
 * Строит HTML-таблицу из JSON-данных.
 * Поддерживает:
 *  - массивы объектов (стандартный случай)
 *  - вложенные объекты (разворачивает через flattenObject)
 *  - одиночный объект
 *  - примитивы
 *
 * @param {*} data — разобранные JSON-данные
 * @returns {{ html: string, rows: number, cols: number }}
 */
function buildTable(data) {
  var rows;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { html: '<p class="text-muted">Пустой массив.</p>', rows: 0, cols: 0 };
    }
    rows = data.map(function (item) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        return flattenObject(item);
      }
      // примитив или массив внутри массива
      return flattenObject({ value: item });
    });
  } else if (data !== null && typeof data === 'object') {
    // одиночный объект — каждая запись = ключ/значение
    rows = [flattenObject(data)];
  } else {
    rows = [{ value: data }];
  }

  // Собираем все уникальные ключи (в порядке появления)
  var allKeys = [];
  rows.forEach(function (row) {
    Object.keys(row).forEach(function (k) {
      if (allKeys.indexOf(k) === -1) allKeys.push(k);
    });
  });

  if (allKeys.length === 0) {
    return { html: '<p class="text-muted">Нет данных для отображения.</p>', rows: 0, cols: 0 };
  }

  var html = '';
  html += '<table class="table table-striped table-hover table-sm align-middle" id="data-table">';

  // Заголовок
  html += '<thead class="table-dark"><tr>';
  html += '<th class="text-center text-muted" style="width:40px">#</th>';
  allKeys.forEach(function (key) {
    html += '<th>' + escapeHtml(key) + '</th>';
  });
  html += '</tr></thead>';

  // Строки
  html += '<tbody>';
  rows.forEach(function (row, rowIdx) {
    html += '<tr data-row-idx="' + rowIdx + '">';
    html += '<td class="text-center text-muted">' + (rowIdx + 1) + '</td>';
    allKeys.forEach(function (key) {
      var val = row[key];
      var cellContent;
      if (val === undefined || val === null) {
        cellContent = '<span class="text-muted">null</span>';
      } else if (typeof val === 'boolean') {
        cellContent = '<span class="badge ' + (val ? 'bg-success' : 'bg-secondary') + '">' + val + '</span>';
      } else {
        var str = String(val);
        // Длинные значения — сворачиваем
        if (str.length > 120) {
          var shortId = uniqueId('cell');
          cellContent = '<span class="cell-short" id="' + shortId + '-short">' +
            escapeHtml(str.slice(0, 100)) +
            '… <a href="#" class="cell-expand" data-id="' + shortId + '">[ещё]</a></span>' +
            '<span class="cell-full" id="' + shortId + '-full" style="display:none">' +
            escapeHtml(str) +
            ' <a href="#" class="cell-collapse" data-id="' + shortId + '">[свернуть]</a></span>';
        } else {
          cellContent = escapeHtml(str);
        }
      }
      html += '<td>' + cellContent + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody>';

  html += '</table>';

  return { html: html, rows: rows.length, cols: allKeys.length };
}

/**
 * Инициализирует обработчики «раскрыть/свернуть» для длинных ячеек.
 */
function initTableExpandHandlers(container) {
  container.addEventListener('click', function (e) {
    var target = e.target;
    if (target.classList.contains('cell-expand')) {
      e.preventDefault();
      var id = target.dataset.id;
      document.getElementById(id + '-short').style.display = 'none';
      document.getElementById(id + '-full').style.display = '';
    } else if (target.classList.contains('cell-collapse')) {
      e.preventDefault();
      var id2 = target.dataset.id;
      document.getElementById(id2 + '-short').style.display = '';
      document.getElementById(id2 + '-full').style.display = 'none';
    }
  });
}

/**
 * Фильтрует строки таблицы по поисковому запросу.
 */
function filterTable(query) {
  var table = document.getElementById('data-table');
  if (!table) return;
  var rows = table.querySelectorAll('tbody tr');
  var lower = query.toLowerCase().trim();
  rows.forEach(function (row) {
    var text = row.textContent.toLowerCase();
    row.style.display = lower === '' || text.includes(lower) ? '' : 'none';
  });
}
