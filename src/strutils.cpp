/**
 * Реализация UTF-8 утилит (см. strutils.h).
 */

#include "strutils.h"
#include "config.h"

String toLowerUtf8(const String &in) {
    String out;
    out.reserve(in.length());
    for (size_t i = 0; i < in.length();) {
        bool matched = false;
        // Двухбайтовая кириллица: заменяем заглавную строчной
        for (size_t p = 0; p < CYR_PAIRS_COUNT; p++) {
            const char *u = CYR_PAIRS[p].upper;
            size_t ulen = strlen(u);
            if (i + ulen <= in.length() &&
                memcmp(in.c_str() + i, u, ulen) == 0) {
                out += CYR_PAIRS[p].lower;
                i += ulen;
                matched = true;
                break;
            }
        }
        if (matched) continue;

        unsigned char c = (unsigned char)in[i];
        if (c >= 'A' && c <= 'Z') {
            out += (char)(c + 32);
            i++;
        } else {
            // копируем весь многобайтовый символ целиком
            size_t clen = 1;
            if ((c & 0xE0) == 0xC0) clen = 2;
            else if ((c & 0xF0) == 0xE0) clen = 3;
            else if ((c & 0xF8) == 0xF0) clen = 4;
            if (i + clen > in.length()) clen = in.length() - i;
            out.concat(in.c_str() + i, clen);
            i += clen;
        }
    }
    return out;
}

std::vector<String> splitMessage(const String &text, size_t maxLen) {
    std::vector<String> msgs;
    if (maxLen == 0) maxLen = MESSAGE_MAX_LEN;

    String cur;
    size_t i = 0;
    size_t n = text.length();

    while (i < n) {
        // пропуск разделителей слов
        while (i < n && isspace((unsigned char)text[i])) i++;
        if (i >= n) break;

        size_t start = i;
        while (i < n && !isspace((unsigned char)text[i])) i++;
        String w = text.substring(start, i);

        // длина "cur + ' ' + w" (без лидирующих пробелов, как в JS-версии)
        size_t joined = (cur.length() > 0 ? cur.length() + 1 : 0) + w.length();

        if (joined > maxLen) {
            if (cur.length() > 0) {
                msgs.push_back(cur);
                cur = "";
            }
            if (w.length() > maxLen) {
                // режем длинное слово по байтам, не разрывая UTF-8 символ
                size_t pos = 0;
                while (pos < w.length()) {
                    size_t take = w.length() - pos;
                    if (take > maxLen) take = maxLen;
                    while (take > 1 &&
                           ((unsigned char)w[pos + take] & 0xC0) == 0x80)
                        take--;
                    msgs.push_back(w.substring(pos, pos + take));
                    pos += take;
                }
            } else {
                cur = w;
            }
        } else {
            if (cur.length() > 0) cur += " ";
            cur += w;
        }
    }
    if (cur.length() > 0) msgs.push_back(cur);
    return msgs;
}
