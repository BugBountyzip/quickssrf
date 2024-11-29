import * as CryptoJS from 'crypto-js';

export class CryptoService {
    private privateKey: string;
    private publicKey: string;
    private isInitialized: boolean = false;

    constructor() {
        // Generate RSA-like key pair using random values
        const keyPair = this.generateKeyPair();
        this.privateKey = keyPair.privateKey;
        this.publicKey = keyPair.publicKey;
        this.isInitialized = true;
    }

    private generateKeyPair() {
        // Generate random keys using CryptoJS
        const privateKey = CryptoJS.lib.WordArray.random(32).toString();
        const publicKey = CryptoJS.lib.WordArray.random(32).toString();
        
        return {
            privateKey,
            publicKey: `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`
        };
    }

    public async encodePublicKey(): Promise<string> {
        if (!this.isInitialized) {
            throw new Error('CryptoService not initialized');
        }
        return Promise.resolve(this.publicKey);
    }

    public async decryptMessage(key: string, secureMessage: string): Promise<string> {
        try {
            // Decode base64 secure message
            const secureMessageWords = CryptoJS.enc.Base64.parse(secureMessage);

            // Extract IV and ciphertext
            const ivWords = CryptoJS.lib.WordArray.create(secureMessageWords.words.slice(0, 4), 16);
            const ciphertextWords = CryptoJS.lib.WordArray.create(
                secureMessageWords.words.slice(4),
                secureMessageWords.sigBytes - 16
            );

            // Use the key directly for decryption
            const decryptedKey = CryptoJS.enc.Base64.parse(key);

            // Decrypt using AES-256-CFB
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: ciphertextWords },
                decryptedKey,
                {
                    iv: ivWords,
                    mode: CryptoJS.mode.CFB,
                    padding: CryptoJS.pad.NoPadding,
                }
            );

            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Error decrypting message:', error);
            return ''; // Return empty string on error
        }
    }

    public getPrivateKey(): string {
        return this.privateKey;
    }

    public getPublicKey(): string {
        return this.publicKey;
    }
}

export const cryptoService = new CryptoService();
