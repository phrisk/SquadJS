import Event from '../../core/event.js';

export default class RefreshedA2SServerInformation extends Event {
  constructor(server, data = {}) {
    super(server);

    this.name = data.name;
    this.version = data.version;

    this.playerSlots = data.playerSlots;
    this.publicSlots = data.publicSlots;
    this.reserveSlots = data.reserveSlots;

    this.playerCount = data.playerCount;
    this.publicQueueLength = data.publicQueueLength;
    this.reserveQueueLength = data.reserveQueueLength;

    this.matchTimeout = data.matchTimeout;
  }
}
