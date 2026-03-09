// Code parser utility for generating flowcharts from code

export interface CodeElement {
  type: 'function' | 'class' | 'variable' | 'condition' | 'loop' | 'import' | 'comment' | 'start' | 'end' | 'process';
  name: string;
  line: number;
  content: string; // Original line content or relevant snippet
  id: string; // Unique ID for Mermaid node
  children?: CodeElement[]; // For more advanced tree structures (not fully utilized in simple line parsing)
}

export interface ParsedCode {
  elements: CodeElement[];
  flowchart: string;
}

export class CodeParser {
  private language: string;
  private nodeCounter: number = 0; // To generate unique node IDs
  private currentScopeElements: CodeElement[] = []; // To manage elements within a scope (e.g., function body)
  private currentParentId: string | null = null; // To track parent for nested elements
  private braceCount: number = 0; // For C-style languages
  private indentLevel: number = 0; // For Python-style languages

  constructor(language: string) {
    this.language = language.toLowerCase();
    this.resetScope(); // Initialize scope variables
  }

  private resetScope() {
    this.nodeCounter = 0;
    this.currentScopeElements = [];
    this.currentParentId = null;
    this.braceCount = 0;
    this.indentLevel = 0;
  }

  private generateNodeId(prefix: string): string {
    return `${prefix}${this.nodeCounter++}`;
  }

  parse(code: string): ParsedCode {
    this.resetScope(); // Reset for each parse call
    const elements = this.extractElements(code);
    const flowchart = this.generateFlowchart(elements);
    
    return {
      elements,
      flowchart
    };
  }

  private extractElements(code: string): CodeElement[] {
    const lines = code.split('\n');
    const elements: CodeElement[] = [];

    // Add a Start node
    const startNode: CodeElement = {
      type: 'start',
      name: 'Start',
      line: 0,
      content: '',
      id: this.generateNodeId('start')
    };
    elements.push(startNode);
    this.currentScopeElements.push(startNode);
    this.currentParentId = startNode.id;

    for (let i = 0; i < lines.length; i++) {
      const originalLine = lines[i];
      const line = originalLine.trim();
      const lineNumber = i + 1;

      // Handle comments - for now, just classify them, don't put in flowchart structure
      if (line.startsWith('//') || line.startsWith('#') || line.startsWith('/*') || line.startsWith('*')) {
        elements.push({
          type: 'comment',
          name: 'Comment',
          line: lineNumber,
          content: originalLine,
          id: this.generateNodeId('comment')
        });
        continue;
      }

      if (!line) {
        continue; // Skip empty lines for element extraction
      }

      // Determine language and parse specific elements
      switch (this.language) {
        case 'javascript':
        case 'typescript':
          this.parseJavaScriptLine(originalLine, line, lineNumber, elements);
          break;
        case 'python':
          this.parsePythonLine(originalLine, line, lineNumber, elements);
          break;
        case 'java':
          this.parseJavaLine(originalLine, line, lineNumber, elements);
          break;
        case 'cpp':
        case 'c':
          this.parseCppLine(originalLine, line, lineNumber, elements);
          break;
        default:
          // Default parsing for other general statements
          elements.push({
            type: 'process',
            name: `Statement: ${line.substring(0, 20)}...`,
            line: lineNumber,
            content: originalLine,
            id: this.generateNodeId('stmt')
          });
          break;
      }
    }

    // Add an End node if elements exist
    if (elements.length > 0) {
      const endNode: CodeElement = {
        type: 'end',
        name: 'End',
        line: lines.length + 1,
        content: '',
        id: this.generateNodeId('end')
      };
      elements.push(endNode);
    }

    return elements;
  }

