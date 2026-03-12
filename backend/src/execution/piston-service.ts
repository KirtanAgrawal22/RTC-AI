import axios from 'axios';

const JUDGE0_BASE_URL = 'https://judge0-ce.p.rapidapi.com';

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const executeCode = async (code: string, language: string, stdin: string): Promise<{
  output: string;
  status: string;
  time: string;
  memory: string;
}> => {
  try {
    // Read API key at runtime, not at module load time
    const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
    
    if (!JUDGE0_API_KEY) {
      throw new Error('JUDGE0_API_KEY is not configured. Add it to your .env file');
    }

    const languageId = getLanguageId(language);

    console.log(`[Judge0] Submitting ${language} code (language_id: ${languageId})`);

    // Submit the code
    const submitResponse = await axios.post<{ token: string }>(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=false`,
      {
        source_code: code,
        language_id: languageId,
        stdin: stdin || ''
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': JUDGE0_API_KEY,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      }
    );

    const token = submitResponse.data.token;
    console.log(`[Judge0] Submission token: ${token}`);

    // Poll for results with exponential backoff
    let result: any = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts max

    while (attempts < maxAttempts) {
      await sleep(500 + attempts * 100); // Start with 500ms, increase by 100ms each attempt
      attempts++;

      try {
        const resultResponse = await axios.get(
          `${JUDGE0_BASE_URL}/submissions/${token}?base64_encoded=false`,
          {
            headers: {
              'X-RapidAPI-Key': JUDGE0_API_KEY,
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            }
          }
        );

        result = resultResponse.data;
        console.log(`[Judge0] Status: ${result.status.id} - ${result.status.description}`);

        // Check if execution is complete (status 3 = Accepted, 4 = Wrong Answer, etc.)
        if (result.status.id >= 3) {
          break; // Execution is complete
        }
      } catch (pollError) {
        console.error(`[Judge0] Poll error on attempt ${attempts}:`, pollError);
        if (attempts === maxAttempts) {
          throw pollError;
        }
      }
    }

    if (!result) {
      throw new Error('Failed to get execution result from Judge0');
    }

    const { stdout, stderr, compile_output, time, memory, status } = result;
    const statusId = status.id;

    // Judge0 status codes: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer, 5=Time Limit, 6=Compilation Error, 7=Runtime Error, 8=System Error
    let finalOutput = '';
    let executionStatus = 'Error';

    if (statusId === 3) {
      // Accepted
      finalOutput = stdout || 'Program executed successfully with no output';
      executionStatus = 'Success';
    } else if (statusId === 4) {
      // Wrong Answer
      finalOutput = stdout || 'Wrong Answer';
      executionStatus = 'Error';
    } else if (statusId === 5) {
      // Time Limit Exceeded
      finalOutput = 'Time Limit Exceeded';
      executionStatus = 'Error';
    } else if (statusId === 6) {
      // Compilation Error
      finalOutput = compile_output || 'Compilation Error';
      executionStatus = 'Error';
    } else if (statusId === 7) {
      // Runtime Error
      finalOutput = stderr || 'Runtime Error';
      executionStatus = 'Error';
    } else if (statusId === 8) {
      // System Error
      finalOutput = 'System Error';
      executionStatus = 'Error';
    } else {
      finalOutput = stdout || stderr || compile_output || 'No output';
      executionStatus = 'Success';
    }

    console.log(`[Judge0] Execution complete: ${executionStatus}`);

    return {
      output: finalOutput,
      status: executionStatus,
      time: `${(parseFloat(time) * 1000).toFixed(2)}ms` || '0ms',
      memory: `${memory || 0} KB`
    };
  } catch (error: any) {
    console.error('[Judge0] Error:', error.message);
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    return {
      output: errorMessage,
      status: 'Error',
      time: '0ms',
      memory: '0KB'
    };
  }
};

// Helper function to map languages to Judge0 language IDs
function getLanguageId(language: string): number {
  const ids: { [key: string]: number } = {
    python: 71, // Python 3
    cpp: 54,    // C++ (GCC 9.2.0)
    java: 62,   // Java (OpenJDK 13.0.1)
    c: 50       // C (GCC 9.2.0)
  };
  return ids[language] || 71; // Default to Python
}

// Helper function to map languages to file extensions
function getFileExtension(language: string): string {
  const extensions: { [key: string]: string } = {
    python: 'py',
    cpp: 'cpp',
    java: 'java',
    c: 'c'
  };
  return extensions[language] || 'txt';
}