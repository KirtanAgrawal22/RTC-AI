interface ExecutionResult {
  output: string;
  status: string;
  time: string;
  memory: string;
}

interface PistonResponse {
  run: {
    output: string;
    stderr: string;
    code: number;
    signal: string | null;
    time: string;
    memory: number;
  };
  compile?: {
    output: string;
    stderr: string;
    code: number;
    signal: string | null;
    time: string;
    memory: number;
  };
}

export const executeCode = async (code: string, language: string, stdin: string = ''): Promise<ExecutionResult> => {
  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: language,
        version: getLanguageVersion(language),
        files: [{ content: code }],
        stdin: stdin
      })
    });

    if (!response.ok) {
      throw new Error(`Piston API error: ${response.statusText}`);
    }

    const data = await response.json() as PistonResponse;
    
    const output = data.run.output || data.run.stderr || 
                  (data.compile ? data.compile.output || data.compile.stderr : '') || 
                  'No output';
    
    return {
      output: output.trim(),
      status: data.run.signal ? 'Signaled' : 'Success',
      time: data.run.time ? `${parseFloat(data.run.time).toFixed(2)}s` : '0.00s',
      memory: data.run.memory ? `${data.run.memory}KB` : '0KB'
    };
  } catch (error) {
    return {
      output: `API Error: ${error instanceof Error ? error.message : String(error)}`,
      status: 'Error',
      time: '0.00s',
      memory: '0KB'
    };
  }
};

const getLanguageVersion = (language: string): string => {
  const versions: { [key: string]: string } = {
    'python': '3.10.0',
    'javascript': '18.15.0',
    'typescript': '5.0.3',
    'cpp': '10.2.0',
    'c': '10.2.0',
    'java': '15.0.2',
    'rust': '1.68.2',
    'go': '1.16.2',
    'ruby': '3.0.1',
    'php': '8.2.3',
    'swift': '5.3.3',
    'csharp': '6.12.0',
    'kotlin': '1.7.20'
  };
  
  return versions[language] || 'latest';
};