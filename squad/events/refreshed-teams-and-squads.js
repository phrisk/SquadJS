import Event from '../../core/event.js';

export default class RefreshedTeamsAndSquads extends Event {
  constructor(server, data = {}) {
    super(server);

    this.teams = data.teams;
    this.squads = data.squads;
  }
}
