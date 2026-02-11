import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EpubDetector } from '../../epubDetector';

describe('EpubDetector', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epubcheck-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    describe('isEpubDirectory', () => {
        it('should return true for a directory with valid mimetype', () => {
            fs.writeFileSync(path.join(tmpDir, 'mimetype'), 'application/epub+zip');
            assert.strictEqual(EpubDetector.isEpubDirectory(tmpDir), true);
        });

        it('should return false for a directory with wrong mimetype content', () => {
            fs.writeFileSync(path.join(tmpDir, 'mimetype'), 'text/plain');
            assert.strictEqual(EpubDetector.isEpubDirectory(tmpDir), false);
        });

        it('should return false for a directory without mimetype file', () => {
            assert.strictEqual(EpubDetector.isEpubDirectory(tmpDir), false);
        });

        it('should return true when mimetype has surrounding whitespace', () => {
            fs.writeFileSync(path.join(tmpDir, 'mimetype'), '  application/epub+zip  \n');
            assert.strictEqual(EpubDetector.isEpubDirectory(tmpDir), true);
        });
    });
});
