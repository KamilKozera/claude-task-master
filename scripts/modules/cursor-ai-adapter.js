/**
 * cursor-ai-adapter.js
 * Adapter to use Cursor's built-in AI instead of Anthropic API
 */

import { CONFIG, log } from './utils.js';
import { startLoadingIndicator, stopLoadingIndicator } from './ui.js';
import fs from 'fs';
import path from 'path';

/**
 * Process task generation by writing prompts to a file for Cursor to process
 * @param {string} prdContent - PRD content
 * @param {string} prdPath - Path to the PRD file
 * @param {number} numTasks - Number of tasks to generate
 * @returns {Object} Generated tasks
 */
async function generateTasksWithCursor(prdContent, prdPath, numTasks) {
  const loadingIndicator = startLoadingIndicator('Generating tasks from PRD...');
  
  try {
    // Create a prompt file for Cursor to process
    const systemPrompt = `You are an AI assistant helping to break down a Product Requirements Document (PRD) into a set of sequential development tasks. 
Your goal is to create ${numTasks} well-structured, actionable development tasks based on the PRD provided.

Each task should follow this JSON structure:
{
  "id": number,
  "title": string,
  "description": string,
  "status": "pending",
  "dependencies": number[] (IDs of tasks this depends on),
  "priority": "high" | "medium" | "low",
  "details": string (implementation details),
  "testStrategy": string (validation approach)
}

Guidelines:
1. Create exactly ${numTasks} tasks, numbered from 1 to ${numTasks}
2. Each task should be atomic and focused on a single responsibility
3. Order tasks logically - consider dependencies and implementation sequence
4. Early tasks should focus on setup, core functionality first, then advanced features
5. Include clear validation/testing approach for each task
6. Set appropriate dependency IDs (a task can only depend on tasks with lower IDs)
7. Assign priority (high/medium/low) based on criticality and dependency order
8. Include detailed implementation guidance in the "details" field

Expected output format:
{
  "tasks": [
    {
      "id": 1,
      "title": "Setup Project Repository",
      "description": "...",
      ...
    },
    ...
  ],
  "metadata": {
    "projectName": "PRD Implementation",
    "totalTasks": ${numTasks},
    "sourceFile": "${prdPath}",
    "generatedAt": "YYYY-MM-DD"
  }
}

Important: Your response must be valid JSON only, with no additional explanation or comments.`;

    const userPrompt = `Here's the Product Requirements Document (PRD) to break down into ${numTasks} tasks:\n\n${prdContent}`;
    
    // Write the prompts to temporary files
    const promptDir = path.join(process.cwd(), 'cursor_prompts');
    if (!fs.existsSync(promptDir)) {
      fs.mkdirSync(promptDir, { recursive: true });
    }
    
    const systemPromptFile = path.join(promptDir, 'system_prompt.txt');
    const userPromptFile = path.join(promptDir, 'user_prompt.txt');
    const responseFile = path.join(promptDir, 'cursor_response.json');
    
    fs.writeFileSync(systemPromptFile, systemPrompt);
    fs.writeFileSync(userPromptFile, userPrompt);
    
    // Instructions for user to process with Cursor
    stopLoadingIndicator(loadingIndicator);
    console.log('\n--------------------------------------------------------------');
    console.log('To generate tasks with Cursor:');
    console.log('1. Open the following files in Cursor:');
    console.log(`   - System prompt: ${systemPromptFile}`);
    console.log(`   - User prompt: ${userPromptFile}`);
    console.log('2. Ask Cursor to generate the tasks based on these prompts');
    console.log('3. Save the response as JSON to:');
    console.log(`   - ${responseFile}`);
    console.log('4. Continue this process when ready');
    console.log('--------------------------------------------------------------\n');
    
    // Wait for user input to continue
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise((resolve) => {
      rl.question('Press Enter once you have saved the Cursor response to continue...', () => {
        rl.close();
        resolve();
      });
    });
    
    // Check if response file exists
    if (!fs.existsSync(responseFile)) {
      throw new Error(`Response file not found: ${responseFile}`);
    }
    
    // Read and parse the response
    const responseText = fs.readFileSync(responseFile, 'utf8');
    return JSON.parse(responseText);
  } catch (error) {
    stopLoadingIndicator(loadingIndicator);
    log('error', `Error generating tasks with Cursor: ${error.message}`);
    throw error;
  }
}

/**
 * Generate subtasks using Cursor
 * @param {Object} task - The task to expand
 * @param {number} numSubtasks - Number of subtasks to generate
 * @param {number} nextSubtaskId - Next subtask ID
 * @param {string} additionalContext - Additional context
 * @returns {Array} Generated subtasks
 */
