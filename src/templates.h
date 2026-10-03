# pragma once
/**
 * Шаблоны событий (аналог templates.js из Node-версии).
 *
 * В исходном репозитории файл templates.js отсутствовал, поэтому шаблоны
 * восстановлены по логике классификатора: 6 типов событий, у каждого —
 * иконка, заголовок, текст сообщения, признак "активная тревога"
 * (isAlert) и противоположный тип (alert <-> cancel).
 */

#include <Arduino.h>

enum EventType {
    EV_NONE = 0,
    EV_AIRPORT_RESTRICT,   // ограничение работы аэропорта Уфы
    EV_AIRPORT_RELEASE,    // снятие ограничений аэропорта Уфы
    EV_ROCKET_ALERT,       // ракетная опасность
    EV_ROCKET_CANCEL,      // отмена ракетной опасности
    EV_BPLA_ALERT,         // опасность БПЛА
    EV_BPLA_CANCEL,        // отмена опасности БПЛА
    EV_TYPE_COUNT
};

struct EventTemplate {
    const char *icon;     // эмодзи-иконка (UTF-8)
    const char *header;   // заголовок первой строки
    const char *body;     // текст второй строки
    bool isAlert;         // true — активная тревога (повторяется), false — разовое событие
    EventType opposite;   // противоположный тип или EV_NONE
};

/** Машинное имя типа (используется как ключ в state.json). */
const char *eventTypeName(EventType t);

/** Шаблон для типа события или nullptr. */
const EventTemplate *getTemplate(EventType t);
