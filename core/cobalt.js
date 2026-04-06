const axios = require("axios");
const probe = require("probe-image-size");
const ffmpeg = require("fluent-ffmpeg");
const tmp = require("tmp");
const fs = require("fs");

async function downloadFromCobalt(url, audioOnly, videoQuality) {
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

    return {
        fileResponses,
        cobaltResponse,
        type,
    };
}

async function getFileMetadata(fileBuffer, fileName) {
    let resolution = "N/A";
    let length = "N/A";
    let type = "unknown";
    let frameCount = 0;

    const ext = fileName.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
        type = "image";
        try {
            const info = probe.sync(fileBuffer);
            if (info && info.width && info.height) {
                resolution = `${info.width}x${info.height}`;
            }
        } catch { }
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
        } catch { }
    }

    return {
        resolution,
        length,
        type,
        frameCount,
    };
}

module.exports = {
    downloadFromCobalt,
    getFileMetadata,
};