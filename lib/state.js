/**
 * Модуль управления состоянием скрипта
 * Хранит:
 * - sent_keys: ключи уже отправленных одноразовых событий
 * - alert_times: время последнего повтора для alert'ов (ключ = тип::newsId)
 * - cancelled_alerts: { тип: newsId последней отмены } — для блокировки
 *   старых alert'ов того же типа
 */

const fs = require('fs');
const { STATE_FILE } = require('./config');
const { log } = require('./logger');

function loadState() {
  var state = { sent_keys: [], alert_times: {}, cancelled_alerts: {} };

  try {
    if (fs.existsSync(STATE_FILE)) {
      var raw = fs.readFileSync(STATE_FILE, 'utf8');
      var p = JSON.parse(raw);

      if (p && typeof p === 'object') {
        // sent_keys (с миграцией со старого формата sent_ids)
        if (p.sent_keys && Array.isArray(p.sent_keys)) {
          state.sent_keys = p.sent_keys.map(function(k) { return String(k).trim(); });
        } else if (p.sent_ids && Array.isArray(p.sent_ids)) {
          state.sent_keys = p.sent_ids.map(function(id) { return String(id).trim(); });
        }

        // alert_times
        if (p.alert_times && typeof p.alert_times === 'object' && !Array.isArray(p.alert_times)) {
          var keys = Object.keys(p.alert_times);
          for (var i = 0; i < keys.length; i++) {
            var cleanKey = String(keys[i]).trim();
            state.alert_times[cleanKey] = Number(p.alert_times[keys[i]]) || 0;
          }
        }

        // cancelled_alerts — новый формат: объект { тип: newsId }
        if (p.cancelled_alerts && typeof p.cancelled_alerts === 'object') {
          if (Array.isArray(p.cancelled_alerts)) {
            // МИГРАЦИЯ со старого формата (массив ключей 'тип::newsId')
            for (var c = 0; c < p.cancelled_alerts.length; c++) {
              var parts = String(p.cancelled_alerts[c]).trim().split('::');
              if (parts.length === 2) {
                var type = parts[0].trim();
                var cnid = Number(parts[1].trim());
                if (!isNaN(cnid)) {
                  var curC = Number(state.cancelled_alerts[type]) || 0;
                  if (cnid > curC) state.cancelled_alerts[type] = cnid;
                }
              }
            }
          } else {
            // Новый формат — копируем как есть
            var ckeys = Object.keys(p.cancelled_alerts);
            for (var ck = 0; ck < ckeys.length; ck++) {
              var ctype = String(ckeys[ck]).trim();
              state.cancelled_alerts[ctype] = Number(p.cancelled_alerts[ckeys[ck]]) || 0;
            }
          }
        }

        // ОЧИСТКА: удаляем из alert_times записи, которые старше отмены того же типа
        var atKeys = Object.keys(state.alert_times);
        for (var a = 0; a < atKeys.length; a++) {
          var aParts = atKeys[a].split('::');
          if (aParts.length === 2) {
            var aType = aParts[0].trim();
            var aNid = Number(aParts[1].trim());
            var aCancel = Number(state.cancelled_alerts[aType]) || 0;
            if (aCancel > 0 && !isNaN(aNid) && aNid < aCancel) {
              delete state.alert_times[atKeys[a]];
              log('  Удалён устаревший alert_time: ' + atKeys[a]);
            }
          }
        }

        log('Состояние загружено: ' + state.sent_keys.length + ' sent_keys, ' +
            Object.keys(state.alert_times).length + ' alert_times, ' +
            Object.keys(state.cancelled_alerts).length + ' cancelled');
      }
    }
  } catch (e) {
    log('Ошибка чтения состояния: ' + e.message);
  }

  return state;
}

function saveState(state) {
  try {
    var cleanState = {
      sent_keys: state.sent_keys.map(function(k) { return String(k).trim(); }),
      alert_times: {},
      cancelled_alerts: {}
    };

    var keys = Object.keys(state.alert_times);
    for (var i = 0; i < keys.length; i++) {
      var cleanKey = String(keys[i]).trim();
      cleanState.alert_times[cleanKey] = Number(state.alert_times[keys[i]]) || 0;
    }

    var ckeys = Object.keys(state.cancelled_alerts);
    for (var c = 0; c < ckeys.length; c++) {
      var ctype = String(ckeys[c]).trim();
      cleanState.cancelled_alerts[ctype] = Number(state.cancelled_alerts[ckeys[c]]) || 0;
    }

    // Атомарная запись через временный файл
    var tmpFile = STATE_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(cleanState), 'utf8');
    fs.renameSync(tmpFile, STATE_FILE);
    log('Состояние сохранено');
  } catch (e) {
    log('Ошибка записи состояния: ' + e.message);
  }
}

module.exports = { loadState, saveState };