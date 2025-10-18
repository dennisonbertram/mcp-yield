import { describe, it, expect } from 'vitest';
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('Error Handling', () => {
  const srcDir = path.resolve(__dirname, '../src');
  const indexPath = path.join(srcDir, 'index.ts');
  const httpPath = path.join(srcDir, 'http.ts');

  describe('index.ts startup error handling', () => {
    it('should have a .catch() handler on start() call', () => {
      // Read the index.ts file
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Check if start() has a .catch() handler
      // Looking for: start().catch(...)
      const hasCatchHandler = /start\(\)\.catch\(/m.test(indexContent);

      // This test will FAIL initially (RED phase)
      expect(hasCatchHandler).toBe(true);
    });

    it('should log fatal error and exit with code 1 on startup failure', () => {
      // Read the index.ts file
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Check for proper error handling in catch block
      const hasFatalErrorLog = /Fatal error during startup/i.test(indexContent);
      const hasProcessExit = /process\.exit\(1\)/m.test(indexContent);

      // These will FAIL initially in RED phase
      expect(hasFatalErrorLog).toBe(true);
      expect(hasProcessExit).toBe(true);
    });
  });

  describe('Global error handlers in index.ts', () => {
    it('should have unhandledRejection handler', () => {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Check for unhandledRejection handler
      const hasUnhandledRejection = /process\.on\(['"]unhandledRejection['"]/m.test(indexContent);

      // This will FAIL initially (RED phase)
      expect(hasUnhandledRejection).toBe(true);
    });

    it('should have uncaughtException handler', () => {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Check for uncaughtException handler
      const hasUncaughtException = /process\.on\(['"]uncaughtException['"]/m.test(indexContent);

      // This will FAIL initially (RED phase)
      expect(hasUncaughtException).toBe(true);
    });

    it('unhandledRejection handler should log and exit', () => {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Extract the unhandledRejection handler code - match until the closing });
      const unhandledMatch = indexContent.match(/process\.on\(['"]unhandledRejection['"],[\s\S]*?\n\}\);/m);

      if (unhandledMatch) {
        const handlerCode = unhandledMatch[0];
        // Check it logs the error
        expect(handlerCode).toContain('logger.error');
        expect(handlerCode).toContain('Unhandled rejection');
        // Check it exits with code 1
        expect(handlerCode).toContain('process.exit(1)');
      } else {
        // Will fail if handler doesn't exist
        expect(unhandledMatch).toBeTruthy();
      }
    });

    it('uncaughtException handler should log and exit', () => {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Extract the uncaughtException handler code - match until the closing });
      const uncaughtMatch = indexContent.match(/process\.on\(['"]uncaughtException['"],[\s\S]*?\n\}\);/m);

      if (uncaughtMatch) {
        const handlerCode = uncaughtMatch[0];
        // Check it logs the error
        expect(handlerCode).toContain('logger.error');
        expect(handlerCode).toContain('Uncaught exception');
        // Check it exits with code 1
        expect(handlerCode).toContain('process.exit(1)');
      } else {
        // Will fail if handler doesn't exist
        expect(uncaughtMatch).toBeTruthy();
      }
    });
  });

  describe('Global error handlers in http.ts', () => {
    it('should have unhandledRejection handler', () => {
      const httpContent = fs.readFileSync(httpPath, 'utf-8');

      // Check for unhandledRejection handler
      const hasUnhandledRejection = /process\.on\(['"]unhandledRejection['"]/m.test(httpContent);

      // This will FAIL initially (RED phase)
      expect(hasUnhandledRejection).toBe(true);
    });

    it('should have uncaughtException handler', () => {
      const httpContent = fs.readFileSync(httpPath, 'utf-8');

      // Check for uncaughtException handler
      const hasUncaughtException = /process\.on\(['"]uncaughtException['"]/m.test(httpContent);

      // This will FAIL initially (RED phase)
      expect(hasUncaughtException).toBe(true);
    });
  });
});