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
            // Based on the Interactsh client reference implementation
            this.publicKey = [
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo",
                "4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u",
                "+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh",
                "kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ",
                "0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg",
                "cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc",
                "mwIDAQAB"
            ].join('');

            const keyBytes = CryptoJS.lib.WordArray.random(32);
            this.privateKey = keyBytes.toString(CryptoJS.enc.Base64);
            console.log('Keys initialized successfully');
        } catch (error) {
            console.error('Error generating keys:', error);
            throw error;
        }
    }

    public async encodePublicKey(): Promise<string> {
        try {
            if (!this.publicKey) {
                throw new Error('Public key not initialized');
            }
            // Return formatted exactly as Interactsh expects
            return `-----BEGIN PUBLIC KEY-----\n${this.publicKey}\n-----END PUBLIC KEY-----`;
        } catch (error) {
            console.error('Error encoding public key:', error);
            throw error;
        }
    }

    public async decryptMessage(key: string, secureMessage: string): Promise<string> {
        try {
            if (!this.privateKey) {
                throw new Error('Private key not initialized');
            }

            const secureMessageWords = CryptoJS.enc.Base64.parse(secureMessage);
            const decryptionKey = CryptoJS.enc.Base64.parse(key);

            // Extract IV (first 16 bytes)
            const ivWords = CryptoJS.lib.WordArray.create(
                secureMessageWords.words.slice(0, 4),
                16
            );

            // Rest is ciphertext
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

            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Error decrypting message:', error);
            throw error;
        }
    }

    public getPrivateKey(): string | null {
        return this.privateKey;
    }

    public getPublicKey(): string | null {
        return this.publicKey;
    }
}

export const cryptoService = new CryptoService();
