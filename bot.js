const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  AttachmentBuilder,
  SectionBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MessageFlags,
  Events,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  FileBuilder,
} = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const { parse } = require("csv-parse");
const probe = require("probe-image-size");
const ffmpeg = require("fluent-ffmpeg");
const tmp = require("tmp");
require("dotenv").config();

const devMode = process.env.DEV === "1";
const token = devMode ? process.env.DEV_TOKEN : process.env.TOKEN;
const ownerId = process.env.OWNER_ID;
const clientId = devMode ? process.env.DEV_CLIENT_ID : process.env.CLIENT_ID;

const rest = new REST({ version: "10" }).setToken(token);

const client = new Client({
  intents: Object.values(GatewayIntentBits),
});

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

const commands = [
  {
    name: "feri",
    description: "Keresett a Feri",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
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
  const subcommand = interaction.options.getSubcommand();

  if (!commandGroup || !subcommand) return;

  switch (commandGroup) {
    case "info":
      await handleInfoCommands(interaction, subcommand);
      break;

    case "fun":
      await handleFunCommands(interaction, subcommand);
      break;

    case "feri":
      await interaction.reply({
        content: "https://www.keresettferi.hu",
        ephemeral: false,
      });
      break;

    default:
      break;
  }
});

async function handleInfoCommands(interaction, subcommand) {
  const stt = Date.now();
  switch (subcommand) {
    case "bot-info":
      await interaction.deferReply();
      let hostCountry = "N/A";
      try {
        const res = await axios.get("https://ipinfo.io/json");
        hostCountry = res.data.country || "N/A";
      } catch {}
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
      break;

    case "ping":
      const msg = await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [new TextDisplayBuilder().setContent("🏓 Pinging...")],
        fetchReply: true,
      });
      const latency = msg.createdTimestamp - interaction.createdTimestamp;
      const pingContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### 🏓 Pong!"),
          new TextDisplayBuilder().setContent(
            `**📨 Message Latency:** \`${latency} ms\`\n**💻 API Latency:** \`${Math.round(client.ws.ping)} ms\``,
          ),
        )
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
        components: [pingContainer],
      });
      break;

    default:
      break;
  }
}

async function handleFunCommands(interaction, subcommand) {
  const stt = Date.now();
  switch (subcommand) {
    case "random-speech-bubble":
      await interaction.deferReply();
      try {
        const response = await axios.get(
          "https://api.github.com/repos/chlkrisz/speech-bubbles/contents/gifs",
        );
        const data = response.data;
        const randomGif =
          data[Math.floor(Math.random() * data.length)].download_url;
        const gifResponse = await axios.get(randomGif, {
          responseType: "arraybuffer",
        });
        const file = new AttachmentBuilder(Buffer.from(gifResponse.data), {
          name: "speechbubble.gif",
        });
        const speechbubbleContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "### 🗨️ Here's your random speech bubble!",
            ),
          )
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder().setURL(
                "attachment://speechbubble.gif",
              ),
            ),
          )
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
          components: [speechbubbleContainer],
          files: [file],
        });
      } catch (error) {
        console.error(error);
        await interaction.editReply({
          content: "❌ An error occurred while fetching the speech bubble.",
        });
      }
      break;
    case "cobalt":
      await handleCobaltCommand(interaction);
      break;

    case "say":
      const content = interaction.options.getString("content");
      if (!content) {
        await interaction.reply({
          content: "⚠️ Please provide content to say.",
          ephemeral: true,
        });
      } else {
        const sayContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${content}`),
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# Message from ${interaction.user.username}, processed in ${(Date.now() - stt) / 1000} seconds`,
            ),
          );

        await interaction.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [sayContainer],
        });
      }
      break;

    default:
      break;
  }
}

