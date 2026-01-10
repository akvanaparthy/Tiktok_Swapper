import config from '../config/index.js';
import logger from '../utils/logger.js';

export async function fetchAirtableRecords(tableName, filterFormula = '', fields = [], httpsAgent) {
  const baseId = config.airtable.baseId;
  const token = config.airtable.token;

  let url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?`;

  if (filterFormula) {
    url += `filterByFormula=${encodeURIComponent(filterFormula)}&`;
  }

  if (fields.length > 0) {
    fields.forEach(f => {
      url += `fields[]=${encodeURIComponent(f)}&`;
    });
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    agent: httpsAgent
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airtable error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  logger.debug('Fetched Airtable records', { table: tableName, count: result.records?.length || 0 });
  return result.records || [];
}

export async function updateAirtableRecord(tableName, recordId, fields, httpsAgent) {
  const baseId = config.airtable.baseId;
  const token = config.airtable.token;

  logger.debug('Updating Airtable record', {
    table: tableName,
    recordId,
    fields: Object.keys(fields),
    hasOutputVideo: !!fields.Output_Video
  });

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields }),
      agent: httpsAgent
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Airtable update failed', {
      table: tableName,
      recordId,
      status: response.status,
      error: errorText.substring(0, 500)
    });
    throw new Error(`Airtable update error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  logger.debug('Updated Airtable record successfully', {
    table: tableName,
    recordId,
    updatedFields: Object.keys(fields)
  });
  return result;
}
