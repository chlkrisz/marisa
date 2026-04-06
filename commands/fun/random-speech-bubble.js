const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, AttachmentBuilder, MessageFlags } = require("discord.js");

async function randomSpeechBubble(interaction, stt) {
    await interaction.deferReply();
    try {
        const response = await fetch(
            "https://api.github.com/repos/chlkrisz/speech-bubbles/contents/gifs",
        );
        const data = await response.json();
        const randomGif =
            data[Math.floor(Math.random() * data.length)].download_url;
        const res = await fetch(randomGif);
        if (!res.ok) {
            throw new Error(`Failed to fetch GIF: ${res.status} ${res.statusText}`);
        }
        const gifResponse = {
            data: await res.arrayBuffer(),
        };
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
}

module.exports = {
    randomSpeechBubble,
};