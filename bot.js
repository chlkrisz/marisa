const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Events,
} = require("discord.js");
require("dotenv").config();

const { botInfo } = require("./commands/info/bot-info");
const { ping } = require("./commands/info/ping");
const { randomSpeechBubble } = require("./commands/fun/random-speech-bubble");
const { cobalt } = require("./commands/fun/cobalt");
const { say } = require("./commands/fun/say");
const { random } = require("./commands/fun/random");

const devMode = process.env.DEV === "1";
const token = devMode ? process.env.DEV_TOKEN : process.env.TOKEN;
const ownerId = process.env.OWNER_ID;
const clientId = devMode ? process.env.DEV_CLIENT_ID : process.env.CLIENT_ID;

const rest = new REST({ version: "10" }).setToken(token);

const client = new Client({
  intents: Object.values(GatewayIntentBits),
});


const commands = [
  {
    name: "feri",
    description: "Keresett a Feri",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    type: 1,
  },
  {
    name: "fun",
    description: "Fun commands",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "random-speech-bubble",
        description: "Displays a random speech bubble GIF",
        type: 1,
      },
      {
        name: "random",
        description: "Randomly choose an item from a list",
        type: 1,
        options: [
          {
            name: "items",
            description: "List of items, separated by commas (,)",
            type: 3,
            required: true,
          },
          {
            name: "count",
            description: "How many items to choose (default: 1)",
            type: 4,
            required: false,
          }
        ],
      },
      {
        name: "say",
        description: "Echoes your message",
        type: 1,
        options: [
          {
            name: "content",
            description: "Content to echo",
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: "cobalt",
        description: "Downloads a video using cobalt.tools",
        type: 1,
        options: [
          {
            name: "url",
            description: "Video URL",
            type: 3,
            required: true,
          },
          {
            name: "audio",
            description: "Only audio?",
            type: 5,
            required: false,
          },
          {
            name: "video_quality",
            description: "Choose video quality",
            type: 3,
            required: false,
            choices: [
              {
                name: "max",
                value: "max",
              },
              {
                name: "2160p",
                value: "2160p",
              },
              {
                name: "1080p",
                value: "1080",
              },
              {
                name: "720p",
                value: "720",
              },
              {
                name: "480p",
                value: "480",
              },
              {
                name: "360p",
                value: "360",
              },
              {
                name: "240p",
                value: "240",
              },
              {
                name: "144p",
                value: "144",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "info",
    description: "Information commands",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "bot-info",
        description: "Displays information about the bot",
        type: 1,
      },
      {
        name: "ping",
        description: "Checks the bot's latency",
        type: 1,
      },
    ],
  },
];

client.once(Events.ClientReady, async () => {
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandGroup = interaction.commandName;

  switch (commandGroup) {
    case "info": {
      const subcommand = interaction.options.getSubcommand();
      await handleInfoCommands(client, interaction, subcommand);
      break;
    }

    case "fun": {
      const subcommand = interaction.options.getSubcommand();
      await handleFunCommands(client, interaction, subcommand);
      break;
    }

    case "feri":
      await interaction.reply({
        content: "https://www.keresettferi.hu",
        ephemeral: false,
      });
      break;
  }
});

async function handleInfoCommands(client, interaction, subcommand) {
  const stt = Date.now();
  switch (subcommand) {
    case "bot-info":
      await botInfo(client, interaction, stt, commands);
      break;

    case "ping":
      await ping(client, interaction, stt);
      break;

    default:
      break;
  }
}

async function handleFunCommands(client, interaction, subcommand) {
  const stt = Date.now();
  switch (subcommand) {
    case "random-speech-bubble":
      await randomSpeechBubble(interaction, stt);
      break;
    case "cobalt":
      await cobalt(interaction, stt);
      break;
    case "say":
      await say(interaction, stt);
      break;
    case "random":
      await random(interaction, stt);
      break;
    default:
      break;
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith("$")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "sync") {
    if (message.author.id !== ownerId) {
      return message.reply(
        "🚫 You do not have permission to perform this action.",
      );
    }
    try {
      const msg = await message.reply("🔄 Refreshing application commands...");
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      await msg.edit("✅ Application commands have been refreshed.");
      console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
      console.error(error);
      await message.reply(
        "❌ An error occurred while refreshing application commands.",
      );
    }
  }
});

client.login(token);
