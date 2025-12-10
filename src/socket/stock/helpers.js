// src/socket/stock/helpers.js
function getBestImage(adItem) {
    if (!adItem) return null;
    if (Array.isArray(adItem.images) && adItem.images.length > 0) return adItem.images[0];
    if (adItem.img && adItem.img.length > 5) return adItem.img;
    if (adItem.image && adItem.image.length > 5) return adItem.image;
    return null; 
}
module.exports = { getBestImage };