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

export const useClientService = () => {
    const state: Ref<State> = ref(State.Idle);
    const correlationID: Ref<string | null> = ref(null);
    const secretKey: Ref<string | null> = ref(null);
    const serverURL: Ref<URL | null> = ref(null);
    const token: Ref<string | null> = ref(null);
    let httpClient: AxiosInstance = axios.create({
        timeout: 10000,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });
    const quitPollingFlag: Ref<boolean> = ref(false);
    let correlationIdNonceLength = 13;
    let interactionCallback: ((interaction: any) => void) | null = null;
    let dataHandler: ((interaction: any) => any) | null = null;
    const pollingInterval: Ref<number> = ref(5000);

    const generateRandomID = (length: number): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from(
            { length }, 
            () => chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');
    };

    const performRegistration = async (payload: any): Promise<boolean> => {
        if (!serverURL.value) throw new Error('Server URL is not defined');
        
        try {
            const url = new URL('/register', serverURL.value.toString()).toString();
            console.log('Registration URL:', url);
            console.log('Registration payload:', payload);

            const response = await httpClient.post(url, JSON.stringify(payload), {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200) {
                state.value = State.Idle;
                console.log('Registration successful:', response.data);
                return true;
            }
            throw new Error(`Registration failed with status ${response.status}`);
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const initialize = async (
        options: Options,
        interactionCallbackParam?: (interaction: any) => void,
        dataHandlerParam?: (interaction: any) => any
    ) => {
        try {
            // Basic setup
            httpClient = options.httpClient || axios.create({
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            // Generate IDs and set URLs
            correlationID.value = generateRandomID(options.correlationIdLength || 20);
            secretKey.value = generateRandomID(options.correlationIdNonceLength || 13);
            serverURL.value = new URL(options.serverURL || 'https://oast.site');
            token.value = options.token || uuidv4();
            correlationIdNonceLength = options.correlationIdNonceLength || 13;

            // Set callbacks
            if (interactionCallbackParam) interactionCallback = interactionCallbackParam;
            if (dataHandlerParam) dataHandler = dataHandlerParam;

            // Handle session info if provided
            if (options.sessionInfo) {
                const session = options.sessionInfo;
                token.value = session.token;
                serverURL.value = new URL(session.serverURL);
            }

            // Register with server
            const publicKey = await cryptoService.encodePublicKey();
            const success = await performRegistration({
                'public-key': publicKey,
                'secret-key': secretKey.value,
                'correlation-id': correlationID.value
            });

            if (!success) {
                throw new Error('Failed to register with server');
            }

            // Setup polling if interval provided
            if (options.keepAliveInterval) {
                pollingInterval.value = options.keepAliveInterval;
                startPolling(interactionCallback || defaultInteractionHandler);
            }

            return success;
        } catch (error) {
            console.error('Initialization error:', error);
            throw error;
        }
    };

    const defaultInteractionHandler = (interaction: any) => {
        console.log('Received interaction:', interaction);
    };

    const getInteractions = async (
        callback: (interaction: any) => void,
        dataHandler?: (interaction: any) => any
    ) => {
        if (!correlationID.value || !secretKey.value || !serverURL.value) {
            throw new Error('Client not properly initialized');
        }

        try {
            const url = new URL(
                `/poll?id=${correlationID.value}&secret=${secretKey.value}`,
                serverURL.value.toString()
            ).toString();

            const headers: any = {};
            if (token.value) headers['Authorization'] = token.value;

            const response = await httpClient.get(url, { headers });
            
            if (response.status === 200 && response.data?.data) {
                for (const item of response.data.data) {
                    const plaintext = await cryptoService.decryptMessage(response.data.aes_key, item);
                    let interaction = JSON.parse(plaintext);
                    if (dataHandler) interaction = dataHandler(interaction);
                    callback(interaction);
                }
            }
        } catch (err) {
            console.error('Error polling interactions:', err);
            throw err;
        }
    };

    const startPolling = (callback: (interaction: any) => void) => {
        if (state.value === State.Polling) return;
        
        quitPollingFlag.value = false;
        state.value = State.Polling;

        const pollingLoop = async () => {
            while (!quitPollingFlag.value) {
                try {
                    await getInteractions(callback, dataHandler);
                } catch (err) {
                    console.error('Polling error:', err);
                }
                await new Promise(resolve => setTimeout(resolve, pollingInterval.value));
            }
        };

        pollingLoop();
    };

    const generateUrl = (): string => {
        if (state.value === State.Closed || !correlationID.value || !serverURL.value) {
            throw new Error('Cannot generate URL: client is closed or not initialized');
        }

        const randomData = generateRandomID(correlationIdNonceLength);
        return `${correlationID.value}${randomData}.${serverURL.value.host}`;
    };

    const poll = async () => {
        if (state.value !== State.Polling) {
            throw new Error('Client is not polling');
        }
        await getInteractions(interactionCallback || defaultInteractionHandler, dataHandler);
    };

    const stopPolling = () => {
        if (state.value !== State.Polling) return;
        quitPollingFlag.value = true;
        state.value = State.Idle;
    };

    const close = async () => {
        if (state.value === State.Polling) {
            throw new Error('Stop polling before closing');
        }
        if (state.value === State.Closed) return;

        try {
            if (serverURL.value && correlationID.value && secretKey.value) {
                const url = new URL('/deregister', serverURL.value.toString()).toString();
                await httpClient.post(url, {
                    correlationID: correlationID.value,
                    secretKey: secretKey.value
                });
            }
            state.value = State.Closed;
        } catch (err) {
            console.error('Error closing client:', err);
            throw err;
        }
    };

    return {
        state,
        correlationID,
        secretKey,
        serverURL,
        token,
        initialize,
        performRegistration,
        startPolling,
        stopPolling,
        start: initialize,
        stop: close,
        close,
        generateUrl,
        poll
    };
};
