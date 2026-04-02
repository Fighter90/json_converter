/**
 * parser.js — парсер и валидатор JSON
 */

/**
 * Пытается распарсить JSON-строку.
 * Возвращает { ok: true, data } или { ok: false, message, line, col }.
 */
function parseJSON(text) {
  try {
    var data = JSON.parse(text);
    return { ok: true, data: data };
  } catch (e) {
    var result = { ok: false, message: e.message, line: null, col: null };
    // Пробуем вытащить позицию из сообщения об ошибке
    var posMatch = e.message.match(/position\s+(\d+)/i);
    if (posMatch) {
      var pos = parseInt(posMatch[1], 10);
      var before = text.slice(0, pos);
      var lines = before.split('\n');
      result.line = lines.length;
      result.col = lines[lines.length - 1].length + 1;
    }
    return result;
  }
}

/**
 * Синтаксическая подсветка JSON — возвращает HTML-строку.
 */
function syntaxHighlight(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  json = escapeHtml(json);
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      var cls = 'json-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string';
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    }
  );
}

/**
 * Строит дерево «сворачиваемых» узлов из объекта.
 * Возвращает HTML-строку.
 */
function buildCollapsibleTree(value, depth) {
  depth = depth || 0;
  var indent = '  '.repeat(depth);
  var innerIndent = '  '.repeat(depth + 1);

  if (value === null) return '<span class="json-null">null</span>';
  if (typeof value === 'boolean') return '<span class="json-boolean">' + value + '</span>';
  if (typeof value === 'number') return '<span class="json-number">' + value + '</span>';
  if (typeof value === 'string') return '<span class="json-string">' + escapeHtml(JSON.stringify(value)) + '</span>';

  if (Array.isArray(value)) {
    if (value.length === 0) return '<span class="json-bracket">[]</span>';
    var id = uniqueId('node');
    var preview = '[' + value.length + ' items]';
    var html = '<span class="json-toggle" data-target="' + id + '" title="Свернуть/развернуть">▼</span>';
    html += '<span class="json-bracket">[</span>';
    html += '<span class="json-preview json-muted" id="' + id + '-preview" style="display:none">' + escapeHtml(preview) + '</span>';
    html += '<span id="' + id + '">';
    value.forEach(function (item, i) {
      var comma = i < value.length - 1 ? '<span class="json-comma">,</span>' : '';
      html += '\n' + innerIndent + buildCollapsibleTree(item, depth + 1) + comma;
    });
    html += '\n' + indent + '</span><span class="json-bracket">]</span>';
    return html;
  }

  if (typeof value === 'object') {
    var keys = Object.keys(value);
    if (keys.length === 0) return '<span class="json-bracket">{}</span>';
    var id2 = uniqueId('node');
    var preview2 = '{' + keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', …' : '') + '}';
    var html2 = '<span class="json-toggle" data-target="' + id2 + '" title="Свернуть/развернуть">▼</span>';
    html2 += '<span class="json-bracket">{</span>';
    html2 += '<span class="json-preview json-muted" id="' + id2 + '-preview" style="display:none">' + escapeHtml(preview2) + '</span>';
    html2 += '<span id="' + id2 + '">';
    keys.forEach(function (key, i) {
      var comma = i < keys.length - 1 ? '<span class="json-comma">,</span>' : '';
      html2 += '\n' + innerIndent +
        '<span class="json-key">' + escapeHtml(JSON.stringify(key)) + '</span>' +
        '<span class="json-colon">: </span>' +
        buildCollapsibleTree(value[key], depth + 1) + comma;
    });
    html2 += '\n' + indent + '</span><span class="json-bracket">}</span>';
    return html2;
  }

  return escapeHtml(String(value));
}
