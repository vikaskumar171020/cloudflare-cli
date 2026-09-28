import http from 'node:http';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import type { AddressInfo } from 'node:net';

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  scope?: string;
}

export interface StartAuthOptions {
  clientId?: string;
  scopes?: string;
  port?: number;
  timeoutMs?: number;
  localMode?: boolean;
}

export class OAuthManager {
  public static readonly DEFAULT_CLIENT_ID = '54d11594-84e4-413e-b414-2e65e1d683fb';
  public static readonly DEFAULT_SCOPES = 'workers:write user:read zone:read dns:edit';
  public static readonly AUTH_ENDPOINT = 'https://dash.cloudflare.com/oauth2/auth';
  public static readonly TOKEN_ENDPOINT = 'https://dash.cloudflare.com/oauth2/token';

  public static generatePkce(): PkcePair {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  public static generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public static buildAuthorizationUrl(params: {
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
    scopes?: string;
  }): string {
    const url = new URL(this.AUTH_ENDPOINT);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('scope', params.scopes || this.DEFAULT_SCOPES);
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  public static async openBrowser(targetUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      let command = '';
      if (process.platform === 'darwin') {
        command = `open "${targetUrl}"`;
      } else if (process.platform === 'win32') {
        command = `start "" "${targetUrl}"`;
      } else {
        command = `xdg-open "${targetUrl}"`;
      }

      exec(command, (err) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  public static async listenForCallback(options: {
    port: number;
    expectedState: string;
    timeoutMs?: number;
  }): Promise<{ code: string; redirectUri: string; close: () => void }> {
    const { port, expectedState, timeoutMs = 120000 } = options;

    return new Promise((resolve, reject) => {
      let server: http.Server;
      let timer: NodeJS.Timeout;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (server) {
          server.close();
        }
      };

      server = http.createServer((req, res) => {
        try {
          const reqUrl = new URL(req.url || '/', `http://localhost:${port}`);
          if (reqUrl.pathname !== '/oauth/callback') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }

          const state = reqUrl.searchParams.get('state');
          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');
          const errorDescription = reqUrl.searchParams.get('error_description');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head><title>Authentication Failed</title></head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: #f87171;">
                  <div style="background: #1e293b; padding: 32px 48px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); text-align: center; max-width: 480px;">
                    <h2 style="margin: 0 0 16px 0; color: #ef4444;">Authentication Failed</h2>
                    <p style="color: #cbd5e1; font-size: 14px;">${error}: ${errorDescription || 'Access was denied.'}</p>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">You may close this window and try again in your terminal.</p>
                  </div>
                </body>
              </html>
            `);
            cleanup();
            reject(new Error(`OAuth Error: ${error} - ${errorDescription || 'Access denied'}`));
            return;
          }

          if (state !== expectedState) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid state parameter (CSRF protection failed)');
            cleanup();
            reject(new Error('OAuth State Mismatch: Security validation failed.'));
            return;
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing authorization code');
            cleanup();
            reject(new Error('Missing authorization code in OAuth callback.'));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Cloudflare CLI Authenticated</title></head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
                <div style="background: #1e293b; padding: 40px 56px; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); text-align: center; max-width: 480px; border: 1px solid #334155;">
                  <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
                  <h2 style="margin: 0 0 12px 0; color: #38bdf8;">Authentication Successful!</h2>
                  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Cloudflare CLI has received your authorization code and configured your local credentials.</p>
                  <div style="margin-top: 24px; padding: 12px; background: #0f172a; border-radius: 8px; color: #22c55e; font-size: 13px; font-weight: bold;">
                    ✓ You may safely close this tab and return to your terminal.
                  </div>
                </div>
              </body>
            </html>
          `);

          cleanup();
          const actualPort = (server.address() as AddressInfo)?.port || port;
          resolve({
            code,
            redirectUri: `http://localhost:${actualPort}/oauth/callback`,
            close: cleanup,
          });
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

      server.on('error', (err) => {
        cleanup();
        reject(err);
      });

      timer = setTimeout(() => {
        cleanup();
        reject(new Error('OAuth authentication timed out. No callback was received.'));
      }, timeoutMs);

      server.listen(port, '127.0.0.1');
    });
  }

  public static async exchangeAuthCode(params: {
    clientId?: string;
    code: string;
    codeVerifier: string;
    redirectUri: string;
    localMode?: boolean;
  }): Promise<OAuthTokens> {
    if (params.localMode) {
      return {
        accessToken: `mock-oauth-token-${crypto.randomBytes(4).toString('hex')}`,
        refreshToken: `mock-refresh-token-${crypto.randomBytes(4).toString('hex')}`,
        tokenType: 'Bearer',
        expiresIn: 86400,
        scope: this.DEFAULT_SCOPES,
      };
    }

    const clientId =
      params.clientId || process.env.CLOUDFLARE_OAUTH_CLIENT_ID || this.DEFAULT_CLIENT_ID;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    });

    const response = await fetch(this.TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange authorization code for token (HTTP ${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      scope: data.scope,
    };
  }
}
