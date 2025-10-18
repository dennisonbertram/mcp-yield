import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('stakekit type safety', () => {
  it('status variable should have explicit type annotation', () => {
    // Read the source file
    const filePath = path.resolve(__dirname, '../../src/client/stakekit.ts');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Check for the status variable declaration
    const statusLineMatch = fileContent.match(/const status.*=/);

    expect(statusLineMatch).toBeTruthy();

    // Check that status has an explicit type annotation (: number | undefined)
    const hasExplicitType = fileContent.includes('const status: number | undefined');

    expect(hasExplicitType).toBeTruthy();
  });

  it('should properly check for undefined status before using in Set.has()', () => {
    // Read the source file
    const filePath = path.resolve(__dirname, '../../src/client/stakekit.ts');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Find the line with RETRY_STATUS_CODES.has(status)
    const retryCheckMatch = fileContent.match(/RETRY_STATUS_CODES\.has\(status\)/);

    expect(retryCheckMatch).toBeTruthy();

    // Check that we verify status is not undefined before calling has()
    // Should be: status !== undefined && RETRY_STATUS_CODES.has(status)
    const hasUndefinedCheck = fileContent.includes('status !== undefined && RETRY_STATUS_CODES.has(status)');

    expect(hasUndefinedCheck).toBeTruthy();
  });
});