import { JobLog, Machine } from '../types';

export class WebSocketClient {
  private static getWsUrl(path: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${path}`;
  }

  static subscribeToJob(
    jobId: string,
    onLog: (log: JobLog) => void,
    onStatus?: (statusData: any) => void
  ): () => void {
    const url = this.getWsUrl(`/ws/jobs/${jobId}`);
    let ws: WebSocket | null = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed) return;
      try {
        ws = new WebSocket(url);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'LOG_ENTRY' && onLog) {
              onLog(msg.data);
            } else if (msg.type === 'STATUS_UPDATE' && onStatus) {
              onStatus(msg.data);
            }
          } catch (e) {
            console.error('Error parsing WS message', e);
          }
        };

        ws.onclose = () => {
          if (!isClosed) {
            setTimeout(connect, 2000);
          }
        };
      } catch (err) {
        console.error('WebSocket connection error', err);
      }
    };

    connect();

    return () => {
      isClosed = true;
      if (ws) {
        ws.close();
      }
    };
  }

  static subscribeToMachines(onUpdate: (machine: Partial<Machine>) => void): () => void {
    const url = this.getWsUrl('/ws/machines');
    let ws: WebSocket | null = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed) return;
      try {
        ws = new WebSocket(url);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'MACHINE_UPDATE' && onUpdate) {
              onUpdate(msg.data);
            }
          } catch (e) {
            console.error('Error parsing WS machine message', e);
          }
        };

        ws.onclose = () => {
          if (!isClosed) {
            setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.error('WebSocket connection error', err);
      }
    };

    connect();

    return () => {
      isClosed = true;
      if (ws) {
        ws.close();
      }
    };
  }
}
