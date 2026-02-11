import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EpubCheckRunner } from '../../epubcheckRunner';

// Access private static methods for testing
const Runner = EpubCheckRunner as any;

describe('EpubCheckRunner', () => {
    describe('getDefaultEpubPath', () => {
        it('should return sibling .epub path for a directory', () => {
            const result = EpubCheckRunner.getDefaultEpubPath('/path/to/my-book');
            assert.strictEqual(result, path.join('/path/to', 'my-book.epub'));
        });

        it('should handle root-level directory', () => {
            const result = EpubCheckRunner.getDefaultEpubPath('/my-book');
            assert.strictEqual(result, path.join('/', 'my-book.epub'));
        });
    });

    describe('getUniquePath', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epubcheck-test-'));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should return the path as-is if file does not exist', () => {
            const filePath = path.join(tmpDir, 'book.epub');
            assert.strictEqual(Runner.getUniquePath(filePath), filePath);
        });

        it('should return book (2).epub if book.epub exists', () => {
            const filePath = path.join(tmpDir, 'book.epub');
            fs.writeFileSync(filePath, '');
            assert.strictEqual(
                Runner.getUniquePath(filePath),
                path.join(tmpDir, 'book (2).epub')
            );
        });

        it('should return book (3).epub if book.epub and book (2).epub exist', () => {
            const filePath = path.join(tmpDir, 'book.epub');
            fs.writeFileSync(filePath, '');
            fs.writeFileSync(path.join(tmpDir, 'book (2).epub'), '');
            assert.strictEqual(
                Runner.getUniquePath(filePath),
                path.join(tmpDir, 'book (3).epub')
            );
        });
    });

    describe('protectExistingEpub', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epubcheck-test-'));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should rename existing file and return temp path', () => {
            const epubPath = path.join(tmpDir, 'book.epub');
            fs.writeFileSync(epubPath, 'original');

            const protectedPath = Runner.protectExistingEpub(epubPath);

            assert.ok(protectedPath);
            assert.ok(fs.existsSync(protectedPath));
            assert.ok(!fs.existsSync(epubPath));
            assert.strictEqual(fs.readFileSync(protectedPath, 'utf-8'), 'original');
        });

        it('should return undefined if file does not exist', () => {
            const epubPath = path.join(tmpDir, 'nonexistent.epub');
            assert.strictEqual(Runner.protectExistingEpub(epubPath), undefined);
        });

        it('should return undefined if path is undefined', () => {
            assert.strictEqual(Runner.protectExistingEpub(undefined), undefined);
        });
    });

    describe('restoreProtectedEpub', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epubcheck-test-'));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should restore to target path when target is free', () => {
            const protectedPath = path.join(tmpDir, '.protected.epub');
            const targetPath = path.join(tmpDir, 'book.epub');
            fs.writeFileSync(protectedPath, 'original');

            Runner.restoreProtectedEpub(protectedPath, targetPath);

            assert.ok(fs.existsSync(targetPath));
            assert.ok(!fs.existsSync(protectedPath));
            assert.strictEqual(fs.readFileSync(targetPath, 'utf-8'), 'original');
        });

        it('should restore to unique name when target is occupied', () => {
            const protectedPath = path.join(tmpDir, '.protected.epub');
            const targetPath = path.join(tmpDir, 'book.epub');
            fs.writeFileSync(protectedPath, 'original');
            fs.writeFileSync(targetPath, 'new version');

            Runner.restoreProtectedEpub(protectedPath, targetPath);

            // Original target unchanged
            assert.strictEqual(fs.readFileSync(targetPath, 'utf-8'), 'new version');
            // Protected file restored to unique path
            const restoredPath = path.join(tmpDir, 'book (2).epub');
            assert.ok(fs.existsSync(restoredPath));
            assert.strictEqual(fs.readFileSync(restoredPath, 'utf-8'), 'original');
        });

        it('should do nothing when protectedPath is undefined', () => {
            const targetPath = path.join(tmpDir, 'book.epub');
            // Should not throw
            Runner.restoreProtectedEpub(undefined, targetPath);
        });
    });

    describe('findGeneratedEpub', () => {
        let tmpDir: string;
        let epubDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epubcheck-test-'));
            epubDir = path.join(tmpDir, 'my-book');
            fs.mkdirSync(epubDir);
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should move epub from inside dir to target (sibling) path', () => {
            const insidePath = path.join(epubDir, 'my-book.epub');
            const targetPath = path.join(tmpDir, 'my-book.epub');
            fs.writeFileSync(insidePath, 'generated');

            const result = Runner.findGeneratedEpub(epubDir, targetPath, undefined);

            assert.strictEqual(result, targetPath);
            assert.ok(fs.existsSync(targetPath));
            assert.ok(!fs.existsSync(insidePath));
        });

        it('should return target path when epub is already at sibling', () => {
            const targetPath = path.join(tmpDir, 'my-book.epub');
            fs.writeFileSync(targetPath, 'generated');

            const result = Runner.findGeneratedEpub(epubDir, targetPath, undefined);

            assert.strictEqual(result, targetPath);
        });

        it('should return undefined when no epub was generated', () => {
            const targetPath = path.join(tmpDir, 'my-book.epub');
            const result = Runner.findGeneratedEpub(epubDir, targetPath, undefined);
            assert.strictEqual(result, undefined);
        });

        it('should return undefined when targetPath is undefined', () => {
            const result = Runner.findGeneratedEpub(epubDir, undefined, undefined);
            assert.strictEqual(result, undefined);
        });
    });
});
