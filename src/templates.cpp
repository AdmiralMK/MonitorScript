/**
 * Реализация шаблонов событий (см. templates.h).
 */

#include "templates.h"

const char *eventTypeName(EventType t) {
    switch (t) {
        case EV_AIRPORT_RESTRICT: return "airport_restrict";
        case EV_AIRPORT_RELEASE:  return "airport_release";
        case EV_ROCKET_ALERT:     return "rocket_alert";
        case EV_ROCKET_CANCEL:    return "rocket_cancel";
        case EV_BPLA_ALERT:       return "bpla_alert";
        case EV_BPLA_CANCEL:      return "bpla_cancel";
        default:                  return "";
    }
}

EventType eventTypeByName(const char *name) {
    if (!name) return EV_NONE;
    for (int i = 1; i < EV_TYPE_COUNT; i++) {
        if (strcmp(name, eventTypeName((EventType)i)) == 0) return (EventType)i;
    }
    return EV_NONE;
}

const EventTemplate *getTemplate(EventType t) {
    static const EventTemplate TEMPLATES[EV_TYPE_COUNT] = {
        /* EV_NONE            */ {"", "", "", false, EV_NONE},
        /* EV_AIRPORT_RESTRICT*/ {"\xF0\x9F\x9B\x8B", // 🛋
                                  "Ограничения в аэропорту Уфы",
                                  "В аэропорту Уфы введены ограничения на приём и выпуск воздушных судов.",
                                  false, EV_AIRPORT_RELEASE},
        /* EV_AIRPORT_RELEASE */ {"\xE2\x9C\x85",     // ✅
                                  "Ограничения сняты",
                                  "Ограничения в аэропорту Уфы сняты, аэропорт работает в штатном режиме.",
                                  false, EV_AIRPORT_RESTRICT},
        /* EV_ROCKET_ALERT    */ {"\xE2\x9A\xA0\xEF\xB8\x8F", // ⚠️
                                  "Ракетная опасность",
                                  "Внимание! Объявлена ракетная опасность на территории Республики Башкортостан. Не подходите к окнам, оставайтесь в укрытии.",
                                  true, EV_ROCKET_CANCEL},
        /* EV_ROCKET_CANCEL   */ {"\xE2\x9C\x85",     // ✅
                                  "Отбой ракетной опасности",
                                  "Ракетная опасность в Республике Башкортостан отменена.",
                                  false, EV_ROCKET_ALERT},
        /* EV_BPLA_ALERT      */ {"\xE2\x9A\xA0\xEF\xB8\x8F", // ⚠️
                                  "Опасность БПЛА",
                                  "Внимание! Обнаружены беспилотные летательные аппараты над территорией Республики Башкортостан. Оставайтесь в укрытии.",
                                  true, EV_BPLA_CANCEL},
        /* EV_BPLA_CANCEL     */ {"\xE2\x9C\x85",     // ✅
                                  "Отбой опасности БПЛА",
                                  "Опасность БПЛА в Республике Башкортостан отменена.",
                                  false, EV_BPLA_ALERT},
    };
    if (t <= EV_NONE || t >= EV_TYPE_COUNT) return nullptr;
    return &TEMPLATES[t];
}
