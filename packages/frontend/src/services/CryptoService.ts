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
            // Generate a random key for both private and public
            const keyBytes = CryptoJS.lib.WordArray.random(32);
            
            // Convert to base64 without any wrapping or formatting
            this.privateKey = keyBytes.toString(CryptoJS.enc.Base64);
            this.publicKey = keyBytes.toString(CryptoJS.enc.Base64);

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
            
            // Return just the base64 string without PEM formatting
            // This is what oast.site actually expects
            return this.publicKey || '';
        } catch (error) {
            console.error('Error encoding public key:', error);
            throw error;
        }
    }

    public async decryptMessage(key: string, secureMessage: string): Promise<string> {
        try {
            this.ensureInitialized();

            // Parse the incoming messages
            const secureMessageWords = CryptoJS.enc.Base64.parse(secureMessage);
            const decryptionKey = CryptoJS.enc.Base64.parse(key);

            // Extract IV and ciphertext
            const ivWords = CryptoJS.lib.WordArray.create(
                secureMessageWords.words.slice(0, 4),
                16
            );
            const ciphertextWords = CryptoJS.lib.WordArray.create(
                secureMessageWords.words.slice(4),
                secureMessageWords.sigBytes - 16
            );

            // Decrypt the message
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: ciphertextWords },
                decryptionKey,
                {
                    iv: ivWords,
                    mode: CryptoJS.mode.CFB,
                    padding: CryptoJS.pad.NoPadding
                }
            );

            // Convert to UTF8 string
            const result = decrypted.toString(CryptoJS.enc.Utf8);
            if (!result) {
                throw new Error('Decryption resulted in empty string');
            }
            
            return result;
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
}

export const cryptoService = new CryptoService();
