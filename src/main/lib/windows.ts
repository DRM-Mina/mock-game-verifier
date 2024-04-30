import { RawIdentifiers } from '../identifiers';
import { exec } from 'child_process';

let system_info: RawIdentifiers = {
  cpuId: '',
  systemSerial: '',
  systemUUID: '',
  baseboardSerial: '',
  macAddress: [],
  diskSerial: '',
};

function extractPhysicalAddresses(output: string): string[] {
  const lines = output.split('\n');
  let ethernetAddress: string = '';
  let wifiAddress: string = '';

  lines.forEach((line) => {
    if (line.includes('Ethernet') && !line.includes('vEthernet')) {
      const matches = line.match(/([0-9A-F]{2}-){5}[0-9A-F]{2}/i);
      if (matches) {
        ethernetAddress = matches[0] || '';
      }
    } else if (line.includes('Wi-Fi')) {
      const matches = line.match(/([0-9A-F]{2}-){5}[0-9A-F]{2}/i);
      if (matches) {
        wifiAddress = matches[0] || '';
      }
    }
  });

  return [ethernetAddress, wifiAddress];
}

export function getWindowsSystemInfo(): Promise<RawIdentifiers> {
  const options = {
    encoding: 'utf-8',
    name: 'Electron',
    icns: '/assets/icon.svg',
  };
  const command =
    'wmic cpu get ProcessorId && wmic bios get serialnumber && wmic csproduct get uuid && wmic baseboard get serialnumber && getmac /v';

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);

      if (stdout) {
        const lines = stdout.split('\n');
        const cpuIdLine =
          lines.findIndex((line) => line.includes('ProcessorId')) + 1;
        const cpuId = lines[cpuIdLine].trim();
        const systemSerialLine =
          lines.findIndex((line) => line.includes('SerialNumber')) + 1;
        const systemSerial = lines[systemSerialLine].trim();
        const systemUUIDLine =
          lines.findIndex((line) => line.includes('UUID')) + 1;
        const systemUUID = lines[systemUUIDLine].trim();
        const baseboardSerialLine =
          lines
            .slice(systemUUIDLine)
            .findIndex((line) => line.includes('SerialNumber')) + 1;
        const baseboardSerial = lines[baseboardSerialLine].trim();

        const macAddresses = extractPhysicalAddresses(stdout);

        system_info = {
          cpuId,
          systemSerial,
          systemUUID,
          baseboardSerial,
          macAddress: macAddresses,
          diskSerial: '',
        };
        resolve(system_info);
      }
    });
  });
}
