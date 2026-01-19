/**
 * ESA EdgeRoutine AI Summarization Handler
 * REST API adapter for DashScope
 */

export default {
    async fetch(request, env) {
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        try {
            const data = await request.json();
            const { transcript, credentials } = data;

            if (!transcript || !credentials || !credentials.dashScopeKey) {
                return new Response('Missing required parameters', { status: 400 });
            }

            // Call DashScope API (Mock implementation)
            const summary = await mockDashScopeSummary(transcript, credentials.dashScopeKey);

            return new Response(JSON.stringify(summary), {
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            return new Response(JSON.stringify({
                error: 'Summarization failed',
                message: error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};

async function mockDashScopeSummary(transcript, apiKey) {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
        summary: "会议主要讨论了项目进展和下一步计划。与会者一致同意加快开发进度，并定于下周进行演示。",
        keyPoints: [
            "项目进展顺利但需要加快速度",
            "下周三需完成初步演示demo",
            "需要解决的某个关键技术难点"
        ],
        usage: {
            total_tokens: 150,
            input_tokens: 100,
            output_tokens: 50
        }
    };
}
