/**
 * Shikimori Catalog Plugin for Lampa
 * Исправленная версия: домен shikimori.one, исправлен appendChild, обновлён API
 * 
 * Установка: Настройки → Расширения → Добавить плагин → вставить URL этого файла
 */

(function () {
    'use strict';

    var API_BASE = 'https://shikimori.one/api';
    var IMG_BASE = 'https://shikimori.one';
    var PLUGIN_NAME = 'Shikimori';

    // ─── Вспомогательные функции ────────────────────────────────────────────

    /**
     * Делает GET-запрос к Shikimori API через $.ajax (jQuery доступен в Lampa)
     * @param {string} endpoint  - путь после /api, например "/animes"
     * @param {object} params    - GET-параметры
     * @param {function} success
     * @param {function} error
     */
    function apiGet(endpoint, params, success, error) {
        var url = API_BASE + endpoint;
        Lampa.Ajax.get({
            url: url,
            data: params || {},
            success: success,
            error: error || function (e) {
                console.error('[Shikimori] Ошибка запроса:', e);
            }
        });
    }

    /**
     * Формирует URL постера. Shikimori возвращает относительные пути вида /system/...
     */
    function posterUrl(anime) {
        if (!anime || !anime.image) return '';
        var path = anime.image.original || anime.image.preview || '';
        if (!path) return '';
        if (path.indexOf('http') === 0) return path;
        return IMG_BASE + path;
    }

    /**
     * Конвертирует объект аниме из формата Shikimori в формат карточки Lampa
     */
    function toCard(anime) {
        var title = anime.russian || anime.name || '';
        var orig  = anime.name || '';
        var poster = posterUrl(anime);
        var score  = parseFloat(anime.score) || 0;

        return {
            id:           anime.id,
            title:        title,
            original_title: orig,
            release_date: (anime.aired_on || '').substring(0, 4),
            poster:       poster,
            poster_path:  poster,
            vote_average: score,
            vote_count:   0,
            overview:     '',
            // сохраняем оригинал для детальной карточки
            shikimori:    anime,
            source:       'shikimori'
        };
    }

    // ─── Компонент: список аниме ────────────────────────────────────────────

    function ShikimoriCatalog(object) {
        var comp    = this;
        var html    = Lampa.Template.get('catalog', {});   // получаем DOM-элемент шаблона
        var body    = html.find('.catalog__content, .content');
        var page    = 1;
        var total   = 0;
        var loading = false;
        var filter  = object.filter || {};

        this.create = function () {
            // Показываем загрузчик
            Lampa.Loading.start(html);
            comp.load();
            this.activity.toggle();
        };

        this.load = function () {
            if (loading) return;
            loading = true;

            var params = {
                limit:  20,
                page:   page,
                order:  filter.order  || 'ranked',
                kind:   filter.kind   || '',
                status: filter.status || '',
                season: filter.season || '',
                genre:  filter.genre  || '',
                score:  filter.score  || ''
            };

            // Убираем пустые параметры
            Object.keys(params).forEach(function (k) {
                if (!params[k] && params[k] !== 0) delete params[k];
            });

            apiGet('/animes', params, function (data) {
                loading = false;
                Lampa.Loading.stop(html);

                if (!data || !data.length) {
                    if (page === 1) {
                        Lampa.Noty.show('Shikimori: ничего не найдено');
                    }
                    return;
                }

                total += data.length;
                data.forEach(function (anime) {
                    var card = Lampa.Card.build(toCard(anime));
                    body.append(card);
                });

                Lampa.Controller.enable('content');
            }, function (e) {
                loading = false;
                Lampa.Loading.stop(html);
                Lampa.Noty.show('Shikimori: ошибка загрузки');
                console.error('[Shikimori] Ошибка:', e);
            });
        };

        this.nextPage = function () {
            page++;
            comp.load();
        };

        this.render = function () {
            return html;
        };

        this.pause  = function () {};
        this.resume = function () {};

        this.back = function () {
            Lampa.Activity.backward();
        };

        this.destroy = function () {
            Lampa.Loading.stop(html);
            html.remove();
        };
    }

    // ─── Компонент: поиск ──────────────────────────────────────────────────

    function ShikimoriSearch(object) {
        var comp    = this;
        var html    = Lampa.Template.get('catalog', {});
        var body    = html.find('.catalog__content, .content');
        var query   = object.search || '';

        this.create = function () {
            Lampa.Loading.start(html);

            apiGet('/animes', { search: query, limit: 30, order: 'popularity' }, function (data) {
                Lampa.Loading.stop(html);

                if (!data || !data.length) {
                    Lampa.Noty.show('Shikimori: по запросу «' + query + '» ничего не найдено');
                    return;
                }

                data.forEach(function (anime) {
                    var card = Lampa.Card.build(toCard(anime));
                    body.append(card);
                });

                Lampa.Controller.enable('content');
            }, function () {
                Lampa.Loading.stop(html);
                Lampa.Noty.show('Shikimori: ошибка поиска');
            });

            this.activity.toggle();
        };

        this.render  = function () { return html; };
        this.pause   = function () {};
        this.resume  = function () {};
        this.back    = function () { Lampa.Activity.backward(); };
        this.destroy = function () { Lampa.Loading.stop(html); html.remove(); };
    }

    // ─── Компонент: главное меню (категории) ───────────────────────────────

    function ShikimoriMenu(object) {
        var comp = this;
        // Используем jQuery для создания DOM — не передаём строку в appendChild!
        var html = $('<div class="shikimori-menu layer--wheight layer--wheight"></div>');

        var categories = [
            { title: 'Топ аниме',        icon: '⭐', order: 'ranked',     kind: '',  status: '' },
            { title: 'Онгоинги',          icon: '📺', order: 'popularity', kind: 'tv',status: 'ongoing' },
            { title: 'Фильмы',            icon: '🎬', order: 'ranked',     kind: 'movie', status: '' },
            { title: 'OVA / ONA',         icon: '💿', order: 'ranked',     kind: 'ova,ona', status: '' },
            { title: 'Популярное',        icon: '🔥', order: 'popularity', kind: '',  status: '' },
            { title: 'Новые сезоны',      icon: '🆕', order: 'aired_on',   kind: '',  status: 'released' },
            { title: 'Зимний сезон 2025', icon: '❄️', order: 'popularity', kind: '',  season: '2025_winter', status: '' },
            { title: 'Весенний 2025',     icon: '🌸', order: 'popularity', kind: '',  season: '2025_spring', status: '' },
            { title: 'Летний 2025',       icon: '☀️', order: 'popularity', kind: '',  season: '2025_summer', status: '' },
            { title: 'Осенний 2025',      icon: '🍂', order: 'popularity', kind: '',  season: '2025_fall',   status: '' },
            { title: '🔍 Поиск',          icon: '🔍', search: true },
        ];

        categories.forEach(function (cat) {
            var item = $('<div class="shikimori-menu__item selector"></div>');
            item.text((cat.icon ? cat.icon + ' ' : '') + cat.title);
            item.on('hover:enter', function () {
                if (cat.search) {
                    // Открываем стандартный поиск Lampa с нашим обработчиком
                    Lampa.Input.show({
                        title: 'Поиск аниме на Shikimori',
                        value: '',
                        callback: function (value) {
                            if (value) {
                                Lampa.Activity.push({
                                    url: '',
                                    title: 'Shikimori: ' + value,
                                    search: value,
                                    component: 'shikimori_search'
                                });
                            }
                        }
                    });
                } else {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Shikimori: ' + cat.title,
                        filter: {
                            order:  cat.order  || 'ranked',
                            kind:   cat.kind   || '',
                            status: cat.status || '',
                            season: cat.season || '',
                        },
                        component: 'shikimori_catalog'
                    });
                }
            });
            html.append(item);
        });

        this.create = function () {
            this.activity.toggle();
        };

        this.render = function () {
            return html;
        };

        this.pause   = function () {};
        this.resume  = function () {};
        this.back    = function () { Lampa.Activity.backward(); };
        this.destroy = function () { html.remove(); };
    }

    // ─── CSS стили ──────────────────────────────────────────────────────────

    function addStyles() {
        var css = [
            '.shikimori-menu { padding: 2em; }',
            '.shikimori-menu__item {',
            '    display: block;',
            '    padding: 0.8em 1.2em;',
            '    margin-bottom: 0.4em;',
            '    border-radius: 0.4em;',
            '    font-size: 1.3em;',
            '    cursor: pointer;',
            '    transition: background 0.2s;',
            '}',
            '.shikimori-menu__item.focus {',
            '    background: rgba(255,255,255,0.15);',
            '}',
        ].join('\n');

        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ─── Регистрация компонентов и пункта меню ──────────────────────────────

    function init() {
        addStyles();

        // Регистрируем компоненты активности
        Lampa.Component.add('shikimori_menu',    ShikimoriMenu);
        Lampa.Component.add('shikimori_catalog', ShikimoriCatalog);
        Lampa.Component.add('shikimori_search',  ShikimoriSearch);

        // Добавляем пункт в боковое меню
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                addMenuItem();
            }
        });
    }

    function addMenuItem() {
        // Проверяем, не добавлен ли уже пункт
        if (Lampa.Menu && Lampa.Menu.has && Lampa.Menu.has('shikimori')) return;

        var menuItem = {
            title:     'Shikimori',
            subtitle:  'Каталог аниме',
            icon:      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',
            component: 'shikimori_menu',
            id:        'shikimori'
        };

        if (Lampa.Menu && Lampa.Menu.add) {
            Lampa.Menu.add(menuItem);
        }
    }

    // ─── Точка входа ────────────────────────────────────────────────────────

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                init();
            }
        });
    }

})();