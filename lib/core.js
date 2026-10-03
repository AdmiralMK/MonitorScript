/**
 * Основная логика скрипта
 * Связывает все модули вместе и реализует обработку RSS
 */

const { log } = require('./logger');
const { fetchURL } = require('./fetcher');
const { parseRSS } = require('./rss-parser');
const { classifyEvents, makeEventKey } = require('./classifier');
const { loadState, saveState } = require('./state');
const { buildMessage, splitMessage, sendToChat } = require('./messenger');
const { RSS_URL, MAX_ITEMS_TO_PROCESS, ALERT_REPEAT_MS } = require('./config');
const TEMPLATES = require('../templates.js');

/**
 * Основная функция обработки RSS
 *
 * Логика в два прохода:
 * 1. Первый проход: находим максимальный newsId отмен для каждого типа
 *    alert'а среди обрабатываемых новостей.
 * 2. Второй проход (от старых к новым): обрабатываем события. Alert
 *    отправляется только если его newsId НОВЕЕ последней отмены того же типа.
 */
function processRSS(xml) {
  var items = parseRSS(xml);
  if (items.length === 0) {
    log('RSS пуст');
    return;
  }

  log('Всего item\'ов в RSS: ' + items.length);

  // Ограничение на количество обрабатываемых новостей
  if (items.length > MAX_ITEMS_TO_PROCESS) {
    items = items.slice(0, MAX_ITEMS_TO_PROCESS);
    log('Ограничено до ' + MAX_ITEMS_TO_PROCESS + ' последних новостей');
  }

  var state = loadState();
  var now = Date.now();
  var allMessages = [];
  var stateChanged = false;

  // ============================================================
  // ПЕРВЫЙ ПРОХОД: максимальный newsId отмен для каждого типа
  // alert'а в этом запуске
  // ============================================================
  var cancel_max_news = {}; // { 'bpla_alert': 831726, ... }
  for (var i = 0; i < items.length; i++) {
    var evFirst = classifyEvents(items[i].title, items[i].description);
    for (var j = 0; j < evFirst.length; j++) {
      var tFirst = TEMPLATES[evFirst[j]];
      // Если это cancel-событие — запоминаем newsId отмены для типа alert'а
      if (!tFirst.isAlert && tFirst.opposite) {
        var alertType = tFirst.opposite;
        var nid = Number(items[i].newsId);
        if (!isNaN(nid)) {
          if (cancel_max_news[alertType] === undefined || nid > cancel_max_news[alertType]) {
            cancel_max_news[alertType] = nid;
          }
        }
      }
    }
  }

  var cancelTypes = Object.keys(cancel_max_news);
  log('Отмены в этом запуске: ' +
      (cancelTypes.length > 0
        ? cancelTypes.map(function(t) { return t + '(ID ' + cancel_max_news[t] + ')'; }).join(', ')
        : '(нет)'));

  // ============================================================
  // ВТОРОЙ ПРОХОД: обработка от старых к новым
  // ============================================================
  for (var ii = items.length - 1; ii >= 0; ii--) {
    var item = items[ii];
    var eventTypes = classifyEvents(item.title, item.description);
    if (eventTypes.length === 0) continue;

    log('Item ' + ii + ' | ID: ' + item.newsId);

    for (var jj = 0; jj < eventTypes.length; jj++) {
      var evType = eventTypes[jj];
      var tmpl = TEMPLATES[evType];
      var key = makeEventKey(evType, item.newsId);

      var shouldSend = false;
      var reason = '';

      if (tmpl.isAlert) {
        // Максимальный newsId отмены этого типа: из текущего запуска и из состояния
        var cancelRun = cancel_max_news[evType];
        var cancelState = state.cancelled_alerts[evType];
        var maxCancel = Math.max(
          cancelRun !== undefined ? cancelRun : 0,
          cancelState !== undefined ? Number(cancelState) : 0
        );

        var alertNewsId = Number(item.newsId);

        if (!isNaN(alertNewsId) && maxCancel > 0 && alertNewsId < maxCancel) {
          // Эта новость об опасности СТАРЕЕ последней отмены → отменена
          shouldSend = false;
          reason = 'Alert отменён (ID ' + alertNewsId + ' < отмена ID ' + maxCancel + ')';
        } else {
          // Актуальная опасность → проверяем время повтора
          var lastTime = state.alert_times[key] || 0;
          var elapsed = now - lastTime;

          if (lastTime === 0) {
            shouldSend = true;
            reason = 'Новый alert';
          } else if (elapsed >= ALERT_REPEAT_MS) {
            shouldSend = true;
            reason = 'Повтор alert (' + Math.floor(elapsed / 60000) + ' мин)';
          } else {
            reason = 'Alert ожидает (' + Math.floor(elapsed / 60000) + '/' + Math.floor(ALERT_REPEAT_MS / 60000) + ' мин)';
          }
        }
      } else {
        // Для не-alert'ов проверяем ключ события
        if (state.sent_keys.indexOf(key) === -1) {
          shouldSend = true;
          reason = 'Новое не-alert событие';
        } else {
          reason = 'Уже отправлено (key: ' + key + ')';
        }
      }

      log('  ' + evType + ': ' + (shouldSend ? 'ОТПРАВКА' : 'ПРОПУСК') + ' | ' + reason);

      if (shouldSend) {
        var fullMsg = buildMessage(tmpl, item);
        var parts = splitMessage(fullMsg, 200);
        for (var p = 0; p < parts.length; p++) {
          allMessages.push(parts[p]);
        }

        // Обновляем состояние
        if (tmpl.isAlert) {
          state.alert_times[key] = now;
        } else {
          // Добавляем ключ события в sent_keys
          if (state.sent_keys.indexOf(key) === -1) {
            state.sent_keys.push(key);
          }

          // При получении отмены запоминаем newsId отмены для типа alert'а
          var oppType = tmpl.opposite;
          if (oppType) {
            var cancelNid = Number(item.newsId);
            if (!isNaN(cancelNid)) {
              var curCancel = Number(state.cancelled_alerts[oppType]) || 0;
              if (cancelNid > curCancel) {
                state.cancelled_alerts[oppType] = cancelNid;
                log('  Записана отмена: ' + oppType + ' -> ID ' + cancelNid);
              }
            }
            // Удаляем висящие alert_times для старых ключей этого типа
            var atKeys = Object.keys(state.alert_times);
            for (var ak = 0; ak < atKeys.length; ak++) {
              if (atKeys[ak].indexOf(oppType + '::') === 0) {
                var atNid = Number(atKeys[ak].split('::')[1]);
                if (!isNaN(atNid) && atNid < cancelNid) {
                  delete state.alert_times[atKeys[ak]];
                }
              }
            }
          }
        }

        stateChanged = true;

        // Сброс противоположного не-alert события (airport_restrict ↔ airport_release)
        if (!tmpl.isAlert) {
          var oppType2 = tmpl.opposite;
          if (oppType2) {
            var oppKey2 = makeEventKey(oppType2, item.newsId);
            var oppIdx = state.sent_keys.indexOf(oppKey2);
            if (oppIdx !== -1) {
              state.sent_keys.splice(oppIdx, 1);
              log('  Сброс sent_key: ' + oppKey2);
            }
          }
        }
      }
    }
  }

  if (allMessages.length > 0) {
    sendToChat(allMessages);
    log('Отправлено сообщений: ' + allMessages.length);
    if (stateChanged) saveState(state);
  } else {
    log('Нет новых событий');
  }
}

/**
 * Точка входа — загрузка RSS и запуск обработки
 */
function run() {
  fetchURL(RSS_URL)
    .then(function(xml) {
      log('RSS получен');
      processRSS(xml);
    })
    .catch(function(e) {
      log('Ошибка: ' + e.message);
    });
}

module.exports = { run, processRSS };