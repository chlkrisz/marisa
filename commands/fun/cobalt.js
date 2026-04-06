const {
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    FileBuilder,
} = require("discord.js");
const { uploadFileToCatbox } = require("../../helpers/catbox");
const { downloadFromCobalt, getFileMetadata } = require("../../core/cobalt");
const { downloadWithYtdlp } = require("../../core/yt-dlp");

async function cobalt(interaction, stt) {
    try {
        const url = interaction.options.getString("url");
        const audioOnly = interaction.options.getBoolean("audio") || false;
        const videoQuality =
            interaction.options.getString("video_quality") || "720";
        const force_ytdlp = interaction.options.getBoolean("force_ytdlp") || false;
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

        if(force_ytdlp) {
            //WOOHOOOOOO LETS GOOOOOOOOOOO YT-DLP BABYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY YEEEEEEEEEEEEEEEEEEEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
            const ytDlpResult = await downloadWithYtdlp(
                interaction.options.getString("url"),
                interaction.options.getBoolean("audio") || false,
                interaction.options.getString("video_quality") || "720",
            );

            const attachment = new AttachmentBuilder(ytDlpResult.buffer, {
                name: ytDlpResult.fileName,
            });
            if (ytDlpResult.buffer.length > 250 * 1024 * 1024) {
                const catboxUrl = await uploadFileToCatbox(
                    ytDlpResult.buffer,
                    ytDlpResult.fileName,
                );
                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new TextDisplayBuilder().setContent(`📎 File uploaded to Catbox: ${catboxUrl}`),
                    ],
                });
            } else {
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
                    ].some((ext) =>
                        ytDlpResult.fileName.toLowerCase().endsWith(ext),
                    )
                ) {
                    mediaPickerContainer.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(
                                `attachment://${ytDlpResult.fileName}`,
                            ),
                        ),
                    );
                } else {
                    mediaPickerContainer.addFileComponents(
                        new FileBuilder().setURL(
                            `attachment://${ytDlpResult.fileName}`,
                        ),
                    );
                }

                mediaPickerContainer
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `-# type: single, ${(
                                ytDlpResult.buffer.length /
                                (1024 * 1024)
                            ).toFixed(2)} MB, took ${(Date.now() - stt) / 1000} seconds`,
                        ),
                    );
                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    files: [attachment],
                    components: [mediaPickerContainer],
                });
                return;
            }
        }

        const { fileResponses, cobaltResponse, type } = await downloadFromCobalt(
            url,
            audioOnly,
            videoQuality,
        );

        if (type === "picker") {
            await handlePickerResponse(
                interaction,
                fileResponses,
                cobaltResponse,
                stt,
            );
        } else {
            await handleSingleResponse(
                interaction,
                fileResponses,
                cobaltResponse,
                stt,
            );
        }
    } catch (error) {
        console.error(
            "An error occurred:",
            error.message,
            error.response?.data || error,
        );
        try {
            // FALLING BACK TO YT-DLP BABYYYY
            const ytDlpResult = await downloadWithYtdlp(
                interaction.options.getString("url"),
                interaction.options.getBoolean("audio") || false,
                interaction.options.getString("video_quality") || "720",
            );

            const attachment = new AttachmentBuilder(ytDlpResult.buffer, {
                name: ytDlpResult.fileName,
            });
            if (ytDlpResult.buffer.length > 250 * 1024 * 1024) {
                const catboxUrl = await uploadFileToCatbox(
                    ytDlpResult.buffer,
                    ytDlpResult.fileName,
                );
                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new TextDisplayBuilder().setContent(`📎 File uploaded to Catbox: ${catboxUrl}`),
                    ],
                });
            } else {
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
                    ].some((ext) =>
                        ytDlpResult.fileName.toLowerCase().endsWith(ext),
                    )
                ) {
                    mediaPickerContainer.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(
                                `attachment://${ytDlpResult.fileName}`,
                            ),
                        ),
                    );
                } else {
                    mediaPickerContainer.addFileComponents(
                        new FileBuilder().setURL(
                            `attachment://${ytDlpResult.fileName}`,
                        ),
                    );
                }

                mediaPickerContainer
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `-# type: single, ${(
                                ytDlpResult.buffer.length /
                                (1024 * 1024)
                            ).toFixed(2)} MB, took ${(Date.now() - stt) / 1000} seconds`,
                        ),
                    );
                await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    files: [attachment],
                    components: [mediaPickerContainer],
                });
            }

        } catch (error) {
            console.error("YT-DLP fallback also failed:", error.message);
            await interaction.editReply({
                content: "❌ An error occurred while processing your request.",
            });
        }
    }
}

