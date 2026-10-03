# pragma once
/**
 * Классификация событий по заголовку и описанию новости
 * (полный аналог classifyEvents / makeEventKey из lib/classifier.js).
 */

#include <Arduino.h>
#include <vector>
#include "templates.h"

/** Ключ события: "тип::newsId" (аналог makeEventKey). */
String makeEventKey(EventType eventType, const String &newsId);

/**
 * Определение списка типов событий по title + description.
 * Логика 1:1 повторяет classifyEvents() из classifier.js.
 */
std::vector<EventType> classifyEvents(const String &title, const String &description);
