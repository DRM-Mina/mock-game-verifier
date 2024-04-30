import React, { Suspense } from 'react';

export interface BlockQueryResponse {
  data: {
    runtime: {
      DRM: {
        sessions: {
          value: string;
        };
      };
    };
  };
}

const getSessionValue = async (gameId: string, hash: string) => {
  const queryTemplate = `
  query GetCurrentSession {
    runtime {
      DRM {
        sessions(
          key: {gameId: {value: "$gameId"}, identifierHash: "$hash"}
        ) {
          value
        }
      }
    }
  }`;

  const query = queryTemplate
    .replace(/\$gameId/g, gameId)
    .replace(/\$hash/g, hash);

  const response = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
    }),
  });

  const { data } = (await response.json()) as BlockQueryResponse;

  return data.runtime.DRM.sessions.value;
};

export default function App() {
  const [sessionValue, setSessionValue] = React.useState<string>('');
  const [gameId, setGameId] = React.useState<string>('1');
  const [hash, setHash] = React.useState<string>('');

  window.electron.ipcRenderer.on('device-set', (_event, args: any) => {
    console.log('device-set', args);
    setHash(args[0]);
  });

  return (
    <div>
      <div>{sessionValue}</div>
      <button
        onClick={async () => {
          const value = await getSessionValue(gameId, hash);
          setSessionValue(value);
        }}
      >
        Get Session Value
      </button>
      <input
        type="text"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
      />
    </div>
  );
}
