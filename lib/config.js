/**
 * Конфигурация скрипта мониторинга опасностей
 * Все константы, пути и настройки собраны здесь
 */

const path = require('path');

// Базовая директория скрипта (родительская для lib/)
const BASE_DIR = path.join(__dirname, '..');

// Настройки повторения
const ALERT_REPEAT_HOURS = 2;
const ALERT_REPEAT_MS = ALERT_REPEAT_HOURS * 60 * 60 * 1000;

// Файлы
const STATE_FILE = path.join(BASE_DIR, '.bashkortostan_state.json');

// RSS источник
const RSS_URL = 'https://gkchs.bashkortostan.ru/presscenter/news/rss/';
const MAX_REDIRECTS = 5;

// Флаги форматирования сообщений
const ADD_NEWS_ID_TO_MESSAGE = false;  // добавлять ID новости в текст
const USE_PUBDATE_TIME = true;        // использовать время из pubDate

// Ограничения обработки
const MAX_ITEMS_TO_PROCESS = 5;       // обрабатывать только N последних новостей

module.exports = {
  BASE_DIR,
  ALERT_REPEAT_HOURS,
  ALERT_REPEAT_MS,
  STATE_FILE,
  RSS_URL,
  MAX_REDIRECTS,
  ADD_NEWS_ID_TO_MESSAGE,
  USE_PUBDATE_TIME,
  MAX_ITEMS_TO_PROCESS
};