async function generateSubtasksWithCursor(task, numSubtasks = 3, nextSubtaskId = 1, additionalContext = '') {
  const loadingIndicator = startLoadingIndicator(`Preparing to generate ${numSubtasks} subtasks for task ${task.id}...`);
  
  try {
    // Create prompt for subtask generation
    const systemPrompt = `You are an expert software developer breaking down a development task into smaller subtasks.
    
Task to break down:
Title: ${task.title}
Description: ${task.description}
Details: ${task.details || 'No additional details provided'}

${additionalContext ? `Additional context: ${additionalContext}\n` : ''}

Create exactly ${numSubtasks} subtasks that divide this task into logical, manageable pieces.
Each subtask should follow this JSON format:
{
  "id": number,  // Subtask ID, starting from ${nextSubtaskId}
  "title": string,  // Brief, descriptive title
  "description": string,  // What needs to be done
  "status": "pending",
  "details": string,  // Implementation details and guidance
  "testStrategy": string  // How to verify this subtask is complete
}

Guidelines:
1. Create exactly ${numSubtasks} subtasks, numbered from ${nextSubtaskId} to ${nextSubtaskId + numSubtasks - 1}
2. Each subtask should be atomic and focused
3. Order subtasks logically - earlier subtasks should be prerequisites for later ones
4. Include clear implementation details and testing approach
5. Make sure all aspects of the parent task are covered by the subtasks

Expected output format:
[
  {
    "id": ${nextSubtaskId},
    "title": "First Subtask",
    "description": "...",
    ...
  },
  ...
]

Important: Your response must be valid JSON array only, with no additional explanation or comments.`;

    // Write the prompt to a temporary file
    const promptDir = path.join(process.cwd(), 'cursor_prompts');
    if (!fs.existsSync(promptDir)) {
      fs.mkdirSync(promptDir, { recursive: true });
    }
    
    const promptFile = path.join(promptDir, 'subtask_prompt.txt');
    const responseFile = path.join(promptDir, 'subtask_response.json');
    
    fs.writeFileSync(promptFile, systemPrompt);
    
    // Instructions for user to process with Cursor
    stopLoadingIndicator(loadingIndicator);
    console.log('\n--------------------------------------------------------------');
    console.log('To generate subtasks with Cursor:');
    console.log('1. Open the following file in Cursor:');
    console.log(`   - ${promptFile}`);
    console.log('2. Ask Cursor to generate the subtasks based on this prompt');
    console.log('3. Save the response as JSON to:');
    console.log(`   - ${responseFile}`);
    console.log('4. Continue this process when ready');
    console.log('--------------------------------------------------------------\n');
    
    // Wait for user input to continue
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise((resolve) => {
      rl.question('Press Enter once you have saved the Cursor response to continue...', () => {
        rl.close();
        resolve();
      });
    });
    
    // Check if response file exists
    if (!fs.existsSync(responseFile)) {
      throw new Error(`Response file not found: ${responseFile}`);
    }
    
    // Read and parse the response
    const responseText = fs.readFileSync(responseFile, 'utf8');
    return JSON.parse(responseText);
  } catch (error) {
    stopLoadingIndicator(loadingIndicator);
    log('error', `Error generating subtasks with Cursor: ${error.message}`);
    throw error;
  }
}

/**
 * Analyze task complexity using Cursor
 * @param {Object} task - The task to analyze
 * @returns {Object} Complexity analysis result
 */
