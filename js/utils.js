/**
 * utils.js — вспомогательные функции
 */

/**
 * Рекурсивно «разворачивает» объект в плоскую структуру.
 * { a: { b: 1 } } → { "a.b": 1 }
 */
function flattenObject(obj, prefix, result) {
  prefix = prefix || '';
  result = result || {};
  if (obj === null || obj === undefined) {
    result[prefix] = obj;
    return result;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[prefix] = '[]';
    } else {
      obj.forEach(function (item, idx) {
        flattenObject(item, prefix ? prefix + '[' + idx + ']' : '[' + idx + ']', result);
      });
    }
    return result;
  }
  if (typeof obj === 'object') {
    var keys = Object.keys(obj);
    if (keys.length === 0) {
      result[prefix] = '{}';
    } else {
      keys.forEach(function (key) {
        flattenObject(obj[key], prefix ? prefix + '.' + key : key, result);
      });
    }
    return result;
  }
  result[prefix] = obj;
  return result;
}

/**
 * Вычисляет максимальную глубину вложенности JSON-значения.
 */
function getDepth(value) {
  if (value === null || typeof value !== 'object') return 0;
  var max = 0;
  var items = Array.isArray(value) ? value : Object.values(value);
  items.forEach(function (child) {
    var d = getDepth(child);
    if (d > max) max = d;
  });
  return max + 1;
}

/**
 * Собирает статистику по JSON-значению.
 */
function collectStats(value) {
  var stats = {
    totalKeys: 0,
    totalValues: 0,
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    arrays: 0,
    objects: 0,
    depth: getDepth(value),
    rawSize: 0
  };

  function walk(v) {
    if (v === null) { stats.nulls++; stats.totalValues++; return; }
    if (Array.isArray(v)) {
      stats.arrays++;
      v.forEach(walk);
      return;
    }
    if (typeof v === 'object') {
      stats.objects++;
      Object.keys(v).forEach(function (k) {
        stats.totalKeys++;
        walk(v[k]);
      });
      return;
    }
    stats.totalValues++;
    if (typeof v === 'string') stats.strings++;
    else if (typeof v === 'number') stats.numbers++;
    else if (typeof v === 'boolean') stats.booleans++;
  }

  walk(value);
  stats.rawSize = JSON.stringify(value).length;
  return stats;
}

/**
 * Форматирует число байт в человекочитаемую строку.
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Экранирует HTML-символы.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Конвертирует значение в строку для CSV-ячейки (RFC 4180).
 */
function toCsvCell(value) {
  if (value === null || value === undefined) return '';
  var s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Генерирует уникальный id для DOM-элементов.
 */
var _idCounter = 0;
function uniqueId(prefix) {
  return (prefix || 'id') + (++_idCounter);
}
