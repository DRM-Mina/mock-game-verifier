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

export function getLinuxSystemInfo(): Promise<RawIdentifiers> {
  const options = {
    encoding: 'utf-8',
    name: 'Electron',
    icns: '/assets/icon.svg',
  };
  const command =
    "dmidecode -t processor | grep ID && dmidecode -s system-serial-number && dmidecode -s system-uuid && dmidecode -t baseboard | grep Serial | awk '{print $3}' && ip link show eno1 | grep link/ether | awk '{print $2}' && ip link show wlo1 | grep link/ether | awk '{print $2}'";

  return new Promise((resolve, reject) => {
    sudo.exec(command, options, (error, stdout, stderr) => {
      if (error) reject(error);

      if (stdout) {
        const lines = stdout.toString().split('\n');
        const cpu_id = lines[0]
          .slice(4, lines[0].length)
          .trim()
          .replaceAll(' ', '');
        const system_serial = lines[1].trim();
        const system_uuid = lines[2].trim();
        const baseboard_serial = lines[3].split(' ')[2].trim();
        const mac_addresses = lines
          .slice(4, lines.length - 1)
          .map((line: string) => line.trim().slice(11, 28));

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
