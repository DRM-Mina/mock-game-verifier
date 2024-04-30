import { Experimental, Field, PrivateKey, Struct, UInt64 } from 'o1js';
import { Identifiers } from './lib/Identifiers';

export class DeviceSessionInput extends Struct({
  gameId: UInt64,
  currentSessionKey: UInt64,
  newSessionKey: UInt64,
}) {}

export class DeviceSessionOutput extends Struct({
  gameId: UInt64,
  newSessionKey: UInt64,
  hash: Field,
}) {}

export const DeviceSession = Experimental.ZkProgram({
  name: 'DeviceSession',
  publicInput: DeviceSessionInput,
  publicOutput: DeviceSessionOutput,
  methods: {
    proofForSession: {
      privateInputs: [Identifiers],
      method(publicInput: DeviceSessionInput, identifiers: Identifiers) {
        const identifiersHash = identifiers.hash();
        const newSessionKey = publicInput.newSessionKey;
        const gameId = publicInput.gameId;

        return {
          gameId: gameId,
          newSessionKey: newSessionKey,
          hash: identifiersHash,
        };
      },
    },
  },
});

export class DeviceSessionProof extends Experimental.ZkProgram.Proof(
  DeviceSession,
) {}

async function timeout(seconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, seconds * 1000);
  });
}

export async function createSession(
  rawIdentifiers: any,
  currentSession: number,
  gameId: number,
) {
  console.log('createSession');

  const identifiers = Identifiers.fromRaw(rawIdentifiers);

  console.log('Compiling');
  await DeviceSession.compile();

  const newSession = Math.floor(Math.random() * (10000000 - 2 + 1)) + 2;

  const publicInput = new DeviceSessionInput({
    gameId: UInt64.from(gameId),
    currentSessionKey: UInt64.from(currentSession),
    newSessionKey: UInt64.from(newSession),
  });

  console.log('Creating proof');
  const proof = await DeviceSession.proofForSession(publicInput, identifiers);

  console.log('New session:', currentSession);

  console.log('In proof:', proof.publicOutput.newSessionKey.toString());

  const stringify = JSON.stringify(proof.toJSON(), null, 2);

  console.log(stringify);

  return stringify;
}
