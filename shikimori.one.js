/**
 * Shikimori для Lampa
 * - Добавляет пункт "Shikimori" в левое меню
 * - Открывает каталог аниме с категориями
 * - Показывает рейтинг Shikimori в карточках
 * API: shikimori.one
 */
(function () {
    'use strict';

    var HOST = 'https://shikimori.one';
    var API  = HOST + '/api';

    // ─── SVG-иконка для меню ─────────────────────────────────────────────────
    var ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>';

    // ─── Утилиты ──────────────────────────────────────────────────────────────
    function imgUrl(a) {
        if (!a || !a.image) return '';
        var p = (a.image.original || a.image.preview || '');
        return p ? (p.indexOf('http') === 0 ? p : HOST + p) : '';
    }

    function apiGet(path, params, ok, fail) {
        var qs = '';
        if (params) {
            var parts = [];
            for (var k in params) {
                if (params[k] !== '' && params[k] !== null && params[k] !== undefined) {
                    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
                }
            }
            if (parts.length) qs = '?' + parts.join('&');
        }
        var net = new Lampa.Reguest();
        net.timeout(15000);
        net['native'](API + path + qs, function (data) {
            net = null;
            ok(data);
        }, function (e) {
            net = null;
            if (fail) fail(e);
        }, false, {});
    }

    function toCard(a) {
        var isMovie = (a.kind === 'movie');
        var year = (a.aired_on || '').slice(0, 4);
        var poster = imgUrl(a);
        return {
            source:           'shikimori',
            type:             isMovie ? 'movie' : 'tv',
            id:               'shiki_' + a.id,
            shiki_id:         a.id,
            title:            a.russian || a.name || '',
            name:             a.russian || a.name || '',
            original_title:   a.name || '',
            original_name:    a.name || '',
            overview:         '',
            img:              poster,
            poster:           poster,
            background_image: poster,
            vote_average:     parseFloat(a.score) || 0,
            vote_count:       0,
            genres:           [],
            adult:            false,
            release_date:     isMovie ? year : '',
            first_air_date:   isMovie ? '' : year,
            number_of_seasons:   isMovie ? 0 : 1,
            seasons:             isMovie ? [] : [],
            number_of_episodes:  parseInt(a.episodes) || 0,
            production_companies: [],
            production_countries: []
        };
    }

    // ─── Категории ───────────────────────────────────────────────────────────
    var CATS = [
        { title: 'Топ аниме',    order: 'ranked',     kind: '',      status: '' },
        { title: 'Онгоинги',     order: 'popularity', kind: 'tv',    status: 'ongoing' },
        { title: 'Популярное',   order: 'popularity', kind: '',      status: '' },
        { title: 'Фильмы',       order: 'ranked',     kind: 'movie', status: '' },
        { title: 'OVA / ONA',    order: 'ranked',     kind: 'ova,ona', status: '' },
        { title: 'Зима 2025',    order: 'popularity', kind: '',      status: '', season: '2025_winter' },
        { title: 'Весна 2025',   order: 'popularity', kind: '',      status: '', season: '2025_spring' },
        { title: 'Лето 2025',    order: 'popularity', kind: '',      status: '', season: '2025_summer' },
        { title: 'Осень 2025',   order: 'popularity', kind: '',      status: '', season: '2025_fall' },
        { title: 'Зима 2026',    order: 'popularity', kind: '',      status: '', season: '2026_winter' },
    ];

    // ─── Компонент: список аниме (category_full-совместимый) ─────────────────
    function ShikimoriList(object) {
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items   = new Lampa.Items();
        var html    = $('<div class="shikimori-list"></div>');
        var filter  = Lampa.Storage.get('shikimori_filter', { order: 'ranked', kind: '', status: '', season: '' });
        var page    = 1;
        var loading = false;
        var ended   = false;

        function params() {
            var p = { limit: 20, page: page };
            if (filter.order)  p.order  = filter.order;
            if (filter.kind)   p.kind   = filter.kind;
            if (filter.status) p.status = filter.status;
            if (filter.season) p.season = filter.season;
            if (object.search) p.search = object.search;
            return p;
        }

        function load() {
            if (loading || ended) return;
            loading = true;
            Lampa.Loading.start(html[0]);

            var p = params();
            var qs = [];
            for (var k in p) qs.push(k + '=' + encodeURIComponent(p[k]));

            network.timeout(15000);
            network['native'](API + '/animes?' + qs.join('&'), function (data) {
                loading = false;
                Lampa.Loading.stop();

                if (!data || !data.length) {
                    ended = true;
                    if (page === 1) Lampa.Noty.show('Shikimori: ничего не найдено');
                    return;
                }
                if (data.length < 20) ended = true;

                data.forEach(function (a) {
                    var card = Lampa.Card.build(toCard(a));
                    scroll.body().append(card);
                });

                items.update();
                Lampa.Controller.enable('content');
            }, function () {
                loading = false;
                Lampa.Loading.stop();
                Lampa.Noty.show('Shikimori: ошибка загрузки');
            }, false, {});
        }

        this.start = function () {
            Lampa.Controller.enable('content');
        };

        this.create = function () {
            var _this = this;

            scroll.append(html);
            scroll.body().addClass('items-line');

            load();

            scroll.onEnd = function () {
                page++;
                load();
            };

            this.activity.toggle();
        };

        this.back   = function () { Lampa.Activity.backward(); };
        this.render = function () { return scroll.render(); };
        this.pause  = function () {};
        this.resume = function () {};
        this.stop   = function () {};
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            items.destroy();
        };
    }

    // ─── Компонент: главное меню Shikimori ───────────────────────────────────
    function ShikimoriHome(object) {
        var scroll  = new Lampa.Scroll({ mask: true, over: true });
        var items   = new Lampa.Items();
        var network = new Lampa.Reguest();
        var html    = $('<div class="shikimori-home"></div>');

        function buildCatItem(cat) {
            var el = $('<div class="shikimori-home__item selector">' + Lampa.Utils.escapeHtml(cat.title) + '</div>');
            el.on('hover:enter', function () {
                Lampa.Activity.push({
                    url:       '',
                    title:     'Shikimori: ' + cat.title,
                    component: 'shikimori_list',
                    order:     cat.order  || 'ranked',
                    kind:      cat.kind   || '',
                    status:    cat.status || '',
                    season:    cat.season || '',
                    page:      1
                });
            });
            return el;
        }

        function buildSearchItem() {
            var el = $('<div class="shikimori-home__item selector">🔍 Поиск аниме</div>');
            el.on('hover:enter', function () {
                Lampa.Input.show({
                    title: 'Поиск на Shikimori',
                    value: '',
                    callback: function (value) {
                        if (value && value.trim()) {
                            Lampa.Activity.push({
                                url:       '',
                                title:     'Shikimori: ' + value,
                                component: 'shikimori_list',
                                search:    value.trim(),
                                page:      1
                            });
                        }
                    }
                });
            });
            return el;
        }

        this.create = function () {
            CATS.forEach(function (cat) {
                scroll.body().append(buildCatItem(cat));
            });
            scroll.body().append(buildSearchItem());

            items.update();
            Lampa.Controller.enable('content');
            this.activity.toggle();
        };

        this.start   = function () { Lampa.Controller.enable('content'); };
        this.back    = function () { Lampa.Activity.backward(); };
        this.render  = function () { return scroll.render(); };
        this.pause   = function () {};
        this.resume  = function () {};
        this.stop    = function () {};
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            items.destroy();
        };
    }

    // ─── CSS ─────────────────────────────────────────────────────────────────
    var CSS = [
        '.shikimori-home { padding: 2em; }',
        '.shikimori-home__item {',
        '  display: block;',
        '  padding: 0.9em 1.4em;',
        '  margin: 0.3em 0;',
        '  font-size: 1.4em;',
        '  border-radius: 0.5em;',
        '  cursor: pointer;',
        '}',
        '.shikimori-home__item.focus,',
        '.shikimori-home__item:hover {',
        '  background: rgba(255,255,255,0.15);',
        '}',
    ].join('\n');

    function addCss() {
        var s = document.createElement('style');
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    // ─── Добавление пункта в меню ─────────────────────────────────────────────
    function addMenuButton() {
        // Ждём появления меню в DOM
        var tries = 0;
        var interval = setInterval(function () {
            tries++;
            var menuList = document.querySelector('.menu .menu__list');
            if (!menuList) {
                if (tries > 100) clearInterval(interval);
                return;
            }
            clearInterval(interval);

            // Проверяем — не добавлен ли уже
            if (document.querySelector('[data-action="shikimori"]')) return;

            var li = document.createElement('li');
            li.className = 'menu__item selector';
            li.setAttribute('data-action', 'shikimori');
            li.innerHTML =
                '<div class="menu__ico">' + ICON_SVG + '</div>' +
                '<div class="menu__text">Shikimori</div>';

            li.addEventListener('click', openShikimori);
            li.addEventListener('keydown', function (e) {
                if (e.keyCode === 13 || e.keyCode === 32) openShikimori();
            });

            // Вставляем после "Аниме" если есть, иначе в конец
            var animeItem = menuList.querySelector('[data-action="anime"]');
            if (animeItem && animeItem.parentNode === menuList) {
                menuList.insertBefore(li, animeItem.nextSibling);
            } else {
                menuList.appendChild(li);
            }

        }, 100);
    }

    function openShikimori() {
        Lampa.Activity.push({
            url:       '',
            title:     'Shikimori',
            component: 'shikimori_home',
            page:      1
        });
    }

    // ─── Рейтинг Shikimori в карточке (бонус) ────────────────────────────────
    function initRatingBadge() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var movie = e.data && e.data.movie;
            if (!movie) return;

            var title = movie.original_title || movie.original_name || movie.name || movie.title || '';
            if (!title) return;

            var net = new Lampa.Reguest();
            net.timeout(10000);
            net['native'](
                API + '/animes?search=' + encodeURIComponent(title) + '&limit=1&order=popularity',
                function (data) {
                    if (!data || !data.length) return;
                    var a = data[0];
                    var score = parseFloat(a.score);
                    if (!score || score <= 0) return;

                    // Находим блок с рейтингом (vote_average)
                    var component = e.object && e.object.component;
                    if (!component || !component.render) return;
                    var dom = component.render();
                    if (!dom || !dom.length) return;

                    // Удаляем старый бейдж если есть
                    dom.find('.shiki-badge').remove();

                    var badge = $('<div class="shiki-badge" style="display:inline-block;margin-left:0.7em;padding:0.1em 0.5em;background:rgba(123,104,238,0.85);border-radius:0.3em;font-size:0.85em;color:#fff;vertical-align:middle;">&#9733; ' + score.toFixed(2) + ' Shikimori</div>');

                    // Вставляем рядом с vote_average
                    var scoreEl = dom.find('.full-start__rate, .rate').first();
                    if (scoreEl.length) {
                        scoreEl.after(badge);
                    } else {
                        dom.find('h1, .title').first().after(badge);
                    }
                },
                function () {},
                false, {}
            );
        });
    }

    // ─── Инициализация ───────────────────────────────────────────────────────
    function init() {
        addCss();

        Lampa.Component.add('shikimori_home', ShikimoriHome);
        Lampa.Component.add('shikimori_list', ShikimoriList);

        addMenuButton();
        initRatingBadge();
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

})();
