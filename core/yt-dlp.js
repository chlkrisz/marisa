const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

async function downloadWithYtdlp(url, audioOnly = false, quality = "720") {
    let tmpDir;

    try {
        if (!url || typeof url !== "string") {
            throw new Error("Invalid URL provided");
        }

        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ytdlp-"));
        const outputPath = path.join(tmpDir, "output.%(ext)s");

        const args = [
            url,
            "-o", outputPath,
            "--no-playlist",
        ];

        if (audioOnly) {
            args.push("-f", "bestaudio");
            args.push("-x");
            args.push("--audio-format", "mp3");
        } else if (quality !== "max") {
            args.push(
                "-f",
                `bestvideo[height<=?${quality}]+bestaudio/best[height<=?${quality}]`
            );
            args.push("--merge-output-format", "mp4");
        } else {
            args.push("-f", "bestvideo+bestaudio/best");
            args.push("--merge-output-format", "mp4");
        }

        const result = await executeYtdlp(args);
        const files = fs.readdirSync(tmpDir);
        if (!files.length) {
            throw new Error("yt-dlp didn't produce any output files");
        }

        const filePath = path.join(tmpDir, files[0]);

        if (!fs.existsSync(filePath)) {
            throw new Error("Output file was not created");
        }

        const buffer = fs.readFileSync(filePath);

        if (!buffer || buffer.length === 0) {
            throw new Error("Downloaded file is empty");
        }

        return {
            buffer,
            fileName: files[0],
            filePath: tmpDir,
        };

    } catch (error) {
        if (tmpDir && fs.existsSync(tmpDir)) {
            try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            } catch (cleanupError) {
                console.error("Error cleaning up temporary directory:", cleanupError.message);
            }
        }

        throw new Error(`yt-dlp download failed: ${error.message}`);
    }
}

async function executeYtdlp(args) {
    return new Promise((resolve, reject) => {
        const process = spawn("yt-dlp", args);
        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        process.on("error", (error) => {
            reject(new Error(`Failed to spawn yt-dlp process: ${error.message}`));
        });

        process.on("exit", (code) => {
            if (code !== 0) {
                reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

async function cleanupFile(tmpDir) {
    try {
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    } catch (error) {
        console.error("Error during cleanup:", error.message);
    }
}

module.exports = {
    downloadWithYtdlp,
    cleanupFile,
};