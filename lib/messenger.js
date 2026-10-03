/**
 * Модуль подготовки и отправки сообщений в чат MeshMonitor
 * Формирует JSON-ответ и разбивает длинные сообщения на части
 */

const { ADD_NEWS_ID_TO_MESSAGE } = require('./config');
const { getEventTime } = require('./date-parser');

/**
 * Разбиение текста на части по maxLen символов
 */
function splitMessage(text, maxLen) {
  if (!maxLen) maxLen = 200;
  var msgs = [];
  var cur = '';
  var words = text.split(/\s+/);
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    if ((cur + ' ' + w).trim().length > maxLen) {
      if (cur.trim().length > 0) { msgs.push(cur.trim()); cur = ''; }
      if (w.length > maxLen) {
        var rem = w;
        while (rem.length > 0) {
          msgs.push(rem.substring(0, maxLen));
          rem = rem.substring(maxLen);
        }
      } else {
        cur = w;
      }
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur.trim().length > 0) msgs.push(cur.trim());
  return msgs;
}

/**
 * Формирование полного текста сообщения из шаблона
 */
function buildMessage(tmpl, item) {
  var eventTime = getEventTime(item);
  var firstLine = tmpl.icon + ' ' + tmpl.header + ' [' + eventTime + '].';

  if (ADD_NEWS_ID_TO_MESSAGE) {
    firstLine += ' [ID:' + String(item.newsId).trim() + ']';
  }

  var lineBreak = String.fromCharCode(10);
  return firstLine + lineBreak + tmpl.body;
}

/**
 * Отправка сообщений в stdout для MeshMonitor
 * Формирует JSON с полем response или responses
 */
function sendToChat(allMessages) {
  if (allMessages.length === 0) return;

  var response = allMessages.length === 1
    ? { response: allMessages[0] }
    : { responses: allMessages };

  console.log(JSON.stringify(response));
}

module.exports = { splitMessage, buildMessage, sendToChat };
