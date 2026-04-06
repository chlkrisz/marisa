const axios = require("axios");
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

module.exports = {
  uploadFileToCatbox,
};