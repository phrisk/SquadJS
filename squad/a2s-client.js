import CoreA2SClient from '../core/a2s-client.js';

export default class SquadA2SClient extends CoreA2SClient {
  constructor(options = {}) {
    options.type = options.type || 'squad';

    super(options);
  }

  async getA2SInformation() {
    // Fetch A2S information.
    const data = await this.getRawA2SInformation();

    // Skip rest of method if A2S information was not fetched.
    if (!data) return null;

    // Return the A2S data.
    return {
      name: data.name,
      version: data.version,

      playerSlots: parseInt(data.maxplayers),
      publicSlots: parseInt(data.raw.rules.NUMPUBCONN),
      reserveSlots: parseInt(data.raw.rules.NUMPRIVCONN),

      playerCount: parseInt(data.raw.rules.PlayerCount_i),
      publicQueueLength: parseInt(data.raw.rules.PublicQueue_i),
      reserveQueueLength: parseInt(data.raw.rules.ReservedQueue_i),

      matchTimeout: parseFloat(data.raw.rules.MatchTimeout_f)
    };
  }
}