async function uploadFileToCatbox(
  fileBuffer,
  fileName,
  apiHost = "https://catbox.moe/user/api.php",
) {
  try {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fileBuffer, fileName);

    const response = await axios.post(apiHost, form, {
      headers: form.getHeaders(),
    });

    if (response.status === 200 && typeof response.data === "string") {
      return response.data.trim();
    } else {
      throw new Error(
        `Unexpected response: ${response.status} - ${response.data}`,
      );
    }
  } catch (error) {
    if (error.response && error.response.status === 413) {
      console.error("Catbox upload failed: File too large.");
      return "❌ File too large for Catbox upload.";
    }
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

async function handleCobaltCommand(interaction) {
  const stt = Date.now();
  try {
    const url = interaction.options.getString("url");
    const audioOnly = interaction.options.getBoolean("audio") || false;
    const videoQuality =
      interaction.options.getString("video_quality") || "720";
    if (
      !url ||
      !url.startsWith("http") ||
      !url.includes("://") ||
      !url.includes(".")
    ) {
      return await interaction.reply({
        content: "⚠️ Please provide a valid URL.",
        ephemeral: false,
      });
    }

    await interaction.deferReply();

    const data = {
      url,
      alwaysProxy: true,
      filenameStyle: "basic",
      videoQuality: videoQuality,
      downloadMode: audioOnly ? "audio" : "auto",
    };

    let cobaltResponse;
    let type = "single";
    try {
      cobaltResponse = await axios.post(process.env.COBALT_URL, data, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      if (cobaltResponse.data.status === "picker") type = "picker";
    } catch (error) {
      throw new Error(
        `Cobalt API error: ${JSON.stringify(error.response?.data) || error.message}`,
      );
    }

    let fileResponses = [];
    try {
      if (type === "picker" && Array.isArray(cobaltResponse.data.picker)) {
        for (const item of cobaltResponse.data.picker) {
          fileResponses.push(
            await axios.get(item.url, {
              responseType: "arraybuffer",
            }),
          );
        }
      } else {
        fileResponses.push(
          await axios.get(cobaltResponse.data.url, {
            responseType: "arraybuffer",
          }),
        );
      }
    } catch (error) {
      console.error("Error downloading file from Cobalt:", error.message);
      throw new Error(
        `Download error: ${JSON.stringify(error.response?.data) || error.message}`,
      );
    }

    if (type === "picker") {
      const mediaItems = [];
      const attachments = [];
      const fileSizes = [];
      for (let i = 0; i < fileResponses.length; i++) {
        const fileBuffer = Buffer.from(fileResponses[i].data);
        const type =
          fileResponses[i].headers["content-type"] ||
          "application/octet-stream";
        const fileName = `item_${i + 1}.${type.split("/").pop().split(";")[0]}`;
        const fileSizeMB = Buffer.byteLength(fileBuffer) / (1024 * 1024);
        fileSizes.push(fileSizeMB);
        const attachment = new AttachmentBuilder(fileBuffer, {
          name: fileName,
        });
        attachments.push(attachment);
        mediaItems.push(
          new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`),
        );
      }

      const totalSizeMB = fileSizes.reduce((a, b) => a + b, 0);

      if (totalSizeMB > 250) {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new TextDisplayBuilder().setContent(
              `📤 Total file size is ${totalSizeMB.toFixed(2)} MB, uploading to Catbox...`,
            ),
          ],
        });
        const catboxUrls = [];
        for (let i = 0; i < fileResponses.length; i++) {
          const fileBuffer = Buffer.from(fileResponses[i].data);
          const fileName = cobaltResponse.data.picker[i].filename;
          const catboxUrl = await uploadFileToCatbox(fileBuffer, fileName);
          catboxUrls.push(catboxUrl);
        }
        const mediaItemsCatbox = catboxUrls.map((url) =>
          new MediaGalleryItemBuilder().setURL(url),
        );
        const mediaPickerContainer =
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent("### 🎬 Output:"),
          );

        if (
          [
            "mp4",
            "webm",
            "mkv",
            "mov",
            "avi",
            "png",
            "jpg",
            "jpeg",
            "gif",
            "avif",
            "webp",
          ].some((ext) => catboxUrls[0].toLowerCase().endsWith(ext))
        ) {
          mediaPickerContainer.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(...mediaItemsCatbox),
          );
        } else {
          mediaPickerContainer.addFileComponents(
            ...catboxUrls.map((url) => new FileBuilder().setURL(url)),
          );
        }

        mediaPickerContainer
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# type: picker, ${totalSizeMB.toFixed(2)} MB, took ${(Date.now() - stt) / 1000} seconds`,
            ),
          );
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          files: [...attachments],
          components: [mediaPickerContainer],
        });
      } else {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new TextDisplayBuilder().setContent(
              "📤 Uploading files, please wait...",
            ),
          ],
        });
        if (mediaItems.length > 10) {
          const mediaItemChunks = [];
          const attachmentChunks = [];
          for (let i = 0; i < mediaItems.length; i += 10) {
            mediaItemChunks.push(mediaItems.slice(i, i + 10));
            attachmentChunks.push(attachments.slice(i, i + 10));
          }
          //first chunk
          const firstChunkContainer =
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`### 🎬 Output:`),
            );
          if (
            [
              "mp4",
              "webm",
              "mkv",
              "mov",
              "avi",
              "png",
              "jpg",
              "jpeg",
              "gif",
              "avif",
              "webp",
            ].some((ext) =>
              attachmentChunks[0][0].name.toLowerCase().endsWith(ext),
            )
          ) {
            firstChunkContainer.addMediaGalleryComponents(
              new MediaGalleryBuilder().addItems(...mediaItemChunks[0]),
            );
          } else {
            firstChunkContainer.addFileComponents(
              ...attachmentChunks[0].map((att) =>
                new FileBuilder().setURL(`attachment://${att.name}`),
              ),
            );
          }
          firstChunkContainer
            .addSeparatorComponents(
              new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `-# (chunk 1/${mediaItemChunks.length})`,
              ),
            );
          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            files: [...attachmentChunks[0]],
            components: [firstChunkContainer],
          });
          //other chunks
          for (let i = 1; i < mediaItemChunks.length; i++) {
            const fasz = new ContainerBuilder();
            if (
              [
                "mp4",
                "webm",
                "mkv",
                "mov",
                "avi",
                "png",
                "jpg",
                "jpeg",
                "gif",
                "avif",
                "webp",
              ].some((ext) =>
                attachmentChunks[i][0].name.toLowerCase().endsWith(ext),
              )
            ) {
              fasz.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(...mediaItemChunks[i]),
              );
            } else {
              fasz.addFileComponents(
                ...attachmentChunks[i].map((att) =>
                  new FileBuilder().setURL(`attachment://${att.name}`),
                ),
              );
            }
            fasz
              .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `-# (chunk ${i + 1}/${mediaItemChunks.length})`,
                ),
              );

            if (i === mediaItemChunks.length - 1) {
              fasz.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `-# type: picker, ${totalSizeMB.toFixed(2)} MB, took ${(Date.now() - stt) / 1000} seconds`,
                ),
              );
            }
            await interaction.followUp({
              flags: MessageFlags.IsComponentsV2,
              files: [...attachmentChunks[i]],
              components: [fasz],
            });
          }
        } else {
          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            files: [...attachments],
            components: [
              new ContainerBuilder()
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent("### 🎬 Output:"),
                )
                .addMediaGalleryComponents(
                  new MediaGalleryBuilder().addItems(...mediaItems),
                )
                .addSeparatorComponents(
                  new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
                ),
            ],
          });
        }
      }
    } else {
      const fileBuffer = Buffer.from(fileResponses[0].data);
      let fileName = cobaltResponse.data.filename;
      //let fileName = "output";
      const fileSizeMB = Buffer.byteLength(fileBuffer) / (1024 * 1024);

      let sizeDisplay;
      if (fileSizeMB < 1) {
        sizeDisplay = `${(fileSizeMB * 1024).toFixed(2)} KB`;
      } else {
        sizeDisplay = `${fileSizeMB.toFixed(2)} MB`;
      }

      let resolution = "N/A";
      let length = "N/A";
      let type = "unknown";
      let frameCount = 0;

      const ext = fileName.split(".").pop().toLowerCase();
      fileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
        type = "image";
        try {
          const info = probe.sync(fileBuffer);
          if (info && info.width && info.height) {
            resolution = `${info.width}x${info.height}`;
          }
        } catch {}
      } else if (
        [
          "mp4",
          "webm",
          "mkv",
          "mov",
          "avi",
          "mp3",
          "wav",
          "ogg",
          "flac",
          "m4a",
        ].includes(ext)
      ) {
        try {
          const tmpFile = tmp.fileSync({ postfix: "." + ext });
          fs.writeFileSync(tmpFile.name, fileBuffer);

          await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(tmpFile.name, (err, metadata) => {
              if (
                !err &&
                metadata &&
                metadata.streams &&
                metadata.streams.length
              ) {
                const stream =
                  metadata.streams.find((s) => s.width && s.height) ||
                  metadata.streams[0];
                if (stream.width && stream.height) {
                  resolution = `${stream.width}x${stream.height}`;
                  type = "video";
                }
                if (stream.duration || metadata.format?.duration) {
                  length = `${stream.duration.toFixed(2) || metadata.format.duration.toFixed(2)}s`;
                }
                frameCount = stream.nb_frames || 0;
                if (stream.codec_type === "audio") type = "audio";
              }
              tmpFile.removeCallback();
              resolve();
            });
          });
        } catch {}
      }

      if (fileSizeMB > 250) {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new TextDisplayBuilder().setContent(
              `📤 File size is ${fileSizeMB.toFixed(2)} MB, uploading to Catbox...`,
            ),
          ],
        });
        const catboxUrl = await uploadFileToCatbox(fileBuffer, fileName);
        const catboxContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("### 🎬 Output:"),
          )
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder().setURL(catboxUrl),
            ),
          );
        if (["video", "image"].includes(type)) {
          catboxContainer.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder().setURL(catboxUrl),
            ),
          );
        } else {
          catboxContainer.addFileComponents(
            new FileBuilder().setURL(catboxUrl),
          );
        }
        catboxContainer
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# type: ${type}, ${resolution === "N/A" ? "" : resolution + ", "}${length === "N/A" ? "" : length + ", "}${sizeDisplay}, ${frameCount === "N/A" ? "" : frameCount + " frames, "}took ${(Date.now() - stt) / 1000} seconds`,
            ),
          );
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [catboxContainer],
        });
      } else {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new TextDisplayBuilder().setContent(
              "📤 Uploading file, please wait...",
            ),
          ],
        });
        const attachment = new AttachmentBuilder(fileBuffer, {
          name: fileName,
        });
        const outputContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### 🎬 Output:"),
        );
        if (["video", "image"].includes(type)) {
          outputContainer.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`),
            ),
          );
        } else {
          outputContainer.addFileComponents(
            new FileBuilder().setURL(`attachment://${fileName}`),
          );
        }
        outputContainer
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# type: ${type}, ${resolution === "N/A" ? "" : resolution + ", "}${length === "N/A" ? "" : length + ", "}${sizeDisplay}, ${frameCount === 0 ? "" : frameCount + " frames, "}took ${(Date.now() - stt) / 1000} seconds`,
            ),
          );
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [outputContainer],
          files: [attachment],
        });
      }
    }
  } catch (error) {
    console.error(
      "An error occurred:",
      error.message,
      error.response?.data || error,
    );
    try {
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new TextDisplayBuilder().setContent(
            "❌ An error occurred while processing your request.\n```\n" +
              (JSON.stringify(error.response?.data) || error.message) +
              "\n```",
          ),
        ],
      });
    } catch (discordError) {
      console.error("Failed to edit reply on Discord:", discordError.message);
    }
  }
}

function formatUptime(uptime) {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
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
