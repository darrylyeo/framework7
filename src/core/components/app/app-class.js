/* eslint-disable no-underscore-dangle */

import { getWindow, getDocument } from 'ssr-window';
import { extend, nextFrame } from '../../utils/utils';
import { getDevice } from '../../utils/get-device';
import { getSupport } from '../../utils/get-support';
import Framework7Class from '../../utils/class';
import EventsClass from '../../utils/events-class';
import ConstructorMethods from '../../utils/constructor-methods';
import ModalMethods from '../../utils/modal-methods';
import $ from '../../utils/dom7';
import loadModule from './load-module';

class Framework7 extends Framework7Class {
  constructor(params = {}) {
    super(params);
    if (Framework7.instance) {
      throw new Error("Framework7 is already initialized and can't be initialized more than once");
    }
    const device = getDevice({ userAgent: params.userAgent || undefined });
    const support = getSupport();

    const passedParams = extend({}, params);

    // App Instance
    const app = this;

    app.device = device;
    app.support = support;

    const window = getWindow();
    const document = getDocument();

    Framework7.instance = app;

    // Default
    const defaults = {
      version: '1.0.0',
      id: 'io.framework7.testapp',
      root: 'body',
      theme: 'auto',
      language: window.navigator.language,
      routes: [],
      name: 'Framework7',
      lazyModulesPath: null,
      initOnDeviceReady: true,
      init: true,
      autoDarkTheme: false,
      iosTranslucentBars: true,
      iosTranslucentModals: true,
      component: undefined,
      componentUrl: undefined,
    };

    // Extend defaults with modules params
    app.useModulesParams(defaults);

    // Extend defaults with passed params
    app.params = extend(defaults, params);

    const $rootEl = $(app.params.root);

    extend(app, {
      // App Id
      id: app.params.id,
      // App Name
      name: app.params.name,
      // App version
      version: app.params.version,
      // Routes
      routes: app.params.routes,
      // Lang
      language: app.params.language,
      // Root
      root: $rootEl,
      // RTL
      rtl: $rootEl.css('direction') === 'rtl',
      // Theme
      theme: (function getTheme() {
        if (app.params.theme === 'auto') {
          if (device.ios) return 'ios';
          if (device.desktop && device.electron) return 'aurora';
          return 'md';
        }
        return app.params.theme;
      })(),
      // Initially passed parameters
      passedParams,
      online: window.navigator.onLine,
    });

    // Save Root
    if (app.root && app.root[0]) {
      app.root[0].f7 = app;
    }

    // Install Modules
    app.useModules();

    // Init Data & Methods
    app.initData();

    // Auto Dark Theme
    const DARK = '(prefers-color-scheme: dark)';
    const LIGHT = '(prefers-color-scheme: light)';
    app.mq = {};
    if (window.matchMedia) {
      app.mq.dark = window.matchMedia(DARK);
      app.mq.light = window.matchMedia(LIGHT);
    }
    app.colorSchemeListener = function colorSchemeListener({ matches, media }) {
      if (!matches) {
        return;
      }
      const html = document.querySelector('html');
      if (media === DARK) {
        html.classList.add('theme-dark');
        app.darkTheme = true;
        app.emit('darkThemeChange', true);
      } else if (media === LIGHT) {
        html.classList.remove('theme-dark');
        app.darkTheme = false;
        app.emit('darkThemeChange', false);
      }
    };

    // Init
    if (app.params.init) {
      if (device.cordova && app.params.initOnDeviceReady) {
        $(document).on('deviceready', () => {
          app.init();
        });
      } else {
        app.init();
      }
    }

    // Return app instance
    return app;
  }

  initData() {
    const app = this;

    // Data
    app.data = {};
    if (app.params.data && typeof app.params.data === 'function') {
      extend(app.data, app.params.data.bind(app)());
    } else if (app.params.data) {
      extend(app.data, app.params.data);
    }
    // Methods
    app.methods = {};
    if (app.params.methods) {
      Object.keys(app.params.methods).forEach((methodName) => {
        if (typeof app.params.methods[methodName] === 'function') {
          app.methods[methodName] = app.params.methods[methodName].bind(app);
        } else {
          app.methods[methodName] = app.params.methods[methodName];
        }
      });
    }
  }

