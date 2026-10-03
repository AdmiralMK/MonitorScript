/**
 * Модуль загрузки URL
 * Поддерживает редиректы и retry при DNS-ошибках / 403
 */

const https = require('https');
const http = require('http');
const { log } = require('./logger');
const { MAX_REDIRECTS } = require('./config');

var BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'identity',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': 'https://gkchs.bashkortostan.ru/presscenter/news/',
  'Connection': 'close'
};

function fetchURL(url, redirectCount, retryCount) {
  if (redirectCount === undefined) redirectCount = 0;
  if (retryCount === undefined) retryCount = 0;

  if (redirectCount > MAX_REDIRECTS) {
    return Promise.reject(new Error('Слишком много редиректов'));
  }

  return new Promise(function(resolve, reject) {
    var client = url.indexOf('https') === 0 ? https : http;
    var req = client.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 15000
    }, function(res) {
      // Обработка редиректов
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        var loc = res.headers.location;
        if (loc.indexOf('/') === 0) {
          var u = new URL(url);
          loc = u.protocol + '//' + u.host + loc;
        }
        res.resume();
        resolve(fetchURL(loc, redirectCount + 1, retryCount));
        return;
      }

      // 403 — часто антибот; повтор с паузой
      if (res.statusCode === 403 && retryCount < 2) {
        res.resume();
        log('HTTP 403, retry ' + (retryCount + 1) + '/2 через 1.5 сек...');
        setTimeout(function() {
          fetchURL(url, redirectCount, retryCount + 1).then(resolve, reject);
        }, 1500);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }

      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        var t = data.trim();
        if (t.indexOf('<!DOCTYPE') === 0 || t.indexOf('<html') === 0 ||
            t.indexOf('<HTML') === 0 || t.indexOf('<h1>Forbidden') === 0) {
          reject(new Error('HTML вместо RSS'));
          return;
        }
        resolve(data);
      });
    });

    req.on('error', function(err) {
      if (err.code === 'EAI_AGAIN' && retryCount < 3) {
        log('DNS-ошибка, retry ' + (retryCount + 1) + '/3 через 2 сек...');
        setTimeout(function() {
          fetchURL(url, redirectCount, retryCount + 1).then(resolve, reject);
        }, 2000);
      } else {
        reject(err);
      }
    });

    req.on('timeout', function() {
      req.destroy();
      reject(new Error('Таймаут'));
    });
  });
}

module.exports = { fetchURL };