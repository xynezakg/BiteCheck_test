import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

export function serializeForSignature(feedbackObj) {
    const name = feedbackObj.customer_name ? String(feedbackObj.customer_name).trim() : "";
    const rating = Number(feedbackObj.rating) || 0;
    
    // Normalize newlines to standard LF (\n) to ensure cross-platform cryptographic consistency
    let comment = feedbackObj.comment ? String(feedbackObj.comment).trim() : "";
    comment = comment.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const attachmentHash = feedbackObj.attachment_hash ? String(feedbackObj.attachment_hash) : ""; 

    const safeName = encodeURIComponent(name);
    const safeComment = encodeURIComponent(comment);

    const canonicalString = `customer_name=${safeName}&rating=${rating}&comment=${safeComment}&attachment_hash=${attachmentHash}`;
    
    return naclUtil.decodeUTF8(canonicalString);
}

// Generates a random keypair for the student in their browser!
export function generateKeyPair() {
    return nacl.sign.keyPair();
}

export function signData(privateKey, feedbackObj) {
    const messageUint8 = serializeForSignature(feedbackObj);
    const signature = nacl.sign.detached(messageUint8, privateKey);
    return naclUtil.encodeBase64(signature); 
}