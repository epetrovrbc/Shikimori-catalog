/**
 * Shikimori — источник данных для Lampa
 * Каталог аниме + оценки в карточках
 * API: shikimori.one
 */

(function () {
    'use strict';

    var SOURCE_NAME  = 'SHIKIMORI';
    var SOURCE_TITLE = 'Shikimori';
    var API          = 'https://shikimori.one/api';
    var HOST         = 'https://shikimori.one';

    var network = new Lampa.Reguest();

    // ─── Утилиты ──────────────────────────────────────────────────────────────

    function img(anime) {
        if (!anime || !anime.image) return '';
        var p = anime.image.original || anime.image.preview || '';
        if (!p) return '';
        return p.indexOf('http') === 0 ? p : HOST + p;
    }

    var KIND = { tv:'TV', movie:'Фильм', ova:'OVA', ona:'ONA', special:'Спешл', music:'Клип',
                 tv_13:'TV', tv_24:'TV', tv_48:'TV' };
    var STATUS = { anons:'Анонс', ongoing:'Онгоинг', released:'Вышло' };

    function toCard(a) {
        var isMovie  = (a.kind === 'movie');
        var year     = (a.aired_on || '').substring(0, 4);
        var title    = a.russian || a.name || '';
        var poster   = img(a);
        var score    = parseFloat(a.score) || 0;
        var card = {
            source:           SOURCE_NAME,
            type:             isMovie ? 'movie' : 'tv',
            id:               SOURCE_NAME + '_' + a.id,
            shikimori_id:     a.id,
            title:            title,
            name:             title,
            original_title:   a.name || '',
            original_name:    a.name || '',
            overview:         '',
            img:              poster,
            poster:           poster,
            background_image: poster,
            vote_average:     score,
            vote_count:       0,
            genres:           [],
            production_companies: [],
            production_countries: [],
            kinopoisk_id:     '',
            imdb_id:          '',
            adult:            false
        };
        if (isMovie) {
            card.release_date = year;
        } else {
            card.first_air_date    = year;
            card.number_of_seasons = 1;
            card.seasons           = [];
            card.number_of_episodes = parseInt(a.episodes) || 0;
        }
        return card;
    }

    function toFull(a) {
        var card = toCard(a);
        card.overview = a.description_html
            ? a.description_html.replace(/<[^>]+>/g, '')
            : (a.description || '');

        var genreArr = [];
        if (a.genres && a.genres.length) {
            genreArr = a.genres.map(function(g){ return { id: g.id, name: g.russian || g.name }; });
        }
        card.genres = genreArr;

        var info = [];
        if (KIND[a.kind])   info.push(KIND[a.kind]);
        if (STATUS[a.status]) info.push(STATUS[a.status]);
        if (a.episodes && parseInt(a.episodes) > 0) info.push(a.episodes + ' эп.');

        card.tagline = info.join(' · ');
        return card;
    }

    function apiGet(path, params, done, fail) {
        var url = API + path;
        var qs  = Object.keys(params || {}).filter(function(k){ return params[k]; })
                       .map(function(k){ return k + '=' + encodeURIComponent(params[k]); }).join('&');
        if (qs) url += '?' + qs;
        network.timeout(15000);
        network['native'](url, done, fail || function(){}, false, {
            headers: { 'User-Agent': 'LampaShikimori/2.0' }
        });
    }

    // ─── Методы источника ─────────────────────────────────────────────────────

    /**
     * Главная страница — несколько строк
     */
    function main(params, oncomplite, onerror) {
        var rows = [
            { title: 'Топ аниме',     order: 'ranked',     kind: '',      status: '',         page: 1 },
            { title: 'Онгоинги',      order: 'popularity', kind: 'tv',    status: 'ongoing',  page: 1 },
            { title: 'Популярное',    order: 'popularity', kind: '',      status: '',         page: 1 },
            { title: 'Фильмы',        order: 'ranked',     kind: 'movie', status: '',         page: 1 },
            { title: 'OVA',           order: 'ranked',     kind: 'ova',   status: '',         page: 1 },
        ];

        var result = [];
        var done   = 0;

        rows.forEach(function(row, i) {
            apiGet('/animes', { limit: 16, page: 1, order: row.order, kind: row.kind, status: row.status },
            function(data) {
                done++;
                if (data && data.length) {
                    result[i] = {
                        title:        row.title,
                        results:      data.map(toCard),
                        url:          '/animes?order=' + row.order + '&kind=' + row.kind + '&status=' + row.status,
                        source:       SOURCE_NAME,
                        more:         true
                    };
                }
                if (done === rows.length) {
                    var out = result.filter(Boolean);
                    if (out.length) oncomplite(out);
                    else onerror();
                }
            },
            function() {
                done++;
                if (done === rows.length) {
                    var out = result.filter(Boolean);
                    if (out.length) oncomplite(out);
                    else onerror();
                }
            });
        });
    }

    /**
     * Категории меню
     */
    function menu(params, oncomplite) {
        oncomplite([
            { title: 'Топ аниме',        url: '/animes?order=ranked',                   source: SOURCE_NAME },
            { title: 'Онгоинги',         url: '/animes?order=popularity&status=ongoing', source: SOURCE_NAME },
            { title: 'Популярное',       url: '/animes?order=popularity',                source: SOURCE_NAME },
            { title: 'Фильмы',           url: '/animes?order=ranked&kind=movie',         source: SOURCE_NAME },
            { title: 'OVA / ONA',        url: '/animes?order=ranked&kind=ova,ona',       source: SOURCE_NAME },
            { title: 'Зима 2025',        url: '/animes?order=popularity&season=2025_winter', source: SOURCE_NAME },
            { title: 'Весна 2025',       url: '/animes?order=popularity&season=2025_spring', source: SOURCE_NAME },
            { title: 'Лето 2025',        url: '/animes?order=popularity&season=2025_summer', source: SOURCE_NAME },
            { title: 'Осень 2025',       url: '/animes?order=popularity&season=2025_fall',   source: SOURCE_NAME },
            { title: 'Зима 2026',        url: '/animes?order=popularity&season=2026_winter', source: SOURCE_NAME },
        ]);
    }

    /**
     * Список (пагинация категории)
     */
    function list(params, oncomplite, onerror) {
        // params.url  = '/animes?order=ranked&kind=movie'  (без домена)
        // params.page = текущая страница
        var page = params.page || 1;
        var raw  = params.url || '/animes?order=ranked';

        // Разбираем путь и параметры из url
        var qIdx  = raw.indexOf('?');
        var path  = qIdx >= 0 ? raw.substring(0, qIdx) : raw;
        var qsRaw = qIdx >= 0 ? raw.substring(qIdx + 1) : '';
        var qMap  = {};
        qsRaw.split('&').forEach(function(p){
            var kv = p.split('=');
            if (kv[0]) qMap[kv[0]] = decodeURIComponent(kv[1] || '');
        });

        var apiParams = {
            limit:  20,
            page:   page,
            order:  qMap.order  || 'ranked',
            kind:   qMap.kind   || '',
            status: qMap.status || '',
            season: qMap.season || '',
            search: qMap.search || ''
        };

        apiGet(path, apiParams,
        function(data) {
            if (!data || !data.length) { onerror(); return; }
            oncomplite({
                results:      data.map(toCard),
                url:          params.url,
                page:         page,
                total_pages:  page + (data.length >= 20 ? 1 : 0),
                total_results: data.length,
                source:       SOURCE_NAME,
                more:         data.length >= 20
            });
        }, onerror);
    }

    /**
     * Поиск
     */
    function search(params, oncomplite, onerror) {
        var query = decodeURIComponent(params.query || '');
        if (!query) { oncomplite([]); return; }

        apiGet('/animes', { search: query, limit: 30, order: 'popularity' },
        function(data) {
            if (!data || !data.length) { oncomplite([]); return; }
            var cards = data.map(toCard);
            var result = {
                results:      cards,
                url:          '/animes?search=' + encodeURIComponent(query),
                page:         1,
                total_pages:  1,
                total_results: cards.length,
                source:       SOURCE_NAME,
                title:        SOURCE_TITLE,
                type:         'tv',
                more:         false
            };
            oncomplite([result]);
        }, function(){ oncomplite([]); });
    }

    /**
     * Полные данные карточки
     */
    function full(params, oncomplite, onerror) {
        var card = params.card || {};
        var id   = card.shikimori_id;

        if (!id && typeof card.id === 'string' && card.id.indexOf(SOURCE_NAME + '_') === 0) {
            id = card.id.substring(SOURCE_NAME.length + 1);
        }

        if (!id) { onerror(); return; }

        apiGet('/animes/' + id, {},
        function(a) {
            if (!a || !a.id) { onerror(); return; }
            var fullCard = toFull(a);

            var status = new Lampa.Status(1);
            status.onComplite = oncomplite;
            status.append('movie', fullCard);
        }, onerror);
    }

    /**
     * Персоны (Shikimori не поддерживает — возвращаем пустое)
     */
    function person(params, oncomplite) {
        oncomplite({});
    }

    /**
     * Сезоны (для ТВ)
     */
    function seasons(tv, from, oncomplite) {
        oncomplite({});
    }

    /**
     * Подкатегории
     */
    function menuCategory(params, oncomplite) {
        oncomplite([]);
    }

    /**
     * Discovery — строка в общем поиске Lampa
     */
    function discovery() {
        return {
            title:  SOURCE_TITLE,
            search: search,
            params: {
                align_left: true,
                object: { source: SOURCE_NAME }
            },
            onMore: function(params) {
                Lampa.Activity.push({
                    url:       '/animes?search=' + (params.query || ''),
                    title:     SOURCE_TITLE + ': ' + decodeURIComponent(params.query || ''),
                    component: 'category_full',
                    page:      1,
                    query:     params.query,
                    source:    SOURCE_NAME
                });
            },
            onCancel: network.clear.bind(network)
        };
    }

    function clear() {
        network.clear();
    }

    // ─── Регистрация ──────────────────────────────────────────────────────────

    var SHIKI = {
        SOURCE_NAME:  SOURCE_NAME,
        SOURCE_TITLE: SOURCE_TITLE,
        main:         main,
        menu:         menu,
        full:         full,
        list:         list,
        search:       search,
        clear:        clear,
        person:       person,
        seasons:      seasons,
        menuCategory: menuCategory,
        discovery:    discovery
    };

    function addPlugin() {
        if (Lampa.Api.sources[SOURCE_NAME]) return; // уже есть

        Lampa.Api.sources[SOURCE_NAME] = SHIKI;

        // Защита от перезаписи другими плагинами
        try {
            Object.defineProperty(Lampa.Api.sources, SOURCE_NAME, {
                get: function(){ return SHIKI; },
                configurable: true
            });
        } catch(e) {}
    }

    if (window.appready) {
        addPlugin();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') addPlugin();
        });
    }

})();
