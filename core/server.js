import A2SClient from './a2s-client.js';
import RconClient from './rcon-client.js';

import logger from '../utils/logger.js';

export default class Server {
  constructor(options = {}) {
    // Store options.
    this.a2sOptions = {
      host: options.a2s.host || options.host,
      port: options.a2s.port || options.queryPort, // Make it possible to store the query port separately as it's a fairly commonly used port.
      type: options.a2s.type || 'squad'
    };

    this.rconOptions = {
      host: options.rcon.host || options.host,
      port: options.rcon.port || options.rconPort,
      password: options.rcon.password || options.rconPassword
    };

    // Initialise server properties.
    this.intervaledTasks = {};

    // Initialise plugin system properties.
    this.plugins = [];
  }

  async watch() {
    await this.initialiseA2SClient();
    await this.initialiseRconClient();
  }

  async unwatch() {
    await this.destroyA2SClient();
    await this.destroyRconClient();
  }

  async initialiseA2SClient() {
    this.a2s = new A2SClient(this.a2sOptions);
  }

  async destroyA2SClient() {
    this.a2s = null;
  }

  async initialiseRconClient() {
    this.rcon = new RconClient(this.rconOptions);

    await this.rcon.connect();
  }

  async destroyRconClient() {
    await this.rcon.disconnect();

    this.rcon = null;
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
