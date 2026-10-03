/**
 * Модуль парсинга RSS-ленты
 * Извлекает новости и ID из URL
 */

const crypto = require('crypto');

function extractNewsId(url) {
  if (!url) return 'unknown';
  var cleanUrl = String(url).trim();
  var match = cleanUrl.match(/\/news\/(\d+)\/?$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return 'hash:' + crypto.createHash('md5').update(cleanUrl).digest('hex').substring(0, 8);
}

function parseRSS(xml) {
  var items = [];
  var re = /<item>([\s\S]*?)<\/item>/gi;
  var m;
  while ((m = re.exec(xml)) !== null) {
    var x = m[1];

    var tm = x.match(/<title>([\s\S]*?)<\/title>/i);
    var title = tm ? tm[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() : '';

    var dm = x.match(/<description>([\s\S]*?)<\/description>/i);
    var desc = dm ? dm[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() : '';

    var lm = x.match(/<link>([\s\S]*?)<\/link>/i);
    var link = lm ? lm[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() : '';

    var pm = x.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    var pubDate = pm ? pm[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() : '';

    var newsId = extractNewsId(link);

    items.push({
      title: title,
      description: desc,
      link: link,
      newsId: newsId,
      pubDate: pubDate
    });
  }
  return items;
}

module.exports = { parseRSS, extractNewsId };
