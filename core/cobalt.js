const probe = require("probe-image-size");
const ffmpeg = require("fluent-ffmpeg");
const tmp = require("tmp");
const fs = require("fs");

async function downloadFromCobalt(url, audioOnly, videoQuality) {
    const data = {
        url,
        alwaysProxy: true,
        filenameStyle: "basic",
        videoQuality,
        downloadMode: audioOnly ? "audio" : "auto",
    };

    let cobaltResponse;
    let type = "single";

    // POST request
    const response = await fetch(process.env.COBALT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cobalt API error: ${errText}`);
    }

    const responseData = await response.json();
    cobaltResponse = { data: responseData };

    if (responseData.status === "picker") {
        type = "picker";
    }

    let fileResponses = [];

    const urls =
        type === "picker" && Array.isArray(responseData.picker)
            ? responseData.picker.map((item) => item.url)
            : [responseData.url];

    for (const fileUrl of urls) {
        const fileRes = await fetch(fileUrl);

        if (!fileRes.ok) {
            throw new Error(`Download error: ${fileRes.statusText}`);
        }

        const buffer = Buffer.from(await fileRes.arrayBuffer());

        fileResponses.push({ data: buffer });
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