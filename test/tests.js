/**
 * test/tests.js — юнит-тесты для JSON конвертера
 * Запуск: node test/tests.js
 */

'use strict';

// ── Минимальная тест-система ─────────────────────────────────────────────────
var passed = 0, failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log('  ✓ ' + label);
    passed++;
  } else {
    console.error('  ✗ ' + label);
    failed++;
  }
}

function assertEq(actual, expected, label) {
  var ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) console.error('    expected: ' + JSON.stringify(expected) + '\n    got:      ' + JSON.stringify(actual));
  assert(ok, label);
}

function describe(name, fn) {
  console.log('\n▶ ' + name);
  fn();
}

// ── Подключаем модули (Node.js окружение) ────────────────────────────────────
// Вместо DOM-функций подключаем реализации из файлов
var fs = require('fs');
var path = require('path');

// Загружаем utils.js и все зависимости
// Используем глобальный контекст (как в браузере)
var utilsCode       = fs.readFileSync(path.join(__dirname, '../js/utils.js'),        'utf8');
var parserCode      = fs.readFileSync(path.join(__dirname, '../js/parser.js'),       'utf8');
var converterCode   = fs.readFileSync(path.join(__dirname, '../js/converter.js'),    'utf8');
var tableBuilderCode= fs.readFileSync(path.join(__dirname, '../js/table-builder.js'),'utf8');

// Выполняем в глобальном контексте Node.js, чтобы функции были доступны
var vm = require('vm');
vm.runInThisContext(utilsCode,        { filename: 'utils.js'         });
vm.runInThisContext(parserCode,       { filename: 'parser.js'        });
vm.runInThisContext(converterCode,    { filename: 'converter.js'     });
vm.runInThisContext(tableBuilderCode, { filename: 'table-builder.js' });

// ── utils.js ─────────────────────────────────────────────────────────────────

describe('flattenObject', function () {
  assertEq(flattenObject({ a: 1, b: 2 }), { a: 1, b: 2 }, 'плоский объект не изменяется');
  assertEq(flattenObject({ a: { b: 1 } }), { 'a.b': 1 }, 'вложенный объект разворачивается');
  assertEq(flattenObject({ a: { b: { c: 42 } } }), { 'a.b.c': 42 }, 'тройная вложенность');
  assertEq(flattenObject({ x: null }), { x: null }, 'null-значение сохраняется');
  assertEq(flattenObject({ arr: [] }), { arr: '[]' }, 'пустой массив → строка');
  assertEq(flattenObject({ obj: {} }), { obj: '{}' }, 'пустой объект → строка');
  assertEq(flattenObject({ a: [1, 2] }), { 'a[0]': 1, 'a[1]': 2 }, 'массив разворачивается по индексу');
});

describe('getDepth', function () {
  assert(getDepth(null) === 0, 'null → глубина 0');
  assert(getDepth('str') === 0, 'строка → глубина 0');
  assert(getDepth({}) === 1, 'пустой объект → глубина 1');
  assert(getDepth([]) === 1, 'пустой массив → глубина 1');
  assert(getDepth({ a: 1 }) === 1, 'объект с примитивом → глубина 1');
  assert(getDepth({ a: { b: 1 } }) === 2, 'объект внутри объекта → глубина 2');
  assert(getDepth({ a: { b: { c: 1 } } }) === 3, 'тройная вложенность → глубина 3');
  assert(getDepth([[[1]]]) === 3, 'массив массивов → глубина 3');
});

describe('collectStats', function () {
  var s = collectStats({ a: 1, b: 'hello', c: true, d: null, e: [1, 2] });
  assert(s.numbers === 3, 'три числа (1, 1, 2)');
  assert(s.strings === 1, 'одна строка');
  assert(s.booleans === 1, 'один булев');
  assert(s.nulls === 1, 'один null');
  assert(s.arrays === 1, 'один массив');
  assert(s.objects === 1, 'один объект (корень)');
  assert(s.totalKeys === 5, '5 ключей');
  assert(s.depth === 2, 'глубина 2');
});

