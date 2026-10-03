/**
 * Модуль логирования
 * Все сообщения выводятся в stderr, чтобы не мешать JSON-выводу в stdout
 */

const PREFIX = '[BPLA] ';

function log(msg) {
  console.error(PREFIX + msg);
}

function logError(msg, err) {
  if (err) {
    console.error(PREFIX + msg + ': ' + (err.message || err));
  } else {
    console.error(PREFIX + msg);
  }
}

module.exports = { log, logError };
