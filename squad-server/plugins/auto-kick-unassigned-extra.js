import BasePlugin from './base-plugin.js';

export default class AutoKickUnassignedExtra extends BasePlugin {
  static get description() {
    return (
      'The <code>AutoKickUnassigned</code> plugin will automatically kick players that are not in a squad after a ' +
      'specified ammount of time.'
    );
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      warningMessage: {
        required: false,
        description: 'Message SquadJS will send to players warning them they will be kicked',
        default: 'Join a squad, you are are unassigned and will be kicked'
      },
      kickMessage: {
        required: false,
        description: 'Message to send to players when they are kicked',
        default: 'Unassigned - automatically removed'
      },
      frequencyOfWarnings: {
        required: false,
        description:
          'How often in <b>Seconds</b> should we warn the player about being unassigned?',
        default: 30
      },
      unassignedTimer: {
        required: false,
        description: 'How long in <b>Seconds</b> to wait before a unassigned player is kicked',
        default: 360
      },
      playerThreshold: {
        required: false,
        description:
          'Player count required for AutoKick to start kicking players, set to -1 to disable',
        default: 93
      },
      roundStartDelay: {
        required: false,
        description:
          'Time delay in <b>Seconds</b> from start of the round before AutoKick starts kicking again',
        default: 900
      },
      ignoreAdmins: {
        required: false,
        description:
          '<ul>' +
          '<li><code>true</code>: Admins will <b>NOT</b> be kicked</li>' +
          '<li><code>false</code>: Admins <b>WILL</b> be kicked</li>' +
          '</ul>',
        default: false
      },
      ignoreWhitelist: {
        required: false,
        description:
          '<ul>' +
          '<li><code>true</code>: Reserve slot players will <b>NOT</b> be kicked</li>' +
          '<li><code>false</code>: Reserve slot players <b>WILL</b> be kicked</li>' +
          '</ul>',
        default: false
      }
    };
  }

  /**
   * trackedPlayers[<steam64ID>] = <tracker>
   *
   *  <tracker> = {
   *         player: <playerObj>
   *       warnings: <int>
   *      startTime: <Epoch Date>
   *    warnTimerID: <intervalID>
   *    kickTimerID: <timeoutID>
   *  }
   */
  constructor(server, options, connectors) {
    super(server, options, connectors);

    this.adminPermission = 'canseeadminchat';
    this.whitelistPermission = 'reserve';

    this.kickTimeout = options.unassignedTimer * 1000;
    this.warningInterval = options.frequencyOfWarnings * 1000;
    this.gracePeriod = options.roundStartDelay * 1000;

    this.betweenRounds = false;

    this.trackedPlayers = {};

    this.onNewGame = this.onNewGame.bind(this);
    this.onPlayerSquadChange = this.onPlayerSquadChange.bind(this);
    this.onUpdatedPlayerInformation = this.onUpdatedPlayerInformation.bind(this);

    this.updateTrackingList = this.updateTrackingList.bind(this);
    this.clearDisconnectedPlayers = this.clearDisconnectedPlayers.bind(this);
  }

  async mount() {
    this.server.on('NEW_GAME', this.onNewGame);
    this.server.on('PLAYER_SQUAD_CHANGE', this.onPlayerSquadChange);
    this.server.on('UPDATED_PLAYER_INFORMATION', this.onUpdatedPlayerInformation);
  }

  async unmount() {
    this.server.removeEventListener('NEW_GAME', this.onNewGame);
    this.server.removeEventListener('PLAYER_SQUAD_CHANGE', this.onPlayerSquadChange);
    this.server.removeEventListener('UPDATED_PLAYER_INFORMATION', this.onUpdatedPlayerInformation);
  }

  async onNewGame() {
    this.betweenRounds = true;
    setTimeout(() => {
      this.betweenRounds = false;
    }, this.gracePeriod);
  }

  async onPlayerSquadChange(player) {
    if (player.steamID in this.trackedPlayers && player.squadID !== null)
      this.untrackPlayer(player.steamID);
  }

  async onUpdatedPlayerInformation() {    
    await this.updateTrackingList();
    await this.clearDisconnectedPlayers();
    await this.processQueue();
  }

  async processQueue() {
    if (this.isProcessingQueue) return;

    this.verbose(1, `Processing ${Object.keys(this.trackedPlayers).length} Tracked Players`);

    this.isProcessingQueue = true;

    for (const steamID of Object.keys(this.trackedPlayers)) {
      const tracker = this.trackedPlayers[steamID];

      if (tracker.doKick) {
        if (!(tracker.player.steamID in this.trackedPlayers)) return;

        this.verbose(1, `Kicking: ${tracker.player.name} (${tracker.player.steamID})`)

        this.server.rcon.kick(tracker.player.steamID, this.options.kickMessage);
        this.server.emit('PLAYER_AUTO_KICKED', {
          player: tracker.player,
          warnings: tracker.warnings,
          startTime: tracker.startTime
        });
        this.verbose(1, `Kicked: ${tracker.player.name}`);
        this.untrackPlayer(tracker.player.steamID);
      }

      else if (tracker.doWarning) {
        if (!(tracker.player.steamID in this.trackedPlayers)) return;

        const msLeft = this.kickTimeout - this.warningInterval * (tracker.warnings + 1);

        // clear on last warning
        if (msLeft < this.warningInterval + 1) clearInterval(tracker.warnTimerID);

        const timeLeft = this.msFormat(msLeft);
        this.server.rcon.warn(tracker.player.steamID, `${this.options.warningMessage} - ${timeLeft}`);
        this.verbose(1, `Warning: ${tracker.player.name} (${timeLeft})`);
        tracker.warnings++;

        tracker.doWarning = false;
      }
    }

    this.isProcessingQueue = false;
  }

  async updateTrackingList() {
    const run = !(this.betweenRounds || this.server.players.length < this.options.playerThreshold);

    this.verbose(
      3,
      `Update Tracking List? ${run} (Between rounds: ${
        this.betweenRounds
      }, Below player threshold: ${this.server.players.length < this.options.playerThreshold})`
    );

    if (!run) {
      for (const steamID of Object.keys(this.trackedPlayers)) this.untrackPlayer(steamID);
      return;
    }

    const admins = this.options.ignoreAdmins ? this.server.getAdminsWithPermission(this.adminPermission) : [];
    const whitelist = this.options.ignoreWhitelist ? this.server.getAdminsWithPermission(this.whitelistPermission) : [];

    // loop through players on server and start tracking players not in a squad
    for (const player of this.server.players) {
      const isTracked = player.steamID in this.trackedPlayers;
      const isUnassigned = player.squadID === null;
      const isAdmin = admins.includes(player.steamID);
      const isWhitelist = whitelist.includes(player.steamID);

      // tracked player joined a squad remove them (redundant afer adding PLAYER_SQUAD_CHANGE, keeping for now)
      if (!isUnassigned && isTracked) this.untrackPlayer(player.steamID);

      if (!isUnassigned) continue;

      if (isAdmin) this.verbose(2, `Admin is Unassigned: ${player.name}`);
      if (isAdmin && this.options.ignoreAdmins) continue;

      if (isWhitelist) this.verbose(2, `Whitelist player is Unassigned: ${player.name}`);
      if (isWhitelist && this.options.ignoreWhitelist) continue;

      // start tracking player
      if (!isTracked) this.trackedPlayers[player.steamID] = this.trackPlayer({ player });
    }
  }

  async clearDisconnectedPlayers() {
    this.verbose(2, `Clearing Disconnected Players`);
    this.verbose(3, `Tracked Players: ${Object.keys(this.trackedPlayers).join(', ')}`);
    this.verbose(3, `Players: ${this.server.players.map(p => p.steamID).join(', ')}`);
    
    for (const steamID of Object.keys(this.trackedPlayers))
      if (!this.server.players.some(p => p.steamID == steamID)) this.untrackPlayer(steamID);
  }

  msFormat(ms) {
    // take in generic # of ms and return formatted MM:SS
    let min = Math.floor((ms / 1000 / 60) << 0);
    let sec = Math.floor((ms / 1000) % 60);
    min = ('' + min).padStart(2, '0');
    sec = ('' + sec).padStart(2, '0');
    return `${min}:${sec}`;
  }

  trackPlayer(info) {
    this.verbose(2, `Tracking: ${info.player.name}`);

    const tracker = {
      player: info.player,
      warnings: 0,
      startTime: Date.now()
    };

    tracker.warnTimerID = setInterval(async () => {
      tracker.doWarning = true;
      this.verbose(1, `Queuing Warning for: ${info.player.name}`);
    }, this.warningInterval);

    tracker.kickTimerID = setTimeout(async () => {
      tracker.doKick = true;
      this.verbose(1, `Queuing Kick for: ${info.player.name}`);
    }, this.kickTimeout);

    return tracker;
  }

  untrackPlayer(steamID) {
    const tracker = this.trackedPlayers[steamID];
    clearInterval(tracker.warnTimerID);
    clearTimeout(tracker.kickTimerID);
    delete this.trackedPlayers[steamID];
    this.verbose(2, `unTrack: ${tracker.player.name}`);
  }
}