async function analyzeTaskComplexityWithCursor(task) {
  const loadingIndicator = startLoadingIndicator(`Preparing complexity analysis for task ${task.id}...`);
  
  try {
    // Create prompt for complexity analysis
    const systemPrompt = `You are an expert software developer analyzing the complexity of a development task.

Task to analyze:
Title: ${task.title}
Description: ${task.description}
Details: ${task.details || 'No additional details provided'}

Analyze this task and provide:
1. A complexity score from 1-10 (where 1 is trivial and 10 is extremely complex)
2. A brief explanation of why you assigned this score
3. Recommended number of subtasks (between 2-6)
4. List of factors contributing to complexity

Expected output format:
{
  "taskId": ${task.id},
  "complexityScore": number,
  "explanation": string,
  "recommendedSubtasks": number,
  "complexityFactors": [
    string,
    string,
    ...
  ]
}

Important: Your response must be valid JSON only, with no additional explanation or comments.`;

    // Write the prompt to a temporary file
    const promptDir = path.join(process.cwd(), 'cursor_prompts');
    if (!fs.existsSync(promptDir)) {
      fs.mkdirSync(promptDir, { recursive: true });
    }
    
    const promptFile = path.join(promptDir, 'complexity_prompt.txt');
    const responseFile = path.join(promptDir, 'complexity_response.json');
    
    fs.writeFileSync(promptFile, systemPrompt);
    
    // Instructions for user to process with Cursor
    stopLoadingIndicator(loadingIndicator);
    console.log('\n--------------------------------------------------------------');
    console.log('To analyze task complexity with Cursor:');
    console.log('1. Open the following file in Cursor:');
    console.log(`   - ${promptFile}`);
    console.log('2. Ask Cursor to analyze the task complexity based on this prompt');
    console.log('3. Save the response as JSON to:');
    console.log(`   - ${responseFile}`);
    console.log('4. Continue this process when ready');
    console.log('--------------------------------------------------------------\n');
    
    // Wait for user input to continue
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise((resolve) => {
      rl.question('Press Enter once you have saved the Cursor response to continue...', () => {
        rl.close();
        resolve();
      });
    });
    
    // Check if response file exists
    if (!fs.existsSync(responseFile)) {
      throw new Error(`Response file not found: ${responseFile}`);
    }
    
    // Read and parse the response
    const responseText = fs.readFileSync(responseFile, 'utf8');
    return JSON.parse(responseText);
  } catch (error) {
    stopLoadingIndicator(loadingIndicator);
    log('error', `Error analyzing task complexity with Cursor: ${error.message}`);
    throw error;
  }
}

/**
 * Generate research-backed content using Cursor
 * @param {string} query - Research query
 * @param {string} context - Additional context
 * @returns {Object} Research results
 */
async function generateResearchWithCursor(query, context = '') {
  const loadingIndicator = startLoadingIndicator(`Preparing research for: ${query}...`);
  
  try {
    // Create prompt for research
    const systemPrompt = `You are an AI research assistant helping a developer with a technical question.
    
Research query: ${query}

${context ? `Additional context: ${context}\n` : ''}

Please conduct detailed research on this topic and provide:
1. A thorough analysis of the question
2. Relevant code examples and implementation approaches
3. Best practices and potential pitfalls
4. Links to relevant documentation (if applicable)
5. A summary of your findings

Expected output format:
{
  "query": "${query}",
  "analysis": string,
  "codeExamples": [
    {
      "language": string,
      "description": string,
      "code": string
    },
    ...
  ],
  "bestPractices": [
    string,
    ...
  ],
  "pitfalls": [
    string,
    ...
  ],
  "documentationLinks": [
    {
      "title": string,
      "url": string,
      "description": string
    },
    ...
  ],
  "summary": string
}

Important: Your response must be valid JSON only, with no additional explanation or comments.`;

    // Write the prompt to a temporary file
    const promptDir = path.join(process.cwd(), 'cursor_prompts');
    if (!fs.existsSync(promptDir)) {
      fs.mkdirSync(promptDir, { recursive: true });
    }
    
    const promptFile = path.join(promptDir, 'research_prompt.txt');
    const responseFile = path.join(promptDir, 'research_response.json');
    
    fs.writeFileSync(promptFile, systemPrompt);
    
    // Instructions for user to process with Cursor
    stopLoadingIndicator(loadingIndicator);
    console.log('\n--------------------------------------------------------------');
    console.log('To generate research with Cursor:');
    console.log('1. Open the following file in Cursor:');
    console.log(`   - ${promptFile}`);
    console.log('2. Ask Cursor to research this topic and respond in the requested format');
    console.log('3. Save the response as JSON to:');
    console.log(`   - ${responseFile}`);
    console.log('4. Continue this process when ready');
    console.log('--------------------------------------------------------------\n');
    
    // Wait for user input to continue
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise((resolve) => {
      rl.question('Press Enter once you have saved the Cursor response to continue...', () => {
        rl.close();
        resolve();
      });
    });
    
    // Check if response file exists
    if (!fs.existsSync(responseFile)) {
      throw new Error(`Response file not found: ${responseFile}`);
    }
    
    // Read and parse the response
    const responseText = fs.readFileSync(responseFile, 'utf8');
    return JSON.parse(responseText);
  } catch (error) {
    stopLoadingIndicator(loadingIndicator);
    log('error', `Error generating research with Cursor: ${error.message}`);
    throw error;
  }
}

// Export the functions
export {
  generateTasksWithCursor as callClaude,
  generateSubtasksWithCursor as generateSubtasks,
  analyzeTaskComplexityWithCursor as analyzeTaskComplexity,
  generateResearchWithCursor as generateResearch
}; 