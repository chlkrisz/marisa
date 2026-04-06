const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

async function ping(client, interaction, stt) {
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
}

module.exports = {
    ping,
};