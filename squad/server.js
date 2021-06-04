import CoreServer from '../core/server.js';

import UpdatedA2sInformation from './events/updated-a2s-information.js';

export default class SquadServer extends CoreServer {
  constructor(options = {}) {
    // Set game specific predefined options.
    options.gamedigType = options.gamedigType || 'squad';

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
    const data = await this.getRawA2SInformation();

    // Skip rest of method if A2S information was not fetched.
    if (!data) return;

    // Update the server object with the data.
    this.name = data.name;
    this.version = data.raw.version;

    this.playerSlots = parseInt(data.maxplayers);
    this.publicSlots = parseInt(data.raw.rules.NUMPUBCONN);
    this.reserveSlots = parseInt(data.raw.rules.NUMPRIVCONN);

    this.playerCount = parseInt(data.raw.rules.PlayerCount_i);
    this.publicQueueLength = parseInt(data.raw.rules.PublicQueue_i);
    this.reserveQueueLength = parseInt(data.raw.rules.ReservedQueue_i);

    this.matchTimeout = parseFloat(data.raw.rules.MatchTimeout_f);

    // Emit event with the data.
    this.emitEvent(
      new UpdatedA2sInformation(this, {
        name: this.name,
        version: this.version,

        playerSlots: this.playerSlots,
        publicSlots: this.publicSlots,
        reserveSlots: this.reserveSlots,

        playerCount: this.playerCount,
        publicQueueLength: this.publicQueueLength,
        reserveQueueLength: this.reserveQueueLength,

        matchTimeout: this.matchTimeout
      })
    );

    this.startIntervaledTask('getA2SInformation');
  }

  async watch() {
    // Start intervaled tasks with no delay.
    await this.getA2SInformation();
  }

  async unwatch() {
    // Stop intervaled tasks.
    this.stopIntervaledTask('getA2SInformation');
  }
}
