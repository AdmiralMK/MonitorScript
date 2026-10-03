# pragma once
/**
 * Работа с датами (аналог lib/date-parser.js).
 *  - Парсинг русскоязычных дат RSS вида "Пн, 06 июл 2026 07:58:00 +0500";
 *  - Форматирование времени события в часовом поясе Уфы (UTC+5):
 *    "hh:mm dd.mm.yy".
 */

#include <Arduino.h>
#include <time.h>

struct RssDate {
    time_t epoch;   // секунды с 1970-01-01 UTC
    bool valid;
};

/**
 * Парсинг даты из pubDate. Поддерживаются и русские, и английские
 * названия дней/месяцев. Возвращает {0,false} при неудаче.
 */
RssDate parseRussianDate(const String &dateStr);

/**
 * Время для сообщения по элементу RSS: сначала пробуем pubDate,
 * при неудаче — текущее время (аналог getEventTime).
 * Формат: "hh:mm dd.mm.yy" (Asia/Yekaterinburg = UTC+5).
 */
String getEventTime(const String &pubDate);
