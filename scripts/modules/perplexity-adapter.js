/**
 * perplexity-adapter.js
 * Adapter to replace Perplexity API with Cursor for research-backed features
 */

import { CONFIG, log } from './utils.js';
import { generateResearch } from './cursor-ai-adapter.js';

/**
 * Generate subtasks with research using Cursor
 * @param {Object} task - The task to expand
 * @param {number} numSubtasks - Number of subtasks to generate
 * @param {number} nextSubtaskId - Next subtask ID
 * @param {string} additionalContext - Additional context
 * @returns {Array} Generated subtasks
 */
async function generateSubtasksWithResearch(task, numSubtasks = 3, nextSubtaskId = 1, additionalContext = '') {
  try {
    log('info', `Generating research for task ${task.id} to help with subtask creation...`);
    
    // First, conduct research on the task
    const researchQuery = `Research best practices, implementation approaches, and technical considerations for: ${task.title} - ${task.description}`;
    const researchResult = await generateResearch(researchQuery, task.details);
    
    // Then use research to inform subtask generation
    const enhancedContext = `
Based on research findings:
${researchResult.analysis}

Best practices to consider:
${researchResult.bestPractices.join('\n')}

Potential implementation approaches:
${researchResult.codeExamples.map(ex => `- ${ex.description}`).join('\n')}

${additionalContext ? `\nAdditional context provided: ${additionalContext}` : ''}
`;
    
    // Use the standard subtask generator with enhanced context
    const { generateSubtasks } = await import('./cursor-ai-adapter.js');
    return await generateSubtasks(task, numSubtasks, nextSubtaskId, enhancedContext);
  } catch (error) {
    log('error', `Error generating research-backed subtasks: ${error.message}`);
    throw error;
  }
}

/**
 * Analyze task complexity with research using Cursor
 * @param {Object} task - The task to analyze
 * @returns {Object} Complexity analysis result
 */
async function analyzeTaskComplexityWithResearch(task) {
  try {
    log('info', `Researching complexity factors for task ${task.id}...`);
    
    // Conduct research on the task complexity
    const researchQuery = `Analyze implementation complexity factors for: ${task.title} - ${task.description}`;
    const researchResult = await generateResearch(researchQuery, task.details);
    
    // Use the research to create an enhanced prompt for complexity analysis
    const enhancedTask = {
      ...task,
      details: `
${task.details || 'No details provided'}

Research-based complexity considerations:
${researchResult.analysis}

Technical factors:
${researchResult.bestPractices.join('\n')}

Implementation challenges:
${researchResult.pitfalls.join('\n')}
`
    };
    
    // Use the standard complexity analyzer with enhanced task info
    const { analyzeTaskComplexity } = await import('./cursor-ai-adapter.js');
    return await analyzeTaskComplexity(enhancedTask);
  } catch (error) {
    log('error', `Error analyzing task complexity with research: ${error.message}`);
    throw error;
  }
}

export { 
  generateSubtasksWithResearch,
  analyzeTaskComplexityWithResearch
}; 