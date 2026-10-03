#!/usr/bin/env node

/**
 * Точка входа скрипта мониторинга опасностей
 * Делегирует всю логику модулю core
 */

const { run } = require('./lib/core');

run();