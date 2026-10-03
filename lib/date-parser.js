/**
 * Модуль работы с датами
 * Парсинг русскоязычных дат из RSS и форматирование в уфимском часовом поясе
 */

const { USE_PUBDATE_TIME } = require('./config');
const { log } = require('./logger');

// Маппинг русских месяцев на английские
var MONTH_MAP = {
  'янв': 'Jan', 'фев': 'Feb', 'мар': 'Mar', 'апр': 'Apr',
  'май': 'May', 'июн': 'Jun', 'июл': 'Jul', 'авг': 'Aug',
  'сен': 'Sep', 'окт': 'Oct', 'ноя': 'Nov', 'дек': 'Dec'
};

// Маппинг русских дней недели
var DAY_MAP = {
  'Пн': 'Mon', 'Вт': 'Tue', 'Ср': 'Wed', 'Чт': 'Thu',
  'Пт': 'Fri', 'Сб': 'Sat', 'Вс': 'Sun'
};

/**
 * Парсинг русскоязычной даты RSS
 * Формат: "Пн, 06 июл 2026 07:58:00 +0500"
 */
function parseRussianDate(dateStr) {
  if (!dateStr) return null;

  var result = String(dateStr).trim();

  // Заменяем русские дни недели
  var dayKeys = Object.keys(DAY_MAP);
  for (var d = 0; d < dayKeys.length; d++) {
    var key = dayKeys[d];
    while (result.indexOf(key) !== -1) {
      result = result.replace(key, DAY_MAP[key]);
    }
  }

  // Заменяем русские месяцы
  var monthKeys = Object.keys(MONTH_MAP);
  for (var m = 0; m < monthKeys.length; m++) {
    var key = monthKeys[m];
    while (result.indexOf(key) !== -1) {
      result = result.replace(key, MONTH_MAP[key]);
    }
  }

  var date = new Date(result);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Получение времени для сообщения
 * Возвращает строку формата "hh:mm dd.mm.yy" в часовом поясе Уфы
 */
function getEventTime(item) {
  var date = null;

  if (USE_PUBDATE_TIME && item.pubDate) {
    date = parseRussianDate(item.pubDate);
    if (!date) {
      log('  pubDate не распарсился, использую текущее время');
      date = new Date();
    }
  } else {
    date = new Date();
  }

  var fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yekaterinburg',
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour12: false
  });
  var parts = fmt.formatToParts(date);
  var g = function(t) {
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === t) return parts[i].value;
    }
    return '';
  };
  return g('hour') + ':' + g('minute') + ' ' + g('day') + '.' + g('month') + '.' + g('year');
}

module.exports = { parseRussianDate, getEventTime };
