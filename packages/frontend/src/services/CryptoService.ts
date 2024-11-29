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
            
            this.publicKey = 
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo" +
                "4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u" +
                "+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh" +
                "kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ" +
                "0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg" +
                "cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbcmwIDAQAB";

            const keyBytes = CryptoJS.lib.WordArray.random(32);
            this.privateKey = keyBytes.toString(CryptoJS.enc.Base64);

            console.log('Keys initialized successfully');
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

            // Return the key in proper PEM format
            return `-----BEGIN PUBLIC KEY-----\n${this.publicKey}\n-----END PUBLIC KEY-----`;
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
