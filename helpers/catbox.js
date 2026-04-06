const FormData = require("form-data");

async function uploadFileToCatbox(
    fileBuffer,
    fileName,
    apiHost = "https://catbox.moe/user/api.php",
) {
    try {
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", fileBuffer, fileName);

        const response = await fetch(apiHost, {
            method: "POST",
            headers: form.getHeaders(),
            body: form,
            duplex: "half",
        });

        const data = await response.text();

        if (response.status === 413) {
            console.error("Catbox upload failed: File too large.");
            return "❌ File too large for Catbox upload.";
        }

        if (response.ok && typeof data === "string") {
            return data.trim();
        }

        throw new Error(`Unexpected response: ${response.status} - ${data}`);
    } catch (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

module.exports = {
    uploadFileToCatbox,
};