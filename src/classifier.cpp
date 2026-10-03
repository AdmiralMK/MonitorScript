/**
 * Реализация классификатора событий (см. classifier.h).
 */

#include "classifier.h"
#include "strutils.h"

String makeEventKey(EventType eventType, const String &newsId) {
    return String(eventTypeName(eventType)) + "::" + trimStr(newsId);
}

static inline bool has(const String &text, const char *needle) {
    return text.indexOf(needle) != -1;
}

std::vector<EventType> classifyEvents(const String &title,
                                      const String &description) {
    std::vector<EventType> events;

    // toLowerCase().trim() из JS-версии
    String text = toLowerUtf8(title + " " + description);
    text.trim();

    // ---------- Проверка аэропорта ----------
    bool hasAirport = has(text, "аэропорт") || has(text, "аэропорту");
    bool hasUfa = has(text, "уф") || has(text, "уфа") || has(text, "уфы");

    if (hasAirport && hasUfa) {
        bool hasOgr = has(text, "огранич") || has(text, "ограничен");
        bool hasSnyat = has(text, "снят") || has(text, "сним");
        if (hasOgr || hasSnyat) {
            events.push_back(hasSnyat ? EV_AIRPORT_RELEASE : EV_AIRPORT_RESTRICT);
        }
    }

    // ---------- Проверка опасности ----------
    bool hasRegion = has(text, "башкортостан") || has(text, "башкир") ||
                     has(text, " рб") || has(text, "по рб") || has(text, "рб!");

    if (hasRegion) {
        bool hasRocket = has(text, "ракетн") || has(text, "ракет");
        bool hasBpla = has(text, "беспилотн") || has(text, "бпла") ||
                       has(text, "беспилот");
        bool hasOtmen = has(text, "отмен");
        bool hasContinues = has(text, "продолжает действовать");

        if (hasContinues) {
            // Сценарий №11: снятие ограничений, но опасность продолжается —
            // cancel не добавляем
        } else if (hasRocket) {
            events.push_back(hasOtmen ? EV_ROCKET_CANCEL : EV_ROCKET_ALERT);
        } else if (hasBpla) {
            events.push_back(hasOtmen ? EV_BPLA_CANCEL : EV_BPLA_ALERT);
        }
    }

    return events;
}
