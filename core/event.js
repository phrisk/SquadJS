export default class Event {
  constructor(server) {
    this.server = server;
  }

  toString() {
    return `Name: ${this.constructor.name}`;
  }
}
