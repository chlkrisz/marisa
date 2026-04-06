const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require("discord.js");

async function random(interaction, stt) {
    const itemsString = interaction.options.getString("items");
    const count = interaction.options.getInteger("count") || 1;
    if (!itemsString) {
        await interaction.reply({
            content: "⚠️ Please provide a list of items separated by commas.",
            ephemeral: true,
        });
    } else {
        const items = itemsString.split(",").map((item) => item.trim()).filter(item => item.length > 0);
        if (items.length === 0) {
            await interaction.reply({
                content: "⚠️ Please provide a valid list of items.",
                ephemeral: true,
            });
        } else {
            const randomItems = [];
            if (count == items.length || count > items.length) {
                while (items.length > 0) {
                    const randomIndex = Math.floor(Math.random() * items.length);
                    randomItems.push(items[randomIndex]);
                    items.splice(randomIndex, 1);
                }
            } else {
                for (let i = 0; i < Math.min(count, items.length); i++) {
                    const randomIndex = Math.floor(Math.random() * items.length);
                    randomItems.push(items[randomIndex]);
                    items.splice(randomIndex, 1);
                }
            }
            const randomContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### Output:`),
                    ...randomItems.map((item) => new TextDisplayBuilder().setContent(`**${item}**`)),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Requested by ${interaction.user.username}, processed in ${(Date.now() - stt) / 1000} seconds`,
                    ),
                );
            await interaction.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [randomContainer],
            });
        }
    }
}

module.exports = {
    random,
};