describe('formatBytes', function () {
  assertEq(formatBytes(500), '500 B', '500 байт');
  assertEq(formatBytes(1024), '1.0 KB', '1 КБ');
  assertEq(formatBytes(1536), '1.5 KB', '1.5 КБ');
  assertEq(formatBytes(1048576), '1.00 MB', '1 МБ');
});

describe('toCsvCell', function () {
  assertEq(toCsvCell('hello'), 'hello', 'простая строка');
  assertEq(toCsvCell('a,b'), '"a,b"', 'строка с запятой → кавычки');
  assertEq(toCsvCell('say "hi"'), '"say ""hi"""', 'строка с кавычками → экранирование');
  assertEq(toCsvCell(null), '', 'null → пустая строка');
  assertEq(toCsvCell(42), '42', 'число');
  assertEq(toCsvCell(true), 'true', 'булев');
});

// ── parser.js ─────────────────────────────────────────────────────────────────

describe('parseJSON — валидный JSON', function () {
  var r = parseJSON('{"a":1}');
  assert(r.ok === true, 'ok=true');
  assertEq(r.data, { a: 1 }, 'data корректна');
});

describe('parseJSON — невалидный JSON', function () {
  var r = parseJSON('{a:1}');
  assert(r.ok === false, 'ok=false при ошибке');
  assert(typeof r.message === 'string', 'message — строка');
});

describe('parseJSON — null', function () {
  var r = parseJSON('null');
  assert(r.ok === true, 'null — валидный JSON');
  assert(r.data === null, 'data === null');
});

describe('parseJSON — массив', function () {
  var r = parseJSON('[1,2,3]');
  assert(r.ok === true, 'массив валиден');
  assertEq(r.data, [1, 2, 3], 'data корректна');
});

describe('parseJSON — пустая строка', function () {
  var r = parseJSON('');
  assert(r.ok === false, 'пустая строка — невалидна');
});

describe('parseJSON — сложный JSON (из задачи)', function () {
  var complexJson = fs.readFileSync(path.join(__dirname, '../examples/complex.json'), 'utf8').trim();
  var r = parseJSON(complexJson);
  assert(r.ok === true, 'сложный JSON парсится без ошибок');
  assert(typeof r.data === 'object' && r.data !== null, 'data — объект');
  assert(r.data.meta && r.data.meta.requestId, 'meta.requestId присутствует');
  assert(r.data.payload && r.data.payload.edgeCases && r.data.payload.edgeCases.unicode, 'payload.edgeCases.unicode присутствует');
});

// ── converter.js ─────────────────────────────────────────────────────────────

describe('formatJSON', function () {
  var data = { a: 1, b: [1, 2] };
  var formatted = formatJSON(data, 2);
  assert(formatted.includes('\n'), 'форматированный JSON содержит переносы строк');
  assertEq(JSON.parse(formatted), data, 'разбирается обратно в тот же объект');
});

describe('minifyJSON', function () {
  var data = { a: 1, b: [1, 2] };
  var minified = minifyJSON(data);
  assert(!minified.includes('\n'), 'минифицированный JSON без переносов строк');
  assert(!minified.includes('  '), 'минифицированный JSON без двойных пробелов');
  assertEq(JSON.parse(minified), data, 'разбирается обратно в тот же объект');
});

describe('arrayToCsv', function () {
  var rows = [
    { name: 'Alice', age: 30 },
    { name: 'Bob',   age: 25 }
  ];
  var csv = arrayToCsv(rows);
  assert(csv.startsWith('name,age'), 'заголовки корректны');
  assert(csv.includes('Alice'), 'данные присутствуют');
  assert(csv.includes('30'), 'числа присутствуют');
});

describe('arrayToCsv — пустой массив', function () {
  assertEq(arrayToCsv([]), '', 'пустой массив → пустая строка');
});

