import * as CryptoJS from 'crypto-js';

export class CryptoService {
    private privateKey: string | null = null;
    private publicKey: string | null = null;
    private isInitialized: boolean = false;

    constructor() {
        this.generateKeys();
        this.isInitialized = true;
    }

    private generateKeys(): void {
        try {
            // Generate random keys
            const privateKeyBytes = CryptoJS.lib.WordArray.random(32);
            const publicKeyBytes = CryptoJS.lib.WordArray.random(32);
            
            this.privateKey = privateKeyBytes.toString(CryptoJS.enc.Base64);
            this.publicKey = publicKeyBytes.toString(CryptoJS.enc.Base64);

            console.log('Keys generated successfully');
        } catch (error) {
            console.error('Error generating keys:', error);
            throw error;
        }
    }

    private ensureInitialized(): void {
        if (!this.isInitialized || !this.publicKey || !this.privateKey) {
            this.generateKeys();
            this.isInitialized = true;
        }
    }

    public async encodePublicKey(): Promise<string> {
        try {
            this.ensureInitialized();
            
            // Format the key in PEM format without line breaks
            // This format is specifically what oast.site expects
            return `-----BEGIN PUBLIC KEY-----${this.publicKey}-----END PUBLIC KEY-----`;
        } catch (error) {
            console.error('Error encoding public key:', error);
            throw error;
        }
    }

    public async decryptMessage(key: string, secureMessage: string): Promise<string> {
        try {
            this.ensureInitialized();

            // Decode the base64 secure message
            const secureMessageWords = CryptoJS.enc.Base64.parse(secureMessage);
            
            // Extract IV (first 16 bytes) and ciphertext
            const ivWords = CryptoJS.lib.WordArray.create(
                secureMessageWords.words.slice(0, 4),
                16
            );
            
            const ciphertextWords = CryptoJS.lib.WordArray.create(
                secureMessageWords.words.slice(4),
                secureMessageWords.sigBytes - 16
            );

            // Use the key directly for decryption
            const decryptionKey = CryptoJS.enc.Base64.parse(key);

            // Decrypt using AES-256-CFB
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: ciphertextWords },
                decryptionKey,
                {
                    iv: ivWords,
                    mode: CryptoJS.mode.CFB,
                    padding: CryptoJS.pad.NoPadding
                }
            );

            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Error decrypting message:', error);
            throw new Error('Failed to decrypt message');
        }
    }

    public getPrivateKey(): string | null {
        this.ensureInitialized();
        return this.privateKey;
    }

    public getPublicKey(): string | null {
        this.ensureInitialized();
        return this.publicKey;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const binary = String.fromCharCode(...new Uint8Array(buffer));
        return btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const cryptoService = new CryptoService();
