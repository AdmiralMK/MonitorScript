/**
 * Модуль классификации событий
 * Определяет тип события по заголовку и описанию новости
 */

function makeEventKey(eventType, newsId) {
  return String(eventType).trim() + '::' + String(newsId).trim();
}

function classifyEvents(title, description) {
  var text = (String(title) + ' ' + String(description)).toLowerCase().trim();
  var events = [];

  // Проверка аэропорта
  var hasAirport = text.indexOf('аэропорт') !== -1 || text.indexOf('аэропорту') !== -1;
  var hasUfa = text.indexOf('уф') !== -1 || text.indexOf('уфа') !== -1 || text.indexOf('уфы') !== -1;

  if (hasAirport && hasUfa) {
    var hasOgr = text.indexOf('огранич') !== -1 || text.indexOf('ограничен') !== -1;
    var hasSnyat = text.indexOf('снят') !== -1 || text.indexOf('сним') !== -1;
    if (hasOgr || hasSnyat) {
      events.push(hasSnyat ? 'airport_release' : 'airport_restrict');
    }
  }

  // Проверка опасности
  var hasRegion = text.indexOf('башкортостан') !== -1 || text.indexOf('башкир') !== -1 ||
                  text.indexOf(' рб') !== -1 || text.indexOf('по рб') !== -1 || text.indexOf('рб!') !== -1;

  if (hasRegion) {
    var hasRocket = text.indexOf('ракетн') !== -1 || text.indexOf('ракет') !== -1;
    var hasBpla = text.indexOf('беспилотн') !== -1 || text.indexOf('бпла') !== -1 || text.indexOf('беспилот') !== -1;
    var hasOtmen = text.indexOf('отмен') !== -1;
    var hasContinues = text.indexOf('продолжает действовать') !== -1;

    if (hasContinues) {
      // Сценарий №11: снятие ограничений, но опасность продолжается — не добавляем cancel
    } else {
      if (hasRocket) {
        events.push(hasOtmen ? 'rocket_cancel' : 'rocket_alert');
      } else if (hasBpla) {
        events.push(hasOtmen ? 'bpla_cancel' : 'bpla_alert');
      }
    }
  }

  return events;
}

module.exports = { makeEventKey, classifyEvents };
