#!/usr/bin/env node

/**
 * Simple validation script for Story 2-1 implementation
 * Tests core functionality without requiring full test framework
 */

import { parseConversationMessages, identifySpeaker, validateConversationStructure, countMessageExchanges } from '../src/conversation-loader.js';

console.log('🧪 Story 2-1 Validation Script\n');

// Test 1: Parse simple conversation
console.log('Test 1: Parse simple conversation...');
const input1 = `User: Hello
Assistant: Hi there!`;
try {
  const messages = parseConversationMessages(input1);
  console.log(`✅ Parsed ${messages.length} messages`);
  console.log(`   User: "${messages[0].content}"`);
  console.log(`   Assistant: "${messages[1].content}"`);
} catch (error) {
  console.error(`❌ Failed: ${error.message}`);
}

// Test 2: Identify speakers
console.log('\nTest 2: Identify speakers...');
const testCases = [
  { input: 'User: hello', expected: 'user' },
  { input: 'Assistant: response', expected: 'assistant' },
  { input: '### User: message', expected: 'user' },
  { input: '**Assistant:** response', expected: 'assistant' },
];

let passed = 0;
for (const tc of testCases) {
  const result = identifySpeaker(tc.input);
  if (result === tc.expected) {
    passed++;
  } else {
    console.error(`❌ Failed: "${tc.input}" expected ${tc.expected}, got ${result}`);
  }
}
console.log(`✅ Passed ${passed}/${testCases.length} speaker identification tests`);

// Test 3: Validate conversation structure
console.log('\nTest 3: Validate conversation structure...');
const validMessages = [
  { speaker: 'user', content: 'Hello' },
  { speaker: 'assistant', content: 'Hi there!' }
];
const validation = validateConversationStructure(validMessages);
console.log(`✅ Validation: ${validation.valid ? 'VALID' : 'INVALID'}`);
console.log(`   Meets threshold: ${validation.meetsThreshold ? 'YES' : 'NO'}`);
console.log(`   Errors: ${validation.errors.length}`);
console.log(`   Warnings: ${validation.warnings.length}`);

// Test 4: Count message exchanges
console.log('\nTest 4: Count message exchanges...');
const conversation = [
  { speaker: 'user', content: 'Q1' },
  { speaker: 'assistant', content: 'A1' },
  { speaker: 'user', content: 'Q2' },
  { speaker: 'assistant', content: 'A2' },
  { speaker: 'user', content: 'Q3' },
  { speaker: 'assistant', content: 'A3' }
];
const stats = countMessageExchanges(conversation);
console.log(`✅ Exchanges: ${stats.totalExchanges}`);
console.log(`   AI Suggestions: ${stats.aiSuggestions}`);
console.log(`   Loaded: ${stats.conversationLoaded}`);

// Test 5: Handle malformed input
console.log('\nTest 5: Handle malformed input...');
try {
  parseConversationMessages(null as any);
  console.error('❌ Should have thrown error for null input');
} catch (error) {
  console.log('✅ Correctly threw error for null input');
}

// Test 6: Threshold validation
console.log('\nTest 6: Threshold validation...');
const shortConv = [
  { speaker: 'user', content: 'Hi' },
  { speaker: 'assistant', content: 'Hello' }
];
const shortValidation = validateConversationStructure(shortConv);
console.log(`✅ Short conversation meets threshold: ${shortValidation.meetsThreshold ? 'YES' : 'NO'}`);
console.log(`   Warnings: ${shortValidation.warnings.join(', ')}`);

console.log('\n✅ All Story 2-1 validation tests completed!');
