const bwipjs = require('bwip-js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

const generateBarcode = async (text, type = 'code128') => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer({
      bcid: type,       // Barcode type
      text: text,       // Text to encode
      scale: 3,         // 3x scaling factor
      height: 10,       // Bar height, in millimeters
      includetext: true, // Show human-readable text
      textxalign: 'center', // Always good to set this
    }, function (err, png) {
      if (err) {
        reject(err);
      } else {
        // Save file locally in src/uploads/barcodes
        const dir = path.join(__dirname, '../uploads/barcodes');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        const filename = `${text}.png`;
        const filepath = path.join(dir, filename);
        fs.writeFileSync(filepath, png);
        resolve(`/uploads/barcodes/${filename}`);
      }
    });
  });
};

const generateQRCode = async (text) => {
  try {
    const dir = path.join(__dirname, '../uploads/qrcodes');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    const filename = `${text}.png`;
    const filepath = path.join(dir, filename);
    await qrcode.toFile(filepath, text);
    return `/uploads/qrcodes/${filename}`;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  generateBarcode,
  generateQRCode
};
