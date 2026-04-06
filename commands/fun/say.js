const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require("discord.js");

async function say(interaction, stt) {
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
}

module.exports = {
    say,
};