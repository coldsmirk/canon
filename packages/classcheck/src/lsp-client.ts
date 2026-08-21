import type { ChildProcess } from "node:child_process";

import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

/**
 * A published diagnostic, narrowed to the fields the gate reads.
 */
export interface LspDiagnostic {
  range: { start: { line: number; character: number } };
  message: string;
  code?: string | number;
}

interface LspInbound {
  id?: number;
  method?: string;
  params?: {
    uri?: string;
    diagnostics?: LspDiagnostic[];
    items?: Array<{ section?: string }>;
  };
  result?: unknown;
}

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export interface LspClientOptions {
  /**
   * Path to the language server's bin script; it is run with the current Node executable.
   */
  serverBin: string;
  /**
   * Workspace root the server is initialized on (the lint cwd).
   */
  rootDir: string;
  /**
   * Settings served back whenever the server pulls `workspace/configuration`.
   */
  settings: Record<string, unknown>;
}

/**
 * An individual request that never answers must fail the run, not hang it.
 */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * A minimal LSP client over stdio — just the slice of the protocol the gate needs: initialize,
 * document sync, hover, and published diagnostics. Hand-rolled rather than pulling in a JSON-RPC
 * library: the framing is ~30 lines, and owning it keeps the failure modes (server crash, silent
 * hang) explicit and testable.
 */
export class LspClient {
  private readonly server: ChildProcess;
  private readonly settings: Record<string, unknown>;
  private readonly rootDir: string;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly diagnostics = new Map<string, LspDiagnostic[]>();
  private readonly openVersions = new Map<string, number>();
  private buffer = Buffer.alloc(0);
  private nextId = 0;
  private exitError: Error | null = null;

  constructor(options: LspClientOptions) {
    this.settings = options.settings;
    this.rootDir = options.rootDir;
    this.server = spawn(process.execPath, [options.serverBin, "--stdio"], {
      stdio: ["pipe", "pipe", "inherit"]
    });
    this.server.stdout?.on("data", (chunk: Buffer) => this.receive(chunk));
    // Without this a crashed server leaves every pending request unsettled and later waits spin
    // forever — the gate must fail loudly instead.
    this.server.on("exit", code => this.fail(new Error(`the language server exited unexpectedly (code ${code})`)));
  }

  private request(method: string, params: unknown): Promise<unknown> {
    if (this.exitError) {
      return Promise.reject(this.exitError);
    }

    const id = ++this.nextId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`the language server did not answer \`${method}\` within ${REQUEST_TIMEOUT_MS}ms`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        resolve,
        reject,
        timer
      });
      this.send({
        id,
        method,
        params
      });
    });
  }

  private notify(method: string, params: unknown): void {
    this.send({ method, params });
  }

  private send(message: Record<string, unknown>): void {
    const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", ...message }), "utf-8");

    this.server.stdin?.write(`Content-Length: ${body.length}\r\n\r\n`);
    this.server.stdin?.write(body);
  }

  private receive(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (;;) {
      const head = this.buffer.indexOf("\r\n\r\n");

      if (head === -1) {
        return;
      }

      const length = Number(/content-length: (?<length>\d+)/i.exec(this.buffer.subarray(0, head).toString("utf-8"))?.groups?.length);

      if (this.buffer.length < head + 4 + length) {
        return;
      }

      const message = JSON.parse(this.buffer.subarray(head + 4, head + 4 + length).toString("utf-8")) as LspInbound;

      this.buffer = this.buffer.subarray(head + 4 + length);
      this.dispatch(message);
    }
  }

  private dispatch(message: LspInbound): void {
    if (message.method === "textDocument/publishDiagnostics") {
      if (message.params?.uri) {
        this.diagnostics.set(message.params.uri, message.params.diagnostics ?? []);
      }
    } else if (message.method === "workspace/configuration") {
      // v0.16 pulls its settings this way; ignoring the request means the run silently uses
      // defaults — the wrong stylesheet root and a useless report.
      this.send({ id: message.id, result: (message.params?.items ?? []).map(item => this.settings[item.section ?? ""] ?? {}) });
    } else if (message.id !== undefined && message.method) {
      // registerCapability and friends: acknowledge, nothing to do.
      this.send({ id: message.id, result: null });
    } else if (message.id !== undefined) {
      const entry = this.pending.get(message.id);

      if (entry) {
        clearTimeout(entry.timer);
        this.pending.delete(message.id);
        entry.resolve(message.result);
      }
    }
  }

  private fail(error: Error): void {
    this.exitError = error;

    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(error);
    }

    this.pending.clear();
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(this.rootDir).href,
      workspaceFolders: [{ uri: pathToFileURL(this.rootDir).href, name: "classcheck" }],
      // `testMode` is the server's own headless switch: it drops the 500ms validation debounce to
      // zero. That debounce is one timer shared by the whole project, so without this every
      // document opened before the last one is simply never validated — a run that reports
      // nothing and looks like a pass.
      initializationOptions: { testMode: true, configuration: this.settings },
      capabilities: {
        workspace: { configuration: true, workspaceFolders: true },
        textDocument: {
          synchronization: {},
          publishDiagnostics: {},
          hover: { contentFormat: ["plaintext"] }
        }
      }
    });
    this.notify("initialized", {});
  }

  /**
   * Open `file` with `text`, or replace its content wholesale if it is already open.
   */
  openDocument(file: string, languageId: string, text: string): void {
    const uri = pathToFileURL(file).href;
    const version = (this.openVersions.get(uri) ?? 0) + 1;

    this.openVersions.set(uri, version);

    if (version === 1) {
      this.notify("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId,
          version,
          text
        }
      });
    } else {
      this.notify("textDocument/didChange", {
        textDocument: { uri, version },
        contentChanges: [{ text }]
      });
    }
  }

  async hover(file: string, line: number, character: number): Promise<string | null> {
    const answer = (await this.request("textDocument/hover", {
      textDocument: { uri: pathToFileURL(file).href },
      position: { line, character }
    })) as { contents: string | { value?: string } } | null;

    if (!answer) {
      return null;
    }

    return typeof answer.contents === "string" ? answer.contents : (answer.contents.value ?? null);
  }

  clearDiagnostics(file: string): void {
    this.diagnostics.delete(pathToFileURL(file).href);
  }

  /**
   * Wait for the server to publish diagnostics for `file` after its latest open/change. Polling —
   * `publishDiagnostics` is a notification with no request to await, so arrival is observed, not
   * requested.
   */
  async waitForDiagnostics(file: string, timeoutMs: number): Promise<LspDiagnostic[]> {
    const uri = pathToFileURL(file).href;
    const deadline = Date.now() + timeoutMs;

    while (!this.diagnostics.has(uri)) {
      if (this.exitError) {
        throw this.exitError;
      }

      if (Date.now() > deadline) {
        throw new Error(`the language server never validated ${file}`);
      }

      await sleep(50);
    }

    return this.diagnostics.get(uri) ?? [];
  }

  dispose(): void {
    // A deliberate shutdown is not a crash: detach the exit handler before killing.
    this.server.removeAllListeners("exit");
    this.server.kill();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