describe('jsonToCsv — массив объектов', function () {
  var data = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
  var csv = jsonToCsv(data);
  assert(csv.includes('a,b') || csv.includes('a'), 'заголовки присутствуют');
  assert(csv.includes('1'), 'значения присутствуют');
});

describe('jsonToCsv — одиночный объект', function () {
  var data = { name: 'Alice', score: 100 };
  var csv = jsonToCsv(data);
  assert(csv.includes('name'), 'ключ name в CSV');
  assert(csv.includes('Alice'), 'значение в CSV');
});

describe('jsonToCsv — вложенный объект разворачивается', function () {
  var data = [{ user: { name: 'Alice', age: 30 } }];
  var csv = jsonToCsv(data);
  assert(csv.includes('user.name'), 'ключ user.name в заголовках');
  assert(csv.includes('Alice'), 'значение Alice в данных');
});

describe('jsonToCsv — значения с запятой экранируются', function () {
  var data = [{ desc: 'hello, world' }];
  var csv = jsonToCsv(data);
  assert(csv.includes('"hello, world"'), 'строка с запятой в кавычках');
});

describe('jsonToCsv — Unicode (кириллица)', function () {
  var data = [{ имя: 'Иван', город: 'Москва' }];
  var csv = jsonToCsv(data);
  assert(csv.includes('Иван'), 'кириллица в значениях сохраняется');
  assert(csv.includes('имя'), 'кириллица в ключах сохраняется');
});

describe('jsonToCsv — спецсимволы экранируются', function () {
  var data = [{ desc: 'line1\nline2', note: 'say "hello"' }];
  var csv = jsonToCsv(data);
  assert(csv.includes('"line1'), 'строка с переносом строки в кавычках');
  assert(csv.includes('""hello""'), 'кавычки удваиваются');
});

// ── table-builder.js ──────────────────────────────────────────────────────────

describe('buildTable — массив объектов содержит data-row-idx', function () {
  var data = [{ a: 1 }, { a: 2 }];
  var result = buildTable(data);
  assert(result.rows === 2, '2 строки');
  assert(result.cols === 1, '1 колонка');
  assert(result.html.includes('data-row-idx="0"'), 'первая строка имеет data-row-idx="0"');
  assert(result.html.includes('data-row-idx="1"'), 'вторая строка имеет data-row-idx="1"');
});

describe('buildTable — нет обёртки .table-responsive', function () {
  var data = [{ x: 1 }];
  var result = buildTable(data);
  assert(!result.html.includes('table-responsive'), 'нет wrapper div.table-responsive');
  assert(result.html.includes('<table'), 'таблица начинается с <table>');
});

describe('buildTable — пустой массив', function () {
  var result = buildTable([]);
  assert(result.rows === 0, 'rows=0 для пустого массива');
  assert(result.cols === 0, 'cols=0 для пустого массива');
});

describe('buildTable — одиночный объект', function () {
  var result = buildTable({ name: 'Alice', age: 30 });
  assert(result.rows === 1, '1 строка для одиночного объекта');
  assert(result.html.includes('Alice'), 'значение присутствует');
});

describe('buildTable — длинные строки сворачиваются', function () {
  var longStr = 'A'.repeat(150);
  var result = buildTable([{ text: longStr }]);
  assert(result.html.includes('cell-expand'), 'содержит ссылку [ещё] для длинного текста');
  assert(result.html.includes('cell-collapse'), 'содержит ссылку [свернуть]');
});

describe('buildTable — кириллица экранируется', function () {
  var result = buildTable([{ город: 'Москва' }]);
  assert(result.html.includes('Москва'), 'кириллические значения сохраняются');
  assert(result.html.includes('город'), 'кириллические ключи сохраняются');
});

// ── Итоги ─────────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
console.log('Итого: ' + passed + ' прошло, ' + failed + ' провалено.');
if (failed > 0) {
  process.exit(1);
} else {
  console.log('Все тесты пройдены ✓');
}
