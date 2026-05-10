const ImageKit = require('@imagekit/nodejs');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_placeholder",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_a87H1Rf4yZ******************",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/placeholder"
});

module.exports = imagekit;
