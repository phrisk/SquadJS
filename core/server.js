import A2SClient from './a2s-client.js';

import logger from '../utils/logger.js';

export default class Server {
  constructor(options = {}) {
    // Specify default data fetcher clients.
    this.A2SClient = options.A2SClient || A2SClient;

    // Store options.
    this.a2sOptions = {
      host: options.a2sHost || options.host,
      port: options.a2sPort || options.queryPort // Make it possible to store the query port separately as it's a fairly commonly used port.
    };

    // Initialise server properties.
    this.intervaledTasks = {};

    // Initialise plugin system properties.
    this.plugins = [];
  }

  async watch() {
    await this.initialiseA2SClient();
  }

  async unwatch() {
    await this.destroyA2SClient();
  }

  async initialiseA2SClient() {
    this.a2sClient = new this.A2SClient(this.a2sOptions);
  }

  async destroyA2SClient() {
    this.a2sClient = null;
  }

  initialiseIntervaledTask(name, func, interval) {
    // Stop old task under the same name.
    this.stopIntervaledTask(name);

    // Store new task info.
    this.intervaledTasks[name] = { func: func.bind(this), interval, timeout: null };
  }

  startIntervaledTask(name) {
    this.intervaledTasks[name].timeout = setTimeout(
      this.intervaledTasks[name].func,
      this.intervaledTasks[name].interval
    );
  }

  stopIntervaledTask(name) {
    clearTimeout(this.intervaledTasks[name]?.timeout);
  }

  mountPlugin(pluginInstanceToMount) {
    this.plugins.push(pluginInstanceToMount);
    pluginInstanceToMount.mount();
  }

  unmountPlugin(pluginInstanceToUnmount) {
    this.plugins = this.plugins.filter(
      (pluginInstance) => pluginInstance !== pluginInstanceToUnmount
    );
    pluginInstanceToUnmount.unmount();
  }

  emitEvent(event) {
    logger.verbose(`Server emitting event (${event.toString()}).`);
    this.plugins.forEach((pluginInstance) => pluginInstance.handleEvent(event));
  }
}