async function handlePickerResponse(interaction, fileResponses, cobaltResponse, stt) {
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
        await handlePickerLargeFiles(interaction, fileResponses, cobaltResponse, totalSizeMB, stt);
    } else {
        await handlePickerSmallFiles(interaction, attachments, mediaItems, totalSizeMB, stt);
    }
}

async function handlePickerLargeFiles(interaction, fileResponses, cobaltResponse, totalSizeMB, stt) {
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
        files: [],
        components: [mediaPickerContainer],
    });
}

async function handlePickerSmallFiles(interaction, attachments, mediaItems, totalSizeMB, stt) {
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

        // Other chunks
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

async function handleSingleResponse(interaction, fileResponses, cobaltResponse, stt) {
    const fileBuffer = Buffer.from(fileResponses[0].data);
    let fileName = cobaltResponse.data.filename;
    const fileSizeMB = Buffer.byteLength(fileBuffer) / (1024 * 1024);

    let sizeDisplay;
    if (fileSizeMB < 1) {
        sizeDisplay = `${(fileSizeMB * 1024).toFixed(2)} KB`;
    } else {
        sizeDisplay = `${fileSizeMB.toFixed(2)} MB`;
    }

    if (Buffer.byteLength(fileBuffer) === 0) {
        // FALLING BACK TO YT-DLP ONCE AGAIIIIIN BABYYYYYYYYYYYYYYYY LEEETS GOOOOOOOOOOOOOOOOO ( i hate cobalt )
        const ytDlpResult = await downloadWithYtdlp(
            interaction.options.getString("url"),
            interaction.options.getBoolean("audio") || false,
            interaction.options.getString("video_quality") || "720",
        );

        const attachment = new AttachmentBuilder(ytDlpResult.buffer, {
            name: ytDlpResult.fileName,
        });
        if (ytDlpResult.buffer.length > 250 * 1024 * 1024) {
            const catboxUrl = await uploadFileToCatbox(
                ytDlpResult.buffer,
                ytDlpResult.fileName,
            );
            await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new TextDisplayBuilder().setContent(`📎 File uploaded to Catbox: ${catboxUrl}`),
                ],
            });
        } else {
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
                ].some((ext) =>
                    ytDlpResult.fileName.toLowerCase().endsWith(ext),
                )
            ) {
                mediaPickerContainer.addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(
                            `attachment://${ytDlpResult.fileName}`,
                        ),
                    ),
                );
            } else {
                mediaPickerContainer.addFileComponents(
                    new FileBuilder().setURL(
                        `attachment://${ytDlpResult.fileName}`,
                    ),
                );
            }

            mediaPickerContainer
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# type: single, ${(
                            ytDlpResult.buffer.length /
                            (1024 * 1024)
                        ).toFixed(2)} MB, took ${(Date.now() - stt) / 1000} seconds`,
                    ),
                );
            await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                files: [attachment],
                components: [mediaPickerContainer],
            });
            return;
        }
    }

    fileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    const { resolution, length, type, frameCount } = await getFileMetadata(
        fileBuffer,
        fileName,
    );

    if (fileSizeMB > 250) {
        await handleSingleLargeFile(
            interaction,
            fileBuffer,
            fileName,
            resolution,
            length,
            type,
            frameCount,
            sizeDisplay,
            stt,
        );
    } else {
        await handleSingleSmallFile(
            interaction,
            fileBuffer,
            fileName,
            resolution,
            length,
            type,
            frameCount,
            sizeDisplay,
            stt,
        );
    }
}

async function handleSingleLargeFile(
    interaction,
    fileBuffer,
    fileName,
    resolution,
    length,
    type,
    frameCount,
    sizeDisplay,
    stt,
) {
    await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
            new TextDisplayBuilder().setContent(
                `📤 File size is ${sizeDisplay}, uploading to Catbox...`,
            ),
        ],
    });

    const catboxUrl = await uploadFileToCatbox(fileBuffer, fileName);
    const catboxContainer = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("### 🎬 Output:"),
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
}

async function handleSingleSmallFile(
    interaction,
    fileBuffer,
    fileName,
    resolution,
    length,
    type,
    frameCount,
    sizeDisplay,
    stt,
) {
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

module.exports = {
    cobalt,
};