  enableAutoDarkTheme() {
    const window = getWindow();
    const document = getDocument();
    if (!window.matchMedia) return;
    const app = this;
    const html = document.querySelector('html');
    if (app.mq.dark && app.mq.light) {
      app.mq.dark.addListener(app.colorSchemeListener);
      app.mq.light.addListener(app.colorSchemeListener);
    }
    if (app.mq.dark && app.mq.dark.matches) {
      html.classList.add('theme-dark');
      app.darkTheme = true;
      app.emit('darkThemeChange', true);
    } else if (app.mq.light && app.mq.light.matches) {
      html.classList.remove('theme-dark');
      app.darkTheme = false;
      app.emit('darkThemeChange', false);
    }
  }

  disableAutoDarkTheme() {
    const window = getWindow();
    if (!window.matchMedia) return;
    const app = this;
    if (app.mq.dark) app.mq.dark.removeListener(app.colorSchemeListener);
    if (app.mq.light) app.mq.light.removeListener(app.colorSchemeListener);
  }

  initAppComponent(callback) {
    const app = this;
    app.router.componentLoader(
      app.params.component,
      app.params.componentUrl,
      { componentOptions: { el: app.root[0], root: true } },
      (el) => {
        app.root = $(el);
        app.root[0].f7 = app;
        app.rootComponent = el.f7Component;
        if (callback) callback();
      },
      () => {},
    );
  }

  _init() {
    const app = this;
    if (app.initialized) return app;

    app.root.addClass('framework7-initializing');

    // RTL attr
    if (app.rtl) {
      $('html').attr('dir', 'rtl');
    }

    // Auto Dark Theme
    if (app.params.autoDarkTheme) {
      app.enableAutoDarkTheme();
    }

    // Watch for online/offline state
    const window = getWindow();
    window.addEventListener('offline', () => {
      app.online = false;
      app.emit('offline');
      app.emit('connection', false);
    });
    window.addEventListener('online', () => {
      app.online = true;
      app.emit('online');
      app.emit('connection', true);
    });

    // Root class
    app.root.addClass('framework7-root');

    // Theme class
    $('html').removeClass('ios md aurora').addClass(app.theme);

    // iOS Translucent
    const device = app.device;
    if (app.params.iosTranslucentBars && app.theme === 'ios' && device.ios) {
      $('html').addClass('ios-translucent-bars');
    }
    if (app.params.iosTranslucentModals && app.theme === 'ios' && device.ios) {
      $('html').addClass('ios-translucent-modals');
    }

    // Init class
    nextFrame(() => {
      app.root.removeClass('framework7-initializing');
    });
    // Emit, init other modules
    app.initialized = true;
    app.emit('init');

    return app;
  }

  init() {
    const app = this;
    if (app.params.component || app.params.componentUrl) {
      app.initAppComponent(() => {
        app._init(); // eslint-disable-line
      });
    } else {
      app._init(); // eslint-disable-line
    }
  }

  // eslint-disable-next-line
  loadModule(...args) {
    return Framework7.loadModule(...args);
  }

  // eslint-disable-next-line
  loadModules(...args) {
    return Framework7.loadModules(...args);
  }

  getVnodeHooks(hook, id) {
    const app = this;
    if (!app.vnodeHooks || !app.vnodeHooks[hook]) return [];
    return app.vnodeHooks[hook][id] || [];
  }

  // eslint-disable-next-line
  get $() {
    return $;
  }

  static get Dom7() {
    return $;
  }

  static get $() {
    return $;
  }

  static get device() {
    return getDevice();
  }

  static get support() {
    return getSupport();
  }

  static get Class() {
    return Framework7Class;
  }

  static get Events() {
    return EventsClass;
  }
}

Framework7.ModalMethods = ModalMethods;
Framework7.ConstructorMethods = ConstructorMethods;

Framework7.loadModule = loadModule;
Framework7.loadModules = function loadModules(modules) {
  return Promise.all(modules.map((module) => Framework7.loadModule(module)));
};

export default Framework7;
