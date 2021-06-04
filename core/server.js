import gamedig from 'gamedig';

import logger from '../utils/logger.js';

export default class Server {
  constructor(options = {}) {
    // Check that required options are specified.
    for (const option of ['host', 'queryPort', 'gamedigType'])
      if (!(option in options)) throw new Error(`${option} must be specified.`);

    // Store options.
    this.host = options.host;
    this.queryPort = options.queryPort;
    this.gamedigType = options.gamedigType;

    this.intervaledTasks = {};

    this.plugins = [];
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

  async getRawA2SInformation() {
    logger.info('Server fetching A2S information...');
    try {
      const data = await gamedig.query({
        type: this.gamedigType,
        host: this.host,
        port: this.queryPort
      });
      logger.info('Server fetched A2S information.');
      return data;
    } catch (err) {
      logger.error('Server failed to get A2S information');
    }
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
