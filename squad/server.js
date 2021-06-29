import CoreServer from '../core/server.js';

import SquadA2SClient from './a2s-client.js';

import UpdatedA2sInformation from './events/updated-a2s-information.js';

export default class SquadServer extends CoreServer {
  constructor(options = {}) {
    // Specify default data fetcher clients.
    options.A2SClient = options.A2SClient || SquadA2SClient;

    // Initialise parent class.
    super(options);

    // Initialise empty server information variables.
    this.name = null;
    this.version = null;

    this.playerSlots = null;
    this.publicSlots = null;
    this.reserveSlots = null;

    this.playerCount = null;
    this.publicQueueLength = null;
    this.reserveQueueLength = null;

    this.matchTimeout = null;

    // Initialise intervaled tasks.
    this.initialiseIntervaledTask('getA2SInformation', this.getA2SInformation, 1000);
  }

  async getA2SInformation() {
    this.stopIntervaledTask('getA2SInformation');

    // Fetch A2S information.
    const data = await this.a2sClient.getA2SInformation();

    // Skip rest of method if A2S information was not fetched.
    if (!data) return;

    // Update the server object with the data.
    this.name = data.name;
    this.version = data.version;

    this.playerSlots = data.playerSlots;
    this.publicSlots = data.publicSlots;
    this.reserveSlots = data.reserveSlots;

    this.playerCount = data.playerCount;
    this.publicQueueLength = data.publicQueueLength;
    this.reserveQueueLength = data.reserveQueueLength;

    this.matchTimeout = data.matchTimeout;

    // Emit event with the data.
    this.emitEvent(
      new UpdatedA2sInformation(this, {
        name: data.name,
        version: data.version,

        playerSlots: data.playerSlots,
        publicSlots: data.publicSlots,
        reserveSlots: data.reserveSlots,

        playerCount: data.playerCount,
        publicQueueLength: data.publicQueueLength,
        reserveQueueLength: data.reserveQueueLength,

        matchTimeout: data.matchTimeout
      })
    );

    this.startIntervaledTask('getA2SInformation');
  }

  async watch() {
    await super.watch();

    // Start intervaled tasks with no delay.
    await this.getA2SInformation();
  }

  async unwatch() {
    // Stop intervaled tasks.
    this.stopIntervaledTask('getA2SInformation');

    await super.unwatch();
  }
}
