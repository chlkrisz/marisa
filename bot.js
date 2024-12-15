const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config();

const token = process.env.TOKEN;
const ownerId = process.env.OWNER_ID;
const clientId = process.env.CLIENT_ID;

const client = new Client({
  intents: Object.values(GatewayIntentBits),
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const commands = [
  {
    name: 'fun',
    description: 'Fun commands',
    integration_types: [ 0, 1 ],
    contexts: [ 0, 1, 2 ],
    options: [
      {
        name: 'random-speech-bubble',
        description: 'Displays a random speech bubble GIF',
        type: 1,
      },
      {
        name: 'ai',
        description: 'Generates AI-based text',
        type: 1,
        options: [
          {
            name: 'text',
            description: 'Prompt for the AI',
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: 'say',
        description: 'Echoes your message',
        type: 1,
        options: [
          {
            name: 'content',
            description: 'Content to echo',
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: 'cobalt',
        description: 'Downloads a video using cobalt.tools',
        type: 1,
        options: [
          {
            name: 'url',
            description: 'Video URL',
            type: 3,
            required: true,
          },
          {
            name: 'audio',
            description: 'Only audio?',
            type: 5,
            required: false,
          },
          {
            name: 'video_quality',
            description: 'Choose video quality',
            type: 3,
            required: false,
            choices: [
              {
                name: 'max',
                value: 'max',
              },
              {
                name: '2160p',
                value: '2160p',
              },
              {
                name: '1080p',
                value: '1080',
              },
              {
                name: '720p',
                value: '720',
              },
              {
                name: '480p',
                value: '480',
              },
              {
                name: '360p',
                value: '360',
              },
              {
                name: '240p',
                value: '240',
              },
              {
                name: '144p',
                value: '144',
              },
            ]
          },
        ],
      },
    ],
  },
  {
    name: 'info',
    description: 'Information commands',
    integration_types: [ 0, 1 ],
    contexts: [ 0, 1, 2 ],
    options: [
      {
        name: 'bot-info',
        description: 'Displays information about the bot',
        type: 1,
      },
      {
        name: 'ping',
        description: 'Checks the bot\'s latency',
        type: 1,
      },
    ],
  },
];

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandGroup = interaction.commandName;
  const subcommand = interaction.options.getSubcommand();

  if (!commandGroup || !subcommand) return;

  switch (commandGroup) {
    case 'info':
      await handleInfoCommands(interaction, subcommand);
      break;

    case 'fun':
      await handleFunCommands(interaction, subcommand);
      break;

    default:
      break;
  }
});

async function handleInfoCommands(interaction, subcommand) {
  switch (subcommand) {
    case 'bot-info':
      const embed = new EmbedBuilder()
        .setTitle('🤖 Bot Information')
        .setColor('#ff8888')
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          {
            name: '🛠️ Performance',
            value: `
**Memory:** ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB
**Platform:** ${process.platform}
**Node.js:** ${process.version}
**Discord.js:** v${require('discord.js').version}
**Uptime:** ${formatUptime(process.uptime())}
**Latency:** ${Math.floor(client.ws.ping)} ms
            `,
          },
          {
            name: '🌐 Public',
            value: `
**Name:** ${client.user.username}
**ID:** ${client.user.id}
**Status:** ${client.user.presence?.status ?? 'N/A'}
**Created At:** ${client.user.createdAt.toLocaleString()}
**Avatar URL:** [Click Here](${client.user.displayAvatarURL()})
            `,
          }
        )
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [embed] });
      break;

    case 'ping':
      const msg = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
      const latency = msg.createdTimestamp - interaction.createdTimestamp;

      const pingEmbed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setColor('#ff8888')
        .addFields(
          { name: '📨 Message Latency', value: `\`${latency} ms\``, inline: true },
          { name: '💻 API Latency', value: `\`${Math.round(client.ws.ping)} ms\``, inline: true }
        )
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({ embeds: [pingEmbed] });
      break;

    default:
      break;
  }
}

async function handleFunCommands(interaction, subcommand) {
  switch (subcommand) {
    case 'random-speech-bubble':
      await interaction.deferReply();
      try {
        const response = await axios.get('https://api.github.com/repos/chlkrisz/speech-bubbles/contents/gifs');
        const data = response.data;
        const randomGif = data[Math.floor(Math.random() * data.length)].download_url;
        const gifResponse = await axios.get(randomGif, { responseType: 'arraybuffer' });
        const file = new AttachmentBuilder(Buffer.from(gifResponse.data), { name: 'speechbubble.gif' });

        await interaction.editReply({ content: '🗨️ Here\'s your random speech bubble!', files: [file] });
      } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ An error occurred while fetching the speech bubble.' });
      }
      break;

    case 'ai':
      await handleAICommand(interaction);
      break;

    case 'cobalt':
      await handleCobaltCommand(interaction);
      break;

    case 'say':
      const content = interaction.options.getString('content');
      if (!content) {
        await interaction.reply({ content: '⚠️ Please provide content to say.', ephemeral: true });
      } else {
        const sayEmbed = new EmbedBuilder()
          .setDescription(content)
          .setColor('#ff8888')
          .setFooter({
            text: `Message from ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        await interaction.reply({ embeds: [sayEmbed] });
      }
      break;

    default:
      break;
  }
}

async function handleAICommand(interaction) {
  try {
    const text = interaction.options.getString('text');
    if (!text) {
      return await interaction.reply({ content: '⚠️ Please provide a prompt.', ephemeral: true });
    }

    const allowedUsers = ['657350415511322647', '1051181672508444683', '952464937756786718'];
    if (!allowedUsers.includes(interaction.user.id)) {
      return await interaction.reply({ content: '🚫 AI functionality is currently restricted.', ephemeral: true });
    }

    await interaction.deferReply();

    const aiApiKey = process.env.AI_API_KEY;
    const apiUrl = 'http://127.0.0.1:3000/api/generate-text';

    const response = await axios.post(apiUrl, { text }, {
      headers: {
        authentication: aiApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const message = response.data.output || 'No response received from AI.';

    if (message.length <= 4096) {
      const aiEmbed = new EmbedBuilder()
        .setTitle('💡 AI Response')
        .setDescription(message)
        .setColor('#ff8888')
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({ embeds: [aiEmbed] });
    } else {
      const attachment = new AttachmentBuilder(Buffer.from(message), { name: 'response.txt' });
      await interaction.editReply({ content: '📄 The response is too long to display. See the attached file.', files: [attachment] });
    }
  } catch (error) {
    console.error(`Error during AI interaction: ${error.message}`);
    await interaction.editReply({ content: '❌ An unexpected error occurred. Please try again later.' });
  }
}

async function uploadFileToCatbox(fileBuffer, fileName, apiHost = "https://catbox.moe/user/api.php") {
  try {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', fileBuffer, fileName);

      const response = await axios.post(apiHost, form, {
          headers: form.getHeaders(),
      });

      if (response.status === 200 && typeof response.data === 'string') {
          return response.data.trim();
      } else {
          throw new Error(`Unexpected response: ${response.status} - ${response.data}`);
      }
  } catch (error) {
      if (error.response && error.response.status === 413) {
          console.error('Catbox upload failed: File too large.');
          return '❌ File too large for Catbox upload.';
      }
      throw new Error(`Failed to upload file: ${error.message}`);
  }
}

async function handleCobaltCommand(interaction) {
  try {
      const url = interaction.options.getString('url');
      const audioOnly = interaction.options.getBoolean('audio') || false;
      if (!url) {
          return await interaction.reply({ content: '⚠️ Please provide a valid URL.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: false });
      await interaction.editReply({ content: '🔄 Processing your request, please wait...' });

      const data = {
          url,
          alwaysProxy: true,
          filenameStyle: 'basic',
          videoQuality: '720',
          downloadMode: audioOnly ? 'audio' : 'auto',
      };

      let cobaltResponse;
      try {
          // Dev note: You could replace this with your own self-hosted Cobalt.tools instance, but you're free to use my instance directly, just don't be a jerk.
          cobaltResponse = await axios.post('https://cobalt.liba.lol/', data, {
              headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
              },
          });
      } catch (error) {
          console.error('Error calling Cobalt API:', error.response?.data || error.message);
          throw new Error(`Cobalt API error: ${error.response?.data || error.message}`);
      }

      let fileResponse;
      try {
          fileResponse = await axios.get(cobaltResponse.data.url, { responseType: 'arraybuffer' });
      } catch (error) {
          console.error('Error downloading file from Cobalt:', error.message);
          throw new Error(`Download error: ${error.message}`);
      }

      const fileBuffer = Buffer.from(fileResponse.data);
      const fileName = cobaltResponse.data.filename;
      const fileSizeMB = Buffer.byteLength(fileBuffer) / (1024 * 1024);

      if (fileSizeMB > 8) {
          await interaction.editReply({ content: '📤 File too large for Discord. Uploading to Catbox...' });
          const catboxUrl = await uploadFileToCatbox(fileBuffer, fileName);
          await interaction.editReply({ content: `🎬 File uploaded successfully: ${catboxUrl}` });
      } else {
          const attachment = new AttachmentBuilder(fileBuffer, { name: fileName });
          await interaction.editReply({ content: '🎬 Output:', files: [attachment] });
      }
  } catch (error) {
      console.error('An error occurred:', error.message, error.response?.data || error);
      try {
          await interaction.editReply({ content: '❌ An error occurred while processing your request.\n```\n' + (error.response?.data || error.message) + '\n```' });
      } catch (discordError) {
          console.error('Failed to edit reply on Discord:', discordError.message);
      }
  }
}

function formatUptime(uptime) {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

const rest = new REST({ version: '10' }).setToken(token);

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('$')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'sync') {
    if (message.author.id !== ownerId) {
      return message.reply('🚫 You do not have permission to perform this action.');
    }
    try {
      const msg = await message.reply('🔄 Refreshing application commands...');
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      await msg.edit('✅ Application commands have been refreshed.');
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
      await message.reply('❌ An error occurred while refreshing application commands.');
    }
  }
});

client.login(token);

