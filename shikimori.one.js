/**
 * LME Shikimori — информер для Lampa
 * Исправленная версия: домен shikimori.one, исправлены все ошибки
 *
 * Что делает: когда открываешь карточку аниме/фильма — добавляет панель
 * с данными с Shikimori (рейтинг, жанры, описание, статус).
 * Также пробует найти тайтл на TMDB по оригинальному названию.
 */

(function () {
    'use strict';

    var SHIKI_API  = 'https://shikimori.one/api';
    var SHIKI_HOST = 'https://shikimori.one';
    var PLUGIN_ID  = 'lme_shikimori';

    // ─── Шаблон панели ──────────────────────────────────────────────────────

    Lampa.Template.add('shikimori_panel', '\
<div class="shikimori-panel selector">\
  <div class="shikimori-panel__head">\
    <span class="shikimori-panel__logo">Shikimori</span>\
    <span class="shikimori-panel__score"></span>\
  </div>\
  <div class="shikimori-panel__body">\
    <div class="shikimori-panel__info"></div>\
  </div>\
</div>');

    // ─── CSS ────────────────────────────────────────────────────────────────

    (function addCss() {
        var css = [
            '.shikimori-panel {',
            '  margin: 0.8em 0;',
            '  padding: 0.8em 1.2em;',
            '  background: rgba(255,255,255,0.06);',
            '  border-radius: 0.5em;',
            '  border-left: 3px solid #7b68ee;',
            '}',
            '.shikimori-panel__head {',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 1em;',
            '  margin-bottom: 0.4em;',
            '}',
            '.shikimori-panel__logo {',
            '  font-weight: bold;',
            '  font-size: 1em;',
            '  color: #7b68ee;',
            '  text-transform: uppercase;',
            '  letter-spacing: 0.05em;',
            '}',
            '.shikimori-panel__score {',
            '  font-size: 1.1em;',
            '  font-weight: bold;',
            '  color: #f0c040;',
            '}',
            '.shikimori-panel__info {',
            '  font-size: 0.85em;',
            '  opacity: 0.8;',
            '  line-height: 1.5;',
            '}',
            '.shikimori-panel.focus {',
            '  background: rgba(123,104,238,0.2);',
            '}',
        ].join('\n');
        var el = document.createElement('style');
        el.textContent = css;
        document.head.appendChild(el);
    })();

    // ─── Поиск на Shikimori ──────────────────────────────────────────────────

    /**
     * Ищет аниме по названию, возвращает первый результат через callback(anime|null)
     */
    function searchAnime(title, callback) {
        var url = SHIKI_API + '/animes?search=' + encodeURIComponent(title) + '&limit=1&order=popularity';
        Lampa.Ajax.get({
            url: url,
            dataType: 'json',
            success: function (data) {
                if (data && data.length) {
                    callback(data[0]);
                } else {
                    callback(null);
                }
            },
            error: function () {
                callback(null);
            }
        });
    }

    /**
     * Получает полные данные аниме по ID
     */
    function getAnime(id, callback) {
        var url = SHIKI_API + '/animes/' + id;
        Lampa.Ajax.get({
            url: url,
            dataType: 'json',
            success: function (data) {
                callback(data || null);
            },
            error: function () {
                callback(null);
            }
        });
    }

    // ─── Форматирование ──────────────────────────────────────────────────────

    var KIND_MAP = {
        tv:       'TV-сериал',
        movie:    'Фильм',
        ova:      'OVA',
        ona:      'ONA',
        special:  'Спешл',
        music:    'Клип',
        tv_13:    'TV-сериал',
        tv_24:    'TV-сериал',
        tv_48:    'TV-сериал',
    };

    var STATUS_MAP = {
        anons:    'Анонс',
        ongoing:  'Онгоинг',
        released: 'Вышло',
    };

    function formatInfo(anime) {
        var parts = [];

        var kind   = KIND_MAP[anime.kind]   || anime.kind   || '';
        var status = STATUS_MAP[anime.status] || anime.status || '';

        if (kind)   parts.push(kind);
        if (status) parts.push(status);

        if (anime.episodes && parseInt(anime.episodes) > 0) {
            var eps = anime.episodes_aired && parseInt(anime.episodes_aired) > 0 && anime.status === 'ongoing'
                ? parseInt(anime.episodes_aired) + ' / ' + anime.episodes + ' эп.'
                : anime.episodes + ' эп.';
            parts.push(eps);
        }

        if (anime.aired_on) {
            var year = anime.aired_on.substring(0, 4);
            if (year) parts.push(year);
        }

        // Жанры
        if (anime.genres && anime.genres.length) {
            var genreNames = anime.genres.slice(0, 4).map(function (g) {
                return g.russian || g.name;
            });
            parts.push(genreNames.join(', '));
        }

        return parts.join(' · ');
    }

    // ─── Инжект панели в карточку ────────────────────────────────────────────

    function injectPanel(component, anime) {
        // Получаем полные данные (жанры есть только в /animes/:id)
        getAnime(anime.id, function (full) {
            var data = full || anime;

            // Создаём DOM-элемент через jQuery (НЕ строку!)
            var panel     = $(Lampa.Template.get('shikimori_panel', {}));
            var scoreEl   = panel.find('.shikimori-panel__score');
            var infoEl    = panel.find('.shikimori-panel__info');

            var score = parseFloat(data.score);
            if (score && score > 0) {
                scoreEl.text('★ ' + score.toFixed(2));
            } else {
                scoreEl.remove();
            }

            var info = formatInfo(data);
            if (info) infoEl.text(info);

            // Ищем куда вставить: в .full-start__details или .info__block или .details
            var target = component.render
                ? component.render().find('.full-start__details, .full__details, .info__block, .details').first()
                : $();

            if (target.length) {
                target.before(panel);
            } else if (component.render) {
                // Запасной вариант — в конец контейнера карточки
                component.render().append(panel);
            }
        });
    }

    // ─── Слушатель событий full (карточка) ──────────────────────────────────

    Lampa.Listener.follow('full', function (e) {
        if (e.type !== 'complite') return;  // Ждём полной загрузки карточки

        var component = e.object.component || e.component;
        var movie     = e.data && e.data.movie ? e.data.movie : (e.object || {});

        if (!movie) return;

        // Проверяем — это аниме? (жанр 16 = Animation / Anime в TMDB)
        // или ищем по любому тайтлу (как оригинал LME)
        var searchTitle = movie.original_title || movie.name || movie.title || '';
        if (!searchTitle) return;

        searchAnime(searchTitle, function (anime) {
            if (!anime) {
                // Если по оригинальному не нашли — пробуем русское/основное название
                var altTitle = movie.title || movie.name || '';
                if (altTitle && altTitle !== searchTitle) {
                    searchAnime(altTitle, function (anime2) {
                        if (anime2 && component) injectPanel(component, anime2);
                    });
                }
                return;
            }
            if (component) injectPanel(component, anime);
        });
    });

    // ─── Метаданные плагина ──────────────────────────────────────────────────

    if (window.Lampa && Lampa.PluginInfo) {
        Lampa.PluginInfo && Lampa.PluginInfo.add && Lampa.PluginInfo.add({
            name:    'LME Shikimori',
            version: '2.0',
            desc:    'Информация с Shikimori в карточке аниме (shikimori.one)',
            id:      PLUGIN_ID
        });
    }

    console.log('[Shikimori] Плагин загружен (shikimori.one)');

})();
