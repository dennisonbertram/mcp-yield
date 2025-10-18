import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('yields input validation', () => {
  it('toListParams should not accept arbitrary unknown parameters', () => {
    // Read the source file
    const filePath = path.resolve(__dirname, '../../src/tools/yields.ts');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Check for the toListParams function signature
    const toListParamsMatch = fileContent.match(/const toListParams = \((.*?)\) =>/);

    expect(toListParamsMatch).toBeTruthy();

    // The function should NOT accept Record<string, unknown>
    // It should only accept z.infer<typeof paginationSchema>
    const hasRecordUnknown = toListParamsMatch![1].includes('Record<string, unknown>');

    expect(hasRecordUnknown).toBeFalsy();
  });

  it('toListParams should have proper type signature for validated params only', () => {
    // Read the source file
    const filePath = path.resolve(__dirname, '../../src/tools/yields.ts');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Check that toListParams only accepts paginationSchema inferred type
    const correctSignature = fileContent.includes('const toListParams = (args: z.infer<typeof paginationSchema>)');

    expect(correctSignature).toBeTruthy();
  });

  it('params object should have proper type annotation', () => {
    // Read the source file
    const filePath = path.resolve(__dirname, '../../src/tools/yields.ts');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Find the params declaration inside toListParams
    const paramsMatch = fileContent.match(/const params: (.*?) = \{\}/);

    expect(paramsMatch).toBeTruthy();

    // Should not be Record<string, unknown>, should be specific
    const hasUnknownType = paramsMatch![1].includes('unknown');

    expect(hasUnknownType).toBeFalsy();

    // Should have specific type like Record<string, string | number>
    const hasSpecificType = paramsMatch![1].includes('Record<string, string | number>');

    expect(hasSpecificType).toBeTruthy();
  });

  it('offset validation should ensure non-negative numbers', () => {
    // Read the source file
    const filePath = path.resolve(__dirname, '../../src/tools/yields.ts');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Find offset handling code
    const offsetHandling = fileContent.match(/if \(args\.offset.*?\) \{[\s\S]*?\}/);

    expect(offsetHandling).toBeTruthy();

    // Should check that offset is a valid non-negative number
    const hasTypeCheck = offsetHandling![0].includes('typeof args.offset === \'number\'');
    const hasNonNegativeCheck = offsetHandling![0].includes('>= 0');

    expect(hasTypeCheck).toBeTruthy();
    expect(hasNonNegativeCheck).toBeTruthy();
  });
});