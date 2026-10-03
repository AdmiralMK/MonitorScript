# pragma once
/**
 * ESP32XMLParser — лёгкий потоковый парсер XML на базе ядра EXPAT.
 *
 * Локальная копия библиотеки (интерфейс совместим с
 * https://github.com/RoboticsBrno/RB3202-ESP32XMLParser), включена в проект,
 * чтобы сборка не зависела от внешних репозиториев.
 *
 * Использование:
 *   XML::Parser parser;
 *   parser.setEndElementHandler([](const XML::Element &el){ ... });
 *   parser.parse(chunk1);            // подкармливаем HTTP-стрим по кускам
 *   parser.parse(chunk2);
 *   parser.parse(lastChunk, true);   // конец потока
 *   if (!parser.hasError()) ...
 */

#include <Arduino.h>
#include <functional>
#include <string>
#include <vector>
#include <memory>

extern "C" {
#include <expat.h>
}

class XML {
public:
    class Parser;
    class Element;
};

/**
 * Элемент XML-дерева (передаётся в обработчик endElement).
 */
class XML::Element {
  public:
    Element(const String &name) : _name(name) {}

    const String &getName() const { return _name; }

    /** Текст элемента (конкатенация всех текстовых узлов). */
    String getText() const {
        String t;
        for (const auto &c : _chars) t += c;
        return t;
    }

    /** Непосредственные дочерние элементы. */
    const std::vector<std::shared_ptr<Element>> &getChildren() const {
        return _children;
    }

    /** Первый дочерний элемент с указанным именем или nullptr. */
    std::shared_ptr<Element> getChild(const String &name) const {
        for (const auto &c : _children)
            if (c->getName() == name) return c;
        return nullptr;
    }

    /** Значение атрибута или пустая строка. */
    String getAttribute(const String &attr) const {
        for (size_t i = 0; i + 1 < _attrs.size(); i += 2)
            if (_attrs[i] == attr) return _attrs[i + 1];
        return String();
    }

    const std::vector<String> &getAttributes() const { return _attrs; }

  protected:
    friend class Parser;

    void addChild(std::shared_ptr<Element> child) {
        _children.push_back(std::move(child));
    }

    void addChars(const char *s, int len) {
        if (len <= 0) len = (int)strlen(s);
        if (!_chars.empty()) _chars.back().concat(s, (size_t)len);
        else _chars.emplace_back(s, (size_t)len);
    }

    void setAttributes(const XML_Char **atts) {
        _attrs.clear();
        for (const XML_Char **a = atts; a && *a; a += 2) {
            _attrs.emplace_back(a[0]);
            _attrs.emplace_back(a[1] ? a[1] : "");
        }
    }

    String _name;
    std::vector<String> _chars;
    std::vector<std::shared_ptr<Element>> _children;
    std::vector<String> _attrs;
};

/**
 * Потоковый парсер. Обработчик вызывается для каждого завершённого элемента.
 */
class XML::Parser {
  public:
    using Handler = std::function<void(const XML::Element &)>;

    Parser() {
        _root = std::make_shared<Element>("");
        _stack.push_back(_root);
    }

    ~Parser() {
        if (_xml) XML_ParserFree(_xml);
    }

    Parser(const Parser &) = delete;
    Parser &operator=(const Parser &) = delete;

    /** Регистрация обработчика завершения элемента. */
    void setEndElementHandler(Handler handler) {
        _endHandler = std::move(handler);
    }

    /**
     * Скармливание очередного куска XML. Возвращает false при ошибке
     * разбора (или если parse() вызвали после ошибки).
     */
    bool parse(const char *data, size_t length, bool isLast = false) {
        if (!_xml && !init()) return false;
        if (_error) return false;

        XML_Status st = XML_Parse(_xml, data, (int)length, isLast ? 1 : 0);
        if (st == XML_STATUS_ERROR) {
            _errorCode = XML_GetErrorCode(_xml);
            long line = XML_GetCurrentLineNumber(_xml);
            long col = XML_GetCurrentColumnNumber(_xml);
            char buf[192];
            snprintf(buf, sizeof(buf), "%s (line %ld, column %ld)",
                     XML_ErrorString(_errorCode), line, col);
            _errorMsg = buf;
            _error = true;
            return false;
        }
        if (isLast) _finished = true;
        return true;
    }

    bool parse(const String &s, bool isLast = false) {
        return parse(s.c_str(), s.length(), isLast);
    }

    /** Была ли ошибка разбора. */
    bool hasError() const { return _error; }
    const String &errorMessage() const { return _errorMsg; }

    /** Корень документа доступен после успешного parse(..., true). */
    std::shared_ptr<Element> getRoot() const { return _root; }

  private:
    static void startElement(void *userData, const XML_Char *name,
                             const XML_Char **atts) {
        auto *self = static_cast<Parser *>(userData);
        auto el = std::make_shared<Element>(name);
        el->setAttributes(atts);
        self->_stack.back()->addChild(el);
        self->_stack.push_back(el);
    }

    static void endElement(void *userData, const XML_Char *name) {
        auto *self = static_cast<Parser *>(userData);
        (void)name;
        std::shared_ptr<Element> el = self->_stack.back();
        self->_stack.pop_back();
        if (self->_endHandler) self->_endHandler(*el);
    }

    static void characterDataHandler(void *userData, const XML_Char *s,
                                     int len) {
        auto *self = static_cast<Parser *>(userData);
        if (!self->_stack.empty()) self->_stack.back()->addChars(s, len);
    }

    bool init() {
        _xml = XML_ParserCreate(nullptr);
        if (!_xml) {
            _error = true;
            _errorMsg = "XML_ParserCreate failed";
            return false;
        }
        XML_SetUserData(_xml, this);
        XML_SetElementHandler(_xml, startElement, endElement);
        XML_SetCharacterDataHandler(_xml, characterDataHandler);
        return true;
    }

    XML_Parser _xml = nullptr;
    std::shared_ptr<Element> _root;
    std::vector<std::shared_ptr<Element>> _stack;
    Handler _endHandler;
    bool _error = false;
    bool _finished = false;
    enum XML_Error _errorCode = XML_ERROR_NOERROR;
    String _errorMsg;
};
