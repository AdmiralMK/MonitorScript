# pragma once
/**
 * Логирование (аналог lib/logger.js).
 * Все служебные сообщения идут в USB-CDC Serial (пины 43/44 заняты под UART-канал данных).
 */

#include <Arduino.h>

#define LOG_PREFIX "[BPLA] "

inline void logMsg(const String &msg) {
    Serial.println(String(LOG_PREFIX) + msg);
}

template <typename... Args>
inline void logf(const char *fmt, Args... args) {
    char buf[256];
    snprintf(buf, sizeof(buf), fmt, args...);
    logMsg(buf);
}