  private parseJavaScriptLine(originalLine: string, line: string, lineNumber: number, elements: CodeElement[]) {
    // Function declarations (e.g., function myFunc(), const myFunc = () => {})
    const funcMatch = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*function|\w+\s*=\s*\(\)\s*=>|class\s+(\w+)\s*{)/);
    if (funcMatch) {
        const name = funcMatch[1] || funcMatch[2] || funcMatch[3] || 'Anonymous Function/Class';
        elements.push({ type: 'function', name: name.replace(/\s*\(.*\)/, ''), line: lineNumber, content: originalLine, id: this.generateNodeId('func') });
        return;
    }
    // If statements
    if (line.match(/^if\s*\(/)) {
      const condition = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
      elements.push({ type: 'condition', name: `If (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('if') });
      return;
    }
    // Else if / Else
    if (line.match(/^(else\s+if|else)\s*\(/) || line === 'else') {
      const condition = line.match(/else\s+if\s*\((.*?)\)/)?.[1] || 'Else';
      elements.push({ type: 'condition', name: `Else If (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('elseif') });
      return;
    }
    // For/while loops
    if (line.match(/^(for|while)\s*\(/)) {
      const loopType = line.match(/^(for|while)/)?.[1] || 'Loop';
      const condition = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
      elements.push({ type: 'loop', name: `${loopType} (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('loop') });
      return;
    }
    // Switch statements
    if (line.match(/^switch\s*\(/)) {
      const condition = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
      elements.push({ type: 'condition', name: `Switch (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('switch') });
      return;
    }
    // Import statements
    if (line.match(/^import\s+/) || line.match(/^require\s*\(/)) {
      elements.push({ type: 'import', name: 'Import', line: lineNumber, content: originalLine, id: this.generateNodeId('import') });
      return;
    }
    // Generic statements (process)
    if (line.length > 0) {
      elements.push({ type: 'process', name: line.substring(0, 30), line: lineNumber, content: originalLine, id: this.generateNodeId('stmt') });
    }
  }

  private parsePythonLine(originalLine: string, line: string, lineNumber: number, elements: CodeElement[]) {
    // Indent level for Python (basic check)
    const currentIndent = originalLine.search(/\S|$/); // Find first non-whitespace character

    // Function definitions
    if (line.match(/^def\s+\w+/)) {
      const match = line.match(/def\s+(\w+)/);
      if (match) {
        elements.push({ type: 'function', name: match[1], line: lineNumber, content: originalLine, id: this.generateNodeId('func') });
        this.indentLevel = currentIndent; // Reset indent level for new function scope
        return;
      }
    }
    // Class definitions
    if (line.match(/^class\s+\w+/)) {
      const match = line.match(/class\s+(\w+)/);
      if (match) {
        elements.push({ type: 'class', name: match[1], line: lineNumber, content: originalLine, id: this.generateNodeId('class') });
        this.indentLevel = currentIndent; // Reset indent level for new class scope
        return;
      }
    }
    // If statements
    if (line.match(/^if\s+/)) {
      const condition = line.substring(line.indexOf('if') + 2, line.lastIndexOf(':')).trim();
      elements.push({ type: 'condition', name: `If (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('if') });
      return;
    }
    // Elif / Else
    if (line.match(/^(elif|else)\s*:/)) {
      const type = line.match(/^(elif|else)/)?.[1] || 'Else';
      const condition = type === 'elif' ? line.substring(line.indexOf('elif') + 4, line.lastIndexOf(':')).trim() : '';
      elements.push({ type: 'condition', name: `${type} ${condition ? `(${condition})` : ''}`, line: lineNumber, content: originalLine, id: this.generateNodeId('elif') });
      return;
    }
    // For/while loops
    if (line.match(/^(for|while)\s+/)) {
      const loopType = line.match(/^(for|while)/)?.[1] || 'Loop';
      const condition = line.substring(line.indexOf(loopType) + loopType.length, line.lastIndexOf(':')).trim();
      elements.push({ type: 'loop', name: `${loopType} (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('loop') });
      return;
    }
    // Import statements
    if (line.match(/^(import|from)\s+/)) {
      elements.push({ type: 'import', name: 'Import', line: lineNumber, content: originalLine, id: this.generateNodeId('import') });
      return;
    }
    // Generic statements (process)
    if (line.length > 0 && currentIndent > this.indentLevel) { // Heuristic for being inside a block
      elements.push({ type: 'process', name: line.substring(0, 30), line: lineNumber, content: originalLine, id: this.generateNodeId('stmt') });
    } else if (line.length > 0 && currentIndent <= this.indentLevel && elements.length > 0 && (elements[elements.length -1].type === 'function' || elements[elements.length -1].type === 'class')) {
        // If indent level matches previous function/class or is less, assume it's part of the global scope or a new top-level element
         elements.push({ type: 'process', name: line.substring(0, 30), line: lineNumber, content: originalLine, id: this.generateNodeId('stmt') });
    }
  }

  private parseJavaLine(originalLine: string, line: string, lineNumber: number, elements: CodeElement[]) {
    // Method declarations
    if (line.match(/^\s*(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\(/)) {
      const match = line.match(/(\w+)\s*\(/);
      if (match) {
        elements.push({ type: 'function', name: match[1], line: lineNumber, content: originalLine, id: this.generateNodeId('func') });
        return;
      }
    }
    // Class declarations
    if (line.match(/^class\s+\w+/)) {
      const match = line.match(/class\s+(\w+)/);
      if (match) {
        elements.push({ type: 'class', name: match[1], line: lineNumber, content: originalLine, id: this.generateNodeId('class') });
        return;
      }
    }
    // Interface declarations
    if (line.match(/^interface\s+\w+/)) {
      const match = line.match(/interface\s+(\w+)/);
      if (match) {
        elements.push({ type: 'class', name: `Interface: ${match[1]}`, line: lineNumber, content: originalLine, id: this.generateNodeId('interface') });
        return;
      }
    }
    // If statements
    if (line.match(/^\s*if\s*\(/)) {
      const condition = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
      elements.push({ type: 'condition', name: `If (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('if') });
      return;
    }
    // Else if / Else
    if (line.match(/^\s*(else\s+if|else)\s*\(/) || line === 'else') {
        const condition = line.match(/else\s+if\s*\((.*?)\)/)?.[1] || 'Else';
        elements.push({ type: 'condition', name: `Else If (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('elseif') });
        return;
    }
    // For/while loops
    if (line.match(/^\s*(for|while)\s*\(/)) {
      const loopType = line.match(/(for|while)/)?.[1] || 'Loop';
      const condition = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
      elements.push({ type: 'loop', name: `${loopType} (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('loop') });
      return;
    }
    // Switch statements
    if (line.match(/^\s*switch\s*\(/)) {
      const condition = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
      elements.push({ type: 'condition', name: `Switch (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('switch') });
      return;
    }
    // Import statements
    if (line.match(/^import\s+/)) {
      elements.push({ type: 'import', name: 'Import', line: lineNumber, content: originalLine, id: this.generateNodeId('import') });
      return;
    }
    // Generic statements (process)
    if (line.length > 0) {
      elements.push({ type: 'process', name: line.substring(0, 30), line: lineNumber, content: originalLine, id: this.generateNodeId('stmt') });
    }
  }

  private parseCppLine(originalLine: string, line: string, lineNumber: number, elements: CodeElement[]) {
    // Function declarations
    if (line.match(/^\s*(?:(?:virtual|inline|explicit)\s+)?(?:(?:(?:const|static|extern|friend)\s+)*\w+\s+(?:const\s+)?\*?\s*&?\s*){1,2}\w+\s*\(/)) {
      const match = line.match(/(\w+)\s*\(/);
      if (match) {
        elements.push({ type: 'function', name: match[1], line: lineNumber, content: originalLine, id: this.generateNodeId('func') });
        return;
      }
    }
    // Class declarations
    if (line.match(/^class\s+\w+/)) {
      const match = line.match(/class\s+(\w+)/);
      if (match) {
        elements.push({ type: 'class', name: match[1], line: lineNumber, content: originalLine, id: this.generateNodeId('class') });
        return;
      }
    }
    // Struct declarations
    if (line.match(/^struct\s+\w+/)) {
      const match = line.match(/struct\s+(\w+)/);
      if (match) {
        elements.push({ type: 'class', name: `Struct: ${match[1]}`, line: lineNumber, content: originalLine, id: this.generateNodeId('struct') });
        return;
      }
    }
    // If statements
    if (line.match(/^\s*if\s*\(/)) {
      const condition = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
      elements.push({ type: 'condition', name: `If (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('if') });
      return;
    }
    // Else if / Else
    if (line.match(/^\s*(else\s+if|else)\s*\(/) || line === 'else') {
        const condition = line.match(/else\s+if\s*\((.*?)\)/)?.[1] || 'Else';
        elements.push({ type: 'condition', name: `Else If (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('elseif') });
        return;
    }
    // For/while loops
    if (line.match(/^\s*(for|while)\s*\(/)) {
      const loopType = line.match(/(for|while)/)?.[1] || 'Loop';
      const condition = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
      elements.push({ type: 'loop', name: `${loopType} (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('loop') });
      return;
    }
    // Switch statements
    if (line.match(/^\s*switch\s*\(/)) {
      const condition = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
      elements.push({ type: 'condition', name: `Switch (${condition})`, line: lineNumber, content: originalLine, id: this.generateNodeId('switch') });
      return;
    }
    // Include statements
    if (line.match(/^#include/)) {
      elements.push({ type: 'import', name: 'Include', line: lineNumber, content: originalLine, id: this.generateNodeId('include') });
      return;
    }
    // Generic statements (process)
    if (line.length > 0) {
      elements.push({ type: 'process', name: line.substring(0, 30), line: lineNumber, content: originalLine, id: this.generateNodeId('stmt') });
    }
  }


 private generateFlowchart(elements: CodeElement[]): string {
  if (!elements.length) {
    return 'graph TD\nEmpty["No code found"]';
  }

  let mermaid = 'graph TD\n';

  // Helper to sanitize labels
  const safe = (text: string) =>
    text
      .replace(/"/g, "'")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // 1️⃣ Define nodes
  elements.forEach(el => {
    const label = safe(el.name);

    switch (el.type) {
      case 'start':
      case 'end':
        mermaid += `    ${el.id}(("${label}"))\n`;
        break;

      case 'condition':
        mermaid += `    ${el.id}{"${label}"}\n`;
        break;

      case 'loop':
        mermaid += `    ${el.id}["${label}"]\n`;
        break;

      default:
        mermaid += `    ${el.id}["${label}"]\n`;
    }
  });

  // 2️⃣ Connect flow
  for (let i = 0; i < elements.length - 1; i++) {
    const curr = elements[i];
    const next = elements[i + 1];

    if (curr.type === 'condition') {
      mermaid += `    ${curr.id} -->|Yes| ${next.id}\n`;
      mermaid += `    ${curr.id} -->|No| ${next.id}\n`;
    } 
    else if (curr.type === 'loop') {
      mermaid += `    ${curr.id} --> ${next.id}\n`;
      mermaid += `    ${next.id} --> ${curr.id}\n`;
    } 
    else {
      mermaid += `    ${curr.id} --> ${next.id}\n`;
    }
  }

  return mermaid;
}

}

// Utility function to parse code and generate flowchart directly
export function parseCodeToFlowchart(code: string, language: string): ParsedCode {
  const parser = new CodeParser(language); // Create a new instance each time
  return parser.parse(code);
}

