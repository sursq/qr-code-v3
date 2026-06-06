import 'server-only';
import { getSettingsRecord, updateSettingsRecord } from './db';

export async function getSettings() {
  return getSettingsRecord();
}

export async function updateSettings(data: {
  labName?: string;
  whatsappEnabled?: boolean;
  messageTemplate?: string;
}) {
  return updateSettingsRecord(data);
}
