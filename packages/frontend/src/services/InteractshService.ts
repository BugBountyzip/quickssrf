const performRegistration = async (payload: any): Promise<boolean> => {
    if (!serverURL.value) throw new Error('Server URL is not defined');
    
    try {
        const url = new URL('/register', serverURL.value.toString()).toString();
        console.log('Registration URL:', url);
        
        // Clean up the public key before sending
        const cleanPayload = {
            'public-key': payload['public-key'].replace(/[\r\n]/g, ''),
            'secret-key': payload['secret-key'],
            'correlation-id': payload['correlation-id']
        };
        
        console.log('Registration payload:', cleanPayload);

        const response = await httpClient.post(url, cleanPayload, {
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
