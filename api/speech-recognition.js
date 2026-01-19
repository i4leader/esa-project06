/**
 * ESA EdgeRoutine Speech Recognition Handler
 * REST API adapter for Alibaba Cloud NLS
 */

export default {
    async fetch(request, env) {
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        try {
            // Check authentication
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response('Unauthorized', { status: 401 });
            }

            const token = authHeader.split(' ')[1];

            // Get audio data
            const audioData = await request.arrayBuffer();
            if (!audioData || audioData.byteLength === 0) {
                return new Response('No audio data provided', { status: 400 });
            }

            // Forward to Alibaba Cloud NLS (Mock implementation for now)
            // In production, this would use fetch to call NLS REST API
            const result = await mockNlsTranscription(audioData, token);

            return new Response(JSON.stringify(result), {
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            return new Response(JSON.stringify({
                error: 'Transcription failed',
                message: error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};

async function mockNlsTranscription(audioData, token) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        taskId: Date.now().toString(),
        result: {
            text: "这是一个模拟的语音转文字结果 (REST API)",
            sentences: [
                {
                    text: "这是一个模拟的语音转文字结果",
                    begin_time: 0,
                    end_time: 2000
                }
            ]
        },
        status: 20000000,
        message: "SUCCESS"
    };
}
