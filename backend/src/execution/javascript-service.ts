import { VM } from 'vm2';

interface ExecutionResult {
  output: string;
  status: string;
  time: string;
  memory: string;
}

export const executeJavaScript = (code: string, stdin: string = ''): ExecutionResult => {
  try {
    const vm = new VM({
      timeout: 5000,
      sandbox: {
        console: {
          log: (...args: any[]) => {
            return args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
          }
        }
      }
    });

    const output = vm.run(`
      (function() {
        let __output = [];
        const originalConsoleLog = console.log;
        console.log = function(...args) {
          __output.push(args.join(' '));
        };
        
        try {
          ${code}
        } catch (error) {
          __output.push('Error: ' + error.message);
        }
        
        return __output.join('\\n');
      })()
    `);

    return { 
      output: output || 'No output', 
      status: 'Success', 
      time: '0.00s', 
      memory: '0KB' 
    };
  } catch (error) {
    return { 
      output: `Error: ${error instanceof Error ? error.message : String(error)}`, 
      status: 'Runtime Error',
      time: '0.00s',
      memory: '0KB'
    };
  }
};