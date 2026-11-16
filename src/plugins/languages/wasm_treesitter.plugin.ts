/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-Node WebAssembly Tree-Sitter CST port with singleton WebAssembly.Module cache per language.
 */
import { detectLanguageFromPath, parseSourceFile, type FileParseAnalysis } from '@core/ast/parsers';
import { SCANNER_MODES, type ScannerMode, type SupportedLanguage } from '@config/metamodel.constants';

export interface AstScannerPort {
	readonly mode: ScannerMode;
	readonly isWasmReady: boolean;
	readonly cachedLanguageCount: number;
	readonly loadGrammarWasm: (language: SupportedLanguage, wasmUrlOrBytes: string | ArrayBuffer) => Promise<boolean>;
	readonly createWorkerInstance: (language: SupportedLanguage) => WebAssembly.Instance | null;
	readonly scanFile: (filePath: string, sourceCode: string) => FileParseAnalysis;
}

const singletonWasmModuleCache = new Map<SupportedLanguage, WebAssembly.Module>();

export function getCachedWasmModule(language: SupportedLanguage): WebAssembly.Module | undefined {
	return singletonWasmModuleCache.get(language);
}

export function createAstScannerAdapter(
	preferredMode: ScannerMode = SCANNER_MODES.FAST_LEXICAL
): AstScannerPort {
	let activeMode: ScannerMode = preferredMode;

	return {
		get mode(): ScannerMode {
			return activeMode;
		},
		get isWasmReady(): boolean {
			return singletonWasmModuleCache.size > 0;
		},
		get cachedLanguageCount(): number {
			return singletonWasmModuleCache.size;
		},
		async loadGrammarWasm(language: SupportedLanguage, wasmUrlOrBytes: string | ArrayBuffer): Promise<boolean> {
			if (!wasmUrlOrBytes) return false;
			if (singletonWasmModuleCache.has(language)) {
				activeMode = SCANNER_MODES.WASM_CST;
				return true;
			}
			try {
				const bytes =
					typeof wasmUrlOrBytes === 'string'
						? await (await fetch(wasmUrlOrBytes)).arrayBuffer()
						: wasmUrlOrBytes;
				const compiledModule = await WebAssembly.compile(bytes);
				singletonWasmModuleCache.set(language, compiledModule);
				new WebAssembly.Instance(compiledModule, {});
				activeMode = SCANNER_MODES.WASM_CST;
				return true;
			} catch {
				activeMode = SCANNER_MODES.FAST_LEXICAL;
				return false;
			}
		},
		createWorkerInstance(language: SupportedLanguage): WebAssembly.Instance | null {
			const cachedModule = singletonWasmModuleCache.get(language);
			if (!cachedModule) return null;
			try {
				return new WebAssembly.Instance(cachedModule, {});
			} catch {
				return null;
			}
		},
		scanFile(filePath: string, sourceCode: string): FileParseAnalysis {
			const lang = detectLanguageFromPath(filePath);
			if (activeMode === SCANNER_MODES.WASM_CST && singletonWasmModuleCache.has(lang)) {
				this.createWorkerInstance(lang);
			}
			return parseSourceFile(filePath, sourceCode);
		},
	};
}
