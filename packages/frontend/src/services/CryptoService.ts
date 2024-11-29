public async encodePublicKey(): Promise<string> {
    if (!this.pubKey) {
        const keyPair = {
            publicKey: CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64),
            privateKey: CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64)
        };
        this.pubKey = keyPair.publicKey;
        this.privKey = keyPair.privateKey;
    }

    // Format the public key in the exact format the server expects
    const formattedKey = this.pubKey
        .match(/.{1,64}/g)
        ?.join('\n') || this.pubKey;
    
    return `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
}
