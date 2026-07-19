const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

function serializeForSignature(feedbackObj) {
    const name = feedbackObj.customer_name ? String(feedbackObj.customer_name).trim() : "";
    const rating = Number(feedbackObj.rating) || 0;
    
    // Normalize newlines to standard LF (\n) to ensure cross-platform cryptographic consistency
    let comment = feedbackObj.comment ? String(feedbackObj.comment).trim() : "";
    comment = comment.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Protect the photo attachment using its SHA-256 hash
    const attachmentHash = feedbackObj.attachment_hash ? String(feedbackObj.attachment_hash) : ""; 

    const safeName = encodeURIComponent(name);
    const safeComment = encodeURIComponent(comment);

    const canonicalString = `customer_name=${safeName}&rating=${rating}&comment=${safeComment}&attachment_hash=${attachmentHash}`;
    
    return nacl.util.decodeUTF8(canonicalString);
}

function keyPairFromSeed(hexSeed) {
    const seed = Buffer.from(hexSeed, 'hex');
    return nacl.sign.keyPair.fromSeed(seed);
}

function signFeedback(privateKey, feedbackObj) {
    const messageUint8 = serializeForSignature(feedbackObj);
    const signature = nacl.sign.detached(messageUint8, privateKey);
    return nacl.util.encodeBase64(signature); 
}

function verifySignature(publicKey, feedbackObj, signatureB64) {
    const messageUint8 = serializeForSignature(feedbackObj);
    const signatureUint8 = nacl.util.decodeBase64(signatureB64);
    const pubKeyUint8 = new Uint8Array(publicKey); 
    return nacl.sign.detached.verify(messageUint8, signatureUint8, pubKeyUint8);
}

module.exports = {
    keyPairFromSeed,
    signFeedback,
    verifySignature,
};