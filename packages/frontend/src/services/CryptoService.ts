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
            const keyBytes = CryptoJS.lib.WordArray.random(32);
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
            
            if (!this.publicKey) {
                throw new Error('Public key not initialized');
            }

            // Format the key in proper PEM format
            // Split the base64 into 64-character lines
            const base64Lines = this.publicKey.match(/.{1,64}/g) || [];
            const pemKey = [
                '-----BEGIN PUBLIC KEY-----',
                ...base64Lines,
                '-----END PUBLIC KEY-----'
            ].join('\n');

            return pemKey;
        } catch (error) {
            console.error('Error encoding public key:', error);
            throw error;
        }
    }

    public async decryptMessage(key: string, secureMessage: string): Promise<string> {
        try {
            this.ensureInitialized();

            const secureMessageWords = CryptoJS.enc.Base64.parse(secureMessage);
            const decryptionKey = CryptoJS.enc.Base64.parse(key);

            const ivWords = CryptoJS.lib.WordArray.create(
                secureMessageWords.words.slice(0, 4),
                16
            );
            const ciphertextWords = CryptoJS.lib.WordArray.create(
                secureMessageWords.words.slice(4),
                secureMessageWords.sigBytes - 16
            );

            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: ciphertextWords },
                decryptionKey,
                {
                    iv: ivWords,
                    mode: CryptoJS.mode.CFB,
                    padding: CryptoJS.pad.NoPadding
                }
            );

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
