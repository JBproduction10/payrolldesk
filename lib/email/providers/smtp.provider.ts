// lib/email/providers/smtp.provider.ts
//
// A minimal SMTP client built on Node's built-in `net`/`tls` sockets —
// there's no nodemailer dependency in this project (and no way to add one
// in some environments), so this implements just enough of RFC 5321 to
// authenticate and send a single HTML email: EHLO, STARTTLS, AUTH LOGIN,
// MAIL FROM / RCPT TO / DATA. It's deliberately narrow — one recipient at
// a time, LOGIN auth only, no attachments — which covers every email this
// app actually sends. If you need more (multiple providers' quirks, retry
// queues, attachments), swap this file for nodemailer once it's installed;
// the EmailProvider interface is designed so nothing else has to change.

import { connect as netConnect, type Socket } from "net";
import { connect as tlsConnect, type TLSSocket } from "tls";
import type { EmailProvider, EmailOptions, EmailResult } from "./interface";

export interface SmtpConfig {
  host: string;
  port: number;
  /** true = implicit TLS from the first byte (port 465). false = plaintext then STARTTLS (port 587/25). */
  secure: boolean;
  user: string;
  password: string;
}

const TIMEOUT_MS = 15_000;

class SmtpConnection {
  private socket: Socket | TLSSocket;
  private buffer = "";
  private waiters: ((line: string) => void)[] = [];

  constructor(socket: Socket | TLSSocket) {
    this.socket = socket;
    this.socket.on("data", (chunk) => this.onData(chunk.toString("utf8")));
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    // An SMTP response is one or more lines; every line except the last of
    // a multi-line response has a dash after the code ("250-"), and the
    // final line has a space ("250 "). So the response is complete once the
    // last *complete* line we've buffered has that space form — checking
    // that (rather than just "did a line arrive") is what correctly waits
    // out multi-line responses like EHLO's capability list instead of
    // returning after just the first line of one.
    const lines = this.buffer.split("\r\n");
    if (lines.length < 2) return; // no full line yet
    const last = lines[lines.length - 2]; // last complete line (lines[-1] is the unfinished tail)
    if (/^\d{3} /.test(last)) {
      this.buffer = "";
      const resolve = this.waiters.shift();
      resolve?.(lines.slice(0, -1).join("\r\n"));
    }
  }

  read(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("SMTP response timed out")), TIMEOUT_MS);
      this.waiters.push((line) => {
        clearTimeout(timer);
        resolve(line);
      });
    });
  }

  async write(line: string): Promise<string> {
    this.socket.write(line + "\r\n");
    return this.read();
  }

  swapSocket(next: TLSSocket) {
    this.socket.removeAllListeners("data");
    this.socket = next;
    this.socket.on("data", (chunk) => this.onData(chunk.toString("utf8")));
  }

  get rawSocket() {
    return this.socket;
  }

  close() {
    this.socket.end();
  }
}

function code(response: string): number {
  return parseInt(response.slice(0, 3), 10);
}

function expect(response: string, wanted: number, step: string) {
  if (code(response) !== wanted) {
    throw new Error(`SMTP ${step} failed: ${response}`);
  }
}

/** RFC 5321 dot-stuffing: a line starting with "." must be escaped as "..". */
function dotStuff(body: string): string {
  return body.replace(/\r\n\./g, "\r\n..").replace(/^\./, "..");
}

function buildMessage(options: EmailOptions, from: string): string {
  const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${options.subject}`,
    options.replyTo ? `Reply-To: ${options.replyTo}` : null,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
  ]
    .filter(Boolean)
    .join("\r\n");
  return dotStuff(`${headers}\r\n\r\n${options.html}`);
}

export class SMTPProvider implements EmailProvider {
  constructor(private config: SmtpConfig) {}

  private async connect(): Promise<SmtpConnection> {
    const { host, port, secure } = this.config;

    const socket = await new Promise<Socket | TLSSocket>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("SMTP connection timed out")), TIMEOUT_MS);
      const s = secure
        ? tlsConnect({ host, port, servername: host }, () => {
            clearTimeout(timer);
            resolve(s);
          })
        : netConnect({ host, port }, () => {
            clearTimeout(timer);
            resolve(s);
          });
      s.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const conn = new SmtpConnection(socket);
    expect(await conn.read(), 220, "greeting"); // server banner arrives unprompted

    const ehlo = async () => expect(await conn.write(`EHLO ${host}`), 250, "EHLO");
    await ehlo();

    if (!secure) {
      expect(await conn.write("STARTTLS"), 220, "STARTTLS");
      const upgraded = await new Promise<TLSSocket>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("STARTTLS upgrade timed out")), TIMEOUT_MS);
        const t = tlsConnect({ socket: socket as Socket, servername: host }, () => {
          clearTimeout(timer);
          resolve(t);
        });
        t.once("error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
      conn.swapSocket(upgraded);
      await ehlo(); // must re-greet on the now-encrypted connection
    }

    if (this.config.user) {
      expect(await conn.write("AUTH LOGIN"), 334, "AUTH LOGIN");
      expect(await conn.write(Buffer.from(this.config.user).toString("base64")), 334, "AUTH user");
      expect(
        await conn.write(Buffer.from(this.config.password).toString("base64")),
        235,
        "AUTH password",
      );
    }

    return conn;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    let conn: SmtpConnection | undefined;
    try {
      conn = await this.connect();
      const fromAddr = options.from?.match(/<(.+)>/)?.[1] ?? options.from ?? this.config.user;
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      expect(await conn.write(`MAIL FROM:<${fromAddr}>`), 250, "MAIL FROM");
      for (const rcpt of recipients) {
        expect(await conn.write(`RCPT TO:<${rcpt}>`), 250, "RCPT TO");
      }
      expect(await conn.write("DATA"), 354, "DATA");
      const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${this.config.host}>`;
      const body = buildMessage(options, options.from ?? this.config.user);
      const sendResult = await conn.write(`${body}\r\n.`);
      expect(sendResult, 250, "message body");
      await conn.write("QUIT").catch(() => {});
      return { success: true, messageId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "SMTP send failed",
      };
    } finally {
      conn?.close();
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const conn = await this.connect();
      conn.close();
      return true;
    } catch {
      return false;
    }
  }
}
