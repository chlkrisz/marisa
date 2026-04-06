const {
  SectionBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MessageFlags,
} = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const { parse } = require("csv-parse");
require("dotenv").config();

async function countryLookup() {
  const records = fs
    .createReadStream("countries.csv")
    .pipe(parse({ columns: true, trim: true }));
  const lookup = {};
  for await (const record of records) {
    lookup[record["Code"]] = record["Name"];
  }
  return lookup;
}
(async () => {
  global.countryLookup = await countryLookup();
})();

function formatUptime(uptime) {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

const ownerId = process.env.OWNER_ID;

async function botInfo(client, interaction, stt, commands) {
    await interaction.deferReply();
    let hostCountry = "N/A";
    try {
        const res = await axios.get("https://ipinfo.io/json");
        hostCountry = res.data.country || "N/A";
    } catch { }
    const botinfoSect = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("### 🤖 Bot Information"),
            new TextDisplayBuilder().setContent("**📊 Statistics**"),
            new TextDisplayBuilder().setContent(
                `**Servers:** ${client.guilds.cache.size}\n**Users:** ${client.users.cache.size}\n**Commands:** ${commands.length}\n**Library:** Discord.js v${require("discord.js").version}\n**Node.js:** ${process.version}\n**Last restarted:** ${new Date(client.uptime ? Date.now() - client.uptime : Date.now()).toLocaleString()}\n**Last updated:** ${fs.existsSync(".git/HEAD") ? new Date(require("child_process").execSync('git log -1 --format="%cd"').toString().trim()).toLocaleString() : new Date(fs.statSync("bot.js").mtime).toLocaleString()} ([${fs.existsSync(".git/HEAD") ? require("child_process").execSync("git rev-parse --short HEAD").toString().trim() : "N/A"}](https://github.com/chlkrisz/marisa/commit/${fs.existsSync(".git/HEAD") ? require("child_process").execSync("git rev-parse HEAD").toString().trim() : ""}))\n**Hosted from:** ${global.countryLookup[hostCountry] || hostCountry} :flag_${hostCountry.toLowerCase()}:`,
            ),
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder({
                media: { url: client.user.displayAvatarURL() },
            }),
        );

    const botinfoTexts = [
        new TextDisplayBuilder().setContent("**🛠️ Performance**"),
        new TextDisplayBuilder().setContent(
            `**Host CPU:** ${require("os").cpus()[0].model}\n**Host Cores:** ${require("os").cpus().length}\n**Memory:** ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB\n**Platform:** ${process.platform}\n**Uptime:** ${formatUptime(process.uptime())}\n**Latency:** ${Math.floor(client.ws.ping)} ms`,
        ),
        new TextDisplayBuilder().setContent("**🌐 Public**"),
        new TextDisplayBuilder().setContent(
            `**Name:** ${client.user.tag ?? client.user.username}\n**ID:** ${client.user.id}\n**Status:** ${client.user.presence?.status ?? "N/A"}\n**Created At:** ${client.user.createdAt.toLocaleString()}\n**Avatar URL:** [Click Here](${client.user.displayAvatarURL()})\n**Owner:** <@${ownerId}> *(@${client.users.cache.get(ownerId)?.username ?? "libasabb"})*\n**Source Code:** [GitHub Repository](https://github.com/chlkrisz/marisa)`,
        ),
    ];

    const container = new ContainerBuilder()
        .addSectionComponents(botinfoSect)
        .addTextDisplayComponents(...botinfoTexts)
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Requested by ${interaction.user.username}, processed in ${(Date.now() - stt) / 1000} seconds`,
            ),
        );

    await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
    });
}

module.exports = {
    botInfo,
};