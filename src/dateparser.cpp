/**
 * Реализация работы с датами (см. dateparser.h).
 */

#include "dateparser.h"
#include "config.h"
#include "logger.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>

// Смещение часового пояса Уфы: Asia/Yekaterinburg = UTC+5
#define UFA_UTC_OFFSET_SEC (5 * 3600)

struct MonthEntry { const char *name; int num; }; // num: 1..12

// Маппинг русских и английских месяцев (аналог MONTH_MAP из date-parser.js)
static const MonthEntry MONTHS[] = {
    {"янв", 1}, {"фев", 2}, {"мар", 3}, {"апр", 4}, {"май", 5},
    {"июн", 6}, {"июл", 7}, {"авг", 8}, {"сен", 9}, {"окт", 10},
    {"ноя", 11}, {"дек", 12},
    {"jan", 1}, {"feb", 2}, {"mar", 3}, {"apr", 4}, {"may", 5},
    {"jun", 6}, {"jul", 7}, {"aug", 8}, {"sep", 9}, {"oct", 10},
    {"nov", 11}, {"dec", 12},
};
static const size_t MONTHS_COUNT = sizeof(MONTHS) / sizeof(MONTHS[0]);

/** Регистронезависимое сравнение побайтово (для UTF-8 кириллица — байты). */
static bool nameEqualsNoCase(const char *a, const char *b) {
    while (*a && *b) {
        unsigned char ca = (unsigned char)*a, cb = (unsigned char)*b;
        if (ca >= 'A' && ca <= 'Z') ca += 32;
        if (cb >= 'A' && cb <= 'Z') cb += 32;
        if (ca != cb) return false;
        a++; b++;
    }
    return *a == '\0' && *b == '\0';
}

RssDate parseRussianDate(const String &dateStr) {
    RssDate res{0, false};
    if (dateStr.length() == 0) return res;

    // Ожидаемый формат: "dd Mon yyyy hh:mm:ss +0500" (Mon — рус./англ.),
    // день недели ("Пн,"/"Mon,") отбрасывается.
    const char *s = dateStr.c_str();

    // Пропускаем всё до первой цифры дня
    while (*s && !isdigit((unsigned char)*s)) s++;
    if (!*s) return res;

    const char *p = s;

    // День
    long day = strtol(p, (char **)&p, 10);
    while (*p == ' ') p++;

    // Название месяца (до пробела), максимум 7 байт (2 рус. буквы + ... )
    char monName[16] = {0};
    size_t k = 0;
    while (*p && *p != ' ' && k < sizeof(monName) - 1) monName[k++] = *p++;
    monName[k] = '\0';
    while (*p == ' ') p++;

    // Год
    long year = strtol(p, (char **)&p, 10);
    while (*p == ' ') p++;

    // Время hh:mm:ss
    long hh = 0, mm = 0, ss = 0;
    hh = strtol(p, (char **)&p, 10);
    if (*p == ':') { p++; mm = strtol(p, (char **)&p, 10); }
    if (*p == ':') { p++; ss = strtol(p, (char **)&p, 10); }

    // Часовой пояс: +HHMM / -HHMM / GMT / отсутствует (считаем местный +0500)
    while (*p == ' ') p++;
    long tzOffMin = UFA_UTC_OFFSET_SEC / 60;
    if (*p == '+' || *p == '-') {
        int sign = (*p == '+') ? 1 : -1;
        p++;
        long tz = strtol(p, nullptr, 10);
        tzOffMin = sign * ((tz / 100) * 60 + (tz % 100));
    } else if (strncmp(p, "GMT", 3) == 0 || strncmp(p, "UTC", 3) == 0) {
        tzOffMin = 0;
    }

    if (day <= 0 || year < 1970) return res;

    // Название месяца -> номер
    int mon = 0;
    for (size_t i = 0; i < MONTHS_COUNT; i++) {
        if (nameEqualsNoCase(monName, MONTHS[i].name)) {
            mon = MONTHS[i].num;
            break;
        }
    }
    if (mon == 0) return res;

    // Сборка struct tm (трактуем как UTC) и вычитание пояса
    struct tm t{};
    t.tm_year = (int)year - 1900;
    t.tm_mon = mon - 1;
    t.tm_mday = (int)day;
    t.tm_hour = (int)hh;
    t.tm_min = (int)mm;
    t.tm_sec = (int)ss;
    t.tm_isdst = 0;

    time_t epochUtc = mktime(&t); // TZ среды не задаётся => эквивалентно timegm
    if (epochUtc == (time_t)-1) return res;
    epochUtc -= (time_t)tzOffMin * 60;

    res.epoch = epochUtc;
    res.valid = true;
    return res;
}

String getEventTime(const String &pubDate) {
    time_t now = time(nullptr);
    time_t eventUtc = now;

#if USE_PUBDATE_TIME
    if (pubDate.length() > 0) {
        RssDate d = parseRussianDate(pubDate);
        if (d.valid) {
            eventUtc = d.epoch;
        } else {
            logMsg("  pubDate не распарсился, использую текущее время");
        }
    }
#else
    (void)pubDate;
#endif

    // Перевод в пояс Уфы (UTC+5) и форматирование "hh:mm dd.mm.yy"
    struct tm ufaTm{};
    time_t shifted = eventUtc + UFA_UTC_OFFSET_SEC;
    gmtime_r(&shifted, &ufaTm);

    char buf[24];
    snprintf(buf, sizeof(buf), "%02d:%02d %02d.%02d.%02d",
             ufaTm.tm_hour, ufaTm.tm_min,
             ufaTm.tm_mday, ufaTm.tm_mon + 1, ufaTm.tm_year % 100);
    return String(buf);
}
