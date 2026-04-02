/**
 * converter.js — конвертация JSON в различные форматы
 */

/**
 * Форматирует JSON с отступами.
 */
function formatJSON(data, indent) {
  indent = indent !== undefined ? indent : 2;
  return JSON.stringify(data, null, indent);
}

/**
 * Минифицирует JSON (убирает все пробелы).
 */
function minifyJSON(data) {
  return JSON.stringify(data);
}

/**
 * Конвертирует массив плоских объектов в CSV.
 * @param {Array<Object>} rows
 * @returns {string}
 */
function arrayToCsv(rows) {
  if (!rows || rows.length === 0) return '';
  var allKeys = [];
  rows.forEach(function (row) {
    Object.keys(row).forEach(function (k) {
      if (allKeys.indexOf(k) === -1) allKeys.push(k);
    });
  });
  var lines = [];
  lines.push(allKeys.map(function (k) { return toCsvCell(k); }).join(','));
  rows.forEach(function (row) {
    lines.push(allKeys.map(function (k) {
      return toCsvCell(row[k] !== undefined ? row[k] : '');
    }).join(','));
  });
  return lines.join('\r\n');
}

/**
 * Конвертирует данные в CSV, поддерживая как массивы, так и объекты.
 * Объекты разворачиваются в плоский вид.
 */
function jsonToCsv(data) {
  var rows;
  if (Array.isArray(data)) {
    rows = data.map(function (item) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        return flattenObject(item);
      }
      return flattenObject({ value: item });
    });
  } else if (data !== null && typeof data === 'object') {
    rows = [flattenObject(data)];
  } else {
    rows = [{ value: data }];
  }
  return arrayToCsv(rows);
}

/**
 * Конвертирует JSON в читаемый текст (YAML-подобный).
 */
function jsonToText(data, indent, depth) {
  indent = indent || '  ';
  depth = depth || 0;
  var pad = indent.repeat(depth);

  if (data === null) return pad + 'null';
  if (typeof data !== 'object') return pad + String(data);

  var lines = [];
  if (Array.isArray(data)) {
    data.forEach(function (item, i) {
      if (item !== null && typeof item === 'object') {
        lines.push(pad + '- [' + i + ']:');
        lines.push(jsonToText(item, indent, depth + 1));
      } else {
        lines.push(pad + '- ' + item);
      }
    });
  } else {
    Object.keys(data).forEach(function (key) {
      var val = data[key];
      if (val !== null && typeof val === 'object') {
        lines.push(pad + key + ':');
        lines.push(jsonToText(val, indent, depth + 1));
      } else {
        lines.push(pad + key + ': ' + val);
      }
    });
  }
  return lines.join('\n');
}

/**
 * Возвращает Blob для скачивания файла.
 * Для CSV добавляет UTF-8 BOM для корректного отображения кириллицы в Excel.
 */
function downloadBlob(content, filename, mime) {
  mime = mime || 'text/plain;charset=utf-8';
  var blobParts = mime.indexOf('csv') !== -1 ? ['\ufeff', content] : [content];
  var blob = new Blob(blobParts, { type: mime });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
