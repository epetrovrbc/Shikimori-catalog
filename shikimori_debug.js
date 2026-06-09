/**
 * Shikimori DEBUG — показывает что доступно в Lampa API
 * Установите, откройте Консоль → Plugins, скопируйте вывод
 */
(function () {
    'use strict';

    function run() {
        // Проверяем что есть в Lampa
        var has = {
            Reguest:    typeof Lampa.Reguest,
            Request:    typeof Lampa.Request,
            Network:    typeof Lampa.Network,
            Ajax:       typeof Lampa.Ajax,
            Scroll:     typeof Lampa.Scroll,
            Items:      typeof Lampa.Items,
            Component:  typeof Lampa.Component,
            Activity:   typeof Lampa.Activity,
            Listener:   typeof Lampa.Listener,
            Template:   typeof Lampa.Template,
            Input:      typeof Lampa.Input,
            Controller: typeof Lampa.Controller,
            Loading:    typeof Lampa.Loading,
            Noty:       typeof Lampa.Noty,
            Menu:       typeof Lampa.Menu
        };

        console.log('[SHIKI DEBUG] Lampa API:', JSON.stringify(has));

        // Проверяем меню в DOM
        var menuItems = document.querySelectorAll('.menu__item');
        console.log('[SHIKI DEBUG] menu__item count:', menuItems.length);

        var menuList = document.querySelector('.menu .menu__list');
        console.log('[SHIKI DEBUG] .menu .menu__list:', menuList ? 'FOUND' : 'NOT FOUND');

        var menu = document.querySelector('.menu');
        console.log('[SHIKI DEBUG] .menu:', menu ? 'FOUND' : 'NOT FOUND');

        // Пробуем добавить тестовый элемент
        if (menuList) {
            var li = document.createElement('li');
            li.className = 'menu__item selector';
            li.setAttribute('data-action', 'shiki_test');
            li.innerHTML = '<div class="menu__ico"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7h7l-6 4 2 7-5-4-5 4 2-7-6-4h7z"/></svg></div><div class="menu__text">✓ Shikimori</div>';
            menuList.appendChild(li);
            console.log('[SHIKI DEBUG] TEST ITEM ADDED to .menu .menu__list');
        } else {
            // Попробуем другие селекторы
            var alt1 = document.querySelector('.menu__list');
            console.log('[SHIKI DEBUG] .menu__list (без .menu):', alt1 ? 'FOUND' : 'NOT FOUND');

            var alt2 = document.querySelector('ul.menu__list');
            console.log('[SHIKI DEBUG] ul.menu__list:', alt2 ? 'FOUND' : 'NOT FOUND');

            // Выводим всё что есть в DOM с классом menu
            var all = document.querySelectorAll('[class*="menu"]');
            var classes = [];
            all.forEach(function(el) { classes.push(el.className); });
            console.log('[SHIKI DEBUG] all menu classes:', JSON.stringify(classes.slice(0, 20)));
        }

        // Проверяем Lampa.Menu API
        if (Lampa.Menu) {
            console.log('[SHIKI DEBUG] Lampa.Menu keys:', JSON.stringify(Object.keys(Lampa.Menu)));
        }

        Lampa.Noty.show('[Shikimori DEBUG] Проверьте Консоль → Plugins');
    }

    if (window.appready) {
        setTimeout(run, 1000); // даём меню время отрисоваться
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') setTimeout(run, 1000);
        });
    }

})();
