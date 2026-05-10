const bwipjs = require('bwip-js');
const qrcode = require('qrcode');
const imagekit = require('./imagekit');

const generateBarcode = async (text, type = 'code128') => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer({
      bcid: type,       // Barcode type
      text: text,       // Text to encode
      scale: 3,         // 3x scaling factor
      height: 10,       // Bar height, in millimeters
      includetext: true, // Show human-readable text
      textxalign: 'center', // Always good to set this
      }, async function (err, png) {
      if (err) {
        reject(err);
      } else {
        try {
          const filename = `${text}.png`;
          const uploadResponse = await imagekit.upload({
            file: png, // buffer
            fileName: filename,
            folder: '/barcodes'
          });
          resolve(uploadResponse.url);
        } catch (uploadErr) {
          reject(uploadErr);
        }
      }
    });
  });
};

const generateQRCode = async (text) => {
  try {
    const filename = `${text}.png`;
    const buffer = await qrcode.toBuffer(text);
    
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: filename,
      folder: '/qrcodes'
    });
    return uploadResponse.url;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  generateBarcode,
  generateQRCode
};
