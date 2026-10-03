# pragma once
/**
 * Конфигурация прошивки ESP32-S3-N16R8 (порт bashkortostan_alert).
 * Все константы и настройки собраны здесь — аналог lib/config.js.
 */

// ============================ Wi-Fi ============================
#ifndef WIFI_SSID
#define WIFI_SSID "YOUR_WIFI_SSID"
#endif

#ifndef WIFI_PASS
#define WIFI_PASS "YOUR_WIFI_PASSWORD"
#endif

// ========================= RSS источник ========================
#define RSS_URL "https://gkchs.bashkortostan.ru/presscenter/news/rss/"

// Максимум редиректов при загрузке RSS (аналог MAX_REDIRECTS)
#define MAX_REDIRECTS 5

// Таймаут HTTP-запроса, мс
#define HTTP_TIMEOUT_MS 15000

// =========================== Период =============================
// Запускать обработку раз в 1 минуту
#define CYCLE_PERIOD_MS (60UL * 1000UL)

// Повтор активной тревоги (аналог ALERT_REPEAT_HOURS = 2)
#define ALERT_REPEAT_MS (2ULL * 60ULL * 60ULL * 1000ULL)

// Обрабатывать только N последних новостей (аналог MAX_ITEMS_TO_PROCESS)
#define MAX_ITEMS_TO_PROCESS 5

// ======================= Файл состояния =========================
// LittleFS: /state.json (аналог .bashkortostan_state.json)
#define STATE_FILE "/state.json"
#define STATE_FILE_TMP "/state.json.tmp"

// ===================== Формат сообщений =========================
// Добавлять ID новости в текст сообщения (ADD_NEWS_ID_TO_MESSAGE)
#ifndef ADD_NEWS_ID_TO_MESSAGE
#define ADD_NEWS_ID_TO_MESSAGE false
#endif

// Использовать время из pubDate (USE_PUBDATE_TIME)
#ifndef USE_PUBDATE_TIME
#define USE_PUBDATE_TIME true
#endif

// Разбиение длинных сообщений на части по N байт UTF-8 (splitMessage 200)
#define MESSAGE_MAX_LEN 200

// ============================ UART ==============================
// Данных отправляется через UART2 на пинах ESP32-S3-N16R8:
//   GPIO43 = TX2, GPIO44 = RX2
#define UART_TX_PIN 43
#define UART_RX_PIN 44
#define UART_BAUD 115200
