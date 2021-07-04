import CoreServer from '../core/server.js';

import Squad from './squad.js';
import Team from './team.js';

import RefreshedA2SServerInformation from './events/refreshed-a2s-server-information.js';
import RefreshedTeamsAndSquads from './events/refreshed-teams-and-squads.js';

import logger from '../utils/logger.js';

export default class SquadServer extends CoreServer {
  constructor(options = {}) {
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

    this.teams = [];
    this.squads = [];

    // Initialise intervaled tasks.
    this.initialiseIntervaledTask(
      'refreshA2SServerInformation',
      this.refreshA2SServerInformation,
      1000
    );
    this.initialiseIntervaledTask('refreshTeamsAndSquads', this.refreshTeamsAndSquads, 1000);
  }

  async fetchA2SServerInformation() {
    // Fetch A2S information.
    const data = await this.a2s.getServerInformation();

    // Skip rest of method if A2S information was not fetched.
    if (!data) return null;

    // Return the formatted data.
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

  async refreshA2SServerInformation() {
    this.stopIntervaledTask('refreshA2SServerInformation');

    logger.info('Refreshing A2S server information...');
    try {
      // Fetch A2S information.
      const data = await this.fetchA2SServerInformation();

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
        new RefreshedA2SServerInformation(this, {
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

      logger.info('Refreshed A2S server information.');
    } catch (err) {
      logger.error('Failed to refresh A2S server information.');
      return null;
    }

    this.startIntervaledTask('refreshA2SServerInformation');
  }

  async fetchTeamsAndSquads() {
    // Get the ListPlayers response from the RCON connection and split the lines.
    const response = (await this.execute('ListSquads')).split('\n');

    // Initiate empty arrays to store the teams and squads in.
    const teams = [];
    const squads = [];

    // Loop over each line of the response.
    for (const line of response) {
      // Check if line contains team information.
      const teamLine = line.match(/^Team ID: ([0-9]+) \((.+)\)$/);

      // Store the team information.
      if (teamLine)
        teams.push(
          new Team(this, {
            id: teamLine[1],
            name: teamLine[2]
          })
        );

      // Check if line contains squad information.
      const squadLine = line.match(/^ID: ([0-9]+) \| Name: (.+) \| Size: ([0-9]) \| Locked: (.+)$/);

      // Store the squad information.
      if (squadLine)
        squads.push(
          new Squad(this, {
            id: squadLine[1],
            name: squadLine[2],
            size: squadLine[3],
            locked: squadLine[4] === 'True'
          })
        );
    }

    // Return the team and squad information.
    return { teams, squads };
  }

  async refreshTeamsAndSquads() {
    this.stopIntervaledTask('refreshTeamsAndSquads');

    logger.info('Refreshing teams and squads...');
    try {
      // Fetch A2S information.
      const { teams, squads } = await this.fetchTeamsAndSquads();

      // Update the server object with the data.
      this.teams = teams;
      this.squads = squads;

      // Emit event with the data.
      this.emitEvent(
        new RefreshedTeamsAndSquads(this, {
          teams: teams,
          squads: squads
        })
      );

      logger.info('Refreshed teams and squads.');
    } catch (err) {
      logger.error('Failed to refresh teams and squads.');
      return null;
    }

    this.startIntervaledTask('refreshTeamsAndSquads');
  }

  async watch() {
    await super.watch();

    // Start intervaled tasks with no delay.
    await this.refreshA2SServerInformation();
  }

  async unwatch() {
    // Stop intervaled tasks.
    this.stopIntervaledTask('updateA2SServerInformation');

    await super.unwatch();
  }
}
