// InteractshService.ts

import axios, { AxiosInstance } from 'axios';
import { ref, Ref } from 'vue';
import { cryptoService } from '@/services/CryptoService';
import { v4 as uuidv4 } from 'uuid';

enum State {
    Idle,
    Polling,
    Closed,
}

interface Options {
    serverURL?: string;
    token?: string;
    disableHTTPFallback?: boolean;
    correlationIdLength?: number;
    correlationIdNonceLength?: number;
    httpClient?: AxiosInstance;
    sessionInfo?: SessionInfo;
    keepAliveInterval?: number;
}

interface SessionInfo {
    serverURL: string;
    token: string;
    privateKey: string;
    correlationID: string;
    secretKey: string;
    publicKey?: string;
}

export async function useClientService() {
    const state: Ref<State> = ref(State.Idle);
    const correlationID: Ref<string | null> = ref(null);
    const secretKey: Ref<string | null> = ref(null);
    const serverURL: Ref<URL | null> = ref(null);
    const token: Ref<string | null> = ref(null);
    let httpClient: AxiosInstance = axios.create({
        timeout: 10000,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    });
    const quitPollingFlag: Ref<boolean> = ref(false);
    let correlationIdNonceLength = 13;
    let interactionCallback: ((interaction: any) => void) | null = null;
    let dataHandler: ((interaction: any) => any) | null = null;
    const pollingInterval: Ref<number> = ref(5000);

    const generateRandomID = (length: number): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    };

    const performRegistration = async (payload: any): Promise<boolean> => {
        if (!serverURL.value) throw new Error('Server URL is not defined');

        try {
            const url = new URL('/register', serverURL.value.toString()).toString();
            console.log('Registration URL:', url);

            // Do not remove newlines from the public key
            const cleanPayload = {
                'public-key': payload['public-key'],
                'secret-key': payload['secret-key'],
                'correlation-id': payload['correlation-id'],
            };

            console.log('Registration payload:', 
