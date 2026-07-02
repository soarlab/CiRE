// Copyright (c) 2026, Compiler Explorer Authors
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import {BaseCompiler} from '../base-compiler.js';
import {CompilationEnvironment} from '../compilation-env.js';
import type {ParseFiltersAndOutputOptions} from '../../types/features/filters.interfaces.js';
import {PreliminaryCompilerInfo} from '../../types/compiler.interfaces.js';
import type {ConfiguredOverrides} from '../../types/compilation/compilation.interfaces.js';
import type {SelectedLibraryVersion} from '../../types/libraries/libraries.interfaces.js';
import {ClangParser} from './argument-parsers.js';
import {splitLines} from '../utils.js';

export class AliveCompiler extends BaseCompiler {
    static get key() {
        return 'alive';
    }

    constructor(compilerInfo: PreliminaryCompilerInfo, env: CompilationEnvironment) {
        super(compilerInfo, env);
        this.compiler.supportsBinary = false;
        this.compiler.supportsExecute = false;
    }

    override optionsForFilter(_filters: ParseFiltersAndOutputOptions, outputFilename: string) {
        return ['>', this.filename(outputFilename)];
    }

    override prepareArguments(
        userOptions: string[],
        _filters: ParseFiltersAndOutputOptions,
        _backendOptions: Record<string, any>,
        inputFilename: string,
        outputFilename: string,
        _libraries: SelectedLibraryVersion[],
        _overrides: ConfiguredOverrides,
    ) {
        return userOptions.concat(inputFilename, '--smt-to=50000', '-o', outputFilename);
    }

    override getArgumentParserClass() {
        return ClangParser;
    }

    override async processAsm(result: {asm: string | {text: string}[]}) {
        const asmValue = result.asm;
        const asmText =
            typeof asmValue === 'string'
                ? asmValue
                : Array.isArray(asmValue)
                    ? asmValue.map(line => line.text).join('\n')
                    : '';
        return {
            asm: splitLines(asmText).map(text => ({text, source: {line: null, file: null}})),
            labelDefinitions: {},
        };
    }
}
