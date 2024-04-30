import sudo from '@vscode/sudo-prompt';
import { RawIdentifiers } from '../identifiers';

let system_info: RawIdentifiers = {
  cpuId: '',
  systemSerial: '',
  systemUUID: '',
  baseboardSerial: '',
  macAddress: [],
  diskSerial: '',
};

export function getMacOSSystemInfo(): Promise<RawIdentifiers> {
  const options = {
    encoding: 'utf-8',
    name: 'Electron',
    icns: '/assets/icon.svg',
  };
  const command =
    'system_profiler SPHardwareDataType | grep "Processor Name" && system_profiler SPHardwareDataType | grep "Serial Number (system)" && system_profiler SPHardwareDataType | grep "Hardware UUID" && system_profiler SPHardwareDataType | grep "Serial Number (system)" && system_profiler SPHardwareDataType | grep "MAC Address"';

  return new Promise((resolve, reject) => {
    sudo.exec(command, options, (error, stdout, stderr) => {
      if (error) reject(error);

      if (stdout) {
        const lines = stdout.toString().split('\n');
        const cpu_id = lines[0].split(':')[1].trim();
        const system_serial = lines[1].split(':')[1].trim();
        const system_uuid = lines[2].split(':')[1].trim();
        const baseboard_serial = lines[3].split(':')[1].trim();
        const mac_addresses = lines
          .slice(4, lines.length - 1)
          .map((line: string) => line.trim().split(':')[1].trim());

        system_info = {
          cpuId: cpu_id,
          systemSerial: system_serial,
          systemUUID: system_uuid,
          baseboardSerial: baseboard_serial,
          macAddress: mac_addresses,
          diskSerial: '',
        };
      }
      resolve(system_info);
    });
  });
}
