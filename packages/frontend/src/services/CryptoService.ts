import * as CryptoJS from 'crypto-js';

export class CryptoService {
    private privKey: CryptoKey | null = null;
    private pubKey: CryptoKey | null = null;
    private isInitialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        this.initializationPromise = this.initializeRSAKeys().catch(error => {
            console.error('Failed to initialize RSA keys:', error);
            throw error;
        });
    }

    private async initializeRSAKeys(): Promise<void> {
        try {
            // Check if Web Crypto is available
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error('Web Crypto API is not available');
            }

            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: { name: 'SHA-256' },
                },
                true,
                ['encrypt', 'decrypt']
            );

            this.pubKey = keyPair.publicKey;
            this.privKey = keyPair.privateKey;
            this.isInitialized = true;
            console.log('RSA keys successfully generated');
        } catch (error) {
            console.error('Error initializing RSA keys:', error);
            throw error;
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        if (!this.isInitialized) {
            throw new Error('CryptoService failed to initialize');
        }
    }

    public async encodePublicKey(): Promise<string> {
        await this.ensureInitialized();
        
        if (!this.pubKey) {
            throw new Error('Public key not initialized');
        }

        try {
            const exported = await window.crypto.subtle.exportKey('spki', this.pubKey);
            const base64Key = this.arrayBufferToBase64(exported);
            return btoa(`-----BEGIN PUBLIC KEY-----\n${base64Key.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`);
        } catch (error) {
            console.error('Error encoding public key:', error);
            throw error;
        }
    }

    public async decryptMessage(key: string, secureMessage: string): Promise<string> {
        await this.ensureInitialized();

        if (!this.privKey) {
            throw new Error('Private key not initialized');
        }

        try {
            const decodedKey = this.base64ToArrayBuffer(key);

            const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'RSA-OAEP',
                    hash: { name: 'SHA-256' },
                },
                this.privKey,
                decodedKey
            );

            const decryptedKey = CryptoJS.lib.WordArray.create(new Uint8Array(decryptedKeyBuffer));
            const secureMessageWords = CryptoJS.enc.Base64.parse(secureMessage);

            const ivWords = CryptoJS.lib.WordArray.create(secureMessageWords.words.slice(0, 4), 16);
            const ciphertextWords = CryptoJS.lib.WordArray.create(
                secureMessageWords.words.slice(4),
                secureMessageWords.sigBytes - 16
            );

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
            throw error;
        }
    }

    public getPrivateKey(): CryptoKey | null {
        return this.privKey;
    }

    public getPublicKey(): CryptoKey | null {
        return this.pubKey;
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
