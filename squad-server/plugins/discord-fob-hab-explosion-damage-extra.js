import DiscordBasePlugin from './discord-base-plugin.js';

export default class DiscordFOBHABExplosionDamageExtra extends DiscordBasePlugin {
  static get description() {
    return (
      'The <code>DiscordFOBHABExplosionDamage</code> plugin logs damage done to FOBs and HABs by ' +
      'explosions to help identify engineers blowing up friendly FOBs and HABs.'
    );
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      ...DiscordBasePlugin.optionsSpecification,
      channelID: {
        required: true,
        description: 'The ID of the channel to log FOB/HAB explosion damage to.',
        default: '',
        example: '667741905228136459'
      },
      color: {
        required: false,
        description: 'The color of the embeds.',
        default: 16761867
      }
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);

    this.onDeployableDamaged = this.onDeployableDamaged.bind(this);
  }

  async mount() {
    this.server.on('DEPLOYABLE_DAMAGED', this.onDeployableDamaged);
  }

  async unmount() {
    this.server.removeEventListener('DEPLOYABLE_DAMAGED', this.onDeployableDamaged);
  }

  async onDeployableDamaged(info) {
    if (!info.deployable.match(/(?:FOBRadio|Hab)_/i)) return;
    if (!info.weapon.match(/_Deployable_/i)) return;
    if (!info.player) return;

    let teamName = this.server.squads?.find(s => s.teamName && s.teamID == info.player.teamID)?.teamName 
      || info.player.teamID
      || 'Unknown';

    const fields = [
      {
        name: "Player's Name",
        value: info.player.name,
        inline: true
      },
      {
        name: "Player's SteamID",
        value: `[${info.player.steamID}](https://steamcommunity.com/profiles/${info.player.steamID})`,
        inline: true
      },
      {
        name: "Player's Team",
        value: teamName
      },
      {
        name: 'Deployable',
        value: info.deployable
      },
      {
        name: 'Weapon',
        value: info.weapon
      }
    ];

    fields.push({
      name: "Note",
      value: `\`\`\`
Date:       ${new Date().toISOString()}
Player:     ${info.player.name}
Team:       ${teamName}
Deployable: ${info.deployable}
Weapon:     ${info.weapon}
\`\`\``
    });

    await this.sendDiscordMessage({
      embed: {
        title: `${info.player.name}`,
        color: this.options.color,
        fields: fields,
        timestamp: info.time.toISOString()
      }
    });
  }
}
