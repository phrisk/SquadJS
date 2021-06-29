import gamedig from 'gamedig';

import logger from '../utils/logger.js';

export default class A2SClient {
  constructor(options = {}) {
    // Check required options are specified.
    for (const option of ['host', 'port', 'type'])
      if (!(option in options)) throw new Error(`${option} must be specified.`);

    // Store options.
    this.host = options.host;
    this.port = options.port;
    this.type = options.type;
  }

  async getRawA2SInformation() {
    logger.info('Server fetching A2S information...');
    try {
      const data = await gamedig.query({
        host: this.host,
        port: this.port,
        type: this.type
      });
      logger.info('Server fetched A2S information.');
      return data;
    } catch (err) {
      console.log(err.message);
      logger.error('Server failed to get A2S information');
      return null;
    }
  }

  async getA2SInformation() {
    return {};
  }
}
