import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import { Configuration } from '../../configuration';

describe('Configuration', () => {
    describe('expandPath', () => {
        it('should expand ~/Documents to {homedir}/Documents', () => {
            const result = Configuration.expandPath('~/Documents');
            assert.strictEqual(result, path.join(os.homedir(), 'Documents'));
        });

        it('should expand ~ alone to {homedir}', () => {
            const result = Configuration.expandPath('~');
            assert.strictEqual(result, os.homedir());
        });

        it('should return absolute paths unchanged', () => {
            const result = Configuration.expandPath('/usr/local/bin');
            assert.strictEqual(result, '/usr/local/bin');
        });

        it('should return empty string unchanged', () => {
            const result = Configuration.expandPath('');
            assert.strictEqual(result, '');
        });

        it('should not expand ~ in the middle of a path', () => {
            const result = Configuration.expandPath('/home/~user');
            assert.strictEqual(result, '/home/~user');
        });
    });
});
