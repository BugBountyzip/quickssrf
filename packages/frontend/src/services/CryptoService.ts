// CryptoService.ts

export class CryptoService {
    private privateKey: CryptoKey | null = null;
    private publicKey: CryptoKey | null = null;
    private isInitialized: boolean = false;

    constructor() {
        // Initialize is now an asynchronous method
    }

    /**
     * Initialize the cryptographic keys.
     */
    public async initialize(): Promise<void> {
        await this.generateKeys();
        this.isInitialized = true;
        console.log('Keys initialized successfully');
    }

    /**
     * Generate RSA key pair using the Web Crypto API.
     */
    private async generateKeys(): Promise<void> {
        try {
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: 'SHA-256',
                },
                true,
                ['encrypt', 'decrypt']
            );

            this.publicKey = keyPair.publicKey;
            this.privateKey = keyPair.privateKey;
        } catch (error) {
            console.error('Error generating keys:', error);
            throw error;
        }
    }

    /**
     * Encode the public key in PEM format with proper line breaks.
     */
    public async encodePublicKey(): Promise<string> {
        try {
            if (!this.publicKey) {
                throw new Error('Public key not initialized');
            }

            const exported = await window.crypto.subtle.exportKey('spki', this.publicKey);
            const exportedAsBase64 = this.arrayBufferToBase64(exported);
            const formattedKey = this.formatPem(exportedAsBase64, 'PUBLIC KEY');

            return formattedKey;
        } catch (error) {
            console.error('Error encoding public key:', error);
            throw error;
        }
    }

    /**
     * Convert an ArrayBuffer to a Base64-encoded string.
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Format a Base64-encoded string into PEM format.
     */
    private formatPem(base64Key: string, label: string): string {
        const lineLength = 64;
        const regex = new RegExp(`.{1,${lineLength}}`, 'g');
        const lines = base64Key.match(regex) || [];
        const formattedKey = `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
        return formattedKey;
    }

    // Placeholder for the decryptMessage method
    public async decryptMessage(key: string, secureMessage: string): Promise<string> {
        // Implement decryption logic here
        return '';
    }

    public getPrivateKey(): CryptoKey | null {
        return this.privateKey;
    }

    public getPublicKey(): CryptoKey | null {
        return this.publicKey;
    }
}

export const cryptoService = new CryptoService();
